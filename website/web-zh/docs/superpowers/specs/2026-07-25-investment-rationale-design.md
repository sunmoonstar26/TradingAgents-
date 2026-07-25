# 投资理由（Investment Rationale）— 设计文档

**目标：** 在个股工作区页面的「投资委员会决策」板块上方，新增一个用户可手动输入、长期保存的「投资理由」板块，与 AI 生成的决策内容并列展示但互不干扰。

不涉及登录体系、多用户、版本历史——这些是本轮明确排除的范围。

---

## 背景

`src/app/stock/[ticker]/page.tsx` 目前只展示 AI 生成的投资委员会决策（`FinalDecision` 组件，读取 `d.committeeDecision.rationale` 等 AI 萃取字段）。没有任何入口让用户写下自己的判断依据并长期保存——现有唯一的「手动输入持久化」模式（`src/lib/memo-store.ts`）是纯 `localStorage`，换设备/清缓存即丢失，不满足「长期保存」的要求。

schema 里已有一张 `knowledge_entries` 表（migration `0002_alphaos_core.sql`），设计初衷正是「公司知识库条目，支持持续完善」，字段包含 `company_id`、`category`、`title`、`content`，但当前代码库里完全没有引用它。这张表的语义与「投资理由」高度吻合，本设计选择复用它，而不是新建表/migration。

## 范围边界

**本轮做：**
- 单条投资理由，per company，就地覆盖更新（不保留历史版本）
- 手动输入、编辑、保存，服务端持久化（Postgres，非 localStorage）
- UI：独立卡片，位于 `FinalDecision` 上方

**本轮不做：**
- 版本历史/审计日志（如需要，是后续在现有 `content` 基础上加时间戳记录的独立小任务）
- 多用户/权限（web-zh 本地单用户模式，无需 `user_id`）
- 富文本/Markdown 渲染（纯文本 textarea，与 `memo-store.ts` 现有字段一致）

---

## 数据层

### 复用表：`knowledge_entries`

```sql
create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  source text,
  confidence integer,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
```

投资理由存为 `category = 'investment_rationale'` 的唯一一条记录（per company）。`title` 固定写 `'Investment Rationale'`（英文常量，符合数据库字段英文强制规则）。保存时：若已存在该 company 的该 category 记录，`update` 覆盖 `content` + 刷新 `created_at`（借用该字段兼作"最后更新时间"，因为记录被就地覆盖而非追加，语义上等价于 updated_at，不新增字段）；否则 `insert`。不使用 `version` 字段递增（本轮不做历史），保持默认值 `1`。

### `src/lib/company-research.ts` 新增

```ts
export async function getInvestmentRationale(
  ticker: string
): Promise<InvestmentRationale | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [row] = await sql<InvestmentRationale[]>`
    select id, content, created_at
    from knowledge_entries
    where company_id = ${companyId} and category = 'investment_rationale'
    limit 1
  `;
  return row ?? null;
}

export async function saveInvestmentRationale(
  ticker: string,
  content: string
): Promise<InvestmentRationale> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) throw new Error(`Company not found: ${ticker}`);

  const sql = getDb();
  const [existing] = await sql<{ id: string }[]>`
    select id from knowledge_entries
    where company_id = ${companyId} and category = 'investment_rationale'
    limit 1
  `;

  const [row] = existing
    ? await sql<InvestmentRationale[]>`
        update knowledge_entries
        set content = ${content}, created_at = now()
        where id = ${existing.id}
        returning id, content, created_at
      `
    : await sql<InvestmentRationale[]>`
        insert into knowledge_entries (company_id, category, title, content)
        values (${companyId}, 'investment_rationale', 'Investment Rationale', ${content})
        returning id, content, created_at
      `;
  return row;
}
```

`findCompanyId` 复用同文件已有的私有 helper，遵循 `getThesisHistory` 等既有函数的模式（先查 company_id，查不到时读操作返回 `null`/空，不抛错）。`saveInvestmentRationale` 是写操作，company 不存在时抛错——这个场景在 UI 层不会触发，因为该板块只在已跑过分析（company 记录已存在）的页面渲染。

---

## 类型

`src/types/index.ts`，紧跟 `Thesis` interface 之后新增：

```ts
export interface InvestmentRationale {
  id: string;
  content: string;
  created_at: string;
}
```

---

## API 层

新增 `src/app/api/stocks/[ticker]/rationale/route.ts`：

```ts
import { NextRequest, NextResponse } from "next/server";
import { getInvestmentRationale, saveInvestmentRationale } from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getInvestmentRationale(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { content } = await req.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "content must be a non-empty string" },
      { status: 400 }
    );
  }

  const data = await saveInvestmentRationale(ticker.toUpperCase(), content.trim());
  return NextResponse.json({ success: true, data });
}
```

遵循 `theses/route.ts` 的薄包装模式：路由只做参数解析 + 校验 + 转发，业务逻辑全在 `company-research.ts`。

---

## UI 层

新增 `src/components/stock/investment-rationale.tsx`（`"use client"`）：

- `useQuery(["rationale", ticker], () => fetch(...).then(r => r.json()))` 读取
- `useMutation` 包装 `PUT` 请求，成功后 `queryClient.invalidateQueries(["rationale", ticker])` 并退出编辑态；失败时在编辑态内联展示错误提示，**不清空 textarea 内容**（避免用户已输入的文字丢失）
- 卡片容器复用 `card-terminal` 样式，标题行风格与 `final-decision.tsx` 一致（`text-[11px] font-semibold ... uppercase tracking-widest`），标题文案 `"投资理由"` 直接写作中文字面量——跟随 `final-decision.tsx` 现有惯例（该文件标题、标签均为组件内中文字面量，未走 `src/content/`），本设计选择与相邻组件保持一致，而非另立新范式

三种状态：
1. **只读・无内容**：显示 `"暂无投资理由"` + 一个"添加"按钮 → 点击进入编辑态
2. **只读・有内容**：显示 `content`（`whitespace-pre-wrap`，保留用户输入的换行）+ 更新时间（`created_at`，格式同其他组件的 `toLocaleString("zh-CN", ...)`）+ "编辑"按钮 → 点击进入编辑态
3. **编辑态**：`textarea`（预填当前 `content`，若无则为空），下方"保存"（disabled 当内容为空或与保存中）/"取消"（还原为只读态，丢弃未保存改动）按钮

加载态：轻量骨架条（参考现有组件 `animate-pulse` 写法），不做单独 skeleton 组件。

**挂载位置：** `src/app/stock/[ticker]/page.tsx`，在 `<FinalDecision>` 组件**之前**、同一个 `<section>` 内（该 section 已有标题 `STOCK_WORKSPACE_TABS.analysis`），作为该 section 内第一个子元素：

```tsx
<section className="space-y-5">
  <h2 className="...">{STOCK_WORKSPACE_TABS.analysis}</h2>

  <InvestmentRationale ticker={ticker} />

  <FinalDecision ...>
    ...
  </FinalDecision>
</section>
```

---

## 验收标准

1. 首次访问一支已分析过的股票页面，投资理由板块显示「暂无投资理由」空状态
2. 点击"添加"，输入文字并保存后，板块切换为只读态并显示刚保存的内容 + 更新时间
3. 刷新页面（或重新访问），内容仍然存在（验证服务端持久化，非 localStorage）
4. 再次编辑并保存，内容被覆盖为新值，旧内容不可见（验证「只保留最新一条」）
5. 编辑态点击"取消"，内容还原为编辑前的值，未发起保存请求
6. 保存请求失败时（如断网模拟），错误提示内联展示，textarea 内容不丢失
7. `npm run build` 通过，无 TypeScript 报错

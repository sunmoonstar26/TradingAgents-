# 公司中心浏览页 + Event Bus 重构 — 设计文档

**目标：** 补齐 `AlphaOS 26.md` V1.0 清单里 web-zh 尚未落地的两个缺口——
1. 用户能看到"已经研究过哪些公司"（公司中心浏览页）
2. 分析结果落库从"一个函数顺序写 6 张表"升级为符合"Workflow First"原则的事件驱动结构（Event Bus）

不涉及登录体系、Portfolio、Knowledge 模块——这些是本轮明确排除的范围。

---

## 一、公司中心浏览页

### 背景

首页 `src/app/page.tsx` 目前只有 `AIResearchConsole`（AI 控制台）和 `OpportunityRadar`（机会雷达），`/api/dashboard` 吃的是 mock 数据。用户跑过分析后，除非记住 ticker 手动输入 URL，没有任何入口能看到"这个网站已经研究过哪些公司"。这是 `AlphaOS 26.md` 「02 一级页面 → 公司中心」定义的核心能力缺口。

### 数据层

`src/lib/company-research.ts` 新增：

```ts
export async function getAllCompanies(): Promise<CompanyDashboardSnapshot[]> {
  const sql = getDb();
  return sql<CompanyDashboardSnapshot[]>`
    select
      c.ticker, c.name, c.market, c.industry, c.sector,
      cd.score, cd.rating, cd.risk_level, cd.opportunity, cd.summary, cd.updated_at
    from companies c
    left join company_dashboard cd on cd.company_id = c.id
    order by coalesce(cd.updated_at, c.created_at) desc
  `;
}
```

复用现有 `CompanyDashboardSnapshot` 类型。`cd.*` 字段允许为 null——理论上一个 company 记录跑过分析后一定有对应 dashboard 快照（persist 流程原子写入），null 只在极端失败场景出现，前端按"暂无数据"展示，不特殊报错。

### API 层

新增 `src/app/api/companies/route.ts`：

```ts
export async function GET() {
  const data = await getAllCompanies();
  return NextResponse.json({ success: true, data });
}
```

### UI 层

新增 `src/components/dashboard/company-center.tsx`：

- `useQuery(["companies"], () => fetch("/api/companies").then(r => r.json()))`
- 卡片网格（`grid grid-cols-2 sm:grid-cols-3 gap-3`，参考 `company-overview.tsx` 的 `StatCard` 网格风格）
- 每张卡片：`card-terminal` 样式，展示 ticker + name、评分（score）、投资建议（rating）、风险等级色块（复用 `RISK_LABELS`/`RISK_COLORS`）、更新时间（`updated_at`，格式同其他组件的 `toLocaleString("zh-CN", ...)`）
- 点击卡片：`router.push(`/stock/${ticker}`)`
- 加载态：3 个骨架卡片（`animate-pulse`，参考 `company-overview.tsx` 的写法）
- 空状态：图标 + `"暂无已研究公司"` + `"运行下方的 AI 分析开始第一次研究"`
- 不做搜索框/筛选（公司数量少，明确排除）

**挂载位置：** `src/app/page.tsx`，放在 `AIResearchConsole` **上方**，作为首页第一屏。标题：`"已研究公司"`。逻辑顺序：先看已有研究成果，再决定是否启动新分析。

不放进 `PrivateZone`（本地单用户模式下没有登录墙意义，且这是只读浏览，不是控制台操作）。

---

## 二、Event Bus 重构

### 背景

`src/lib/persist-analysis-result.ts` 目前是一个函数顺序执行 6 步 SQL（upsert company → insert analysis_result → insert timeline_event → insert research_history → upsert company_dashboard → insert thesis）。代码注释里明确写着这是"暂不引入独立 Workflow/Event Bus，先用一次直接函数调用验证契约"的临时方案。

这违反 `AlphaOS 26.md` 「开发规范 → 架构规范」的 Workflow First 原则（"模块之间禁止直接调用，必须通过 Workflow/Event Bus"），且以后新增模块（如 V1.5 的 Knowledge）只能继续往这个函数里塞代码，耦合会越来越重。

### 方案：进程内同步 Event Bus（不引入队列/worker）

**新文件 `src/types/events.ts`**

```ts
import type { TARawResult } from "@/schemas/analysis-result";
import type { StockDetail } from "@/types";

export interface AnalysisCompletedEvent {
  companyId: string;
  analysisResultId: string;
  sessionId: string;
  raw: TARawResult;
  detail: StockDetail;
}
```

**新文件 `src/lib/event-bus.ts`**

```ts
type Handler<T> = (payload: T) => Promise<void>;

const handlers = new Map<string, Handler<unknown>[]>();

export function on<T>(event: string, handler: Handler<T>): void {
  const list = handlers.get(event) ?? [];
  list.push(handler as Handler<unknown>);
  handlers.set(event, list);
}

/**
 * 逐个 await 订阅者，单个订阅者失败不阻断其他订阅者；
 * 所有失败在结束后统一汇总记录，调用方决定是否需要感知（目前只 catch+log）。
 */
export async function emit<T>(event: string, payload: T): Promise<void> {
  const list = handlers.get(event) ?? [];
  const errors: unknown[] = [];
  for (const handler of list) {
    try {
      await handler(payload);
    } catch (e) {
      errors.push(e);
      console.error(`[EventBus] "${event}" 订阅者执行失败:`, e);
    }
  }
}
```

不引入队列、不引入 worker、不做持久化重放——这是 V2.0"Workflow 自动化"的范畴，现阶段没有对应基础设施，过度设计。这里只解决"模块间耦合"的问题：调用方 `emit` 一个事件，不关心谁在监听、监听者内部怎么写库。

**改造 `persist-analysis-result.ts`**

保留在触发函数里的两步（这两步是所有订阅者的前提，不算"业务模块"，属于 AnalysisResult 本身的落库）：
1. upsert `companies`
2. insert `analysis_results`

拆成独立订阅者（各自一个文件，放在新目录 `src/lib/analysis-subscribers/`）：
- `write-timeline-event.ts` — insert `timeline_events`
- `write-thesis.ts` — 查询上一版本号 + insert `theses`
- `write-dashboard.ts` — upsert `company_dashboard`
- `write-research-history.ts` — insert `research_history`

每个订阅者签名：`async (event: AnalysisCompletedEvent) => Promise<void>`，内部用 `getDb()` 直连，逻辑与现有代码一致，只是拆分到独立文件+独立订阅函数。

`persist-analysis-result.ts` 改造后：

```ts
import { emit } from "./event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./analysis-subscribers/write-timeline-event";
import "./analysis-subscribers/write-thesis";
import "./analysis-subscribers/write-dashboard";
import "./analysis-subscribers/write-research-history";

export async function persistAnalysisResult(
  raw: TARawResult,
  detail: StockDetail,
  sessionId: string
): Promise<void> {
  const sql = getDb();
  const ticker = raw.ticker.toUpperCase();

  const [company] = await sql`insert into companies (...) ... returning id`;
  const [analysisResult] = await sql`insert into analysis_results (...) ... returning id`;

  const event: AnalysisCompletedEvent = {
    companyId: company.id,
    analysisResultId: analysisResult.id,
    sessionId,
    raw,
    detail,
  };
  await emit("analysis.completed", event);
}
```

各订阅者文件通过 side-effect import（`import "./write-timeline-event"`）在模块加载时调用 `on("analysis.completed", handler)` 完成注册——这是 Node/Next.js 模块系统里最简单的自注册方式，不需要额外的注册表文件。

**调用方 `analysis-store.ts` 不变**——`persistAnalysisResult(raw, detail, session_id).catch(...)` 的调用方式和错误处理逻辑完全不受影响，这是纯内部重构。

**验证方式：** 因为是纯重构，行为对用户不可见。验证手段是跑一次真实分析（或用现有测试数据模拟 `TARawResult`），确认 4 张表（timeline_events、theses、company_dashboard、research_history）依然被正确写入，且任一订阅者失败不影响其他订阅者继续执行。

---

## 三、范围边界

**本轮不做：**
- 登录/多用户体系（web-zh 明确保持本地单用户模式）
- Knowledge 模块（`knowledge_entries` 表已建，本轮不接入）
- Portfolio 模块
- Workflow 队列化/worker/失败重试（V2.0 范畴）
- 公司中心的搜索/筛选

**验收标准：**
1. 首页能看到"已研究公司"卡片列表，跑完一次新分析后刷新首页能看到新卡片
2. 点击卡片能正确跳转到对应 `/stock/[ticker]` 页面
3. 空状态（未跑过任何分析）文案正确显示
4. `persist-analysis-result.ts` 重构后，跑一次分析验证 4 张表依然正确写入
5. `npm run build` 通过，无 TypeScript 报错

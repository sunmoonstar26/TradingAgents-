# 公司中心浏览页 + Event Bus 重构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给 web-zh 首页加一个"已研究公司"浏览区块，并把 `persist-analysis-result.ts` 从一个顺序写 6 步 SQL 的函数，重构成基于进程内 Event Bus 的发布/订阅结构。

**Architecture:** 公司中心走标准的 API route → React Query → 卡片网格三层结构，复用现有 `CompanyDashboardSnapshot` 类型和 `card-terminal` 样式。Event Bus 是一个不依赖任何第三方库的极简同步发布订阅模块（`Map<string, Handler[]>` + 顺序 `await`），触发方只负责 upsert company + insert analysis_result 后 `emit`，四个订阅者各自独立 try/catch 写自己的表。

**Tech Stack:** Next.js 16 (App Router) / React 19 / TypeScript / `postgres` (postgres.js) / `@tanstack/react-query` / `lucide-react` / Node 内置 `node:test` + `tsx`（测试运行器，新增 devDependency，不引入 Jest/Vitest）

## Global Constraints

- 所有用户可见文案使用中文字符串字面量（web-zh 是中文产品，不走 next-intl）
- 枚举/类型定义复用 `src/types/enums.ts`、`src/types/index.ts` 中已有的 `RiskLevel`、`CompanyDashboardSnapshot`，不新造重复类型
- 数据库直连用 `getDb()`（`src/lib/db.ts`），禁止在客户端组件里直接查库
- Append Only 原则：Timeline / Thesis / ResearchHistory 表只允许 insert，不允许 update/delete；`company_dashboard` 是唯一允许 upsert 覆盖的表
- 组件视觉风格复用 `card-terminal` CSS 类、`var(--text-primary)` / `var(--text-secondary)` / `var(--border-custom)` 等既有 CSS 变量，不引入新配色体系
- 本轮不做：登录体系、Knowledge 模块接入、Portfolio 模块、Workflow 队列化/worker、公司中心搜索筛选
- 测试运行器新增 `tsx@4.23.1`（精确版本号，devDependency），不引入 Jest/Vitest

---

### Task 1: 公司中心数据层 — `getAllCompanies()`

**Files:**
- Modify: `src/lib/company-research.ts`

**Interfaces:**
- Consumes: `getDb()` from `./db`（已存在），`CompanyDashboardSnapshot` type from `@/types`（已存在，字段：`ticker, name, market, industry, sector, score, rating, risk_level, opportunity, summary, updated_at`）
- Produces: `getAllCompanies(): Promise<CompanyDashboardSnapshot[]>`，供 Task 2 的 API route 调用

- [ ] **Step 1: 在 `company-research.ts` 末尾新增 `getAllCompanies` 函数**

在文件末尾（`getCompanyDashboard` 函数之后）追加：

```ts
export async function getAllCompanies(): Promise<CompanyDashboardSnapshot[]> {
  const sql = getDb();
  const rows = await sql<CompanyDashboardSnapshot[]>`
    select
      c.ticker,
      c.name,
      c.market,
      c.industry,
      c.sector,
      cd.score,
      cd.rating,
      cd.risk_level,
      cd.opportunity,
      cd.summary,
      cd.updated_at
    from companies c
    left join company_dashboard cd on cd.company_id = c.id
    order by coalesce(cd.updated_at, c.created_at) desc
  `;
  return rows;
}
```

- [ ] **Step 2: 手动验证 SQL 可执行**

Run:
```bash
cd "website/web-zh" && psql "$(grep '^DATABASE_URL' .env.local | cut -d= -f2-)" -c "
select c.ticker, c.name, c.market, c.industry, c.sector,
       cd.score, cd.rating, cd.risk_level, cd.opportunity, cd.summary, cd.updated_at
from companies c
left join company_dashboard cd on cd.company_id = c.id
order by coalesce(cd.updated_at, c.created_at) desc;
"
```
Expected: 返回一个结果表（可能为空，只要不报 SQL 语法/表名错误即可）。

- [ ] **Step 3: Commit**

```bash
cd "website/web-zh"
git add src/lib/company-research.ts
git commit -m "feat(web-zh): add getAllCompanies query for company center"
```

---

### Task 2: 公司中心 API route

**Files:**
- Create: `src/app/api/companies/route.ts`

**Interfaces:**
- Consumes: `getAllCompanies()` from `@/lib/company-research`（Task 1 产出）
- Produces: `GET /api/companies` 返回 `{ success: true, data: CompanyDashboardSnapshot[] }`，供 Task 3 的前端组件调用

- [ ] **Step 1: 创建 API route 文件**

```ts
import { NextResponse } from "next/server";
import { getAllCompanies } from "@/lib/company-research";

export async function GET() {
  const data = await getAllCompanies();
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 2: 启动开发服务器并手动验证接口**

Run:
```bash
cd "website/web-zh" && npm run dev &
sleep 5
curl -s http://localhost:3001/api/companies | head -c 500
kill %1
```
Expected: 输出 `{"success":true,"data":[...]}`（数组内容取决于当前库里已有的公司数据，可能为空数组 `[]`）。

- [ ] **Step 3: Commit**

```bash
cd "website/web-zh"
git add src/app/api/companies/route.ts
git commit -m "feat(web-zh): add GET /api/companies endpoint"
```

---

### Task 3: 公司中心 UI 组件

**Files:**
- Create: `src/components/dashboard/company-center.tsx`

**Interfaces:**
- Consumes: `GET /api/companies`（Task 2 产出，返回 shape `{ success: boolean; data: CompanyDashboardSnapshot[] }`）；`RiskLevel` from `@/types/enums`；`RISK_LABELS`, `RISK_COLORS` from `@/content/labels`（已存在）
- Produces: `export function CompanyCenter()` React 组件，供 Task 4 挂载到首页

- [ ] **Step 1: 编写组件**

```tsx
"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Sparkles } from "lucide-react";
import { CompanyDashboardSnapshot } from "@/types";
import { RiskLevel } from "@/types/enums";
import { RISK_LABELS, RISK_COLORS } from "@/content/labels";

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function CompanyCard({ company }: { company: CompanyDashboardSnapshot }) {
  const router = useRouter();
  const riskLevel =
    company.risk_level && company.risk_level in RiskLevel
      ? (company.risk_level as RiskLevel)
      : null;

  return (
    <button
      onClick={() => router.push(`/stock/${company.ticker}`)}
      className="text-left rounded-xl border border-[var(--border-custom)] p-3 hover:border-[var(--blue)]/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {company.ticker}
        </span>
        {riskLevel && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: RISK_COLORS[riskLevel], backgroundColor: `${RISK_COLORS[riskLevel]}1A` }}
          >
            {RISK_LABELS[riskLevel]}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] truncate mb-2">
        {company.name}
      </p>
      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]/60 font-mono">
        <span>{company.rating ?? "暂无数据"}</span>
        <span>{company.score != null ? `评分 ${company.score}` : "—"}</span>
      </div>
      <div className="text-[10px] text-[var(--text-secondary)]/40 font-mono mt-1">
        {formatUpdatedAt(company.updated_at)}
      </div>
    </button>
  );
}

export function CompanyCenter() {
  const { data, isLoading } = useQuery<{
    success: boolean;
    data: CompanyDashboardSnapshot[];
  }>({
    queryKey: ["companies"],
    queryFn: () => fetch("/api/companies").then((r) => r.json()),
    retry: false,
  });

  const companies = data?.data ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"已研究公司"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {"公司研究档案"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无已研究公司"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"运行下方的 AI 分析开始第一次研究"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {companies.map((c) => (
              <CompanyCard key={c.ticker} company={c} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: 类型检查**

Run:
```bash
cd "website/web-zh" && npx tsc --noEmit
```
Expected: 无报错（若有既存的历史报错，确认没有新增来自 `company-center.tsx` 的报错）。

- [ ] **Step 3: Commit**

```bash
cd "website/web-zh"
git add src/components/dashboard/company-center.tsx
git commit -m "feat(web-zh): add CompanyCenter component"
```

---

### Task 4: 挂载公司中心到首页

**Files:**
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `CompanyCenter` from `@/components/dashboard/company-center`（Task 3 产出）

- [ ] **Step 1: 引入并挂载组件**

在 `src/app/page.tsx` 顶部 import 区新增：

```tsx
import { CompanyCenter } from "@/components/dashboard/company-center";
```

将 `<main>` 内的内容从：

```tsx
      <main className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto space-y-10">
        {/* 1. AI 研究控制台 */}
        <PrivateZone label={"AI 研究控制台"}>
          <AIResearchConsole />
        </PrivateZone>
```

改为：

```tsx
      <main className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto space-y-10">
        {/* 0. 已研究公司 */}
        <CompanyCenter />

        {/* 1. AI 研究控制台 */}
        <PrivateZone label={"AI 研究控制台"}>
          <AIResearchConsole />
        </PrivateZone>
```

- [ ] **Step 2: 启动开发服务器，浏览器手动验证首页渲染**

Run:
```bash
cd "website/web-zh" && npm run dev &
sleep 5
curl -s http://localhost:3001/ | grep -o "已研究公司" | head -1
kill %1
```
Expected: 输出 `已研究公司`（说明该文案已渲染到 HTML 里）。

- [ ] **Step 3: Commit**

```bash
cd "website/web-zh"
git add src/app/page.tsx
git commit -m "feat(web-zh): mount CompanyCenter on homepage"
```

---

### Task 5: 事件类型定义

**Files:**
- Create: `src/types/events.ts`

**Interfaces:**
- Consumes: `TARawResult` from `@/schemas/analysis-result`（已存在）；`StockDetail` from `@/types`（已存在）
- Produces: `AnalysisCompletedEvent` interface，供 Task 6-10 使用

- [ ] **Step 1: 创建事件类型文件**

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

- [ ] **Step 2: 类型检查**

Run:
```bash
cd "website/web-zh" && npx tsc --noEmit
```
Expected: 无新增报错。

- [ ] **Step 3: Commit**

```bash
cd "website/web-zh"
git add src/types/events.ts
git commit -m "feat(web-zh): add AnalysisCompletedEvent type"
```

---

### Task 6: Event Bus 核心模块（TDD）

**Files:**
- Create: `src/lib/event-bus.ts`
- Test: `src/lib/event-bus.test.ts`

**Interfaces:**
- Produces: `on<T>(event: string, handler: (payload: T) => Promise<void>): void`、`emit<T>(event: string, payload: T): Promise<void>`，供 Task 7-10 及 Task 11 使用

- [ ] **Step 1: 新增 devDependency `tsx`**

```bash
cd "website/web-zh" && npm install --save-dev --save-exact tsx@4.23.1
```

- [ ] **Step 2: 在 `package.json` 的 `scripts` 里新增测试命令**

在 `"scripts"` 块里追加一行（`"lint": "eslint"` 之后加逗号）。**glob 必须加引号**——npm 默认用 `sh` 执行脚本，`sh` 的 `**` 不会递归匹配多层目录（会漏掉 `src/lib/analysis-subscribers/` 下两层深的订阅者测试），加引号后交给 Node 自己的 glob 引擎处理才能正确递归：

```json
    "test": "tsx --test \"src/**/*.test.ts\""
```

完整 `scripts` 块变为：

```json
  "scripts": {
    "dev": "next dev -p 3001",
    "dev:en": "LOCALE=en next dev -p 3001",
    "dev:zh": "LOCALE=zh next dev -p 3001",
    "build": "next build --webpack",
    "start": "next start",
    "lint": "eslint",
    "test": "tsx --test \"src/**/*.test.ts\""
  },
```

- [ ] **Step 3: 写失败测试**

```ts
import { test } from "node:test";
import assert from "node:assert/strict";
import { on, emit } from "./event-bus";

test("emit 调用所有已注册的订阅者，并传递 payload", async () => {
  const received: number[] = [];
  on<number>("test.event", async (payload) => {
    received.push(payload);
  });
  on<number>("test.event", async (payload) => {
    received.push(payload * 10);
  });

  await emit<number>("test.event", 5);

  assert.deepEqual(received, [5, 50]);
});

test("单个订阅者抛错不阻断其他订阅者继续执行", async () => {
  const received: string[] = [];
  on<string>("test.event.error", async () => {
    throw new Error("订阅者 A 故意失败");
  });
  on<string>("test.event.error", async (payload) => {
    received.push(payload);
  });

  await emit<string>("test.event.error", "ok");

  assert.deepEqual(received, ["ok"]);
});

test("没有订阅者时 emit 不报错", async () => {
  await assert.doesNotReject(() => emit("test.event.nobody", {}));
});
```

- [ ] **Step 4: 运行测试，确认失败（因为 `event-bus.ts` 还不存在）**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/event-bus.test.ts
```
Expected: FAIL，报错信息包含 `Cannot find module './event-bus'` 或类似的模块解析失败。

- [ ] **Step 5: 编写 `event-bus.ts` 实现**

```ts
// 进程内同步发布订阅：模块间禁止直接调用，必须通过事件解耦（AlphaOS Workflow First 原则）。
// 不做队列/持久化/重放——这是 V2.0 Workflow 自动化的范畴，现阶段没有对应基础设施。

type Handler<T> = (payload: T) => Promise<void>;

const handlers = new Map<string, Handler<unknown>[]>();

export function on<T>(event: string, handler: Handler<T>): void {
  const list = handlers.get(event) ?? [];
  list.push(handler as Handler<unknown>);
  handlers.set(event, list);
}

/**
 * 逐个 await 订阅者；单个订阅者失败仅记录日志，不阻断其他订阅者继续执行。
 */
export async function emit<T>(event: string, payload: T): Promise<void> {
  const list = handlers.get(event) ?? [];
  for (const handler of list) {
    try {
      await handler(payload);
    } catch (e) {
      console.error(`[EventBus] "${event}" 订阅者执行失败:`, e);
    }
  }
}
```

- [ ] **Step 6: 运行测试，确认通过**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/event-bus.test.ts
```
Expected: PASS，3 个测试全部 `✔`。

- [ ] **Step 7: Commit**

```bash
cd "website/web-zh"
git add package.json package-lock.json src/lib/event-bus.ts src/lib/event-bus.test.ts
git commit -m "feat(web-zh): add process-local event bus with TDD tests"
```

---

### Task 7: 订阅者 — 写 Timeline 事件（TDD）

**Files:**
- Create: `src/lib/analysis-subscribers/write-timeline-event.ts`
- Test: `src/lib/analysis-subscribers/write-timeline-event.test.ts`

**Interfaces:**
- Consumes: `on` from `../event-bus`（Task 6 产出）；`AnalysisCompletedEvent` from `@/types/events`（Task 5 产出）；`getDb` from `../db`
- Produces: 模块加载时自动向 `"analysis.completed"` 事件注册一个订阅者（side-effect import，无导出函数供外部直接调用）

**注意：** 这个订阅者会真实写库（依赖本地 Postgres `alphaos_local`）。测试策略是先建一条测试用的 company 记录，emit 事件后查询 `timeline_events` 表验证写入，最后清理测试数据——不 mock 数据库，因为这是验证真实 SQL 语句的正确性。

- [ ] **Step 1: 写失败测试**

```ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { on, emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-timeline-event";

const TEST_TICKER = "TESTWTE";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteTimelineEvent"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("write-timeline-event 订阅者在 analysis.completed 时插入一条 timeline_events 记录", async () => {
  const sql = getDb();

  const event: AnalysisCompletedEvent = {
    companyId: testCompanyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-timeline",
    raw: { ticker: TEST_TICKER, signal: "BUY" } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: { rationale: "测试用理由" },
    } as AnalysisCompletedEvent["detail"],
  };

  await emit("analysis.completed", event);

  const rows = await sql`
    select title, description, source
    from timeline_events
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "AI 分析完成：BUY");
  assert.equal(rows[0].description, "测试用理由");
  assert.equal(rows[0].source, "TradingAgents");
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-timeline-event.test.ts
```
Expected: FAIL，报错 `Cannot find module './write-timeline-event'`。

- [ ] **Step 3: 编写实现**

```ts
import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  await sql`
    insert into timeline_events (company_id, event_type, title, description, source, occurred_at)
    values (
      ${event.companyId},
      'analysis_completed',
      ${`AI 分析完成：${event.raw.signal}`},
      ${event.detail.committeeDecision.rationale},
      'TradingAgents',
      now()
    )
  `;
});
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-timeline-event.test.ts
```
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
cd "website/web-zh"
git add src/lib/analysis-subscribers/write-timeline-event.ts src/lib/analysis-subscribers/write-timeline-event.test.ts
git commit -m "feat(web-zh): extract timeline-event write as event subscriber"
```

---

### Task 8: 订阅者 — 写 Thesis 版本（TDD）

**Files:**
- Create: `src/lib/analysis-subscribers/write-thesis.ts`
- Test: `src/lib/analysis-subscribers/write-thesis.test.ts`

**Interfaces:**
- Consumes: `on` from `../event-bus`；`AnalysisCompletedEvent` from `@/types/events`；`getDb` from `../db`
- Produces: 模块加载时自动向 `"analysis.completed"` 事件注册订阅者，负责按公司自增 `theses.version`

- [ ] **Step 1: 写失败测试**

```ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-thesis";

const TEST_TICKER = "TESTWTH";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteThesis"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function buildEvent(rationale: string): AnalysisCompletedEvent {
  return {
    companyId: testCompanyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-thesis",
    raw: { ticker: TEST_TICKER, signal: "BUY" } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: { rationale },
    } as AnalysisCompletedEvent["detail"],
  };
}

test("write-thesis 订阅者第一次触发时插入 version=1，previous_version=null", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("第一版理由"));

  const rows = await sql`
    select version, content, previous_version
    from theses
    where company_id = ${testCompanyId}
    order by version asc
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].version, 1);
  assert.equal(rows[0].content, "第一版理由");
  assert.equal(rows[0].previous_version, null);
});

test("write-thesis 订阅者第二次触发时插入 version=2，previous_version=1", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("第二版理由"));

  const rows = await sql`
    select version, content, previous_version
    from theses
    where company_id = ${testCompanyId}
    order by version asc
  `;

  assert.equal(rows.length, 2);
  assert.equal(rows[1].version, 2);
  assert.equal(rows[1].content, "第二版理由");
  assert.equal(rows[1].previous_version, 1);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-thesis.test.ts
```
Expected: FAIL，报错 `Cannot find module './write-thesis'`。

- [ ] **Step 3: 编写实现**

```ts
import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();

  const [lastThesis] = await sql<{ version: number }[]>`
    select version from theses
    where company_id = ${event.companyId}
    order by version desc
    limit 1
  `;

  const previousVersion = lastThesis?.version ?? null;
  await sql`
    insert into theses (company_id, version, content, previous_version)
    values (
      ${event.companyId},
      ${(previousVersion ?? 0) + 1},
      ${event.detail.committeeDecision.rationale},
      ${previousVersion}
    )
  `;
});
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-thesis.test.ts
```
Expected: PASS，2 个测试全部 `✔`（注意两个测试有顺序依赖，`node:test` 默认按文件内声明顺序执行）。

- [ ] **Step 5: Commit**

```bash
cd "website/web-zh"
git add src/lib/analysis-subscribers/write-thesis.ts src/lib/analysis-subscribers/write-thesis.test.ts
git commit -m "feat(web-zh): extract thesis versioning as event subscriber"
```

---

### Task 9: 订阅者 — 写 Dashboard 快照（TDD）

**Files:**
- Create: `src/lib/analysis-subscribers/write-dashboard.ts`
- Test: `src/lib/analysis-subscribers/write-dashboard.test.ts`

**Interfaces:**
- Consumes: `on` from `../event-bus`；`AnalysisCompletedEvent` from `@/types/events`；`getDb` from `../db`
- Produces: 模块加载时自动向 `"analysis.completed"` 事件注册订阅者，upsert `company_dashboard`

- [ ] **Step 1: 写失败测试**

```ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-dashboard";

const TEST_TICKER = "TESTWDB";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteDashboard"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function buildEvent(signal: string, conviction: number): AnalysisCompletedEvent {
  return {
    companyId: testCompanyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-dashboard",
    raw: { ticker: TEST_TICKER, signal } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: {
        rationale: "仪表盘测试理由",
        recommendedExposure: "20%",
        conviction,
      },
      riskExposures: [{ level: "MEDIUM" }],
    } as AnalysisCompletedEvent["detail"],
  };
}

test("write-dashboard 订阅者首次触发时插入一条 company_dashboard 记录", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("BUY", 70));

  const rows = await sql`
    select rating, score, risk_level, opportunity
    from company_dashboard
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].rating, "BUY");
  assert.equal(rows[0].score, 70);
  assert.equal(rows[0].risk_level, "MEDIUM");
  assert.equal(rows[0].opportunity, "20%");
});

test("write-dashboard 订阅者第二次触发时覆盖同一条记录（upsert）", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("SELL", 30));

  const rows = await sql`
    select rating, score
    from company_dashboard
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].rating, "SELL");
  assert.equal(rows[0].score, 30);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-dashboard.test.ts
```
Expected: FAIL，报错 `Cannot find module './write-dashboard'`。

- [ ] **Step 3: 编写实现**

```ts
import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  await sql`
    insert into company_dashboard (company_id, score, rating, risk_level, opportunity, summary, updated_at)
    values (
      ${event.companyId},
      ${event.detail.committeeDecision.conviction},
      ${event.raw.signal},
      ${event.detail.riskExposures[0]?.level ?? null},
      ${event.detail.committeeDecision.recommendedExposure},
      ${event.detail.committeeDecision.rationale},
      now()
    )
    on conflict (company_id) do update set
      score = excluded.score,
      rating = excluded.rating,
      risk_level = excluded.risk_level,
      opportunity = excluded.opportunity,
      summary = excluded.summary,
      updated_at = excluded.updated_at
  `;
});
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-dashboard.test.ts
```
Expected: PASS，2 个测试全部 `✔`。

- [ ] **Step 5: Commit**

```bash
cd "website/web-zh"
git add src/lib/analysis-subscribers/write-dashboard.ts src/lib/analysis-subscribers/write-dashboard.test.ts
git commit -m "feat(web-zh): extract dashboard upsert as event subscriber"
```

---

### Task 10: 订阅者 — 写 ResearchHistory 存档（TDD）

**Files:**
- Create: `src/lib/analysis-subscribers/write-research-history.ts`
- Test: `src/lib/analysis-subscribers/write-research-history.test.ts`

**Interfaces:**
- Consumes: `on` from `../event-bus`；`AnalysisCompletedEvent` from `@/types/events`；`getDb` from `../db`
- Produces: 模块加载时自动向 `"analysis.completed"` 事件注册订阅者，insert `research_history`

- [ ] **Step 1: 写失败测试**

```ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-research-history";

const TEST_TICKER = "TESTWRH";
let testCompanyId: string;
let testAnalysisResultId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteResearchHistory"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;

  const [analysisResult] = await sql<{ id: string }[]>`
    insert into analysis_results (company_id, session_id, raw_json)
    values (${testCompanyId}, ${"test-session-write-research-history"}, ${sql.json({ ticker: TEST_TICKER })})
    returning id
  `;
  testAnalysisResultId = analysisResult.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("write-research-history 订阅者插入一条包含 model/runtime/token 的存档记录", async () => {
  const sql = getDb();

  const event: AnalysisCompletedEvent = {
    companyId: testCompanyId,
    analysisResultId: testAnalysisResultId,
    sessionId: "test-session-write-research-history",
    raw: {
      ticker: TEST_TICKER,
      signal: "BUY",
      model: "test-model",
      runtime_ms: 1234,
      token_usage: 5678,
    } as AnalysisCompletedEvent["raw"],
    detail: {} as AnalysisCompletedEvent["detail"],
  };

  await emit("analysis.completed", event);

  const rows = await sql`
    select model, runtime_ms, token_usage
    from research_history
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].model, "test-model");
  assert.equal(rows[0].runtime_ms, 1234);
  assert.equal(rows[0].token_usage, 5678);
});
```

- [ ] **Step 2: 运行测试，确认失败**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-research-history.test.ts
```
Expected: FAIL，报错 `Cannot find module './write-research-history'`。

- [ ] **Step 3: 编写实现**

```ts
import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  await sql`
    insert into research_history (company_id, analysis_result_id, raw_json, model, runtime_ms, token_usage)
    values (
      ${event.companyId},
      ${event.analysisResultId},
      ${sql.json(event.raw)},
      ${event.raw.model ?? null},
      ${event.raw.runtime_ms ?? null},
      ${event.raw.token_usage ?? null}
    )
  `;
});
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/analysis-subscribers/write-research-history.test.ts
```
Expected: PASS。

- [ ] **Step 5: Commit**

```bash
cd "website/web-zh"
git add src/lib/analysis-subscribers/write-research-history.ts src/lib/analysis-subscribers/write-research-history.test.ts
git commit -m "feat(web-zh): extract research-history archival as event subscriber"
```

---

### Task 11: 改造 `persist-analysis-result.ts` 使用 Event Bus

**Files:**
- Modify: `src/lib/persist-analysis-result.ts`
- Test: `src/lib/persist-analysis-result.test.ts`

**Interfaces:**
- Consumes: `emit` from `./event-bus`（Task 6）；4 个订阅者模块（Task 7-10，通过 side-effect import 注册）；`AnalysisCompletedEvent` from `@/types/events`（Task 5）
- Produces: `persistAnalysisResult(raw: TARawResult, detail: StockDetail, sessionId: string): Promise<void>`（签名不变，`src/lib/analysis-store.ts` 的调用方不需要改动）

**注意：** 这一步是本次重构的核心验收点——用一次完整的端到端调用验证 4 张表依然被正确写入。测试用真实数据库连接，不 mock。

- [ ] **Step 1: 写失败测试**

```ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "./db";
import { persistAnalysisResult } from "./persist-analysis-result";
import type { TARawResult } from "@/schemas/analysis-result";
import type { StockDetail } from "@/types";

const TEST_TICKER = "TESTPAR";

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("persistAnalysisResult 端到端写入 company/analysis_result/timeline/thesis/dashboard/research_history 六张表", async () => {
  const sql = getDb();

  const raw = {
    ticker: TEST_TICKER,
    signal: "BUY",
    model: "test-model",
    runtime_ms: 1000,
    token_usage: 2000,
  } as TARawResult;

  const detail = {
    name: "测试公司-PersistAnalysisResult",
    committeeDecision: {
      rationale: "端到端测试理由",
      recommendedExposure: "15%",
      conviction: 80,
    },
    riskExposures: [{ level: "LOW" }],
  } as StockDetail;

  const sessionId = "test-session-persist-e2e";

  await persistAnalysisResult(raw, detail, sessionId);

  const [company] = await sql<{ id: string }[]>`
    select id from companies where ticker = ${TEST_TICKER}
  `;
  assert.ok(company, "companies 表应有对应记录");

  const [analysisResult] = await sql<{ id: string }[]>`
    select id from analysis_results where session_id = ${sessionId}
  `;
  assert.ok(analysisResult, "analysis_results 表应有对应记录");

  const timelineRows = await sql`
    select id from timeline_events where company_id = ${company.id}
  `;
  assert.equal(timelineRows.length, 1, "timeline_events 应有一条记录");

  const thesisRows = await sql`
    select id from theses where company_id = ${company.id}
  `;
  assert.equal(thesisRows.length, 1, "theses 应有一条记录");

  const dashboardRows = await sql`
    select id from company_dashboard where company_id = ${company.id}
  `;
  assert.equal(dashboardRows.length, 1, "company_dashboard 应有一条记录");

  const researchHistoryRows = await sql`
    select id from research_history where company_id = ${company.id}
  `;
  assert.equal(researchHistoryRows.length, 1, "research_history 应有一条记录");
});
```

- [ ] **Step 2: 运行测试，确认失败（因为 `persist-analysis-result.ts` 还是旧实现，事件表还没接上）**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/persist-analysis-result.test.ts
```
Expected: 此时旧实现仍是直接写 6 步 SQL，测试实际会 PASS（旧代码逻辑正确）。这一步的目的是确认测试本身在改造前能通过，作为重构安全网——记录下这次运行结果，Step 5 改造后重新跑一遍必须仍然 PASS。

- [ ] **Step 3: 用完整代码替换 `persist-analysis-result.ts`**

```ts
// 持久化适配层：把校验通过的 TARawResult 落进 AlphaOS Company 四层模型（本地 Postgres）。
// company/analysis_result 是所有下游模块的前提，保留在此处直接写入；
// timeline/thesis/dashboard/research_history 四个模块通过 event-bus 解耦，
// 各自的写入逻辑见 ./analysis-subscribers/。
import type { TARawResult } from "@/schemas/analysis-result";
import type { StockDetail } from "@/types";
import type { AnalysisCompletedEvent } from "@/types/events";
import { getDb } from "./db";
import { emit } from "./event-bus";
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

  // 1. upsert companies（按 ticker 唯一）
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${ticker}, ${detail.name}, 'US')
    on conflict (ticker) do update set name = excluded.name, updated_at = now()
    returning id
  `;
  const companyId = company.id;

  // 2. insert analysis_results（session_id 唯一，永不覆盖）
  const [analysisResult] = await sql<{ id: string }[]>`
    insert into analysis_results (
      company_id, session_id, raw_json, summary, recommendation, confidence, risk, opportunity, model
    ) values (
      ${companyId},
      ${sessionId},
      ${sql.json(raw)},
      ${detail.committeeDecision.rationale},
      ${raw.signal},
      ${detail.committeeDecision.conviction},
      ${detail.riskExposures[0]?.value ?? null},
      ${detail.committeeDecision.recommendedExposure},
      ${raw.model ?? null}
    )
    returning id
  `;
  const analysisResultId = analysisResult.id;

  // 3. 触发事件，Timeline/Thesis/Dashboard/ResearchHistory 各自的订阅者独立写入
  const event: AnalysisCompletedEvent = {
    companyId,
    analysisResultId,
    sessionId,
    raw,
    detail,
  };
  await emit("analysis.completed", event);
}
```

- [ ] **Step 4: 运行测试，确认通过**

Run:
```bash
cd "website/web-zh" && npx tsx --test src/lib/persist-analysis-result.test.ts
```
Expected: PASS，与 Step 2 的结果一致（同一个测试文件，验证重构没有改变行为）。

- [ ] **Step 5: 运行全量测试套件，确认所有测试通过**

Run:
```bash
cd "website/web-zh" && npm run test
```
Expected: 全部测试（`event-bus.test.ts` 3 个 + 4 个订阅者测试各 1-2 个 + `persist-analysis-result.test.ts` 1 个）均 PASS，无 FAIL。

- [ ] **Step 6: 类型检查全项目**

Run:
```bash
cd "website/web-zh" && npx tsc --noEmit
```
Expected: 无报错。

- [ ] **Step 7: Commit**

```bash
cd "website/web-zh"
git add src/lib/persist-analysis-result.ts src/lib/persist-analysis-result.test.ts
git commit -m "refactor(web-zh): persist-analysis-result emits event instead of direct writes"
```

---

### Task 12: 构建验证 + 收尾

**Files:** 无新增/修改文件，仅验证

- [ ] **Step 1: 完整生产构建**

Run:
```bash
cd "website/web-zh" && npm run build
```
Expected: 构建成功，无 TypeScript/ESLint 报错。若报错，根据报错信息定位是 Task 1-11 中哪一步引入的问题并修复。

- [ ] **Step 2: 启动开发服务器，手动验证首页 + 公司中心 + 分析流程完整闭环**

Run:
```bash
cd "website/web-zh" && npm run dev &
sleep 5
curl -s http://localhost:3001/api/companies | python3 -m json.tool | head -20
kill %1
```
Expected: 返回当前库里已有的公司列表（真实数据，非测试数据——Task 7-11 的测试数据在各自 `after` hook 里已清理）。

- [ ] **Step 3: 确认无测试残留数据污染生产库**

Run:
```bash
cd "website/web-zh" && psql "$(grep '^DATABASE_URL' .env.local | cut -d= -f2-)" -c "
select ticker from companies where ticker like 'TEST%';
"
```
Expected: 返回 0 行（所有测试用的 `TESTWTE`/`TESTWTH`/`TESTWDB`/`TESTWRH`/`TESTPAR` 公司记录已被各测试文件的 `after` hook 清理干净）。

- [ ] **Step 4: 最终确认 git log**

Run:
```bash
cd "website/web-zh" && git log --oneline -12
```
Expected: 看到本计划 Task 1-11 的 11 个 commit，按顺序排列。

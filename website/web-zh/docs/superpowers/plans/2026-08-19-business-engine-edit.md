# 商业引擎板块可编辑功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给股票详情页的"商业引擎"板块（`BusinessEnginesSection`）加人工编辑能力：编辑已有引擎的任意字段、新增一条引擎、删除一条引擎，且人工编辑过的数据在下次 AI 分析 upsert 时不会被覆盖。

**Architecture:** 数据库新增 `is_manually_edited` 整行锁定标记字段，`business_engine_snapshots.analysis_result_id` 改为可空以支持人工操作产生的快照。后端在 `company-research.ts` 新增 `updateBusinessEngine`/`createBusinessEngine`/`deleteBusinessEngine` 三个函数，配合两个 API route 文件（现有 `business-engines/route.ts` 加 POST，新建 `business-engines/[engineId]/route.ts` 提供 PUT/DELETE）。`write-business-engine.ts` 订阅器在 upsert 前检查 `is_manually_edited`，锁定的行只追加 snapshot 不覆盖主表。前端 `business-engines.tsx` 组件加编辑/新增表单（复用现有 `EngineCard` 结构，通过 `editingId` 判断渲染模式）和删除确认。

**Tech Stack:** Next.js App Router / TypeScript / `postgres` npm 包直连本地 Postgres / TanStack Query / node:test + node:assert/strict / React 19 / lucide-react 图标 / framer-motion

## Global Constraints

- 用户界面文案统一放置于 `src/content/` 目录，不允许在组件中直接硬编码字符串（`AGENTS.md` 规则 2）
- 所有信号/风险/等级/状态统一使用 `src/types/enums.ts` 中的 TypeScript Enum，禁止用中文字符串做条件判断（`AGENTS.md` 规则 1）
- 枚举展示文案统一从 `src/content/business-engine.ts` 读取，不在组件内写死（`AGENTS.md` 规则 4）
- 数据库写入只走服务端 `DATABASE_URL` 直连（`src/lib/db.ts` 的 `getDb()`），不引入新连接方式
- 本次不做登录/角色权限校验，沿用项目本地单用户模式（与 `ProphetIndicator`/`CompanyTimeline` 一致）
- 测试用 `node:test` + `node:assert/strict`，通过 `npm test` 运行（实际执行：`tsx --env-file=.env.local --test --test-force-exit "src/**/*.test.ts" "scripts/**/*.test.ts"`）
- 迁移文件仅作记录，本项目无自动化迁移工具，实际应用靠手动执行 `psql "$DATABASE_URL" -f supabase/migrations/0007_xxx.sql`（`$DATABASE_URL` 取自 `.env.local`）
- `EngineChangeType.MANUAL_EDIT`、`is_manually_edited` 字段名在迁移/类型/SQL/组件展示中必须逐字一致
- 人工硬删除一条 `business_engines` 记录会级联清空它的全部 `business_engine_snapshots` 历史（现有 `on delete cascade` 外键不变），这是已确认接受的行为

---

## Task 1: 数据库迁移 — 新增锁定标记字段，放宽快照外键约束

**Files:**
- Create: `supabase/migrations/0007_business_engine_editable.sql`

**Interfaces:**
- Produces: `business_engines.is_manually_edited`（boolean，默认 false）列；`business_engine_snapshots.analysis_result_id` 变为可空

- [ ] **Step 1: 创建迁移文件**

```sql
-- 整行锁定标记：人工编辑/新增后置为 true，AI 下次 upsert 时跳过该行的主表更新，
-- 但仍追加 snapshot 历史（用于回看 AI 本来想做的变化）。
alter table public.business_engines
  add column is_manually_edited boolean not null default false;

-- 人工新增/编辑/删除操作不属于任何一次 AI 分析，无 analysis_result_id 可填。
alter table public.business_engine_snapshots
  alter column analysis_result_id drop not null;
```

- [ ] **Step 2: 应用迁移到本地数据库**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -f supabase/migrations/0007_business_engine_editable.sql`
Expected: 输出 `ALTER TABLE` 两次，无报错

- [ ] **Step 3: 验证字段已生效**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "\d business_engines" | grep is_manually_edited`
Expected: 输出包含 `is_manually_edited | boolean | ... | not null | false`

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0007_business_engine_editable.sql
git commit -m "feat(web-zh): add business_engines manual-edit lock migration"
```

---

## Task 2: 类型与枚举扩展

**Files:**
- Modify: `src/types/enums.ts`
- Modify: `src/types/index.ts`
- Modify: `src/content/business-engine.ts`

**Interfaces:**
- Consumes: 无（纯类型定义任务）
- Produces: `EngineChangeType.MANUAL_EDIT`；`BusinessEngine.is_manually_edited: boolean`；`BusinessEngineInput` 接口（`name`, `description`, `customer_segment`, `product_or_service`, `monetization_model`, `revenue_role`, `lifecycle_stage`, `trend`, `confidence`, `evidence` 十个字段，供 Task 3/4/5 使用）；`CHANGE_TYPE_LABELS[EngineChangeType.MANUAL_EDIT]` 文案

- [ ] **Step 1: 在 `src/types/enums.ts` 的 `EngineChangeType` 里新增 `MANUAL_EDIT`**

找到现有定义：
```typescript
export enum EngineChangeType {
  BASELINE  = "BASELINE",
  NEW       = "NEW",
  GROWING   = "GROWING",
  STABLE    = "STABLE",
  WEAKENING = "WEAKENING",
  DECLINING = "DECLINING",
  PROMOTED  = "PROMOTED",
  DEMOTED   = "DEMOTED",
  ABANDONED = "ABANDONED",
  UNCERTAIN = "UNCERTAIN",
}
```

改为：
```typescript
export enum EngineChangeType {
  BASELINE    = "BASELINE",
  NEW         = "NEW",
  GROWING     = "GROWING",
  STABLE      = "STABLE",
  WEAKENING   = "WEAKENING",
  DECLINING   = "DECLINING",
  PROMOTED    = "PROMOTED",
  DEMOTED     = "DEMOTED",
  ABANDONED   = "ABANDONED",
  UNCERTAIN   = "UNCERTAIN",
  MANUAL_EDIT = "MANUAL_EDIT",
}
```

- [ ] **Step 2: 在 `src/types/index.ts` 的 `BusinessEngine` 接口新增字段，并新增 `BusinessEngineInput` 接口**

找到现有 `BusinessEngine` 接口（约第 474-486 行）：
```typescript
export interface BusinessEngine {
  id: string;
  company_id: string;
  name: string;
  description: string;
  customer_segment: CustomerSegment[];
  product_or_service: string | null;
  monetization_model: MonetizationModel[];
  revenue_role: RevenueRole;
  lifecycle_stage: LifecycleStage;
  trend: EngineTrend;
  confidence: EngineConfidence;
  evidence: BusinessEngineEvidence[];
  last_verified_at: string;
  updated_at: string;
}
```

在 `updated_at: string;` 后新增一行：
```typescript
  updated_at: string;
  is_manually_edited: boolean;
}
```

在 `BusinessEngine` 接口后（`BusinessEngineSnapshot` 接口前）新增：
```typescript
/** 人工新增/编辑商业引擎时的请求体，字段与 BusinessEngine 一致但不含 id/时间戳/锁定标记 */
export interface BusinessEngineInput {
  name: string;
  description: string;
  customer_segment: CustomerSegment[];
  product_or_service: string | null;
  monetization_model: MonetizationModel[];
  revenue_role: RevenueRole;
  lifecycle_stage: LifecycleStage;
  trend: EngineTrend;
  confidence: EngineConfidence;
  evidence: BusinessEngineEvidence[];
}
```

- [ ] **Step 3: 在 `src/content/business-engine.ts` 的 `CHANGE_TYPE_LABELS` 新增一行**

找到：
```typescript
export const CHANGE_TYPE_LABELS: Record<EngineChangeType, string> = {
  [EngineChangeType.BASELINE]: "基线已建立",
  [EngineChangeType.NEW]: "新识别",
  [EngineChangeType.GROWING]: "上升趋势",
  [EngineChangeType.STABLE]: "保持稳定",
  [EngineChangeType.WEAKENING]: "增长放缓",
  [EngineChangeType.DECLINING]: "衰退",
  [EngineChangeType.PROMOTED]: "升级",
  [EngineChangeType.DEMOTED]: "降级",
  [EngineChangeType.ABANDONED]: "已放弃",
  [EngineChangeType.UNCERTAIN]: "状态变化",
};
```

改为：
```typescript
export const CHANGE_TYPE_LABELS: Record<EngineChangeType, string> = {
  [EngineChangeType.BASELINE]: "基线已建立",
  [EngineChangeType.NEW]: "新识别",
  [EngineChangeType.GROWING]: "上升趋势",
  [EngineChangeType.STABLE]: "保持稳定",
  [EngineChangeType.WEAKENING]: "增长放缓",
  [EngineChangeType.DECLINING]: "衰退",
  [EngineChangeType.PROMOTED]: "升级",
  [EngineChangeType.DEMOTED]: "降级",
  [EngineChangeType.ABANDONED]: "已放弃",
  [EngineChangeType.UNCERTAIN]: "状态变化",
  [EngineChangeType.MANUAL_EDIT]: "人工修改",
};
```

- [ ] **Step 4: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增报错（现有代码库若已有历史报错，确认新增字段没有引入新的报错即可）

- [ ] **Step 5: Commit**

```bash
git add src/types/enums.ts src/types/index.ts src/content/business-engine.ts
git commit -m "feat(web-zh): add MANUAL_EDIT change type and is_manually_edited field"
```

---

## Task 3: 输入校验函数 + `getBusinessEngines` 补充新字段

**Files:**
- Modify: `src/lib/company-research.ts`
- Test: `src/lib/company-research.test.ts`

**Interfaces:**
- Consumes: `BusinessEngineInput`（Task 2 产出，来自 `@/types`）；`RevenueRole`/`LifecycleStage`/`EngineTrend`/`EngineConfidence`/`CustomerSegment`/`MonetizationModel`（`@/types/enums`）
- Produces: `validateBusinessEngineInput(body: unknown): { ok: true; value: BusinessEngineInput } | { ok: false; error: string }`，供 Task 4 的 API route 使用

- [ ] **Step 1: 在 `src/lib/company-research.test.ts` 顶部 import 新函数，并新增校验测试**

修改文件顶部 import（现有）：
```typescript
import {
  getInvestmentRationale,
  saveInvestmentRationale,
  getTimelineEvents,
  createTimelineEvent,
  deleteTimelineEvent,
} from "./company-research";
```

改为：
```typescript
import {
  getInvestmentRationale,
  saveInvestmentRationale,
  getTimelineEvents,
  createTimelineEvent,
  deleteTimelineEvent,
  validateBusinessEngineInput,
} from "./company-research";
```

在文件末尾追加测试：
```typescript
test("validateBusinessEngineInput 对合法输入返回 ok:true", () => {
  const result = validateBusinessEngineInput({
    name: "Azure",
    description: "云服务收入",
    customer_segment: ["ENTERPRISE"],
    product_or_service: "Cloud Infrastructure",
    monetization_model: ["USAGE_BASED"],
    revenue_role: "CORE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [],
  });
  assert.equal(result.ok, true);
});

test("validateBusinessEngineInput 对空 name 返回 ok:false", () => {
  const result = validateBusinessEngineInput({
    name: "  ",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [],
  });
  assert.equal(result.ok, false);
});

test("validateBusinessEngineInput 对非法 revenue_role 枚举值返回 ok:false", () => {
  const result = validateBusinessEngineInput({
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "NOT_A_REAL_ROLE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [],
  });
  assert.equal(result.ok, false);
});

test("validateBusinessEngineInput 对非法 evidence 项返回 ok:false", () => {
  const result = validateBusinessEngineInput({
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [{ source: "news.com", source_type: "news", date: "2026-01-01" }],
  });
  assert.equal(result.ok, false);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="validateBusinessEngineInput"`
Expected: FAIL，报错 `validateBusinessEngineInput is not a function` 或 import 报错

- [ ] **Step 3: 在 `src/lib/company-research.ts` 顶部补充 import，并新增校验函数**

找到顶部 import：
```typescript
import type {
  TimelineEvent,
  Thesis,
  InvestmentRationale,
  ProphetIndicator,
  ResearchHistoryEntry,
  CompanyDashboardSnapshot,
  BusinessEngine,
} from "@/types";
import { getDb } from "./db";
```

改为：
```typescript
import type {
  TimelineEvent,
  Thesis,
  InvestmentRationale,
  ProphetIndicator,
  ResearchHistoryEntry,
  CompanyDashboardSnapshot,
  BusinessEngine,
  BusinessEngineInput,
  BusinessEngineEvidence,
} from "@/types";
import {
  RevenueRole,
  LifecycleStage,
  EngineTrend,
  EngineConfidence,
  CustomerSegment,
  MonetizationModel,
} from "@/types/enums";
import { getDb } from "./db";
```

在文件末尾（`getBusinessEngines` 函数之后）追加：
```typescript
type ValidationResult =
  | { ok: true; value: BusinessEngineInput }
  | { ok: false; error: string };

function isEnumValue<T extends string>(enumObj: Record<string, T>, value: unknown): value is T {
  return typeof value === "string" && (Object.values(enumObj) as string[]).includes(value);
}

function isValidEvidence(value: unknown): value is BusinessEngineEvidence {
  if (typeof value !== "object" || value === null) return false;
  const ev = value as Record<string, unknown>;
  return (
    typeof ev.source === "string" &&
    (ev.source_type === "news" || ev.source_type === "financial_statement") &&
    typeof ev.date === "string" &&
    typeof ev.claim === "string" &&
    (ev.direction === "POSITIVE" || ev.direction === "NEGATIVE" || ev.direction === "NEUTRAL") &&
    isEnumValue(EngineConfidence, ev.confidence)
  );
}

export function validateBusinessEngineInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || b.name.trim() === "") {
    return { ok: false, error: "name must be a non-empty string" };
  }
  if (typeof b.description !== "string" || b.description.trim() === "") {
    return { ok: false, error: "description must be a non-empty string" };
  }
  if (b.product_or_service !== null && typeof b.product_or_service !== "string") {
    return { ok: false, error: "product_or_service must be a string or null" };
  }
  if (!isEnumValue(RevenueRole, b.revenue_role)) {
    return { ok: false, error: "revenue_role is not a valid RevenueRole" };
  }
  if (!isEnumValue(LifecycleStage, b.lifecycle_stage)) {
    return { ok: false, error: "lifecycle_stage is not a valid LifecycleStage" };
  }
  if (!isEnumValue(EngineTrend, b.trend)) {
    return { ok: false, error: "trend is not a valid EngineTrend" };
  }
  if (!isEnumValue(EngineConfidence, b.confidence)) {
    return { ok: false, error: "confidence is not a valid EngineConfidence" };
  }
  if (!Array.isArray(b.customer_segment) || !b.customer_segment.every((s) => isEnumValue(CustomerSegment, s))) {
    return { ok: false, error: "customer_segment must be an array of valid CustomerSegment values" };
  }
  if (!Array.isArray(b.monetization_model) || !b.monetization_model.every((m) => isEnumValue(MonetizationModel, m))) {
    return { ok: false, error: "monetization_model must be an array of valid MonetizationModel values" };
  }
  if (!Array.isArray(b.evidence) || !b.evidence.every(isValidEvidence)) {
    return { ok: false, error: "evidence must be an array of valid evidence entries" };
  }

  return {
    ok: true,
    value: {
      name: b.name.trim(),
      description: b.description.trim(),
      customer_segment: b.customer_segment as CustomerSegment[],
      product_or_service: (b.product_or_service as string | null) ?? null,
      monetization_model: b.monetization_model as MonetizationModel[],
      revenue_role: b.revenue_role as RevenueRole,
      lifecycle_stage: b.lifecycle_stage as LifecycleStage,
      trend: b.trend as EngineTrend,
      confidence: b.confidence as EngineConfidence,
      evidence: b.evidence as BusinessEngineEvidence[],
    },
  };
}
```

同时给现有 `getBusinessEngines` 的 SELECT 补上新字段（找到）：
```typescript
  const rows = await sql<BusinessEngine[]>`
    select
      id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at
    from business_engines
```

改为：
```typescript
  const rows = await sql<BusinessEngine[]>`
    select
      id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at, is_manually_edited
    from business_engines
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --test-name-pattern="validateBusinessEngineInput"`
Expected: PASS，4 个测试全部通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/company-research.ts src/lib/company-research.test.ts
git commit -m "feat(web-zh): add validateBusinessEngineInput and expose is_manually_edited"
```

---

## Task 4: 增删改数据库函数 — `updateBusinessEngine` / `createBusinessEngine` / `deleteBusinessEngine`

**Files:**
- Modify: `src/lib/company-research.ts`
- Test: `src/lib/company-research.test.ts`

**Interfaces:**
- Consumes: `validateBusinessEngineInput`（Task 3 产出，同文件内）；`BusinessEngineInput`/`BusinessEngine`（`@/types`）；`findCompanyId`（文件内现有私有函数）
- Produces: `updateBusinessEngine(ticker: string, engineId: string, input: BusinessEngineInput): Promise<BusinessEngine | null>`；`createBusinessEngine(ticker: string, input: BusinessEngineInput): Promise<BusinessEngine | null>`；`deleteBusinessEngine(ticker: string, engineId: string): Promise<boolean>`，供 Task 5 的 API route 使用

- [ ] **Step 1: 在 `src/lib/company-research.test.ts` 追加 import 和测试**

在 import 列表追加三个函数：
```typescript
import {
  getInvestmentRationale,
  saveInvestmentRationale,
  getTimelineEvents,
  createTimelineEvent,
  deleteTimelineEvent,
  validateBusinessEngineInput,
  getBusinessEngines,
  updateBusinessEngine,
  createBusinessEngine,
  deleteBusinessEngine,
} from "./company-research";
```

在文件末尾追加测试：
```typescript
const BUSINESS_ENGINE_TICKER = "TESTBEEDIT";

test("createBusinessEngine 新增一条引擎，is_manually_edited 为 true", async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${BUSINESS_ENGINE_TICKER}, ${"测试公司-BusinessEngineEdit"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;

  const created = await createBusinessEngine(BUSINESS_ENGINE_TICKER, {
    name: "Azure",
    description: "云服务收入",
    customer_segment: ["ENTERPRISE"],
    product_or_service: "Cloud Infrastructure",
    monetization_model: ["USAGE_BASED"],
    revenue_role: "CORE" as never,
    lifecycle_stage: "SCALING" as never,
    trend: "STABLE" as never,
    confidence: "HIGH" as never,
    evidence: [],
  });

  assert.ok(created);
  assert.equal(created?.name, "Azure");
  assert.equal(created?.is_manually_edited, true);

  const engines = await getBusinessEngines(BUSINESS_ENGINE_TICKER);
  assert.equal(engines.length, 1);

  await sql`delete from companies where ticker = ${BUSINESS_ENGINE_TICKER}`;
});

test("createBusinessEngine 同名再次调用时 upsert 覆盖同一条记录，追加一条 MANUAL_EDIT snapshot", async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${BUSINESS_ENGINE_TICKER}, ${"测试公司-BusinessEngineEdit"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;

  const first = await createBusinessEngine(BUSINESS_ENGINE_TICKER, {
    name: "Azure",
    description: "第一版描述",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE" as never,
    lifecycle_stage: "SCALING" as never,
    trend: "STABLE" as never,
    confidence: "HIGH" as never,
    evidence: [],
  });
  const second = await createBusinessEngine(BUSINESS_ENGINE_TICKER, {
    name: "Azure",
    description: "第二版描述",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE" as never,
    lifecycle_stage: "SCALING" as never,
    trend: "STABLE" as never,
    confidence: "HIGH" as never,
    evidence: [],
  });

  assert.equal(first?.id, second?.id, "同名应更新同一条记录");
  assert.equal(second?.description, "第二版描述");

  const snapshots = await sql`
    select change_type from business_engine_snapshots where business_engine_id = ${second!.id}
  `;
  assert.equal(snapshots.length, 2, "两次 createBusinessEngine 各追加一条 snapshot");
  assert.ok(snapshots.every((s: { change_type: string }) => s.change_type === "MANUAL_EDIT"));

  await sql`delete from companies where ticker = ${BUSINESS_ENGINE_TICKER}`;
});

test("updateBusinessEngine 编辑已有引擎并追加 MANUAL_EDIT snapshot", async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${BUSINESS_ENGINE_TICKER}, ${"测试公司-BusinessEngineEdit"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;

  const created = await createBusinessEngine(BUSINESS_ENGINE_TICKER, {
    name: "Azure",
    description: "原始描述",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE" as never,
    lifecycle_stage: "SCALING" as never,
    trend: "STABLE" as never,
    confidence: "HIGH" as never,
    evidence: [],
  });

  const updated = await updateBusinessEngine(BUSINESS_ENGINE_TICKER, created!.id, {
    name: "Azure",
    description: "编辑后的描述",
    customer_segment: ["ENTERPRISE"],
    product_or_service: "Cloud Infrastructure",
    monetization_model: ["USAGE_BASED"],
    revenue_role: "MAJOR" as never,
    lifecycle_stage: "SCALING" as never,
    trend: "UP" as never,
    confidence: "MEDIUM" as never,
    evidence: [],
  });

  assert.equal(updated?.description, "编辑后的描述");
  assert.equal(updated?.revenue_role, "MAJOR");
  assert.equal(updated?.is_manually_edited, true);

  await sql`delete from companies where ticker = ${BUSINESS_ENGINE_TICKER}`;
});

test("updateBusinessEngine 对不存在的 engineId 返回 null", async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${BUSINESS_ENGINE_TICKER}, ${"测试公司-BusinessEngineEdit"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;

  const result = await updateBusinessEngine(
    BUSINESS_ENGINE_TICKER,
    "00000000-0000-0000-0000-000000000000",
    {
      name: "Azure",
      description: "描述",
      customer_segment: [],
      product_or_service: null,
      monetization_model: [],
      revenue_role: "CORE" as never,
      lifecycle_stage: "SCALING" as never,
      trend: "STABLE" as never,
      confidence: "HIGH" as never,
      evidence: [],
    }
  );

  assert.equal(result, null);
  await sql`delete from companies where ticker = ${BUSINESS_ENGINE_TICKER}`;
});

test("deleteBusinessEngine 删除已有引擎返回 true，且级联清除 snapshot", async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${BUSINESS_ENGINE_TICKER}, ${"测试公司-BusinessEngineEdit"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;

  const created = await createBusinessEngine(BUSINESS_ENGINE_TICKER, {
    name: "Azure",
    description: "待删除",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE" as never,
    lifecycle_stage: "SCALING" as never,
    trend: "STABLE" as never,
    confidence: "HIGH" as never,
    evidence: [],
  });

  const deleted = await deleteBusinessEngine(BUSINESS_ENGINE_TICKER, created!.id);
  assert.equal(deleted, true);

  const engines = await getBusinessEngines(BUSINESS_ENGINE_TICKER);
  assert.equal(engines.length, 0);

  const snapshots = await sql`
    select id from business_engine_snapshots where business_engine_id = ${created!.id}
  `;
  assert.equal(snapshots.length, 0, "级联删除应清空该引擎的历史快照");

  await sql`delete from companies where ticker = ${BUSINESS_ENGINE_TICKER}`;
});

test("deleteBusinessEngine 对不存在的 engineId 返回 false", async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${BUSINESS_ENGINE_TICKER}, ${"测试公司-BusinessEngineEdit"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;

  const deleted = await deleteBusinessEngine(
    BUSINESS_ENGINE_TICKER,
    "00000000-0000-0000-0000-000000000000"
  );
  assert.equal(deleted, false);

  await sql`delete from companies where ticker = ${BUSINESS_ENGINE_TICKER}`;
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="BusinessEngine"`
Expected: FAIL，报错 `updateBusinessEngine is not a function`（或类似 import 报错）

- [ ] **Step 3: 在 `src/lib/company-research.ts` 末尾追加三个函数**

```typescript
export async function updateBusinessEngine(
  ticker: string,
  engineId: string,
  input: BusinessEngineInput
): Promise<BusinessEngine | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [engine] = await sql<BusinessEngine[]>`
    update business_engines set
      name = ${input.name},
      description = ${input.description},
      customer_segment = ${input.customer_segment},
      product_or_service = ${input.product_or_service},
      monetization_model = ${input.monetization_model},
      revenue_role = ${input.revenue_role},
      lifecycle_stage = ${input.lifecycle_stage},
      trend = ${input.trend},
      confidence = ${input.confidence},
      evidence = ${sql.json(input.evidence)},
      is_manually_edited = true,
      last_verified_at = now(),
      updated_at = now()
    where id = ${engineId} and company_id = ${companyId}
    returning id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at, is_manually_edited
  `;
  if (!engine) return null;

  await sql`
    insert into business_engine_snapshots (
      business_engine_id, company_id, analysis_result_id, revenue_role,
      lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
    ) values (
      ${engine.id}, ${companyId}, null, ${input.revenue_role},
      ${input.lifecycle_stage}, ${input.trend}, ${input.confidence},
      'MANUAL_EDIT', '人工编辑', ${sql.json(input.evidence)}
    )
  `;
  return engine;
}

export async function createBusinessEngine(
  ticker: string,
  input: BusinessEngineInput
): Promise<BusinessEngine | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [engine] = await sql<BusinessEngine[]>`
    insert into business_engines (
      company_id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, is_manually_edited, last_verified_at, updated_at
    ) values (
      ${companyId}, ${input.name}, ${input.description}, ${input.customer_segment},
      ${input.product_or_service}, ${input.monetization_model}, ${input.revenue_role},
      ${input.lifecycle_stage}, ${input.trend}, ${input.confidence},
      ${sql.json(input.evidence)}, true, now(), now()
    )
    on conflict (company_id, name) do update set
      description = excluded.description,
      customer_segment = excluded.customer_segment,
      product_or_service = excluded.product_or_service,
      monetization_model = excluded.monetization_model,
      revenue_role = excluded.revenue_role,
      lifecycle_stage = excluded.lifecycle_stage,
      trend = excluded.trend,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      is_manually_edited = true,
      last_verified_at = now(),
      updated_at = now()
    returning id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at, is_manually_edited
  `;

  await sql`
    insert into business_engine_snapshots (
      business_engine_id, company_id, analysis_result_id, revenue_role,
      lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
    ) values (
      ${engine.id}, ${companyId}, null, ${input.revenue_role},
      ${input.lifecycle_stage}, ${input.trend}, ${input.confidence},
      'MANUAL_EDIT', '人工新增', ${sql.json(input.evidence)}
    )
  `;
  return engine;
}

export async function deleteBusinessEngine(
  ticker: string,
  engineId: string
): Promise<boolean> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return false;

  const sql = getDb();
  const rows = await sql`
    delete from business_engines
    where id = ${engineId} and company_id = ${companyId}
    returning id
  `;
  return rows.length > 0;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --test-name-pattern="BusinessEngine"`
Expected: PASS，全部 6 个测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/company-research.ts src/lib/company-research.test.ts
git commit -m "feat(web-zh): add create/update/delete business engine functions"
```

---

## Task 5: API Routes — POST 新增、PUT 编辑、DELETE 删除

**Files:**
- Modify: `src/app/api/stocks/[ticker]/business-engines/route.ts`
- Test: `src/app/api/stocks/[ticker]/business-engines/route.test.ts` (new)
- Create: `src/app/api/stocks/[ticker]/business-engines/[engineId]/route.ts`
- Test: `src/app/api/stocks/[ticker]/business-engines/[engineId]/route.test.ts` (new)

**Interfaces:**
- Consumes: `getBusinessEngines`/`createBusinessEngine`/`updateBusinessEngine`/`deleteBusinessEngine`/`validateBusinessEngineInput`（Task 3/4 产出，从 `@/lib/company-research`）
- Produces: `POST /api/stocks/[ticker]/business-engines`（201 成功 / 400 校验失败）；`PUT /api/stocks/[ticker]/business-engines/[engineId]`（200 成功 / 400 校验失败 / 404 未找到）；`DELETE /api/stocks/[ticker]/business-engines/[engineId]`（200 成功 / 404 未找到），供 Task 6 前端组件调用

- [ ] **Step 1: 创建 `route.test.ts`（GET/POST 用例）**

```typescript
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET, POST } from "./route";

const TEST_TICKER = "TESTBEAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-BusinessEnginesAPI"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function fakeParams(ticker: string) {
  return { params: Promise.resolve({ ticker }) };
}

function fakeRequest(body: unknown) {
  return { json: async () => body } as never;
}

test("GET 在没有记录时返回 success:true, data:[]", async () => {
  const res = await GET({} as never, fakeParams(TEST_TICKER));
  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data, []);
});

test("POST 缺少 name 时返回 400", async () => {
  const res = await POST(
    fakeRequest({
      description: "描述",
      customer_segment: [],
      product_or_service: null,
      monetization_model: [],
      revenue_role: "CORE",
      lifecycle_stage: "SCALING",
      trend: "STABLE",
      confidence: "HIGH",
      evidence: [],
    }),
    fakeParams(TEST_TICKER)
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("POST 非法 revenue_role 时返回 400", async () => {
  const res = await POST(
    fakeRequest({
      name: "Azure",
      description: "描述",
      customer_segment: [],
      product_or_service: null,
      monetization_model: [],
      revenue_role: "NOT_REAL",
      lifecycle_stage: "SCALING",
      trend: "STABLE",
      confidence: "HIGH",
      evidence: [],
    }),
    fakeParams(TEST_TICKER)
  );
  assert.equal(res.status, 400);
});

test("POST 成功创建后返回 201，且 GET 能读到该引擎", async () => {
  const res = await POST(
    fakeRequest({
      name: "Azure",
      description: "云服务收入",
      customer_segment: ["ENTERPRISE"],
      product_or_service: "Cloud Infrastructure",
      monetization_model: ["USAGE_BASED"],
      revenue_role: "CORE",
      lifecycle_stage: "SCALING",
      trend: "STABLE",
      confidence: "HIGH",
      evidence: [],
    }),
    fakeParams(TEST_TICKER)
  );
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.name, "Azure");

  const getRes = await GET({} as never, fakeParams(TEST_TICKER));
  const getBody = await getRes.json();
  assert.equal(getBody.data.length, 1);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="POST"`
Expected: FAIL，`POST is not exported` 或类似 import 报错

- [ ] **Step 3: 修改 `route.ts` 新增 POST handler**

现有文件：
```typescript
import { NextRequest, NextResponse } from "next/server";
import { getBusinessEngines } from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getBusinessEngines(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}
```

改为：
```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessEngines,
  createBusinessEngine,
  validateBusinessEngineInput,
} from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getBusinessEngines(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBusinessEngineInput(body);
  if (!validated.ok) {
    return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
  }

  const data = await createBusinessEngine(ticker.toUpperCase(), validated.value);
  if (!data) {
    return NextResponse.json(
      { success: false, error: `Company not found: ${ticker}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data }, { status: 201 });
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --test-name-pattern="POST"`
Expected: PASS

- [ ] **Step 5: 创建 `[engineId]/route.test.ts`（PUT/DELETE 用例）**

```typescript
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { createBusinessEngine } from "@/lib/company-research";
import { PUT, DELETE } from "./route";

const TEST_TICKER = "TESTBEIDAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-BusinessEngineIdAPI"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function fakeParams(ticker: string, engineId: string) {
  return { params: Promise.resolve({ ticker, engineId }) };
}

function fakeRequest(body: unknown) {
  return { json: async () => body } as never;
}

const VALID_INPUT = {
  name: "Azure",
  description: "云服务收入",
  customer_segment: ["ENTERPRISE"],
  product_or_service: "Cloud Infrastructure",
  monetization_model: ["USAGE_BASED"],
  revenue_role: "CORE",
  lifecycle_stage: "SCALING",
  trend: "STABLE",
  confidence: "HIGH",
  evidence: [],
};

test("PUT 对存在的引擎返回 200 并更新内容", async () => {
  const created = await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);

  const res = await PUT(
    fakeRequest({ ...VALID_INPUT, description: "更新后的描述" }),
    fakeParams(TEST_TICKER, created!.id)
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.description, "更新后的描述");
});

test("PUT 对不存在的 engineId 返回 404", async () => {
  const res = await PUT(
    fakeRequest(VALID_INPUT),
    fakeParams(TEST_TICKER, "00000000-0000-0000-0000-000000000000")
  );
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("PUT 校验失败时返回 400", async () => {
  const created = await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);

  const res = await PUT(
    fakeRequest({ ...VALID_INPUT, name: "" }),
    fakeParams(TEST_TICKER, created!.id)
  );
  assert.equal(res.status, 400);
});

test("DELETE 对存在的引擎返回 200", async () => {
  const created = await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);

  const res = await DELETE({} as never, fakeParams(TEST_TICKER, created!.id));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

test("DELETE 对不存在的 engineId 返回 404", async () => {
  const res = await DELETE(
    {} as never,
    fakeParams(TEST_TICKER, "00000000-0000-0000-0000-000000000000")
  );
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});
```

- [ ] **Step 6: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="PUT|DELETE"`
Expected: FAIL，文件不存在报错

- [ ] **Step 7: 创建 `[engineId]/route.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";
import {
  updateBusinessEngine,
  deleteBusinessEngine,
  validateBusinessEngineInput,
} from "@/lib/company-research";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string; engineId: string }> }
) {
  const { ticker, engineId } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBusinessEngineInput(body);
  if (!validated.ok) {
    return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
  }

  const data = await updateBusinessEngine(ticker.toUpperCase(), engineId, validated.value);
  if (!data) {
    return NextResponse.json(
      { success: false, error: `Engine not found: ${engineId}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string; engineId: string }> }
) {
  const { ticker, engineId } = await params;

  const deleted = await deleteBusinessEngine(ticker.toUpperCase(), engineId);
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: `Engine not found: ${engineId}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}
```

- [ ] **Step 8: 运行测试确认通过**

Run: `npm test`
Expected: PASS，全部测试通过（含此前 Task 1-4 的测试）

- [ ] **Step 9: Commit**

```bash
git add src/app/api/stocks/\[ticker\]/business-engines/
git commit -m "feat(web-zh): add POST/PUT/DELETE routes for business engines"
```

---

## Task 6: Python upsert 订阅器感知人工锁定

**Files:**
- Modify: `src/lib/analysis-subscribers/write-business-engine.ts`
- Test: `src/lib/analysis-subscribers/write-business-engine.test.ts`

**Interfaces:**
- Consumes: `business_engines.is_manually_edited`（Task 1 迁移产出的列）；`detectChange`（`../business-engine-diff`，现有不变）
- Produces: 无新增导出——本任务只改内部行为，验证点是数据库最终状态

- [ ] **Step 1: 在 `write-business-engine.test.ts` 追加锁定场景测试**

在文件末尾追加（复用现有 `createTestCompany`/`createTestAnalysisResult`/`makeEvent` 辅助函数）：

```typescript
test("write-business-engine 订阅者跳过已人工锁定的引擎主表更新，但仍追加 snapshot", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("LOCKED");
  const firstAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-locked-1");

  await emit(
    "analysis.completed",
    makeEvent(companyId, firstAnalysisId, "test-session-wbe-locked-1", [
      {
        name: "Azure",
        description: "AI 写入的描述",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "CORE",
        lifecycle_stage: "SCALING",
        trend: "STABLE",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const [engine] = await sql<{ id: string }[]>`
    select id from business_engines where company_id = ${companyId} and name = 'Azure'
  `;
  await sql`
    update business_engines set description = ${"人工修改后的描述"}, is_manually_edited = true
    where id = ${engine.id}
  `;

  const secondAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-locked-2");
  await emit(
    "analysis.completed",
    makeEvent(companyId, secondAnalysisId, "test-session-wbe-locked-2", [
      {
        name: "Azure",
        description: "AI 第二次写入的描述",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "MAJOR",
        lifecycle_stage: "SCALING",
        trend: "DOWN",
        confidence: "LOW",
        evidence: [],
      },
    ])
  );

  const [afterSecondRun] = await sql<{ description: string; revenue_role: string; is_manually_edited: boolean }[]>`
    select description, revenue_role, is_manually_edited from business_engines where id = ${engine.id}
  `;
  assert.equal(afterSecondRun.description, "人工修改后的描述", "主表不应被 AI 第二次分析覆盖");
  assert.equal(afterSecondRun.revenue_role, "CORE", "主表 revenue_role 不应被覆盖");
  assert.equal(afterSecondRun.is_manually_edited, true);

  const snapshots = await sql<{ change_type: string; analysis_result_id: string | null }[]>`
    select change_type, analysis_result_id from business_engine_snapshots
    where business_engine_id = ${engine.id} and analysis_result_id = ${secondAnalysisId}
  `;
  assert.equal(snapshots.length, 1, "锁定状态下仍应追加一条 snapshot");
  assert.equal(snapshots[0].analysis_result_id, secondAnalysisId);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- --test-name-pattern="write-business-engine"`
Expected: FAIL——锁定场景测试断言主表未被覆盖会失败，因为当前实现无条件 upsert

- [ ] **Step 3: 修改 `write-business-engine.ts` 加锁定判断**

将现有：
```typescript
  for (const item of scan) {
    const previous = existingByName.get(item.name) ?? null;
    const { changeType, reason } = detectChange(previous, item as ExtractedBusinessEngine, companyHasBaseline);

    const [engine] = await sql`
      insert into business_engines (
```

改为：
```typescript
  for (const item of scan) {
    const previous = existingByName.get(item.name) ?? null;
    const { changeType, reason } = detectChange(previous, item as ExtractedBusinessEngine, companyHasBaseline);

    if (previous?.is_manually_edited) {
      // 整行锁定：不覆盖人工修改的主表数据，但仍追加快照，
      // 保留"AI 本次分析认为该引擎发生了什么变化"这条历史记录。
      await sql`
        insert into business_engine_snapshots (
          business_engine_id, company_id, analysis_result_id, revenue_role,
          lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
        ) values (
          ${previous.id}, ${event.companyId}, ${event.analysisResultId}, ${item.revenue_role},
          ${item.lifecycle_stage}, ${item.trend}, ${item.confidence}, ${changeType},
          ${`${reason}（已人工锁定，主表未更新）`}, ${sql.json(item.evidence)}
        )
      `;
      continue;
    }

    const [engine] = await sql`
      insert into business_engines (
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- --test-name-pattern="write-business-engine"`
Expected: PASS，全部测试通过

- [ ] **Step 5: Commit**

```bash
git add src/lib/analysis-subscribers/write-business-engine.ts src/lib/analysis-subscribers/write-business-engine.test.ts
git commit -m "feat(web-zh): skip AI upsert for manually-locked business engines"
```

---

## Task 7: 前端文案扩展

**Files:**
- Modify: `src/content/business-engine.ts`

**Interfaces:**
- Consumes: 无
- Produces: `BUSINESS_ENGINE_TEXT` 新增字段（`editButton`, `deleteButton`, `saveButton`, `savingButton`, `cancelButton`, `addEngineButton`, `manuallyEditedBadge`, `deleteConfirm`, `fieldLabels`, `placeholders`, `validationErrors`），供 Task 8 组件使用

- [ ] **Step 1: 修改 `BUSINESS_ENGINE_TEXT` 对象**

找到现有：
```typescript
export const BUSINESS_ENGINE_TEXT = {
  sectionTitle: "商业引擎",
  cardTitle: "赚钱路数追踪",
  emptyTitle: "尚未建立业务基线",
  emptySubtitle: "运行首次分析后自动生成 Business Engine",
  expandLabel: "查看详情与证据",
  collapseLabel: "收起",
  customerSegmentLabel: "客户群体",
  productOrServiceLabel: "产品 / 服务",
  monetizationModelLabel: "变现模式",
  confidenceLabel: "置信度",
  evidenceLabel: "证据",
  evidenceSourceTypeLabels: {
    news: "新闻",
    financial_statement: "财报",
  } as Record<"news" | "financial_statement", string>,
  evidenceDirectionLabels: {
    POSITIVE: "正面",
    NEGATIVE: "负面",
    NEUTRAL: "中性",
  } as Record<"POSITIVE" | "NEGATIVE" | "NEUTRAL", string>,
} as const;
```

改为：
```typescript
export const BUSINESS_ENGINE_TEXT = {
  sectionTitle: "商业引擎",
  cardTitle: "赚钱路数追踪",
  emptyTitle: "尚未建立业务基线",
  emptySubtitle: "运行首次分析后自动生成 Business Engine",
  expandLabel: "查看详情与证据",
  collapseLabel: "收起",
  customerSegmentLabel: "客户群体",
  productOrServiceLabel: "产品 / 服务",
  monetizationModelLabel: "变现模式",
  confidenceLabel: "置信度",
  evidenceLabel: "证据",
  evidenceSourceTypeLabels: {
    news: "新闻",
    financial_statement: "财报",
  } as Record<"news" | "financial_statement", string>,
  evidenceDirectionLabels: {
    POSITIVE: "正面",
    NEGATIVE: "负面",
    NEUTRAL: "中性",
  } as Record<"POSITIVE" | "NEGATIVE" | "NEUTRAL", string>,
  editButton: "编辑",
  deleteButton: "删除",
  saveButton: "保存",
  savingButton: "保存中...",
  cancelButton: "取消",
  addEngineButton: "新增引擎",
  addEngineTitle: "新建商业引擎",
  manuallyEditedBadge: "人工修改",
  deleteConfirm: (name: string) =>
    `确定删除这个商业引擎吗？\n\n${name}\n\n删除后该引擎的历史记录也将一同清除。`,
  fieldLabels: {
    name: "引擎名称",
    description: "描述",
    productOrService: "产品 / 服务",
    revenueRole: "营收角色",
    lifecycleStage: "生命周期阶段",
    trend: "趋势",
    confidence: "置信度",
    customerSegment: "客户群体",
    monetizationModel: "变现模式",
    evidence: "证据（JSON 数组）",
  },
  placeholders: {
    name: "如：云计算服务、广告平台",
    description: "简要说明该业务的核心模式和定位",
    productOrService: "如：Cloud Infrastructure",
    evidence: '[{"source":"...","source_type":"news","date":"2026-01-01","claim":"...","direction":"POSITIVE","confidence":"MEDIUM"}]',
  },
  validationErrors: {
    nameRequired: "引擎名称不能为空",
    descriptionRequired: "描述不能为空",
    evidenceInvalidJson: "证据格式不正确，需为合法 JSON 数组",
    saveFailed: "保存失败，请重试",
    deleteFailed: "删除失败，请重试",
  },
} as const;
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增报错

- [ ] **Step 3: Commit**

```bash
git add src/content/business-engine.ts
git commit -m "feat(web-zh): add edit/add/delete copy for business engine section"
```

---

## Task 8: 前端组件 — 编辑/新增/删除表单

**Files:**
- Modify: `src/components/stock/business-engines.tsx`

**Interfaces:**
- Consumes: `BUSINESS_ENGINE_TEXT`（Task 7 产出）；`BusinessEngine.is_manually_edited`（Task 2 产出）；`ENGINE_TREND_LABELS`/`REVENUE_ROLE_LABELS`/`LIFECYCLE_STAGE_LABELS`/`CUSTOMER_SEGMENT_LABELS`/`MONETIZATION_MODEL_LABELS`/`ENGINE_CONFIDENCE_LABELS`（现有，`../../content/business-engine`）；`POST`/`PUT`/`DELETE /api/stocks/[ticker]/business-engines[/[engineId]]`（Task 5 产出）
- Produces: 无新导出——本任务只改这一个组件文件的内部实现，`BusinessEnginesSection` 的导出签名不变（仍是 `{ ticker }: Props`）

项目当前无 `.tsx` 组件测试基建（未配置 jsdom/testing-library），本任务不新增单测，改为 Task 9 手动浏览器验证覆盖交互路径。

- [ ] **Step 1: 用以下内容整体替换 `src/components/stock/business-engines.tsx`**

文件顶部（import 和类型定义）：
```typescript
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown, ChevronRight, Pencil, Trash2, Plus,
} from "lucide-react";
import { BusinessEngine } from "../../types";
import {
  RevenueRole, LifecycleStage, EngineTrend, EngineConfidence, CustomerSegment, MonetizationModel,
} from "../../types/enums";
import {
  REVENUE_ROLE_LABELS,
  LIFECYCLE_STAGE_LABELS,
  CUSTOMER_SEGMENT_LABELS,
  MONETIZATION_MODEL_LABELS,
  ENGINE_CONFIDENCE_LABELS,
  ENGINE_TREND_LABELS,
  BUSINESS_ENGINE_TEXT,
} from "../../content/business-engine";

interface Props {
  ticker: string;
}

interface EngineDraft {
  name: string;
  description: string;
  customer_segment: CustomerSegment[];
  product_or_service: string;
  monetization_model: MonetizationModel[];
  revenue_role: RevenueRole;
  lifecycle_stage: LifecycleStage;
  trend: EngineTrend;
  confidence: EngineConfidence;
  evidenceText: string;
}

const ROLE_ORDER = [
  RevenueRole.CORE,
  RevenueRole.MAJOR,
  RevenueRole.EMERGING,
  RevenueRole.EXPERIMENTAL,
  RevenueRole.DECLINING,
  RevenueRole.UNKNOWN,
];

const EMPTY_DRAFT: EngineDraft = {
  name: "",
  description: "",
  customer_segment: [],
  product_or_service: "",
  monetization_model: [],
  revenue_role: RevenueRole.UNKNOWN,
  lifecycle_stage: LifecycleStage.UNKNOWN,
  trend: EngineTrend.UNKNOWN,
  confidence: EngineConfidence.LOW,
  evidenceText: "[]",
};

function draftFromEngine(engine: BusinessEngine): EngineDraft {
  return {
    name: engine.name,
    description: engine.description,
    customer_segment: engine.customer_segment,
    product_or_service: engine.product_or_service ?? "",
    monetization_model: engine.monetization_model,
    revenue_role: engine.revenue_role,
    lifecycle_stage: engine.lifecycle_stage,
    trend: engine.trend,
    confidence: engine.confidence,
    evidenceText: JSON.stringify(engine.evidence, null, 2),
  };
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function TrendIcon({ trend }: { trend: EngineTrend }) {
  if (trend === EngineTrend.UP) return <TrendingUp className="w-3.5 h-3.5 text-[var(--green)]" />;
  if (trend === EngineTrend.DOWN) return <TrendingDown className="w-3.5 h-3.5 text-[var(--red)]" />;
  return <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]/40" />;
}

const inputClass =
  "w-full rounded-lg border border-[var(--border-custom)] bg-[var(--panel2)]/60 px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/40";
```

`EngineForm` 组件（编辑和新增共用同一套字段渲染）：
```typescript
function EngineForm({
  draft,
  onChange,
  onSave,
  onCancel,
  onDelete,
  isSaving,
  error,
}: {
  draft: EngineDraft;
  onChange: (draft: EngineDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.name}
        </label>
        <input
          className={inputClass}
          value={draft.name}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.description}
        </label>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={draft.description}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.productOrService}
        </label>
        <input
          className={inputClass}
          value={draft.product_or_service}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.productOrService}
          onChange={(e) => onChange({ ...draft, product_or_service: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.revenueRole}
          </label>
          <select
            className={inputClass}
            value={draft.revenue_role}
            onChange={(e) => onChange({ ...draft, revenue_role: e.target.value as RevenueRole })}
          >
            {Object.values(RevenueRole).map((v) => (
              <option key={v} value={v}>{REVENUE_ROLE_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.lifecycleStage}
          </label>
          <select
            className={inputClass}
            value={draft.lifecycle_stage}
            onChange={(e) => onChange({ ...draft, lifecycle_stage: e.target.value as LifecycleStage })}
          >
            {Object.values(LifecycleStage).map((v) => (
              <option key={v} value={v}>{LIFECYCLE_STAGE_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.trend}
          </label>
          <select
            className={inputClass}
            value={draft.trend}
            onChange={(e) => onChange({ ...draft, trend: e.target.value as EngineTrend })}
          >
            {Object.values(EngineTrend).map((v) => (
              <option key={v} value={v}>{ENGINE_TREND_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.confidence}
          </label>
          <select
            className={inputClass}
            value={draft.confidence}
            onChange={(e) => onChange({ ...draft, confidence: e.target.value as EngineConfidence })}
          >
            {Object.values(EngineConfidence).map((v) => (
              <option key={v} value={v}>{ENGINE_CONFIDENCE_LABELS[v]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.customerSegment}
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.values(CustomerSegment).map((v) => (
            <label key={v} className="flex items-center gap-1 text-[11px] text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={draft.customer_segment.includes(v)}
                onChange={() =>
                  onChange({ ...draft, customer_segment: toggleInArray(draft.customer_segment, v) })
                }
              />
              {CUSTOMER_SEGMENT_LABELS[v]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.monetizationModel}
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.values(MonetizationModel).map((v) => (
            <label key={v} className="flex items-center gap-1 text-[11px] text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={draft.monetization_model.includes(v)}
                onChange={() =>
                  onChange({ ...draft, monetization_model: toggleInArray(draft.monetization_model, v) })
                }
              />
              {MONETIZATION_MODEL_LABELS[v]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.evidence}
        </label>
        <textarea
          className={`${inputClass} min-h-[88px] resize-y font-mono`}
          value={draft.evidenceText}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.evidence}
          onChange={(e) => onChange({ ...draft, evidenceText: e.target.value })}
        />
      </div>

      {error && <p className="text-[11px] text-[var(--red)]">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20 transition-colors disabled:opacity-50"
        >
          {isSaving ? BUSINESS_ENGINE_TEXT.savingButton : BUSINESS_ENGINE_TEXT.saveButton}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {BUSINESS_ENGINE_TEXT.cancelButton}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isSaving}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            {BUSINESS_ENGINE_TEXT.deleteButton}
          </button>
        )}
      </div>
    </div>
  );
}
```

`EngineCard` 组件（只读展示 + 编辑态切换 + 人工修改角标）：
```typescript
function EngineCard({
  engine,
  ticker,
  editingId,
  setEditingId,
  queryKey,
}: {
  engine: BusinessEngine;
  ticker: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  queryKey: unknown[];
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<EngineDraft>(() => draftFromEngine(engine));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingId === engine.id;

  const startEditing = () => {
    setDraft(draftFromEngine(engine));
    setError(null);
    setEditingId(engine.id);
    setExpanded(true);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setError(null);
  };

  const save = async () => {
    if (draft.name.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.nameRequired);
      return;
    }
    if (draft.description.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.descriptionRequired);
      return;
    }
    let evidence;
    try {
      evidence = JSON.parse(draft.evidenceText);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.evidenceInvalidJson);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/business-engines/${engine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          customer_segment: draft.customer_segment,
          product_or_service: draft.product_or_service.trim() || null,
          monetization_model: draft.monetization_model,
          revenue_role: draft.revenue_role,
          lifecycle_stage: draft.lifecycle_stage,
          trend: draft.trend,
          confidence: draft.confidence,
          evidence,
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setEditingId(null);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(BUSINESS_ENGINE_TEXT.deleteConfirm(engine.name))) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/stocks/${ticker}/business-engines/${engine.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? BUSINESS_ENGINE_TEXT.validationErrors.deleteFailed);
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setEditingId(null);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.deleteFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {engine.name}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--panel2)]/60 text-[var(--text-secondary)]">
            {REVENUE_ROLE_LABELS[engine.revenue_role]}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)]/60">
            {LIFECYCLE_STAGE_LABELS[engine.lifecycle_stage]}
          </span>
          <TrendIcon trend={engine.trend} />
          {engine.is_manually_edited && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--blue)]/10 text-[var(--blue)]">
              {BUSINESS_ENGINE_TEXT.manuallyEditedBadge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        )}
      </button>

      {!isEditing && (
        <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {engine.description}
        </p>
      )}

      {expanded && isEditing && (
        <div className="mt-3">
          <EngineForm
            draft={draft}
            onChange={setDraft}
            onSave={save}
            onCancel={cancelEditing}
            onDelete={remove}
            isSaving={isSaving}
            error={error}
          />
        </div>
      )}

      {expanded && !isEditing && (
        <div className="mt-3 space-y-2 text-[11px]">
          <div>
            <span className="text-[var(--text-secondary)]/60 mr-2">
              {BUSINESS_ENGINE_TEXT.customerSegmentLabel}
            </span>
            {engine.customer_segment.map((s) => (
              <span key={s} className="mr-1.5 text-[var(--text-primary)]">
                {CUSTOMER_SEGMENT_LABELS[s]}
              </span>
            ))}
          </div>
          {engine.product_or_service && (
            <div>
              <span className="text-[var(--text-secondary)]/60 mr-2">
                {BUSINESS_ENGINE_TEXT.productOrServiceLabel}
              </span>
              <span className="text-[var(--text-primary)]">{engine.product_or_service}</span>
            </div>
          )}
          <div>
            <span className="text-[var(--text-secondary)]/60 mr-2">
              {BUSINESS_ENGINE_TEXT.monetizationModelLabel}
            </span>
            {engine.monetization_model.map((m) => (
              <span key={m} className="mr-1.5 text-[var(--text-primary)]">
                {MONETIZATION_MODEL_LABELS[m]}
              </span>
            ))}
          </div>
          <div>
            <span className="text-[var(--text-secondary)]/60 mr-2">
              {BUSINESS_ENGINE_TEXT.confidenceLabel}
            </span>
            <span className="text-[var(--text-primary)]">
              {ENGINE_CONFIDENCE_LABELS[engine.confidence]}
            </span>
          </div>
          {engine.evidence.length > 0 && (
            <div>
              <div className="text-[var(--text-secondary)]/60 mb-1">
                {BUSINESS_ENGINE_TEXT.evidenceLabel}
              </div>
              <ul className="space-y-1">
                {engine.evidence.map((ev, i) => (
                  <li key={i} className="text-[var(--text-secondary)]">
                    {`${BUSINESS_ENGINE_TEXT.evidenceSourceTypeLabels[ev.source_type]} · ${ev.date} · ${ev.claim} (${BUSINESS_ENGINE_TEXT.evidenceDirectionLabels[ev.direction]})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {BUSINESS_ENGINE_TEXT.editButton}
          </button>
        </div>
      )}
    </div>
  );
}
```

`NewEngineCard` 组件（新增表单，独立于 `EngineCard`，因为没有 `engine` 对象可展示只读态）：
```typescript
function NewEngineCard({
  ticker,
  queryKey,
  onClose,
}: {
  ticker: string;
  queryKey: unknown[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<EngineDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (draft.name.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.nameRequired);
      return;
    }
    if (draft.description.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.descriptionRequired);
      return;
    }
    let evidence;
    try {
      evidence = JSON.parse(draft.evidenceText);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.evidenceInvalidJson);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/business-engines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          customer_segment: draft.customer_segment,
          product_or_service: draft.product_or_service.trim() || null,
          monetization_model: draft.monetization_model,
          revenue_role: draft.revenue_role,
          lifecycle_stage: draft.lifecycle_stage,
          trend: draft.trend,
          confidence: draft.confidence,
          evidence,
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
        return;
      }
      await qc.invalidateQueries({ queryKey });
      onClose();
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--blue)]/30 p-3">
      <div className="mb-2 text-[12px] font-semibold text-[var(--text-primary)]">
        {BUSINESS_ENGINE_TEXT.addEngineTitle}
      </div>
      <EngineForm
        draft={draft}
        onChange={setDraft}
        onSave={save}
        onCancel={onClose}
        isSaving={isSaving}
        error={error}
      />
    </div>
  );
}
```

`BusinessEnginesSection`（主导出组件，新增顶部"新增引擎"按钮 + 状态管理）：
```typescript
export function BusinessEnginesSection({ ticker }: Props) {
  const queryKey = ["stock-business-engines", ticker];
  const { data, isLoading } = useQuery<{ success: boolean; data: BusinessEngine[] }>({
    queryKey,
    queryFn: () => fetch(`/api/stocks/${ticker}/business-engines`).then((r) => r.json()),
    retry: false,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

  const engines = data?.data ?? [];
  const grouped = ROLE_ORDER
    .map((role) => ({ role, items: engines.filter((e) => e.revenue_role === role) }))
    .filter((g) => g.items.length > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
          {BUSINESS_ENGINE_TEXT.sectionTitle}
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {BUSINESS_ENGINE_TEXT.addEngineButton}
          </button>
        )}
      </div>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {BUSINESS_ENGINE_TEXT.cardTitle}
          </span>
        </div>

        {isAdding && (
          <div className="mb-4">
            <NewEngineCard ticker={ticker} queryKey={queryKey} onClose={() => setIsAdding(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : engines.length === 0 && !isAdding ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">
              {BUSINESS_ENGINE_TEXT.emptyTitle}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {BUSINESS_ENGINE_TEXT.emptySubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ role, items }) => (
              <div key={role}>
                <h3 className="text-[10px] font-semibold text-[var(--text-secondary)]/70 uppercase tracking-wide mb-2">
                  {REVENUE_ROLE_LABELS[role]}
                </h3>
                <div className="space-y-2">
                  {items.map((engine) => (
                    <EngineCard
                      key={engine.id}
                      engine={engine}
                      ticker={ticker}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      queryKey={queryKey}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无新增报错。若报错提示某个 import 未使用或类型不匹配，对照本步骤给出的完整文件内容检查是否有遗漏的字段名（比如 `ENGINE_TREND_LABELS` 是否已从 `../../content/business-engine` 正确导出——现有文件里已存在该常量，不需要新增）。

- [ ] **Step 3: 运行项目 lint**

Run: `npm run lint`
Expected: 无新增报错

- [ ] **Step 4: Commit**

```bash
git add src/components/stock/business-engines.tsx
git commit -m "feat(web-zh): add edit/add/delete UI for business engine cards"
```

---

## Task 9: 手动浏览器验证

**Files:** 无代码改动，仅验证

**Interfaces:**
- Consumes: Task 1-8 全部产出
- Produces: 无

项目无组件测试基建，本任务用真实浏览器走一遍完整交互路径，确认端到端行为符合设计。

- [ ] **Step 1: 启动开发服务器**

Run: `npm run dev:zh`
Expected: 服务在 `http://localhost:3001` 启动成功，无报错

- [ ] **Step 2: 打开一个有商业引擎数据的股票详情页**

打开浏览器访问 `http://localhost:3001/stock/<某个已跑过分析的 ticker>`（例如从数据库查一个 `business_engines` 表里有记录的 ticker：`psql "$DATABASE_URL" -c "select distinct c.ticker from business_engines be join companies c on c.id = be.company_id limit 1"`）。

Expected: 页面正常渲染"商业引擎"板块，卡片列表按角色分组展示，标题栏右侧有"新增引擎"按钮

- [ ] **Step 3: 验证编辑功能**

展开任意一张引擎卡片 → 点击"编辑" → 修改 description 字段内容 → 点击"保存"。

Expected: 保存后卡片回到只读态，description 显示新内容，卡片角标出现"人工修改"标签

- [ ] **Step 4: 验证编辑校验**

再次点击"编辑" → 清空 name 字段 → 点击"保存"。

Expected: 显示"引擎名称不能为空"错误提示，未跳出编辑态

- [ ] **Step 5: 验证新增功能**

取消当前编辑 → 点击顶部"新增引擎" → 填写 name="测试新引擎"、description="测试新增功能"，其余保持默认 → 点击"保存"。

Expected: 保存后列表刷新，新卡片出现在对应角色分组下（默认 `revenue_role=UNKNOWN`，若分组里没有"未知"分组会新建一个）

- [ ] **Step 6: 验证删除功能**

展开刚新增的"测试新引擎"卡片 → 点击"编辑" → 点击"删除" → 确认浏览器弹出的 `window.confirm` 对话框，点击确认。

Expected: 卡片从列表中消失

- [ ] **Step 7: 验证数据库锁定标记生效**

Run: `psql "$DATABASE_URL" -c "select name, is_manually_edited from business_engines where is_manually_edited = true limit 5"`
Expected: 能看到 Step 3 编辑过的那条引擎记录，`is_manually_edited` 为 `t`

- [ ] **Step 8: 验证 snapshot 历史记录**

Run: `psql "$DATABASE_URL" -c "select change_type, change_reason, analysis_result_id from business_engine_snapshots where change_type = 'MANUAL_EDIT' order by created_at desc limit 5"`
Expected: 能看到 Step 3 编辑操作对应的 snapshot 记录，`change_type` 为 `MANUAL_EDIT`，`analysis_result_id` 为 `NULL`

- [ ] **Step 9: 清理测试数据（可选）**

若 Step 3 编辑过的记录是真实数据（非测试专用 ticker），确认是否需要手动恢复其原始内容，避免真实业务数据被测试步骤污染。若使用的是专门的测试 ticker，跳过此步。

无 commit——本任务不产生代码改动。

---

## Self-Review

**1. Spec 覆盖检查：**
- 全部字段可编辑 → Task 4/5/8（`updateBusinessEngine` + PUT route + `EngineForm` 覆盖 name/description/product_or_service/revenue_role/lifecycle_stage/trend/confidence/customer_segment/monetization_model/evidence 十个字段）✓
- 整行锁定，AI 不覆盖已编辑字段 → Task 1（`is_manually_edited` 列）+ Task 6（订阅器跳过逻辑）✓
- 暂不做权限校验 → 权限模型章节声明，未新增任何校验代码 ✓
- 支持新增/删除整条引擎记录 → Task 4/5/8（`createBusinessEngine`/`deleteBusinessEngine` + POST/DELETE route + `NewEngineCard`/删除按钮）✓
- 人工操作记录 MANUAL_EDIT snapshot → Task 2（枚举新增）+ Task 4（两个函数末尾插入 snapshot）+ Task 6（锁定路径也追加 snapshot）✓
- 硬删除 → Task 4 的 `deleteBusinessEngine` 用 `delete from`，Task 9 Step 7/8 验证级联删除历史的行为已被接受 ✓

**2. 占位符扫描：** 全文搜索确认无 "TBD/TODO/日后补充" 等字样，所有代码块均为完整可运行内容。

**3. 类型一致性检查：**
- `BusinessEngineInput` 字段名（Task 2 定义）与 `validateBusinessEngineInput` 返回值（Task 3）、`updateBusinessEngine`/`createBusinessEngine` 参数（Task 4）、API route body 解析（Task 5）、前端 `EngineDraft`→请求体映射（Task 8）五处逐一核对：`name`/`description`/`customer_segment`/`product_or_service`/`monetization_model`/`revenue_role`/`lifecycle_stage`/`trend`/`confidence`/`evidence` 命名统一。
- `is_manually_edited` 字段名在 Task 1 迁移、Task 2 类型、Task 4 SQL、Task 6 订阅器判断、Task 8 组件展示五处一致。
- `EngineChangeType.MANUAL_EDIT` 在 Task 2 枚举、Task 4 SQL 字面量、Task 6 测试断言、Task 7 文案四处拼写一致。
- Task 8 前端引用的 `ENGINE_TREND_LABELS` 确认是 `src/content/business-engine.ts` 现有导出（调研阶段已确认存在），未在计划中重复定义。

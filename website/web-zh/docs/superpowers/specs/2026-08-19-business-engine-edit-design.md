# 商业引擎板块 — 编辑功能 设计文档

日期：2026-08-19
状态：待自审

## 背景

股票详情页的"商业引擎"板块（`BusinessEnginesSection`，`src/components/stock/business-engines.tsx`）目前纯只读：数据完全来自 Python 端分析产出，经 `write-business-engine.ts` 订阅器写入 `business_engines` 表。

现在需要给这个板块加人工编辑能力：编辑已有引擎的任意字段、新增一条引擎、删除一条引擎。核心难点在于人工编辑的数据不能被下一次 AI 分析的 upsert 覆盖。

## 范围与非目标

- **范围**：新增 3 个 API 操作（PUT 编辑、POST 新增、DELETE 删除）；`BusinessEnginesSection` 组件加编辑/新增表单和删除入口；Python upsert 订阅器改为感知锁定状态；两处 schema 迁移。
- **非目标**：不做登录/角色权限（沿用项目当前本地单用户模式，与 `ProphetIndicator`/`CompanyTimeline` 一致）；不改造 evidence 的编辑体验为结构化子表单（本次用 JSON textarea）；不涉及 Business Engine 之外的板块。

## 权限模型

沿用项目现状：`src/lib/auth.ts` 是本地单用户模式（`LOCAL_USER`，`isLoggedIn` 恒为 `true`），没有真实鉴权系统。本次编辑功能不新增权限校验，任何能访问页面的人都可编辑——与 `ProphetIndicator` 的 PUT route 权限模型完全一致，不引入新的不一致。

## 数据模型变更

### 迁移 `0007_business_engine_editable.sql`

```sql
-- 整行锁定标记：人工编辑/新增后置为 true，AI 下次 upsert 时跳过该行的主表更新，
-- 但仍追加 snapshot 历史（用于回看 AI 本来想做的变化）。
alter table public.business_engines
  add column is_manually_edited boolean not null default false;

-- 人工新增/编辑/删除操作不属于任何一次 AI 分析，无 analysis_result_id 可填。
alter table public.business_engine_snapshots
  alter column analysis_result_id drop not null;
```

风险点：`business_engine_snapshots.business_engine_id` 现有外键是 `on delete cascade`。人工硬删除一条 `business_engines` 记录会级联清空它的全部历史快照——已与用户确认接受这个行为，不额外处理（不改成 `set null`，保持 schema 简单）。

### 枚举扩展

`src/types/enums.ts` 的 `EngineChangeType` 新增一个值：

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
  MANUAL_EDIT = "MANUAL_EDIT", // 新增：标记人工新增/编辑产生的快照
}
```

`src/content/business-engine.ts` 的 `CHANGE_TYPE_LABELS` 补充：
```typescript
[EngineChangeType.MANUAL_EDIT]: "人工修改",
```

### 类型扩展

`src/types/index.ts` 的 `BusinessEngine` 接口新增字段：
```typescript
export interface BusinessEngine {
  // ... 现有字段
  is_manually_edited: boolean;
}
```

新增一个人工新增/编辑请求体类型（不落库用的辅助类型，供 API route 和组件共享）：
```typescript
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

## 后端设计

### `src/lib/company-research.ts` 新增函数

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

`name` 有唯一约束 `(company_id, name)`，`createBusinessEngine` 用 `on conflict` upsert，与"新增一个已存在名字的引擎"等价于编辑它，语义上不需要额外校验重复名字。

### API Routes

`src/app/api/stocks/[ticker]/business-engines/route.ts` 新增：

```typescript
export async function POST(req: NextRequest, { params }: { params: Promise<{ ticker: string }> }) {
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
    return NextResponse.json({ success: false, error: `Company not found: ${ticker}` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data }, { status: 201 });
}
```

新文件 `src/app/api/stocks/[ticker]/business-engines/[engineId]/route.ts`：

```typescript
export async function PUT(req: NextRequest, { params }: { params: Promise<{ ticker: string; engineId: string }> }) {
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
    return NextResponse.json({ success: false, error: `Engine not found: ${engineId}` }, { status: 404 });
  }
  return NextResponse.json({ success: true, data });
}

export async function DELETE(_req: NextRequest, { params }: { params: Promise<{ ticker: string; engineId: string }> }) {
  const { ticker, engineId } = await params;
  const deleted = await deleteBusinessEngine(ticker.toUpperCase(), engineId);
  if (!deleted) {
    return NextResponse.json({ success: false, error: `Engine not found: ${engineId}` }, { status: 404 });
  }
  return NextResponse.json({ success: true });
}
```

### 输入校验

新增 `validateBusinessEngineInput`（放在 `src/lib/company-research.ts` 或新文件 `src/lib/business-engine-validation.ts`——放同一文件即可，量不大）：

- `name`：非空字符串（trim 后长度 > 0）
- `description`：非空字符串
- `product_or_service`：字符串或 null
- `revenue_role`：必须是 `RevenueRole` 枚举值之一
- `lifecycle_stage`：必须是 `LifecycleStage` 枚举值之一
- `trend`：必须是 `EngineTrend` 枚举值之一
- `confidence`：必须是 `EngineConfidence` 枚举值之一
- `customer_segment`：数组，每项必须是 `CustomerSegment` 枚举值之一（允许空数组）
- `monetization_model`：数组，每项必须是 `MonetizationModel` 枚举值之一（允许空数组）
- `evidence`：数组，每项校验 `source`/`source_type`/`date`/`claim`/`direction`/`confidence` 字段类型（允许空数组）

任一校验失败返回 `{ ok: false, error: "<字段> 不合法" }`，成功返回 `{ ok: true, value: BusinessEngineInput }`。

## Python 端 upsert 感知锁定

`src/lib/analysis-subscribers/write-business-engine.ts` 改动：

```typescript
on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const scan = event.raw.business_engine_scan;
  if (!scan || scan.length === 0) return;

  const sql = getDb();
  const existing = await sql<BusinessEngine[]>`
    select * from business_engines where company_id = ${event.companyId}
  `;
  const existingByName = new Map(existing.map((e) => [e.name, e]));
  const companyHasBaseline = existing.length > 0;

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

    // ... 现有 upsert + snapshot 逻辑不变
  }
});
```

`detectChange` 函数不变——它只是纯函数，锁定判断在调用它之后、写库之前拦截。

## 前端设计

### 状态管理（`business-engines.tsx`）

组件顶层新增：
```typescript
const [editingId, setEditingId] = useState<string | null>(null);
const [isAdding, setIsAdding] = useState(false);
const [draft, setDraft] = useState<BusinessEngineInput | null>(null);
const [isSaving, setIsSaving] = useState(false);
const [error, setError] = useState<string | null>(null);
```

`draft` 是编辑中/新增中的表单状态，编辑时初始化为该 engine 的当前值，新增时初始化为空白模板。

### 表单字段布局

- **文本输入**：`name`（`<input>`）、`description`（`<textarea>`）、`product_or_service`（`<input>`，可留空）
- **单选枚举**：`revenue_role`、`lifecycle_stage`、`trend`、`confidence` 用原生 `<select>`，选项文案读 `src/content/business-engine.ts` 里对应的 `*_LABELS`
- **多选枚举**：`customer_segment`、`monetization_model` 用 checkbox group（每个枚举值一个 checkbox），不用 `<select multiple>`——原生多选框在触屏和可访问性上都比 native multi-select 好用,且当前项目其余多选场景（如无）没有先例可循,checkbox group 是更常见的 web 表单模式
- **Evidence**：一个 `<textarea>`，placeholder 提示 JSON 数组格式；保存前 `JSON.parse`，失败则报错"证据格式不正确，需为合法 JSON 数组"，不阻塞其他字段的保存尝试（用户可以清空 evidence 为 `[]` 跳过）

### 交互

**编辑已有引擎**：`EngineCard` 展开后，标题行右侧增加"编辑"按钮（复用 `ProphetIndicator` 的 `Pencil` 图标模式）。点击后该卡片内部切换为表单视图（替换只读展示区），复用同一个 `EngineCard` 组件而不拆分独立表单组件，通过 `editingId === engine.id` 判断渲染模式。

**新增引擎**：板块标题栏（`商业引擎` 旁）增加"新增引擎"按钮。点击后在卡片列表顶部插入一个空表单卡片（复用同一套字段渲染，`revenue_role` 等枚举字段默认值为 `UNKNOWN`，`confidence` 默认 `LOW`，与数据库默认值一致）。

**删除引擎**：编辑表单内提供"删除"按钮（不放在只读卡片上，避免误触——删除是破坏性操作，要求先进入编辑态才能看到删除入口）。点击后 `window.confirm` 二次确认（文案含引擎名称和"历史记录也将一同清除"的提示），确认后调用 DELETE。

**保存/取消**：与 `ProphetIndicator` 一致的按钮组（"保存"/"取消"），保存成功后 `queryClient.invalidateQueries({ queryKey: ["stock-business-engines", ticker] })` 并退出编辑态。

**人工锁定标记展示**：`EngineCard` 展开区域，若 `engine.is_manually_edited === true`，在卡片角标位置显示一个小标签（复用现有 `REVENUE_ROLE_LABELS` 角标同样的 pill 样式），文案取 `BUSINESS_ENGINE_TEXT.manuallyEditedBadge`，让用户知道这条数据不会被下次 AI 分析覆盖。

### 文案新增（`src/content/business-engine.ts`）

```typescript
export const BUSINESS_ENGINE_TEXT = {
  // ... 现有字段
  editButton: "编辑",
  deleteButton: "删除",
  saveButton: "保存",
  savingButton: "保存中...",
  cancelButton: "取消",
  addEngineButton: "新增引擎",
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

## 测试策略

参照 `write-business-engine.test.ts` 和 `timeline/[eventId]/route.test.ts` 的模式，用 `node:test` + 真实本地数据库：

- **`business-engines/route.test.ts`**（补充 POST 用例）：新增成功返回 201；必填字段缺失返回 400；枚举值非法返回 400
- **`business-engines/[engineId]/route.test.ts`**（新文件）：PUT 编辑成功；PUT 对不存在的 engineId 返回 404；DELETE 成功；DELETE 对不存在的 engineId 返回 404
- **`write-business-engine.test.ts`**（补充用例）：人工编辑后（`is_manually_edited=true`）触发一次 AI 分析，验证主表字段未被覆盖，同时验证新增了一条 `change_type='<AI判定的类型>'`、`change_reason` 含"已人工锁定"字样的 snapshot
- **组件层**：项目当前无 `.tsx` 组件测试基建，不新增，手动浏览器验证覆盖交互路径（实施计划中给出具体验证步骤）。

## Self-Review

- **占位符扫描**：无 TBD/TODO。
- **一致性**：权限模型与 `ProphetIndicator`/`CompanyTimeline` 一致（本地单用户，无鉴权）；`EngineChangeType.MANUAL_EDIT` 在枚举、标签、订阅器、API 四处保持同一命名；`is_manually_edited` 字段名在迁移、类型、SQL、组件展示中统一。
- **一致性补充**：两处 schema 冲突（snapshot 级联删除、`analysis_result_id` NOT NULL）已在设计中明确记录处理方式并附带用户确认依据，不是遗留歧义。
- **范围检查**：聚焦编辑/新增/删除三个操作 + 锁定机制,未涉及权限系统重构、未涉及 evidence 子表单化,足够聚焦。
- **歧义检查**："新增已存在名字的引擎"明确等价于编辑（upsert 语义）；"锁定后 AI 是否还追加快照"明确为"追加但不覆盖主表"，不存在其他解读空间。

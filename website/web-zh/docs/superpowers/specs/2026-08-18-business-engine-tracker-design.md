# Business Engine Tracker（商业引擎追踪系统）设计文档

日期：2026-08-18
状态：已确认，待转入实施计划

## 背景与产品定位

当前 `公司概览`（`src/components/stock/company-overview.tsx`）只是展示 `company_dashboard` 表里的评分/评级/风险等级/行业/敞口等静态快照字段，无历史、无业务细节。

本次改造把 Company Overview 的内部产品定位从"公司数据卡片"升级为：

> **商业引擎追踪系统（Business Engine Tracker）**——不是介绍公司，而是持续追踪公司的赚钱机器。

第一阶段只回答：
1. 这家公司现在靠什么赚钱？
2. 哪些赚钱引擎正在增长/衰退？
3. 公司最近推出了哪些新赚钱方式？
4. 哪些新业务只是"故事"，哪些已经开始产生收入？
5. 与上一次分析相比，赚钱地图发生了什么变化？

严格不做（留给后续阶段）：护城河、ROIC、资本配置、投资论点、估值、股票评级、Opportunity Score、Moat Score、Company Quality Score。

原始需求文档：`website/Website optimization/260817 Business Engine Track.md`。

## 项目审计结论

- **当前 Company Overview**：纯只读，读 `company_dashboard`（唯一允许覆盖的快照表，无历史），文案硬编码未走 `src/content/`。
- **可复用基础设施**：
  - `event-bus.ts` + `analysis-subscribers/*` — 进程内发布订阅，各订阅者失败互相隔离，且不影响主分析成功（`persistAnalysisResult` 已有此保证）。
  - `theses` 表的版本化模式（`version` + `previous_version`）是现有最接近"历史快照"的范式。
  - `timeline_events` 已有按 `(company_id, source_url)` 去重和软删除。
  - Python 侧 `news_curator.py`（新闻去重/翻译/分类）与 `financial_statement_extractor.py`（财报解读提取）都是"主分析完成后的增强步骤"，失败仅 `emit warning`，不影响主流程——Business Engine Extractor 直接照搬这个模式。
- **关键缺口**：Python 端目前完全没有业务分部/收入来源/商业模式的结构化数据源（Finnhub/Alpha Vantage/yFinance 只给汇总财务数据）。识别"赚钱路数"必须靠 LLM 从 `fundamentals_report` + `financial_statement_analysis` + `news_items` 文本推断，而不是查询结构化数据。
- **Node 侧分析编排**（`analysis-store.ts`）已经是异步轮询模式，`persistAnalysisResult` 失败已经做隔离（记录日志，不影响 UI/主流程），新增的 Business Engine 持久化直接复用这条路径。

## 关键决策（已与用户确认）

1. **推断环节**：在 Python 端 `run_analysis_zh.py` 扩展新增 `business_engine_extractor.py`，逻辑集中在 Python 侧，Node 只做持久化和展示。
2. **触发频率**：跟随主分析同步触发，通过 event-bus 新增订阅者，失败不影响主分析。
3. **数据存储**：新建两张专用表 `business_engines`（当前状态）+ `business_engine_snapshots`（历史快照，追加写入），不复用 `knowledge_entries`。
4. **首批范围**：只对新触发分析的公司生效，不批量回填已有公司历史数据。
5. **UI 集成**：直接改造现有 `company-overview.tsx` 承担的 Section 位置（产品定位从数据卡片变为商业引擎追踪系统），不新增并存的独立 Section。
6. **Evidence 来源**：直接复用现有 `news_items`（结构化新闻）和 `financial_statement_analysis`（财报解读文本）作为证据来源，不新建独立证据采集/存储体系。
7. **语言**：业务名称（`name`，如 Azure/AWS/iPhone）保留英文专有名词原文，不翻译；所有状态标签、板块标题、描述文案、LLM 生成的 description 和 evidence.claim 全部为简体中文，通过 `content/business-engine.ts` + `content/labels.ts` 集中管理，枚举内部值保持英文（满足 AGENTS.md 规则 1/3/4）。

## 整体数据流

```
用户触发分析（首次或"重新分析"）
        ↓
Node: analysis-store.ts → FastAPI(api-server-zh) → subprocess run_analysis_zh.py
        ↓（子进程内，主分析 + 已有 news_curator/financial_statement_extractor 步骤完成后）
新增步骤：business_engine_extractor.py
  输入：fundamentals_report + financial_statement_analysis + news_items
       + 该公司已有 Business Engine 名称列表（尽量复用已有命名）
  输出：结构化 Business Engine Scan（每个 engine 的完整字段，见下）
        ↓
随 analysis-result JSON 写入 output_path，Node 轮询拿到结果
        ↓
persistAnalysisResult() 触发 analysis.completed 事件
        ↓（新增订阅者 write-business-engine.ts）
  1. 读取该公司 business_engines 当前状态
  2. 按 name 精确匹配已有记录
  3. 用确定性规则（非 LLM，纯函数）比较新旧状态 → change_type
  4. upsert business_engines；insert 一行 business_engine_snapshots
  5. 若公司此前无记录 → 整批标记 BASELINE，不算"增长"
        ↓
失败只记录日志（event-bus 现有错误隔离机制），不影响主分析成功
        ↓
Company Overview 页面读取 business_engines + business_engine_snapshots 渲染
```

**核心原则**：LLM 只负责"当前时刻业务状态是什么样"的推断（一次性、可重复触发），状态变化的判定（新出现/增长/衰退/升级/降级）由 Node 侧确定性代码计算，不再让 LLM 做第二次推断。这样变化类型可解释、可单测、可复现，满足"重复证据不能制造虚假变化"的要求。

## 数据模型

### 新增枚举（`src/types/enums.ts`，唯一来源）

```typescript
export enum RevenueRole {
  CORE = "CORE", MAJOR = "MAJOR", EMERGING = "EMERGING",
  EXPERIMENTAL = "EXPERIMENTAL", DECLINING = "DECLINING", UNKNOWN = "UNKNOWN",
}

export enum LifecycleStage {
  ANNOUNCED = "ANNOUNCED", LAUNCHED = "LAUNCHED", EARLY_ADOPTION = "EARLY_ADOPTION",
  REVENUE_GENERATING = "REVENUE_GENERATING", SCALING = "SCALING", CORE = "CORE",
  DECLINING = "DECLINING", RESTRUCTURING = "RESTRUCTURING", ABANDONED = "ABANDONED",
  UNKNOWN = "UNKNOWN",
}

export enum EngineTrend {
  UP = "UP", STABLE = "STABLE", DOWN = "DOWN", UNKNOWN = "UNKNOWN",
}

export enum EngineConfidence {
  HIGH = "HIGH", MEDIUM = "MEDIUM", LOW = "LOW",
}

export enum EngineChangeType {
  BASELINE = "BASELINE", NEW = "NEW", GROWING = "GROWING", STABLE = "STABLE",
  WEAKENING = "WEAKENING", DECLINING = "DECLINING", PROMOTED = "PROMOTED",
  DEMOTED = "DEMOTED", ABANDONED = "ABANDONED", UNCERTAIN = "UNCERTAIN",
}

export enum CustomerSegment {
  CONSUMER = "CONSUMER", ENTERPRISE = "ENTERPRISE", DEVELOPER = "DEVELOPER",
  ADVERTISER = "ADVERTISER", FINANCIAL_INSTITUTION = "FINANCIAL_INSTITUTION",
  GOVERNMENT = "GOVERNMENT", SMB = "SMB", CREATOR = "CREATOR",
  PLATFORM_MERCHANT = "PLATFORM_MERCHANT", AI_COMPANY = "AI_COMPANY",
  OTHER = "OTHER", UNKNOWN = "UNKNOWN",
}

export enum MonetizationModel {
  SUBSCRIPTION = "SUBSCRIPTION", USAGE_BASED = "USAGE_BASED", ADVERTISING = "ADVERTISING",
  TRANSACTION_FEE = "TRANSACTION_FEE", HARDWARE_SALES = "HARDWARE_SALES",
  SOFTWARE_LICENSE = "SOFTWARE_LICENSE", PLATFORM_COMMISSION = "PLATFORM_COMMISSION",
  LONG_TERM_CONTRACT = "LONG_TERM_CONTRACT", ONE_TIME_PURCHASE = "ONE_TIME_PURCHASE",
  HYBRID = "HYBRID", UNKNOWN = "UNKNOWN",
}
```

Python 端的同名枚举字符串值必须与上面逐字一致——这是 Python↔TS 之间的契约，由 Zod schema（`src/schemas/analysis-result.ts` 扩展）在边界处校验。

### 数据库迁移（`supabase/migrations/0006_business_engine.sql`）

```sql
create table public.business_engines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text not null,
  customer_segment text[] not null default '{}',
  product_or_service text,
  monetization_model text[] not null default '{}',
  revenue_role text not null default 'UNKNOWN',
  lifecycle_stage text not null default 'UNKNOWN',
  trend text not null default 'UNKNOWN',
  confidence text not null default 'LOW',
  evidence jsonb not null default '[]',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

create table public.business_engine_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_engine_id uuid not null references public.business_engines(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  analysis_result_id uuid not null references public.analysis_results(id) on delete cascade,
  revenue_role text not null,
  lifecycle_stage text not null,
  trend text not null,
  confidence text not null,
  change_type text not null,
  change_reason text,
  evidence_summary jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index business_engine_snapshots_company_created_idx
  on public.business_engine_snapshots (company_id, created_at desc);
create index business_engine_snapshots_engine_created_idx
  on public.business_engine_snapshots (business_engine_id, created_at desc);

alter table public.business_engines enable row level security;
alter table public.business_engine_snapshots enable row level security;
create policy "anyone can read business_engines"
  on public.business_engines for select using (true);
create policy "anyone can read business_engine_snapshots"
  on public.business_engine_snapshots for select using (true);
-- 不建 insert/update/delete policy：与其他表一致，写入只走服务端 DATABASE_URL 直连。
```

`evidence` / `evidence_summary` 是 JSONB 数组，结构：

```typescript
interface BusinessEngineEvidence {
  source: string;        // 如新闻标题原文 / "2026 Q2 财报"
  source_type: "news" | "financial_statement";
  date: string;
  claim: string;          // 中文事实陈述
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: EngineConfidence;
}
```

`source_type` 是证据来源标签，不参与业务判断逻辑，不做正式枚举。

### TypeScript 类型（`src/types/index.ts` 新增）

```typescript
export interface BusinessEngine {
  id: string;
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

export interface BusinessEngineSnapshot {
  id: string;
  business_engine_id: string;
  name: string; // 冗余字段，避免历史列表多次 join
  revenue_role: RevenueRole;
  lifecycle_stage: LifecycleStage;
  trend: EngineTrend;
  confidence: EngineConfidence;
  change_type: EngineChangeType;
  change_reason: string | null;
  created_at: string;
}
```

## Python 端：Business Engine Extractor

新增 `tradingagents/dataflows/business_engine_extractor.py`，结构参照 `financial_statement_extractor.py`。

```python
class BusinessEngineEvidence(BaseModel):
    source: str
    source_type: Literal["news", "financial_statement"]
    date: str
    claim: str
    direction: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    confidence: EngineConfidenceEnum

class BusinessEngineItem(BaseModel):
    name: str
    description: str
    customer_segment: list[CustomerSegmentEnum]
    product_or_service: str | None
    monetization_model: list[MonetizationModelEnum]
    revenue_role: RevenueRoleEnum
    lifecycle_stage: LifecycleStageEnum
    trend: EngineTrendEnum
    confidence: EngineConfidenceEnum
    evidence: list[BusinessEngineEvidence]

class BusinessEngineScan(BaseModel):
    engines: list[BusinessEngineItem]

def extract_business_engines(
    llm: Any, ticker: str, company_name: str,
    fundamentals_report: str, financial_statement_analysis: str,
    news_items: list[dict], known_engine_names: list[str],
    *, max_attempts: int = 3,
) -> list[BusinessEngineItem]: ...
```

Prompt 设计要点：
- 输入包含该公司**已有 Business Engine 名称列表**，明确要求尽量复用已有名称，不要为同一业务起新名字。
- 没有证据支撑的字段必须填 `UNKNOWN`，禁止编造收入占比/用户数/市场份额等数值（这些字段在数据模型里本就不存在，从结构上杜绝）。
- 每条 evidence 必须能追溯到 `news_items` 具体条目或 `financial_statement_analysis` 文本片段，不允许凭空生成来源。
- 复用 `financial_statement_extractor.py` 的 DeepSeek 重试兜底模式（3 次重试防止空结构化输出）。

集成到 `run_analysis_zh.py`：仿照 `_extract_financial_statement_analysis` 的写法新增 `_extract_business_engines`，try/except 包裹，失败 `emit warning`，返回空列表，不影响主分析。输出字段 `business_engine_scan: list[dict]` 加入最终返回的 JSON。

`src/schemas/analysis-result.ts` 的 `TARawResultSchema` 需要新增对应字段（`z.array(...).optional().default([])`，与 `news_items` 一致的可选兜底策略，保持向后兼容旧样本 JSON）。

## Node 端：变化检测与持久化

### 变化检测（`src/lib/business-engine-diff.ts`，纯函数，无 IO，可单测）

```typescript
function detectChange(
  previous: BusinessEngine | null,
  incoming: ExtractedBusinessEngine
): { changeType: EngineChangeType; reason: string } {
  if (!previous) return { changeType: EngineChangeType.BASELINE, reason: "首次建立业务基线" };

  const roleOrder = [DECLINING, EXPERIMENTAL, EMERGING, MAJOR, CORE]; // UNKNOWN 不参与升降判断
  const roleRankChanged = compareRank(previous.revenue_role, incoming.revenue_role, roleOrder);

  if (incoming.lifecycle_stage === ABANDONED && previous.lifecycle_stage !== ABANDONED)
    return { changeType: ABANDONED, reason: "公司已明确退出该业务" };
  if (roleRankChanged > 0) return { changeType: PROMOTED, reason: "营收角色升级" };
  if (roleRankChanged < 0) return { changeType: DEMOTED, reason: "营收角色降级" };
  if (incoming.trend === UP && previous.trend !== UP) return { changeType: GROWING, reason: "趋势转为上升" };
  if (incoming.trend === DOWN && previous.trend !== DOWN) return { changeType: WEAKENING, reason: "趋势转为下降" };
  if (previous.revenue_role === incoming.revenue_role
      && previous.lifecycle_stage === incoming.lifecycle_stage
      && previous.trend === incoming.trend)
    return { changeType: STABLE, reason: "无明显变化" };
  return { changeType: UNCERTAIN, reason: "状态发生变化但无法归类为明确的升级/降级" };
}
```

本次 LLM 输出了公司已有 baseline 之外的新名字 → 判定为 `NEW`（不是 `BASELINE`，`BASELINE` 只用于公司首次建档、一次性把所有 engine 标记为基线）。

### 持久化订阅者（`src/lib/analysis-subscribers/write-business-engine.ts`）

```typescript
on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const scan = event.raw.business_engine_scan;
  if (!scan || scan.length === 0) return;

  const sql = getDb();
  const existing = await sql<BusinessEngine[]>`
    select * from business_engines where company_id = ${event.companyId}
  `;
  const existingByName = new Map(existing.map((e) => [e.name, e]));

  for (const item of scan) {
    const previous = existingByName.get(item.name) ?? null;
    const { changeType, reason } = detectChange(previous, item);

    const [engine] = await sql`
      insert into business_engines (
        company_id, name, description, customer_segment, product_or_service,
        monetization_model, revenue_role, lifecycle_stage, trend, confidence,
        evidence, last_verified_at, updated_at
      ) values (
        ${event.companyId}, ${item.name}, ${item.description}, ${item.customer_segment},
        ${item.product_or_service}, ${item.monetization_model}, ${item.revenue_role},
        ${item.lifecycle_stage}, ${item.trend}, ${item.confidence}, ${sql.json(item.evidence)},
        now(), now()
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
        last_verified_at = now(),
        updated_at = now()
      returning id
    `;

    await sql`
      insert into business_engine_snapshots (
        business_engine_id, company_id, analysis_result_id, revenue_role,
        lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
      ) values (
        ${engine.id}, ${event.companyId}, ${event.analysisResultId}, ${item.revenue_role},
        ${item.lifecycle_stage}, ${item.trend}, ${item.confidence}, ${changeType}, ${reason},
        ${sql.json(item.evidence)}
      )
    `;
  }
});
```

失败会被 `event-bus.ts` 现有机制捕获并聚合抛出，但不会阻断其他订阅者（timeline/thesis/dashboard 照常写入），也不影响 `analysis-store.ts` 里"分析成功但持久化失败仅记录日志"的既有逻辑——完全复用现有隔离机制。

需在 `src/lib/persist-analysis-result.ts` 增加一行 side-effect import：`import "./analysis-subscribers/write-business-engine";`

## UI 层

### 查询层（`src/lib/business-engine.ts`）

```typescript
export async function getBusinessEngines(ticker: string): Promise<BusinessEngine[]> {
  // findCompanyId(ticker) → 按 revenue_role 优先级排序（CORE→MAJOR→EMERGING→EXPERIMENTAL→DECLINING→UNKNOWN）再按 name
}

export async function getBusinessEngineHistory(
  businessEngineId: string,
  limit = 10
): Promise<BusinessEngineSnapshot[]> {
  // join business_engines 取 name，按 created_at desc limit
}
```

### API 路由

新增 `src/app/api/stocks/[ticker]/business-engines/route.ts`（GET，只读，与 `overview`/`theses`/`timeline` 路由模式一致）。

### 组件（`src/components/stock/business-engines.tsx`）

替换掉现有 `company-overview.tsx` 在页面里的位置和职责（`src/app/stock/[ticker]/page.tsx` 里 `<CompanyOverview ticker={ticker} />` 换成 `<BusinessEnginesSection ticker={ticker} />`）。

- 顶层按 `revenue_role` 分组展示：核心业务 / 主要业务 / 新兴业务 / 实验性业务 / 衰退业务。
- 每个分组内渲染 `EngineCard` 列表。
- 加载态：骨架屏（复用现有 `animate-pulse` 模式）。
- 空态："尚未建立业务基线" + "运行首次分析后自动生成" 提示（复用现有空态文案模式）。

**`EngineCard` 折叠态**：
- 业务名称（专有名词原文）+ 营收角色徽章（中文）+ 生命周期阶段（中文）
- 趋势图标：UP 绿色↑ / DOWN 红色↓ / STABLE 灰色→
- 变化提示（仅非 STABLE 时显示，取最近一次 snapshot 的 change_type + change_reason）
- 一句话描述（`description`）
- 展开按钮

**展开态**（额外展示）：
- 客户群体标签组（多选，中文）
- 产品/服务（可能为空）
- 变现模式标签组（多选，中文）
- 置信度徽章（右上角，中文）
- 证据列表：每条一行，来源类型图标（📰新闻 / 📊财报）+ 日期 + claim + 方向箭头 + 置信度
- 历史快照入口留作后续阶段可选增强，本阶段不做（避免范围膨胀）

### 文案（新增 `src/content/business-engine.ts`）

```typescript
export const REVENUE_ROLE_LABELS: Record<RevenueRole, string> = {
  CORE: "核心业务", MAJOR: "主要业务", EMERGING: "新兴业务",
  EXPERIMENTAL: "实验性业务", DECLINING: "衰退业务", UNKNOWN: "未知",
};

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  ANNOUNCED: "已宣布", LAUNCHED: "已推出", EARLY_ADOPTION: "早期采用",
  REVENUE_GENERATING: "产生营收", SCALING: "规模化扩张", CORE: "核心运营",
  DECLINING: "衰退期", RESTRUCTURING: "重组中", ABANDONED: "已放弃", UNKNOWN: "未知",
};

export const CHANGE_TYPE_LABELS: Record<EngineChangeType, string> = {
  BASELINE: "基线已建立", NEW: "新识别", GROWING: "上升趋势", STABLE: "保持稳定",
  WEAKENING: "增长放缓", DECLINING: "衰退", PROMOTED: "升级", DEMOTED: "降级",
  ABANDONED: "已放弃", UNCERTAIN: "状态变化",
};

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  CONSUMER: "消费者", ENTERPRISE: "企业", DEVELOPER: "开发者", ADVERTISER: "广告主",
  FINANCIAL_INSTITUTION: "金融机构", GOVERNMENT: "政府", SMB: "中小企业",
  CREATOR: "创作者", PLATFORM_MERCHANT: "平台商家", AI_COMPANY: "AI 公司",
  OTHER: "其他", UNKNOWN: "未知",
};

export const MONETIZATION_MODEL_LABELS: Record<MonetizationModel, string> = {
  SUBSCRIPTION: "订阅制", USAGE_BASED: "按使用量收费", ADVERTISING: "广告",
  TRANSACTION_FEE: "交易手续费", HARDWARE_SALES: "硬件销售", SOFTWARE_LICENSE: "软件授权",
  PLATFORM_COMMISSION: "平台抽佣", LONG_TERM_CONTRACT: "长期合同",
  ONE_TIME_PURCHASE: "一次性购买", HYBRID: "混合模式", UNKNOWN: "未知",
};

export const ENGINE_TREND_LABELS: Record<EngineTrend, string> = {
  UP: "上升", STABLE: "稳定", DOWN: "下降", UNKNOWN: "未知",
};

export const ENGINE_CONFIDENCE_LABELS: Record<EngineConfidence, string> = {
  HIGH: "高", MEDIUM: "中", LOW: "低",
};
```

所有中文文案集中在这一个文件，组件内不出现硬编码字符串（修正现有 `company-overview.tsx` 违反 AGENTS.md 规则 2 的问题）。

`src/content/labels.ts` 的 `STOCK_WORKSPACE_TABS.overview` 文案由 "公司概览" 改为符合新定位的名称（如 "商业引擎"），具体文案在实施时和用户确认。

## 测试计划（对应原始 spec 第四十六节）

在 `src/lib/business-engine-diff.test.ts` 覆盖：
1. 首次分析（无历史）→ `BASELINE`
2. 无明显变化 → `STABLE`
3. 新业务首次出现（公司已有 baseline）→ `NEW`，且不能直接判定为 `CORE`
4. revenue_role 从低到高变化 → `PROMOTED`
5. revenue_role 从高到低变化 → `DEMOTED`
6. trend 转为 DOWN → `WEAKENING`
7. lifecycle_stage 变为 `ABANDONED` → `ABANDONED`
8. 所有字段都是 `UNKNOWN`/无变化 → 不产生虚假的 `GROWING`/`PROMOTED`

在 `src/lib/analysis-subscribers/write-business-engine.test.ts` 覆盖（参照 `write-thesis.test.ts`/`write-timeline-event.test.ts` 现有模式）：
9. 空 `business_engine_scan` → no-op，不报错
10. 正常写入 → `business_engines` upsert 正确，`business_engine_snapshots` 追加一行
11. 订阅者内部抛错 → 被 event-bus 捕获，不阻断其他订阅者

Python 侧 `tests/test_business_engine_extractor.py`（参照 `test_financial_statement_extractor.py`/`test_news_curator.py` 现有模式）：
12. 正常输入 → 返回结构化 `BusinessEngineItem` 列表
13. 无财报/新闻内容 → 返回空列表，不报错
14. LLM 返回空结构化输出 → 触发重试逻辑，最终仍为空则抛出可捕获异常（由 `run_analysis_zh.py` emit warning 兜底）

## 明确排除范围（第一阶段不做）

- 护城河、竞争优势评分、ROIC、资本配置、投资论点、估值、股票评级、买入/卖出建议、风险评分、Opportunity Score、Moat Score、Company Quality Score。
- 批量回填已有公司的历史 Business Engine 数据。
- 独立的证据采集/存储体系（继续复用 news_items / financial_statement_analysis）。
- 复杂的 Business Engine Map 可视化图表（第一阶段用文字结构展示"客户→产品→收费→收入"路径）。
- 历史快照的可视化时间线组件（数据结构已支持，UI 展示留给下一阶段）。
- 变化重要性分级隐藏低重要性变化（原始 spec 第三十二节提到的"高/中/低"重要性筛选，第一阶段展示全部变化，不做筛选）。

## 待实施计划阶段进一步明确的事项

- `STOCK_WORKSPACE_TABS.overview` 具体改成什么中文名称。
- Prompt 里对"已有 Business Engine 名称列表"传给 LLM 的具体格式。
- `business_engine_extractor.py` 的重试次数、超时策略是否需要独立配置项。

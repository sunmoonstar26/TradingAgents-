# Business Engine Tracker（商业引擎追踪系统）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 把 web-zh 股票详情页的"公司概览"从静态数据卡片改造为持续追踪公司赚钱路数的 Business Engine Tracker：每次 TradingAgents 分析完成后，Python 端 LLM 从财报解读/新闻/基本面报告中推断出结构化的"赚钱引擎"列表，Node 端用确定性规则和历史状态比较、检测变化，写入新表，UI 按核心/主要/新兴/实验性/衰退分组展示，全部中文文案。

**Architecture:** Python 侧新增 `business_engine_extractor.py`（结构参照 `financial_statement_extractor.py`），在 `run_analysis_zh.py` 主分析完成后调用一次 LLM，输出 `business_engine_scan` 字段随分析结果 JSON 返回。Node 侧 `src/schemas/analysis-result.ts` 用 Zod 校验该字段，新增两张表 `business_engines`（当前状态）/`business_engine_snapshots`（历史快照追加写入），新增事件订阅者 `write-business-engine.ts` 监听现有 `analysis.completed` 事件，用纯函数 `detectChange()` 做确定性状态比较（不再调用 LLM），失败由现有 event-bus 隔离机制兜底。UI 新增 `BusinessEnginesSection` 组件替换页面上原 `CompanyOverview` 的位置。

**Tech Stack:** Python 3 / Pydantic / LangChain `with_structured_output` / pytest（后端）；Next.js 16 App Router / TypeScript / Zod / `postgres` npm 包 / node:test / React 19（前端）

## Global Constraints

- 用户界面文案统一放置于 `src/content/` 目录，不允许在组件中直接硬编码字符串（`AGENTS.md` 规则 2）；本项目实际做法是全部中文（用户已确认），业务名称如 Azure/AWS/iPhone 等专有名词保留英文原文不翻译
- 所有信号/风险/等级/状态统一使用 `src/types/enums.ts` 中的 TypeScript Enum，禁止用中文字符串做条件判断（`AGENTS.md` 规则 1）
- 枚举展示文案统一从 `src/content/labels.ts` 或新增的 `src/content/business-engine.ts` 读取，不在组件内写死（`AGENTS.md` 规则 4）
- Python 端枚举字符串值必须与 TypeScript 端逐字一致（大写英文，如 `"CORE"`），这是 Python↔Node 之间的契约
- 数据库写入只走服务端 `DATABASE_URL` 直连（`src/lib/db.ts` 的 `getDb()`），不引入新连接方式
- 新表遵循现有 RLS 模式：公开只读（`anyone can read`），不开放写入策略
- LLM 抽取失败只 `emit warning` 并返回空列表/兜底值，不能让主分析流程失败（沿用 `_extract_financial_statement_analysis` 的模式）
- Node 端事件订阅者失败只被 event-bus 捕获聚合，不阻断其他订阅者，也不影响 `persistAnalysisResult` 已直接写入的 `companies`/`analysis_results`
- 禁止编造未经证据支撑的字段，没有证据时枚举值填 `UNKNOWN`（不新增自由文本兜底）
- TypeScript 测试用 `node:test` + `node:assert/strict`，通过 `npm test` 运行；Python 测试用 `pytest`，标记 `@pytest.mark.unit`
- 状态变化判定（NEW/GROWING/PROMOTED/DEMOTED/...）必须是确定性代码计算，不能由 LLM 二次推断

---

## Task 1: 枚举定义 — Business Engine 相关 TypeScript Enum

**Files:**
- Modify: `src/types/enums.ts`

**Interfaces:**
- Produces: `RevenueRole`, `LifecycleStage`, `EngineTrend`, `EngineConfidence`, `EngineChangeType`, `CustomerSegment`, `MonetizationModel` 七个字符串枚举，导出自 `@/types/enums`

- [ ] **Step 1: 在 `src/types/enums.ts` 末尾追加枚举**

```typescript
export enum RevenueRole {
  CORE         = "CORE",
  MAJOR        = "MAJOR",
  EMERGING     = "EMERGING",
  EXPERIMENTAL = "EXPERIMENTAL",
  DECLINING    = "DECLINING",
  UNKNOWN      = "UNKNOWN",
}

export enum LifecycleStage {
  ANNOUNCED          = "ANNOUNCED",
  LAUNCHED           = "LAUNCHED",
  EARLY_ADOPTION     = "EARLY_ADOPTION",
  REVENUE_GENERATING = "REVENUE_GENERATING",
  SCALING            = "SCALING",
  CORE               = "CORE",
  DECLINING          = "DECLINING",
  RESTRUCTURING      = "RESTRUCTURING",
  ABANDONED          = "ABANDONED",
  UNKNOWN            = "UNKNOWN",
}

export enum EngineTrend {
  UP      = "UP",
  STABLE  = "STABLE",
  DOWN    = "DOWN",
  UNKNOWN = "UNKNOWN",
}

export enum EngineConfidence {
  HIGH   = "HIGH",
  MEDIUM = "MEDIUM",
  LOW    = "LOW",
}

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

export enum CustomerSegment {
  CONSUMER               = "CONSUMER",
  ENTERPRISE             = "ENTERPRISE",
  DEVELOPER              = "DEVELOPER",
  ADVERTISER             = "ADVERTISER",
  FINANCIAL_INSTITUTION  = "FINANCIAL_INSTITUTION",
  GOVERNMENT             = "GOVERNMENT",
  SMB                    = "SMB",
  CREATOR                = "CREATOR",
  PLATFORM_MERCHANT      = "PLATFORM_MERCHANT",
  AI_COMPANY             = "AI_COMPANY",
  OTHER                  = "OTHER",
  UNKNOWN                = "UNKNOWN",
}

export enum MonetizationModel {
  SUBSCRIPTION        = "SUBSCRIPTION",
  USAGE_BASED         = "USAGE_BASED",
  ADVERTISING         = "ADVERTISING",
  TRANSACTION_FEE     = "TRANSACTION_FEE",
  HARDWARE_SALES      = "HARDWARE_SALES",
  SOFTWARE_LICENSE    = "SOFTWARE_LICENSE",
  PLATFORM_COMMISSION = "PLATFORM_COMMISSION",
  LONG_TERM_CONTRACT  = "LONG_TERM_CONTRACT",
  ONE_TIME_PURCHASE   = "ONE_TIME_PURCHASE",
  HYBRID              = "HYBRID",
  UNKNOWN             = "UNKNOWN",
}
```

- [ ] **Step 2: 类型检查确认无语法错误**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错（该命令本身可能因项目其他既有问题有既存报错，只需确认没有新增的、指向 `enums.ts` 的报错）

- [ ] **Step 3: Commit**

```bash
git add src/types/enums.ts
git commit -m "feat(web-zh): add Business Engine enums"
```

---

## Task 2: 数据库迁移 — `business_engines` + `business_engine_snapshots` 表

**Files:**
- Create: `supabase/migrations/0006_business_engine.sql`

**Interfaces:**
- Produces: 表 `public.business_engines`（列见下）唯一约束 `(company_id, name)`；表 `public.business_engine_snapshots`（列见下），索引 `(company_id, created_at desc)` 与 `(business_engine_id, created_at desc)`

- [ ] **Step 1: 编写迁移 SQL**

写入 `supabase/migrations/0006_business_engine.sql`：

```sql
-- Business Engine：公司当前赚钱路数的结构化状态（唯一允许 upsert 覆盖的资产表之一，
-- 覆盖前的状态通过 business_engine_snapshots 追加保存，不丢失历史）。
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

-- Business Engine Snapshot：每次分析后追加一行，不覆盖，用于回看历史变化。
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

-- 不建 insert/update/delete policy：写入只走服务端 DATABASE_URL 直连，
-- 与 companies/timeline_events 等表的写入路径一致。
```

- [ ] **Step 2: 应用迁移到本地数据库**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -f supabase/migrations/0006_business_engine.sql`
Expected: 输出 `CREATE TABLE` ×2、`CREATE INDEX` ×2、`ALTER TABLE` ×2、`CREATE POLICY` ×2，无报错

- [ ] **Step 3: 验证表结构**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "\d public.business_engines" -c "\d public.business_engine_snapshots"`
Expected: `business_engines` 显示 14 列 + 唯一约束 `business_engines_company_id_name_key`；`business_engine_snapshots` 显示 11 列 + 两个索引

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0006_business_engine.sql
git commit -m "feat(web-zh): add business_engines and business_engine_snapshots tables"
```

---

## Task 3: TypeScript 类型定义

**Files:**
- Modify: `src/types/index.ts`

**Interfaces:**
- Consumes: `RevenueRole`, `LifecycleStage`, `EngineTrend`, `EngineConfidence`, `EngineChangeType`, `CustomerSegment`, `MonetizationModel`（Task 1）
- Produces: `BusinessEngineEvidence`, `BusinessEngine`, `BusinessEngineSnapshot`, `ExtractedBusinessEngine` interfaces，导出自 `@/types`

- [ ] **Step 1: 在 `src/types/index.ts` 顶部 import 区块追加枚举导入**

找到文件开头的：
```typescript
import { Signal, RiskLevel, AlertLevel, AgentPersonality } from "./enums";
export { Signal, RiskLevel, AlertLevel, AgentPersonality };
```

替换为：
```typescript
import {
  Signal, RiskLevel, AlertLevel, AgentPersonality,
  RevenueRole, LifecycleStage, EngineTrend, EngineConfidence,
  EngineChangeType, CustomerSegment, MonetizationModel,
} from "./enums";
export {
  Signal, RiskLevel, AlertLevel, AgentPersonality,
  RevenueRole, LifecycleStage, EngineTrend, EngineConfidence,
  EngineChangeType, CustomerSegment, MonetizationModel,
};
```

- [ ] **Step 2: 在文件末尾（`CompanyDashboardSnapshot` interface 之后）追加**

```typescript
// ── Business Engine：公司赚钱路数追踪 ──

export interface BusinessEngineEvidence {
  source: string;
  source_type: "news" | "financial_statement";
  date: string;
  claim: string;
  direction: "POSITIVE" | "NEGATIVE" | "NEUTRAL";
  confidence: EngineConfidence;
}

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
  name: string;
  revenue_role: RevenueRole;
  lifecycle_stage: LifecycleStage;
  trend: EngineTrend;
  confidence: EngineConfidence;
  change_type: EngineChangeType;
  change_reason: string | null;
  created_at: string;
}

/** Python 端 business_engine_extractor.py 输出的单条结果（尚未落库，无 id/时间戳） */
export interface ExtractedBusinessEngine {
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

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错

- [ ] **Step 4: Commit**

```bash
git add src/types/index.ts
git commit -m "feat(web-zh): add Business Engine TypeScript types"
```

---

## Task 4: Zod schema 扩展 — `business_engine_scan` 字段

**Files:**
- Modify: `src/schemas/analysis-result.ts`

**Interfaces:**
- Consumes: 无新增外部依赖（纯 Zod schema 扩展）
- Produces: `TARawResultSchema` 新增可选字段 `business_engine_scan: ExtractedBusinessEngine[]`（运行时用字符串枚举校验，兜底空数组）

- [ ] **Step 1: 在 `TARawResultSchema` 的 `news_items` 字段之后、`financial_statement_analysis` 字段之前插入**

找到：
```typescript
  financial_statement_analysis: z.string().optional().default(""),
});
```

替换为：
```typescript
  financial_statement_analysis: z.string().optional().default(""),
  // 每个 Business Engine 的完整状态（Python 端 business_engine_extractor.py 输出）。
  // 历史样本 JSON 文件没有这个字段，且提取失败时上游兜底空数组，设为可选并兜底空数组。
  business_engine_scan: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        customer_segment: z.array(z.string()),
        product_or_service: z.string().nullable().optional(),
        monetization_model: z.array(z.string()),
        revenue_role: z.string(),
        lifecycle_stage: z.string(),
        trend: z.string(),
        confidence: z.string(),
        evidence: z.array(
          z.object({
            source: z.string(),
            source_type: z.enum(["news", "financial_statement"]),
            date: z.string(),
            claim: z.string(),
            direction: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
            confidence: z.string(),
          })
        ),
      })
    )
    .optional()
    .default([]),
});
```

**为什么 `revenue_role`/`lifecycle_stage`/`trend`/`confidence`/`customer_segment`/`monetization_model` 在 Zod 里用 `z.string()` 而不是 `z.enum(...)`：** Python 端和 Node 端枚举字符串值约定一致（Task 1 已定义），但 Zod 在这个边界层只做"这是字符串"的类型校验，不做枚举成员校验——如果 Python 端因 bug 输出了枚举表之外的值，宁可让它作为字符串进入下游、在 UI 展示层被 `Record<Enum, string>` 查表时得到 `undefined`（可观察的异常），也不要在这里直接让整个分析结果解析失败。这与 `signal: z.string()`（同一文件里现有字段）的处理方式一致。

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错

- [ ] **Step 3: Commit**

```bash
git add src/schemas/analysis-result.ts
git commit -m "feat(web-zh): validate business_engine_scan field in TARawResultSchema"
```

---

## Task 5: Python — `business_engine_extractor.py` + 单测

**Files:**
- Create: `tradingagents/dataflows/business_engine_extractor.py`
- Test: `tests/test_business_engine_extractor.py`

**Interfaces:**
- Produces: `BusinessEngineEvidence`（Pydantic）、`BusinessEngineItem`（Pydantic）、`BusinessEngineScan`（Pydantic）、`extract_business_engines(llm, ticker, company_name, fundamentals_report, financial_statement_analysis, news_items, known_engine_names, *, max_attempts=3) -> list[dict]`

- [ ] **Step 1: 写失败的测试**

创建 `tests/test_business_engine_extractor.py`：

```python
"""Tests for tradingagents.dataflows.business_engine_extractor.

Mirrors the mocking style in tests/test_financial_statement_extractor.py:
a MagicMock stands in for the LangChain chat model, and
`.with_structured_output(...)` is wired to return another MagicMock whose
`.invoke(...)` returns a pre-built Pydantic instance.
"""

from unittest.mock import MagicMock

import pytest

from tradingagents.dataflows.business_engine_extractor import (
    BusinessEngineEvidence,
    BusinessEngineItem,
    BusinessEngineScan,
    extract_business_engines,
)


def _news_items():
    return [
        {
            "title": "Azure 云业务营收同比增长 29%",
            "summary": "微软最新财报显示云计算业务持续扩张",
            "source": "Reuters",
            "url": "https://example.com/azure-news",
            "published_at": "2026-08-01T10:00:00.000Z",
            "category": "财报新闻",
        }
    ]


@pytest.mark.unit
class TestExtractBusinessEngines:
    def test_empty_inputs_returns_empty_without_calling_llm(self):
        llm = MagicMock()
        result = extract_business_engines(
            llm, "MSFT", "Microsoft", "", "", [], []
        )
        assert result == []
        llm.with_structured_output.assert_not_called()

    def test_returns_extracted_engines(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = BusinessEngineScan(
            engines=[
                BusinessEngineItem(
                    name="Azure",
                    description="通过企业云基础设施使用量获得收入。",
                    customer_segment=["ENTERPRISE", "DEVELOPER"],
                    product_or_service="Cloud Infrastructure",
                    monetization_model=["USAGE_BASED", "SUBSCRIPTION"],
                    revenue_role="CORE",
                    lifecycle_stage="SCALING",
                    trend="UP",
                    confidence="HIGH",
                    evidence=[
                        BusinessEngineEvidence(
                            source="Azure 云业务营收同比增长 29%",
                            source_type="news",
                            date="2026-08-01",
                            claim="云业务收入同比明显增长。",
                            direction="POSITIVE",
                            confidence="HIGH",
                        )
                    ],
                )
            ]
        )

        result = extract_business_engines(
            llm,
            "MSFT",
            "Microsoft",
            "# Fundamentals report...",
            "## 利润表\n云业务营收增长",
            _news_items(),
            known_engine_names=["Azure"],
        )

        assert len(result) == 1
        assert result[0]["name"] == "Azure"
        assert result[0]["revenue_role"] == "CORE"
        assert result[0]["evidence"][0]["claim"] == "云业务收入同比明显增长。"

    def test_with_structured_output_failure_propagates(self):
        llm = MagicMock()
        llm.with_structured_output.side_effect = RuntimeError("provider unavailable")

        with pytest.raises(RuntimeError, match="provider unavailable"):
            extract_business_engines(
                llm, "MSFT", "Microsoft", "some report", "", _news_items(), []
            )

    def test_structured_invoke_failure_propagates(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.side_effect = RuntimeError("timeout")

        with pytest.raises(RuntimeError, match="timeout"):
            extract_business_engines(
                llm, "MSFT", "Microsoft", "some report", "", _news_items(), []
            )

    def test_retries_when_structured_output_returns_none_then_succeeds(self):
        """某些模型（如 DeepSeek）偶尔 finish_reason=tool_calls 但参数为空，
        with_structured_output 会静默返回 None 而不抛错；应内部重试而不是让
        调用方把这当作硬失败并回退到空列表（导致 Business Engine 基线缺失）。"""
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.side_effect = [
            None,
            BusinessEngineScan(engines=[]),
        ]

        result = extract_business_engines(
            llm, "MSFT", "Microsoft", "some report", "", _news_items(), []
        )

        assert result == []
        assert structured_llm.invoke.call_count == 2

    def test_raises_after_max_attempts_all_none(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = None

        with pytest.raises(RuntimeError, match="Business Engine"):
            extract_business_engines(
                llm, "MSFT", "Microsoft", "some report", "", _news_items(), [],
                max_attempts=3,
            )
        assert structured_llm.invoke.call_count == 3
```

- [ ] **Step 2: 运行测试确认失败**

Run: `cd "/Users/donny2026/Downloads/TradingAgents 项目" && python3 -m pytest tests/test_business_engine_extractor.py -v`
Expected: `ModuleNotFoundError: No module named 'tradingagents.dataflows.business_engine_extractor'`

- [ ] **Step 3: 编写实现**

创建 `tradingagents/dataflows/business_engine_extractor.py`：

```python
"""从公司基本面报告 + 财报解读 + 结构化新闻中推断公司当前的赚钱路数（Business Engine）。

Python 端标准数据源（Finnhub/Alpha Vantage/yFinance）都只提供汇总财务数据，没有
分产品线/分地区的收入拆解，因此"公司现在靠什么赚钱"这件事无法从结构化数据里
查出来，必须靠 LLM 从现有文本素材里推断。复用 news_curator.py /
financial_statement_extractor.py 的思路：一次 with_structured_output 调用完成
识别 + 结构化输出，供 run_analysis_zh.py 在分析完成后调用。

严格要求：没有证据支撑的字段必须是 UNKNOWN，禁止编造收入占比/用户数/市场份额等
数值（这些字段本就不在输出结构里，从结构上杜绝）；每条 evidence 必须能追溯到
传入的 news_items 或 financial_statement_analysis 文本，不允许凭空生成来源。
"""

from __future__ import annotations

from typing import Any, Literal

from pydantic import BaseModel, Field

CustomerSegmentLiteral = Literal[
    "CONSUMER", "ENTERPRISE", "DEVELOPER", "ADVERTISER",
    "FINANCIAL_INSTITUTION", "GOVERNMENT", "SMB", "CREATOR",
    "PLATFORM_MERCHANT", "AI_COMPANY", "OTHER", "UNKNOWN",
]
MonetizationModelLiteral = Literal[
    "SUBSCRIPTION", "USAGE_BASED", "ADVERTISING", "TRANSACTION_FEE",
    "HARDWARE_SALES", "SOFTWARE_LICENSE", "PLATFORM_COMMISSION",
    "LONG_TERM_CONTRACT", "ONE_TIME_PURCHASE", "HYBRID", "UNKNOWN",
]
RevenueRoleLiteral = Literal[
    "CORE", "MAJOR", "EMERGING", "EXPERIMENTAL", "DECLINING", "UNKNOWN"
]
LifecycleStageLiteral = Literal[
    "ANNOUNCED", "LAUNCHED", "EARLY_ADOPTION", "REVENUE_GENERATING",
    "SCALING", "CORE", "DECLINING", "RESTRUCTURING", "ABANDONED", "UNKNOWN",
]
EngineTrendLiteral = Literal["UP", "STABLE", "DOWN", "UNKNOWN"]
EngineConfidenceLiteral = Literal["HIGH", "MEDIUM", "LOW"]


class BusinessEngineEvidence(BaseModel):
    source: str = Field(description="证据来源，如新闻标题原文或财报解读片段摘录")
    source_type: Literal["news", "financial_statement"]
    date: str = Field(description="证据对应的日期，YYYY-MM-DD")
    claim: str = Field(description="简体中文事实陈述，不含推断")
    direction: Literal["POSITIVE", "NEGATIVE", "NEUTRAL"]
    confidence: EngineConfidenceLiteral


class BusinessEngineItem(BaseModel):
    name: str = Field(description="具体的赚钱路数名称，专有名词保留英文原文，如 Azure/AWS/iPhone，不使用过于宽泛的词如 Cloud/AI")
    description: str = Field(description="一句话简体中文说明这项业务如何赚钱")
    customer_segment: list[CustomerSegmentLiteral]
    product_or_service: str | None = None
    monetization_model: list[MonetizationModelLiteral]
    revenue_role: RevenueRoleLiteral
    lifecycle_stage: LifecycleStageLiteral
    trend: EngineTrendLiteral
    confidence: EngineConfidenceLiteral
    evidence: list[BusinessEngineEvidence]


class BusinessEngineScan(BaseModel):
    engines: list[BusinessEngineItem]


def extract_business_engines(
    llm: Any,
    ticker: str,
    company_name: str,
    fundamentals_report: str,
    financial_statement_analysis: str,
    news_items: list[dict],
    known_engine_names: list[str],
    *,
    max_attempts: int = 3,
) -> list[dict]:
    """推断公司当前的 Business Engine 列表，返回可直接 JSON 序列化的 dict 列表。

    调用失败时直接抛出异常，不在这里静默兜底——由调用方（run_analysis_zh.py）
    决定如何降级并通过 emit() 让失败对用户/日志可见。
    """
    if not fundamentals_report.strip() and not financial_statement_analysis.strip() and not news_items:
        return []

    structured_llm = llm.with_structured_output(BusinessEngineScan)

    news_lines = "\n".join(
        f"- [{item.get('published_at', '')}] {item['title']}: {item.get('summary') or ''}"
        for item in news_items
    ) or "(无相关新闻)"

    known_names_line = ", ".join(known_engine_names) if known_engine_names else "(该公司此前没有已识别的 Business Engine)"

    prompt = f"""You are identifying {ticker} ({company_name})'s current "business engines" —
the distinct mechanisms through which the company earns revenue and cash flow from
customers. A business engine is NOT a generic label like "Technology" or "Cloud" —
it must be a specific, concrete revenue mechanism such as "Azure", "iPhone", "Google Search".

Known business engines already tracked for this company (reuse these exact names
when the evidence refers to the same business; do not invent a new name for the
same thing): {known_names_line}

For each business engine you can support with evidence, determine:
- name: the specific engine name (keep proper nouns in their original form, do not translate)
- description: one Simplified Chinese sentence explaining how it makes money
- customer_segment: who pays (pick from the fixed enum, UNKNOWN if unclear)
- product_or_service: what specifically is sold (or null if unclear)
- monetization_model: how it charges (pick from the fixed enum, UNKNOWN if unclear)
- revenue_role: its current importance to the company (CORE/MAJOR/EMERGING/EXPERIMENTAL/DECLINING/UNKNOWN)
- lifecycle_stage: how far it has progressed from being announced to being a core
  business (ANNOUNCED/LAUNCHED/EARLY_ADOPTION/REVENUE_GENERATING/SCALING/CORE/DECLINING/RESTRUCTURING/ABANDONED/UNKNOWN)
- trend: UP/STABLE/DOWN/UNKNOWN
- confidence: HIGH/MEDIUM/LOW based on how directly the evidence supports your judgment
- evidence: a list of concrete evidence items, each one MUST be traceable to the
  financial statement analysis or a specific news item below — do not fabricate
  a source. Each evidence's "claim" must be a factual statement in Simplified
  Chinese, not an inference.

STRICT RULES:
- If there is not enough evidence to determine a field, use UNKNOWN. Never guess
  revenue figures, revenue share, market share, user counts, adoption rates, or
  profit margins — those fields do not exist in this schema and must never appear
  inside description/evidence text either.
- Announcing a product is NOT the same as it generating revenue. Only mark
  REVENUE_GENERATING or higher lifecycle stages when there is explicit evidence
  of realized revenue, not just an announcement or launch.
- Do not manufacture a business engine that has no support in the material below.

Financial statement analysis (Simplified Chinese):
{financial_statement_analysis or "(无财报解读内容)"}

Fundamentals report:
{fundamentals_report or "(无基本面报告内容)"}

Recent news items:
{news_lines}"""

    result: BusinessEngineScan | None = None
    for _ in range(max_attempts):
        result = structured_llm.invoke(prompt)
        if result is not None:
            break
    if result is None:
        raise RuntimeError(
            f"Business Engine 提取在 {max_attempts} 次尝试后仍返回空结果（模型可能未正确返回结构化输出）"
        )

    return [item.model_dump() for item in result.engines]
```

- [ ] **Step 4: 运行测试确认通过**

Run: `cd "/Users/donny2026/Downloads/TradingAgents 项目" && python3 -m pytest tests/test_business_engine_extractor.py -v`
Expected: 6 个测试全部 PASS

- [ ] **Step 5: Commit**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
git add tradingagents/dataflows/business_engine_extractor.py tests/test_business_engine_extractor.py
git commit -m "feat: add business_engine_extractor for revenue-mechanism scan"
```

---

## Task 6: Python — 集成到 `run_analysis_zh.py`

**Files:**
- Modify: `website/api-server-zh/run_analysis_zh.py`

**Interfaces:**
- Consumes: `extract_business_engines(llm, ticker, company_name, fundamentals_report, financial_statement_analysis, news_items, known_engine_names, *, max_attempts=3) -> list[dict]`（Task 5）
- Produces: 最终返回 dict 新增键 `business_engine_scan: list[dict]`

- [ ] **Step 1: 在 `run_analysis` 函数内，`financial_statement_analysis` 计算之后追加调用**

找到（`run_analysis_zh.py` 第 82-84 行附近）：
```python
    financial_statement_analysis = _extract_financial_statement_analysis(
        ticker, final_state.get("fundamentals_report", ""), llm=graph.quick_thinking_llm
    )
```

在其后追加：
```python
    business_engine_scan = _extract_business_engines(
        ticker,
        company_name,
        final_state.get("fundamentals_report", ""),
        financial_statement_analysis,
        news_items,
        llm=graph.quick_thinking_llm,
    )
```

- [ ] **Step 2: 在返回的 dict 中新增字段**

找到（第 118-120 行附近）：
```python
        "news_items": news_items,
        "financial_statement_analysis": financial_statement_analysis,
    }
```

替换为：
```python
        "news_items": news_items,
        "financial_statement_analysis": financial_statement_analysis,
        "business_engine_scan": business_engine_scan,
    }
```

- [ ] **Step 3: 在 `_extract_financial_statement_analysis` 函数定义之后追加新的包装函数**

找到（第 172-186 行附近）：
```python
def _extract_financial_statement_analysis(
    ticker: str, fundamentals_report: str, llm=None
) -> str:
    if not fundamentals_report or llm is None:
        return ""

    try:
        from tradingagents.dataflows.financial_statement_extractor import (
            extract_financial_statement_analysis,
        )
        return extract_financial_statement_analysis(llm, ticker, fundamentals_report)
    except Exception as e:
        emit({"type": "warning", "message": f"财报解读提取失败: {e}"})
        return ""
```

在其后追加：
```python
def _extract_business_engines(
    ticker: str,
    company_name: str,
    fundamentals_report: str,
    financial_statement_analysis: str,
    news_items: list[dict],
    llm=None,
) -> list[dict]:
    if llm is None:
        return []

    try:
        from tradingagents.dataflows.business_engine_extractor import (
            extract_business_engines,
        )
        # 首次实现暂不查询已有 Business Engine 名称（该查询发生在 Node/Postgres 侧，
        # Python 子进程不持有数据库连接）；known_engine_names 留空列表，LLM 仍能正常
        # 识别业务，只是本次无法主动对齐历史命名——足够支撑第一阶段验收标准。
        return extract_business_engines(
            llm,
            ticker,
            company_name,
            fundamentals_report,
            financial_statement_analysis,
            news_items,
            known_engine_names=[],
        )
    except Exception as e:
        emit({"type": "warning", "message": f"Business Engine 提取失败: {e}"})
        return []
```

- [ ] **Step 4: 语法检查**

Run: `cd "/Users/donny2026/Downloads/TradingAgents 项目" && python3 -c "import ast; ast.parse(open('website/api-server-zh/run_analysis_zh.py').read())"`
Expected: 无输出（无语法错误）

- [ ] **Step 5: Commit**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
git add website/api-server-zh/run_analysis_zh.py
git commit -m "feat: wire business_engine_scan into run_analysis_zh.py output"
```

---

## Task 7: Node — 变化检测纯函数 `detectChange` + 单测

**Files:**
- Create: `src/lib/business-engine-diff.ts`
- Test: `src/lib/business-engine-diff.test.ts`

**Interfaces:**
- Consumes: `BusinessEngine`, `ExtractedBusinessEngine`（Task 3）, `RevenueRole`, `LifecycleStage`, `EngineTrend`, `EngineChangeType`（Task 1）
- Produces: `detectChange(previous: BusinessEngine | null, incoming: ExtractedBusinessEngine): { changeType: EngineChangeType; reason: string }`

- [ ] **Step 1: 写失败的测试**

创建 `src/lib/business-engine-diff.test.ts`：

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { detectChange } from "./business-engine-diff";
import {
  RevenueRole, LifecycleStage, EngineTrend, EngineConfidence, EngineChangeType,
} from "@/types/enums";
import type { BusinessEngine, ExtractedBusinessEngine } from "@/types";

function makeIncoming(overrides: Partial<ExtractedBusinessEngine> = {}): ExtractedBusinessEngine {
  return {
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: RevenueRole.CORE,
    lifecycle_stage: LifecycleStage.SCALING,
    trend: EngineTrend.STABLE,
    confidence: EngineConfidence.HIGH,
    evidence: [],
    ...overrides,
  };
}

function makePrevious(overrides: Partial<BusinessEngine> = {}): BusinessEngine {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: RevenueRole.CORE,
    lifecycle_stage: LifecycleStage.SCALING,
    trend: EngineTrend.STABLE,
    confidence: EngineConfidence.HIGH,
    evidence: [],
    last_verified_at: "2026-01-01T00:00:00.000Z",
    updated_at: "2026-01-01T00:00:00.000Z",
    ...overrides,
  };
}

test("detectChange：无历史记录时判定为 BASELINE", () => {
  const result = detectChange(null, makeIncoming());
  assert.equal(result.changeType, EngineChangeType.BASELINE);
});

test("detectChange：所有字段都不变时判定为 STABLE", () => {
  const result = detectChange(makePrevious(), makeIncoming());
  assert.equal(result.changeType, EngineChangeType.STABLE);
});

test("detectChange：revenue_role 从低到高变化时判定为 PROMOTED", () => {
  const previous = makePrevious({ revenue_role: RevenueRole.EMERGING });
  const incoming = makeIncoming({ revenue_role: RevenueRole.CORE });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.PROMOTED);
});

test("detectChange：revenue_role 从高到低变化时判定为 DEMOTED", () => {
  const previous = makePrevious({ revenue_role: RevenueRole.CORE });
  const incoming = makeIncoming({ revenue_role: RevenueRole.EMERGING });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.DEMOTED);
});

test("detectChange：trend 转为 DOWN 时判定为 WEAKENING", () => {
  const previous = makePrevious({ trend: EngineTrend.STABLE });
  const incoming = makeIncoming({ trend: EngineTrend.DOWN });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.WEAKENING);
});

test("detectChange：trend 转为 UP 时判定为 GROWING", () => {
  const previous = makePrevious({ trend: EngineTrend.STABLE });
  const incoming = makeIncoming({ trend: EngineTrend.UP });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.GROWING);
});

test("detectChange：lifecycle_stage 变为 ABANDONED 时判定为 ABANDONED，优先于其他判定", () => {
  const previous = makePrevious({
    revenue_role: RevenueRole.EMERGING,
    lifecycle_stage: LifecycleStage.SCALING,
  });
  const incoming = makeIncoming({
    revenue_role: RevenueRole.CORE, // 即便同时发生了"升级"，ABANDONED 优先
    lifecycle_stage: LifecycleStage.ABANDONED,
  });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.ABANDONED);
});

test("detectChange：UNKNOWN 之间的变化不产生虚假的 PROMOTED/DEMOTED", () => {
  const previous = makePrevious({ revenue_role: RevenueRole.UNKNOWN });
  const incoming = makeIncoming({ revenue_role: RevenueRole.UNKNOWN });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.STABLE);
});

test("detectChange：无法归类为明确升降的其他变化判定为 UNCERTAIN", () => {
  const previous = makePrevious({ confidence: EngineConfidence.LOW });
  const incoming = makeIncoming({ confidence: EngineConfidence.HIGH });
  const result = detectChange(previous, incoming);
  assert.equal(result.changeType, EngineChangeType.UNCERTAIN);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/lib/business-engine-diff.test.ts`
Expected: FAIL，报 `Cannot find module './business-engine-diff'`

- [ ] **Step 3: 编写实现**

创建 `src/lib/business-engine-diff.ts`：

```typescript
// 确定性的 Business Engine 状态变化判定：输入输出都是已校验过的枚举值，
// 不调用 LLM，保证"重复证据不能制造虚假变化"——变化类型必须可解释、可复现。
import {
  RevenueRole, LifecycleStage, EngineTrend, EngineChangeType,
} from "@/types/enums";
import type { BusinessEngine, ExtractedBusinessEngine } from "@/types";

const REVENUE_ROLE_RANK: Record<RevenueRole, number> = {
  [RevenueRole.DECLINING]: 0,
  [RevenueRole.EXPERIMENTAL]: 1,
  [RevenueRole.EMERGING]: 2,
  [RevenueRole.MAJOR]: 3,
  [RevenueRole.CORE]: 4,
  [RevenueRole.UNKNOWN]: -1, // UNKNOWN 不参与升降判断，见下方 compareRank 处理
};

function compareRoleRank(previous: RevenueRole, incoming: RevenueRole): number {
  if (previous === RevenueRole.UNKNOWN || incoming === RevenueRole.UNKNOWN) return 0;
  return REVENUE_ROLE_RANK[incoming] - REVENUE_ROLE_RANK[previous];
}

export function detectChange(
  previous: BusinessEngine | null,
  incoming: ExtractedBusinessEngine
): { changeType: EngineChangeType; reason: string } {
  if (!previous) {
    return { changeType: EngineChangeType.BASELINE, reason: "首次建立业务基线" };
  }

  if (
    incoming.lifecycle_stage === LifecycleStage.ABANDONED &&
    previous.lifecycle_stage !== LifecycleStage.ABANDONED
  ) {
    return { changeType: EngineChangeType.ABANDONED, reason: "公司已明确退出该业务" };
  }

  const roleRankChanged = compareRoleRank(previous.revenue_role, incoming.revenue_role);
  if (roleRankChanged > 0) {
    return { changeType: EngineChangeType.PROMOTED, reason: "营收角色升级" };
  }
  if (roleRankChanged < 0) {
    return { changeType: EngineChangeType.DEMOTED, reason: "营收角色降级" };
  }

  if (incoming.trend === EngineTrend.UP && previous.trend !== EngineTrend.UP) {
    return { changeType: EngineChangeType.GROWING, reason: "趋势转为上升" };
  }
  if (incoming.trend === EngineTrend.DOWN && previous.trend !== EngineTrend.DOWN) {
    return { changeType: EngineChangeType.WEAKENING, reason: "趋势转为下降" };
  }

  const noChange =
    previous.revenue_role === incoming.revenue_role &&
    previous.lifecycle_stage === incoming.lifecycle_stage &&
    previous.trend === incoming.trend &&
    previous.confidence === incoming.confidence;
  if (noChange) {
    return { changeType: EngineChangeType.STABLE, reason: "无明显变化" };
  }

  return {
    changeType: EngineChangeType.UNCERTAIN,
    reason: "状态发生变化但无法归类为明确的升级/降级",
  };
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/lib/business-engine-diff.test.ts`
Expected: 9 个测试全部 PASS

- [ ] **Step 5: Commit**

```bash
git add src/lib/business-engine-diff.ts src/lib/business-engine-diff.test.ts
git commit -m "feat(web-zh): add deterministic Business Engine change detection"
```

---

## Task 8: Node — 持久化事件订阅者 `write-business-engine.ts` + 单测

**Files:**
- Create: `src/lib/analysis-subscribers/write-business-engine.ts`
- Test: `src/lib/analysis-subscribers/write-business-engine.test.ts`
- Modify: `src/lib/persist-analysis-result.ts`

**Interfaces:**
- Consumes: `detectChange`（Task 7）, `on`/`emit`（`src/lib/event-bus.ts` 现有）, `getDb`（`src/lib/db.ts` 现有）, `AnalysisCompletedEvent`（`src/types/events.ts` 现有，`raw.business_engine_scan` 字段来自 Task 4）
- Produces: 副作用注册订阅者到 `analysis.completed` 事件；无导出函数（模式与 `write-thesis.ts`/`write-timeline-event.ts` 一致，import 即注册）

- [ ] **Step 1: 写失败的测试**

创建 `src/lib/analysis-subscribers/write-business-engine.test.ts`：

```typescript
import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import { EngineChangeType } from "@/types/enums";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-business-engine";

const TEST_TICKER_PREFIX = "TWBE";

async function createTestCompany(suffix: string): Promise<string> {
  const sql = getDb();
  const ticker = `${TEST_TICKER_PREFIX}${suffix}`;
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${ticker}, ${"测试公司-WriteBusinessEngine"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  return company.id;
}

async function createTestAnalysisResult(companyId: string, sessionId: string): Promise<string> {
  const sql = getDb();
  const [row] = await sql<{ id: string }[]>`
    insert into analysis_results (company_id, session_id, raw_json)
    values (${companyId}, ${sessionId}, ${sql.json({})})
    returning id
  `;
  return row.id;
}

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker like ${TEST_TICKER_PREFIX + "%"}`;
});

function makeEvent(
  companyId: string,
  analysisResultId: string,
  sessionId: string,
  scan: AnalysisCompletedEvent["raw"]["business_engine_scan"]
): AnalysisCompletedEvent {
  return {
    companyId,
    analysisResultId,
    sessionId,
    raw: {
      ticker: TEST_TICKER_PREFIX,
      signal: "BUY",
      business_engine_scan: scan,
    } as AnalysisCompletedEvent["raw"],
    detail: {} as AnalysisCompletedEvent["detail"],
  };
}

test("write-business-engine 订阅者在 business_engine_scan 为空时不写入", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("A");
  const analysisResultId = await createTestAnalysisResult(companyId, "test-session-wbe-empty");

  await emit("analysis.completed", makeEvent(companyId, analysisResultId, "test-session-wbe-empty", []));

  const rows = await sql`select id from business_engines where company_id = ${companyId}`;
  assert.equal(rows.length, 0, "空 scan 不应新增记录");
});

test("write-business-engine 订阅者首次写入时判定为 BASELINE", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("B");
  const analysisResultId = await createTestAnalysisResult(companyId, "test-session-wbe-baseline");

  await emit(
    "analysis.completed",
    makeEvent(companyId, analysisResultId, "test-session-wbe-baseline", [
      {
        name: "Azure",
        description: "云服务收入",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "CORE",
        lifecycle_stage: "SCALING",
        trend: "UP",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const engines = await sql`select * from business_engines where company_id = ${companyId}`;
  assert.equal(engines.length, 1);
  assert.equal(engines[0].name, "Azure");
  assert.equal(engines[0].revenue_role, "CORE");

  const snapshots = await sql`
    select change_type from business_engine_snapshots where company_id = ${companyId}
  `;
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].change_type, EngineChangeType.BASELINE);
});

test("write-business-engine 订阅者第二次分析时按历史状态比较并 upsert", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("C");
  const firstAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-first");

  await emit(
    "analysis.completed",
    makeEvent(companyId, firstAnalysisId, "test-session-wbe-first", [
      {
        name: "Azure",
        description: "云服务收入",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "EMERGING",
        lifecycle_stage: "SCALING",
        trend: "STABLE",
        confidence: "MEDIUM",
        evidence: [],
      },
    ])
  );

  const secondAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-second");
  await emit(
    "analysis.completed",
    makeEvent(companyId, secondAnalysisId, "test-session-wbe-second", [
      {
        name: "Azure",
        description: "云服务收入持续扩张",
        customer_segment: ["ENTERPRISE", "DEVELOPER"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED", "SUBSCRIPTION"],
        revenue_role: "CORE",
        lifecycle_stage: "CORE",
        trend: "UP",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const engines = await sql`select * from business_engines where company_id = ${companyId}`;
  assert.equal(engines.length, 1, "同名业务应 upsert 而非新增一行");
  assert.equal(engines[0].revenue_role, "CORE", "应更新为最新状态");

  const snapshots = await sql`
    select change_type from business_engine_snapshots
    where company_id = ${companyId} order by created_at asc
  `;
  assert.equal(snapshots.length, 2, "两次分析应各产生一条 snapshot，历史不覆盖");
  assert.equal(snapshots[0].change_type, EngineChangeType.BASELINE);
  assert.equal(snapshots[1].change_type, EngineChangeType.PROMOTED);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npm test -- src/lib/analysis-subscribers/write-business-engine.test.ts`
Expected: FAIL，报 `Cannot find module './write-business-engine'`

- [ ] **Step 3: 编写实现**

创建 `src/lib/analysis-subscribers/write-business-engine.ts`：

```typescript
import { on } from "../event-bus";
import { getDb } from "../db";
import { detectChange } from "../business-engine-diff";
import type { AnalysisCompletedEvent } from "@/types/events";
import type { BusinessEngine } from "@/types";

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

    const [engine] = await sql<{ id: string }[]>`
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

- [ ] **Step 4: 运行测试确认通过**

Run: `npm test -- src/lib/analysis-subscribers/write-business-engine.test.ts`
Expected: 3 个测试全部 PASS

- [ ] **Step 5: 在 `persist-analysis-result.ts` 注册新订阅者**

找到 `src/lib/persist-analysis-result.ts` 文件顶部：
```typescript
import "./analysis-subscribers/write-timeline-event";
import "./analysis-subscribers/write-thesis";
import "./analysis-subscribers/write-dashboard";
import "./analysis-subscribers/write-research-history";
```

替换为：
```typescript
import "./analysis-subscribers/write-timeline-event";
import "./analysis-subscribers/write-thesis";
import "./analysis-subscribers/write-dashboard";
import "./analysis-subscribers/write-research-history";
import "./analysis-subscribers/write-business-engine";
```

- [ ] **Step 6: 运行完整测试套件确认无回归**

Run: `npm test`
Expected: 全部测试 PASS（包括 `persist-analysis-result.test.ts` 里既有的端到端测试，因为新增订阅者对空 `business_engine_scan` 是 no-op，不影响原有断言）

- [ ] **Step 7: Commit**

```bash
git add src/lib/analysis-subscribers/write-business-engine.ts src/lib/analysis-subscribers/write-business-engine.test.ts src/lib/persist-analysis-result.ts
git commit -m "feat(web-zh): persist Business Engine state and history snapshots"
```

---

## Task 9: Node — 查询层 + API 路由

**Files:**
- Modify: `src/lib/company-research.ts`
- Create: `src/app/api/stocks/[ticker]/business-engines/route.ts`

**Interfaces:**
- Consumes: `findCompanyId`（`src/lib/company-research.ts` 现有私有函数）, `getDb`（现有）, `BusinessEngine`（Task 3）
- Produces: `getBusinessEngines(ticker: string): Promise<BusinessEngine[]>`；`GET /api/stocks/[ticker]/business-engines` 返回 `{ success: true, data: BusinessEngine[] }`

- [ ] **Step 1: 在 `src/lib/company-research.ts` 末尾追加查询函数**

追加到文件末尾：
```typescript

export async function getBusinessEngines(ticker: string): Promise<BusinessEngine[]> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return [];

  const sql = getDb();
  const rows = await sql<BusinessEngine[]>`
    select
      id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at
    from business_engines
    where company_id = ${companyId}
    order by
      case revenue_role
        when 'CORE' then 1
        when 'MAJOR' then 2
        when 'EMERGING' then 3
        when 'EXPERIMENTAL' then 4
        when 'DECLINING' then 5
        else 6
      end,
      name
  `;
  return rows;
}
```

同时在文件顶部的 type import 列表里追加 `BusinessEngine`：

找到：
```typescript
import type {
  TimelineEvent,
  Thesis,
  InvestmentRationale,
  ProphetIndicator,
  ResearchHistoryEntry,
  CompanyDashboardSnapshot,
} from "@/types";
```

替换为：
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
```

- [ ] **Step 2: 创建 API 路由**

创建 `src/app/api/stocks/[ticker]/business-engines/route.ts`：

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

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错

- [ ] **Step 4: 手动验证路由（需先有本地开发服务器运行且数据库有测试数据，若无测试数据可跳过，Task 8 的测试已覆盖底层写入逻辑）**

Run: `npm run dev &` 然后 `curl -s http://localhost:3001/api/stocks/AAPL/business-engines | head -c 500`
Expected: 返回 `{"success":true,"data":[]}`（若 AAPL 尚无 Business Engine 记录，空数组也是正确响应）；测试完成后终止 dev server 进程

- [ ] **Step 5: Commit**

```bash
git add src/lib/company-research.ts src/app/api/stocks/[ticker]/business-engines/route.ts
git commit -m "feat(web-zh): add getBusinessEngines query and API route"
```

---

## Task 10: Node — 中文文案文件 `content/business-engine.ts`

**Files:**
- Create: `src/content/business-engine.ts`

**Interfaces:**
- Consumes: `RevenueRole`, `LifecycleStage`, `EngineChangeType`, `CustomerSegment`, `MonetizationModel`, `EngineTrend`, `EngineConfidence`（Task 1）
- Produces: `REVENUE_ROLE_LABELS`, `LIFECYCLE_STAGE_LABELS`, `CHANGE_TYPE_LABELS`, `CUSTOMER_SEGMENT_LABELS`, `MONETIZATION_MODEL_LABELS`, `ENGINE_TREND_LABELS`, `ENGINE_CONFIDENCE_LABELS`（均为 `Record<Enum, string>`），以及 `BUSINESS_ENGINE_TEXT` 静态 UI 文案对象

- [ ] **Step 1: 创建 `src/content/business-engine.ts`**

```typescript
// website/web-zh/src/content/business-engine.ts
// Business Engine Tracker 板块的全部中文展示文案，组件内不出现硬编码字符串。

import {
  RevenueRole, LifecycleStage, EngineChangeType,
  CustomerSegment, MonetizationModel, EngineTrend, EngineConfidence,
} from "@/types/enums";

export const REVENUE_ROLE_LABELS: Record<RevenueRole, string> = {
  [RevenueRole.CORE]: "核心业务",
  [RevenueRole.MAJOR]: "主要业务",
  [RevenueRole.EMERGING]: "新兴业务",
  [RevenueRole.EXPERIMENTAL]: "实验性业务",
  [RevenueRole.DECLINING]: "衰退业务",
  [RevenueRole.UNKNOWN]: "未知",
};

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  [LifecycleStage.ANNOUNCED]: "已宣布",
  [LifecycleStage.LAUNCHED]: "已推出",
  [LifecycleStage.EARLY_ADOPTION]: "早期采用",
  [LifecycleStage.REVENUE_GENERATING]: "产生营收",
  [LifecycleStage.SCALING]: "规模化扩张",
  [LifecycleStage.CORE]: "核心运营",
  [LifecycleStage.DECLINING]: "衰退期",
  [LifecycleStage.RESTRUCTURING]: "重组中",
  [LifecycleStage.ABANDONED]: "已放弃",
  [LifecycleStage.UNKNOWN]: "未知",
};

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

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  [CustomerSegment.CONSUMER]: "消费者",
  [CustomerSegment.ENTERPRISE]: "企业",
  [CustomerSegment.DEVELOPER]: "开发者",
  [CustomerSegment.ADVERTISER]: "广告主",
  [CustomerSegment.FINANCIAL_INSTITUTION]: "金融机构",
  [CustomerSegment.GOVERNMENT]: "政府",
  [CustomerSegment.SMB]: "中小企业",
  [CustomerSegment.CREATOR]: "创作者",
  [CustomerSegment.PLATFORM_MERCHANT]: "平台商家",
  [CustomerSegment.AI_COMPANY]: "AI 公司",
  [CustomerSegment.OTHER]: "其他",
  [CustomerSegment.UNKNOWN]: "未知",
};

export const MONETIZATION_MODEL_LABELS: Record<MonetizationModel, string> = {
  [MonetizationModel.SUBSCRIPTION]: "订阅制",
  [MonetizationModel.USAGE_BASED]: "按使用量收费",
  [MonetizationModel.ADVERTISING]: "广告",
  [MonetizationModel.TRANSACTION_FEE]: "交易手续费",
  [MonetizationModel.HARDWARE_SALES]: "硬件销售",
  [MonetizationModel.SOFTWARE_LICENSE]: "软件授权",
  [MonetizationModel.PLATFORM_COMMISSION]: "平台抽佣",
  [MonetizationModel.LONG_TERM_CONTRACT]: "长期合同",
  [MonetizationModel.ONE_TIME_PURCHASE]: "一次性购买",
  [MonetizationModel.HYBRID]: "混合模式",
  [MonetizationModel.UNKNOWN]: "未知",
};

export const ENGINE_TREND_LABELS: Record<EngineTrend, string> = {
  [EngineTrend.UP]: "上升",
  [EngineTrend.STABLE]: "稳定",
  [EngineTrend.DOWN]: "下降",
  [EngineTrend.UNKNOWN]: "未知",
};

export const ENGINE_CONFIDENCE_LABELS: Record<EngineConfidence, string> = {
  [EngineConfidence.HIGH]: "高",
  [EngineConfidence.MEDIUM]: "中",
  [EngineConfidence.LOW]: "低",
};

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

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错

- [ ] **Step 3: Commit**

```bash
git add src/content/business-engine.ts
git commit -m "feat(web-zh): add Business Engine Chinese copy content file"
```

---

## Task 11: Node — UI 组件 `BusinessEnginesSection`

**Files:**
- Create: `src/components/stock/business-engines.tsx`
- Modify: `src/app/stock/[ticker]/page.tsx`

**Interfaces:**
- Consumes: `BusinessEngine`（Task 3）, `REVENUE_ROLE_LABELS`/`LIFECYCLE_STAGE_LABELS`/`CHANGE_TYPE_LABELS`/`CUSTOMER_SEGMENT_LABELS`/`MONETIZATION_MODEL_LABELS`/`ENGINE_TREND_LABELS`/`ENGINE_CONFIDENCE_LABELS`/`BUSINESS_ENGINE_TEXT`（Task 10）, `GET /api/stocks/[ticker]/business-engines`（Task 9）
- Produces: `BusinessEnginesSection({ ticker }: { ticker: string })` React 组件，替换页面里原 `<CompanyOverview ticker={ticker} />` 的位置

- [ ] **Step 1: 创建组件文件**

创建 `src/components/stock/business-engines.tsx`：

```tsx
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { BusinessEngine } from "../../types";
import { RevenueRole, EngineTrend } from "../../types/enums";
import {
  REVENUE_ROLE_LABELS,
  LIFECYCLE_STAGE_LABELS,
  CUSTOMER_SEGMENT_LABELS,
  MONETIZATION_MODEL_LABELS,
  ENGINE_CONFIDENCE_LABELS,
  BUSINESS_ENGINE_TEXT,
} from "../../content/business-engine";

interface Props {
  ticker: string;
}

const ROLE_ORDER = [
  RevenueRole.CORE,
  RevenueRole.MAJOR,
  RevenueRole.EMERGING,
  RevenueRole.EXPERIMENTAL,
  RevenueRole.DECLINING,
  RevenueRole.UNKNOWN,
];

function TrendIcon({ trend }: { trend: EngineTrend }) {
  if (trend === EngineTrend.UP) return <TrendingUp className="w-3.5 h-3.5 text-[var(--green)]" />;
  if (trend === EngineTrend.DOWN) return <TrendingDown className="w-3.5 h-3.5 text-[var(--red)]" />;
  return <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]/40" />;
}

function EngineCard({ engine }: { engine: BusinessEngine }) {
  const [expanded, setExpanded] = useState(false);

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
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        )}
      </button>

      <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
        {engine.description}
      </p>

      {expanded && (
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
        </div>
      )}
    </div>
  );
}

export function BusinessEnginesSection({ ticker }: Props) {
  const { data, isLoading } = useQuery<{ success: boolean; data: BusinessEngine[] }>({
    queryKey: ["stock-business-engines", ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}/business-engines`).then((r) => r.json()),
    retry: false,
  });

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
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {BUSINESS_ENGINE_TEXT.sectionTitle}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {BUSINESS_ENGINE_TEXT.cardTitle}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : engines.length === 0 ? (
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
                    <EngineCard key={engine.id} engine={engine} />
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

**为什么组件不展示"变化提示"**：`BusinessEngine`（当前状态表）本身不携带 `change_type`——那是 `BusinessEngineSnapshot` 才有的字段，需要单独查询历史表才能拿到"最近一次变化"。设计文档里的"变化提示"展示项依赖这份历史数据，而 spec 明确把"历史快照的可视化时间线组件"列为排除范围（下一阶段做），所以本阶段组件只使用 `BusinessEngine` 的当前状态字段，不引入 `EngineChangeType`/`CHANGE_TYPE_LABELS`。

- [ ] **Step 2: 在页面里替换组件**

修改 `src/app/stock/[ticker]/page.tsx`。

找到 import 区块：
```typescript
import { CompanyOverview } from "@/components/stock/company-overview";
```

替换为：
```typescript
import { BusinessEnginesSection } from "@/components/stock/business-engines";
```

找到渲染区块（第 453 行附近）：
```tsx
        <CompanyOverview ticker={ticker} />
```

替换为：
```tsx
        <BusinessEnginesSection ticker={ticker} />
```

- [ ] **Step 3: 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错（`src/components/stock/company-overview.tsx` 和其查询的 `/api/stocks/[ticker]/overview` 路由暂保留在代码库中不删除，只是页面不再引用它——`company_dashboard` 表和该组件仍可能被其他地方引用，删除属于范围外的清理工作）

- [ ] **Step 4: 运行完整测试套件**

Run: `npm test`
Expected: 全部测试 PASS

- [ ] **Step 5: 运行 lint**

Run: `npm run lint`
Expected: 无新增报错（`business-engines.tsx` 和 `business-engine.ts` 内容文件应通过 ESLint 检查）

- [ ] **Step 6: 手动验证 UI（启动开发服务器，浏览器访问一个已有分析数据的股票详情页）**

Run: `npm run dev`

浏览器打开 `http://localhost:3001/stock/AAPL`（或数据库里任意已有分析结果的 ticker），确认：
- 页面上原"公司概览"位置现在显示"商业引擎"标题和"赚钱路数追踪"卡片
- 若该股票尚无 `business_engines` 记录，显示"尚未建立业务基线"空态
- 若有记录，按核心/主要/新兴/实验性/衰退分组展示，点击卡片可展开查看客户群体/产品服务/变现模式/置信度/证据

确认后终止开发服务器进程（`Ctrl+C` 或 kill 对应进程）。

- [ ] **Step 7: Commit**

```bash
git add src/components/stock/business-engines.tsx src/app/stock/[ticker]/page.tsx
git commit -m "feat(web-zh): render Business Engine Tracker on stock detail page"
```

---

## Task 12: 端到端回归验证

**Files:**
- 无新增/修改文件（纯验证任务）

**Interfaces:**
- 无

- [ ] **Step 1: 运行完整 TypeScript 测试套件**

Run: `cd "/Users/donny2026/Downloads/TradingAgents 项目/website/web-zh" && npm test`
Expected: 全部测试 PASS，包括 `persist-analysis-result.test.ts` 里既有的端到端测试（company/analysis_result/timeline/thesis/dashboard/research_history 六张表）继续通过，新增的 `business-engine-diff.test.ts` 和 `write-business-engine.test.ts` 也通过

- [ ] **Step 2: 运行完整 lint**

Run: `npm run lint`
Expected: 无报错

- [ ] **Step 3: 运行完整 TypeScript 类型检查**

Run: `npx tsc --noEmit -p tsconfig.json`
Expected: 无新增报错（相对于本计划开始前的基线）

- [ ] **Step 4: 运行 Next.js 生产构建**

Run: `npm run build`
Expected: 构建成功，无编译错误

- [ ] **Step 5: 运行 Python 测试套件**

Run: `cd "/Users/donny2026/Downloads/TradingAgents 项目" && python3 -m pytest tests/test_business_engine_extractor.py tests/test_financial_statement_extractor.py tests/test_news_curator.py -v`
Expected: 全部 PASS（确认新模块不影响已有的两个同模式模块）

- [ ] **Step 6: 汇总报告**

按原始需求文档（`website/Website optimization/260817 Business Engine Track.md` 第五十一节）格式，整理一份简短的实施结果说明，包含：新增文件列表、修改文件列表、数据库迁移是否已应用、测试结果（lint/typecheck/test/build 各自 PASS/FAIL）、已知限制（本阶段 `known_engine_names` 未从数据库回填给 Python 端、批量回填历史公司未做、历史快照可视化未做）。

---

## 明确排除范围（本计划不做，对应设计文档"排除范围"章节）

- 护城河、竞争优势评分、ROIC、资本配置、投资论点、估值、股票评级、买入/卖出建议、风险评分、Opportunity Score、Moat Score、Company Quality Score
- 批量回填已有公司的历史 Business Engine 数据
- 独立的证据采集/存储体系
- 复杂的 Business Engine Map 可视化图表
- 历史快照的可视化时间线组件（`business_engine_snapshots` 数据已可查询，UI 展示留给下一阶段）
- 变化重要性分级筛选（高/中/低）
- 从数据库回填 `known_engine_names` 给 Python 端（Task 6 的实现说明里已记录为已知限制，下一阶段可通过 FastAPI 请求体传入已有名称列表来补上）

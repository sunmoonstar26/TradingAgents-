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

from typing import Any, Literal, Optional

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
    product_or_service: Optional[str] = None
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

"""从完整基本面报告中只提取财报三表（资产负债表/现金流量表/利润表）相关解读。

fundamentals_analyst.py 生成的 fundamentals_report 混合了公司概况、估值倍数、
风险因素等内容，且章节标题每次运行都不固定（英文报告用 "5. Balance Sheet
Analysis"，中文报告用 "三、资产负债表健康度分析"），无法用标题/正则匹配稳定
提取。这里复用 news_curator.py 的思路：一次 LLM 调用完成"识别财报三表相关内容
+ 只保留这部分 + 译成简体中文"，供 run_analysis_zh.py 在分析完成后调用。
"""

from __future__ import annotations

from typing import Any

from pydantic import BaseModel, Field


class FinancialStatementAnalysis(BaseModel):
    analysis_zh: str = Field(
        description=(
            "仅保留原报告中与资产负债表、现金流量表、利润表（营收/利润/费用）"
            "直接相关的解读内容，译成简体中文的 Markdown 文本；"
            "不包含公司概况、估值倍数（PE/PB/PS等）、股价/Beta、泛化风险因素等内容。"
            "若原报告完全没有财报三表相关内容，返回空字符串。"
        )
    )


def extract_financial_statement_analysis(
    llm: Any, ticker: str, fundamentals_report: str, *, max_attempts: int = 3
) -> str:
    """从 fundamentals_report 中只提取财报三表相关解读，译成简体中文。

    调用失败时直接抛出异常，不在这里静默兜底——由调用方（run_analysis_zh.py）
    决定如何降级并通过 emit() 让失败对用户/日志可见，避免失败被吞掉却无处可查。
    """
    if not fundamentals_report or not fundamentals_report.strip():
        return ""

    structured_llm = llm.with_structured_output(FinancialStatementAnalysis)
    prompt = f"""Below is a fundamental analysis report for {ticker}. The report's
section structure and headings vary run to run, so identify the relevant
content by meaning, not by heading text.

Extract and rewrite ONLY the parts that interpret the three financial
statements — balance sheet, cash flow statement, and income statement
(revenue/profit/margins/expenses) — into a single well-organized Simplified
Chinese Markdown text. Preserve concrete numbers, tables, and the analyst's
qualitative judgments about financial health, profitability, and cash flow
quality.

Exclude: company overview/profile, valuation multiples (P/E, P/B, P/S, PEG),
stock price/beta/52-week range, dividend yield, generic risk factors unless
they are a direct commentary on a financial statement line item, and any
overall rating/verdict/executive-summary/investment-recommendation section
(e.g. "Rating: Underweight", "Executive Summary", overall conclusion tables)
— those are trading calls, not financial-statement interpretation, and must
not appear in the output even if the report places them near financial data.

If the report contains no financial-statement content at all, return an
empty string.

Report:
{fundamentals_report}"""

    # 部分模型（如 DeepSeek）偶尔会返回 finish_reason=tool_calls 但工具调用参数
    # 为空，此时 langchain 的 with_structured_output 不会抛错，而是静默返回
    # None——不重试会导致 result.analysis_zh 直接 AttributeError，被调用方当作
    # 硬失败兜底为空字符串。这里先内部重试几次再兜底。
    result: FinancialStatementAnalysis | None = None
    for _ in range(max_attempts):
        result = structured_llm.invoke(prompt)
        if result is not None:
            break
    if result is None:
        raise RuntimeError(
            f"财报解读提取在 {max_attempts} 次尝试后仍返回空结果（模型可能未正确返回结构化输出）"
        )

    return result.analysis_zh.strip()


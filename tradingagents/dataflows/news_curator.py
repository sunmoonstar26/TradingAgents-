"""筛选相关性 + 翻译为中文 + 主题分类，一次结构化 LLM 调用完成三件事。

Finnhub /company-news 按 symbol 抓取仍会混入弱相关/纯提及型新闻，且原文是英文。
这个模块把"是否真正相关"、"翻译成中文"、"归类到哪个主题"三件事合并为
一次 with_structured_output 调用，供 run_analysis_zh.py 在分析完成后调用。
"""

from __future__ import annotations

from enum import Enum
from typing import Any

from pydantic import BaseModel, Field


class NewsCategory(str, Enum):
    COMPANY = "公司新闻"
    EXECUTIVE = "高管新闻"
    EARNINGS = "财报新闻"
    INDUSTRY = "行业新闻"
    MACRO = "宏观新闻"
    OTHER = "其他"


class CuratedNewsItem(BaseModel):
    index: int = Field(description="对应输入新闻列表的下标（从0开始）")
    is_relevant: bool = Field(
        description="该新闻是否与目标公司真正相关（非仅泛泛提及）"
    )
    title_zh: str = Field(description="新闻标题的简体中文翻译")
    summary_zh: str | None = Field(
        default=None, description="新闻摘要的简体中文翻译，若原文无摘要则为空"
    )
    category: NewsCategory = Field(description="该新闻所属主题分类")


class CuratedNewsBatch(BaseModel):
    items: list[CuratedNewsItem]


def curate_news(
    llm: Any, ticker: str, company_name: str, raw_items: list[dict], *, max_attempts: int = 3
) -> list[dict]:
    """筛选相关性 + 翻译为中文 + 主题分类。

    raw_items 每项含 title/summary/source/url/published_at（英文原文，来自 Finnhub）。
    返回过滤掉不相关新闻后的列表，每项新增 title（中文标题，覆盖英文）、
    summary（中文摘要，覆盖英文）、category 字段，其余字段（source/url/published_at）保持不变。

    调用失败时直接抛出异常，不在这里静默兜底——由调用方（run_analysis_zh.py）
    决定如何降级并通过 emit() 让失败对用户/日志可见，避免失败被吞掉却无处可查。
    """
    if not raw_items:
        return []

    structured_llm = llm.with_structured_output(CuratedNewsBatch)
    news_lines = "\n".join(
        f"{i}. [{item['title']}] {item.get('summary') or ''}"
        for i, item in enumerate(raw_items)
    )
    prompt = f"""You are screening news for {ticker} ({company_name})'s investor timeline.

For each numbered news item below, decide:
1. is_relevant: true only if the news is substantively about {ticker}/{company_name} itself
   (not just a passing mention in a broader list/roundup article)
2. title_zh: translate the title to Simplified Chinese
3. summary_zh: translate the summary to Simplified Chinese (null if no summary)
4. category: pick exactly one — 公司新闻 / 高管新闻 / 财报新闻 / 行业新闻 / 宏观新闻 / 其他

News items:
{news_lines}

Return one entry per input item (same index), even if is_relevant is false."""

    # 部分模型（如 DeepSeek）偶尔会返回 finish_reason=tool_calls 但工具调用参数
    # 为空，此时 langchain 的 with_structured_output 不会抛错，而是静默返回
    # None——不重试会导致 result.items 直接 AttributeError，被调用方当作硬失败
    # 兜底为未翻译的英文原文（正是用户看到的 bug）。这里先内部重试几次再兜底。
    result: CuratedNewsBatch | None = None
    for _ in range(max_attempts):
        result = structured_llm.invoke(prompt)
        if result is not None:
            break
    if result is None:
        raise RuntimeError(
            f"新闻筛选/翻译在 {max_attempts} 次尝试后仍返回空结果（模型可能未正确返回结构化输出）"
        )

    curated = []
    for entry in result.items:
        if not entry.is_relevant or entry.index >= len(raw_items):
            continue
        original = raw_items[entry.index]
        curated.append(
            {
                **original,
                "title": entry.title_zh,
                "summary": entry.summary_zh,
                "category": entry.category.value,
            }
        )
    return curated


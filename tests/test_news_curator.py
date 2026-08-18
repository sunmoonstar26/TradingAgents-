"""Tests for tradingagents.dataflows.news_curator.

Mirrors the mocking style in tests/test_structured_agents.py: a MagicMock
stands in for the LangChain chat model, and `.with_structured_output(...)`
is wired to return another MagicMock whose `.invoke(...)` returns a
pre-built Pydantic instance.
"""

from unittest.mock import MagicMock

import pytest

from tradingagents.dataflows.news_curator import (
    CuratedNewsBatch,
    CuratedNewsItem,
    NewsCategory,
    curate_news,
)


def _raw_items():
    return [
        {
            "title": "Company X reports record profit",
            "summary": "Earnings beat expectations",
            "source": "Reuters",
            "url": "https://example.com/1",
            "published_at": "2026-07-20T10:00:00.000Z",
        },
        {
            "title": "10 stocks to watch this week",
            "summary": "A roundup mentioning many companies",
            "source": "Yahoo",
            "url": "https://example.com/2",
            "published_at": "2026-07-21T10:00:00.000Z",
        },
    ]


@pytest.mark.unit
class TestCurateNews:
    def test_empty_input_returns_empty_without_calling_llm(self):
        llm = MagicMock()
        result = curate_news(llm, "AAPL", "Apple Inc.", [])
        assert result == []
        llm.with_structured_output.assert_not_called()

    def test_filters_irrelevant_and_translates_and_categorizes(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = CuratedNewsBatch(
            items=[
                CuratedNewsItem(
                    index=0,
                    is_relevant=True,
                    title_zh="公司X公布创纪录利润",
                    summary_zh="盈利超预期",
                    category=NewsCategory.EARNINGS,
                ),
                CuratedNewsItem(
                    index=1,
                    is_relevant=False,
                    title_zh="本周值得关注的10只股票",
                    summary_zh=None,
                    category=NewsCategory.OTHER,
                ),
            ]
        )

        result = curate_news(llm, "AAPL", "Apple Inc.", _raw_items())

        assert len(result) == 1
        assert result[0]["title"] == "公司X公布创纪录利润"
        assert result[0]["summary"] == "盈利超预期"
        assert result[0]["category"] == "财报新闻"
        # Original non-LLM fields (source/url/published_at) must be preserved.
        assert result[0]["source"] == "Reuters"
        assert result[0]["url"] == "https://example.com/1"
        assert result[0]["published_at"] == "2026-07-20T10:00:00.000Z"

    def test_with_structured_output_failure_propagates(self):
        llm = MagicMock()
        llm.with_structured_output.side_effect = RuntimeError("provider unavailable")

        with pytest.raises(RuntimeError, match="provider unavailable"):
            curate_news(llm, "AAPL", "Apple Inc.", _raw_items())

    def test_structured_invoke_failure_propagates(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.side_effect = RuntimeError("timeout")

        with pytest.raises(RuntimeError, match="timeout"):
            curate_news(llm, "AAPL", "Apple Inc.", _raw_items())

    def test_out_of_range_index_is_skipped(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = CuratedNewsBatch(
            items=[
                CuratedNewsItem(
                    index=5,
                    is_relevant=True,
                    title_zh="不存在的下标",
                    summary_zh=None,
                    category=NewsCategory.OTHER,
                ),
            ]
        )

        result = curate_news(llm, "AAPL", "Apple Inc.", _raw_items())
        assert result == []

    def test_retries_when_structured_output_returns_none_then_succeeds(self):
        """某些模型（如 DeepSeek）偶尔 finish_reason=tool_calls 但参数为空，
        with_structured_output 会静默返回 None 而不抛错；curate_news 应内部
        重试而不是让调用方把这当作硬失败并回退到未翻译的英文原文。"""
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        good_batch = CuratedNewsBatch(
            items=[
                CuratedNewsItem(
                    index=0,
                    is_relevant=True,
                    title_zh="公司X公布创纪录利润",
                    summary_zh="盈利超预期",
                    category=NewsCategory.EARNINGS,
                ),
                CuratedNewsItem(
                    index=1,
                    is_relevant=False,
                    title_zh="本周值得关注的10只股票",
                    summary_zh=None,
                    category=NewsCategory.OTHER,
                ),
            ]
        )
        structured_llm.invoke.side_effect = [None, good_batch]

        result = curate_news(llm, "AAPL", "Apple Inc.", _raw_items())

        assert structured_llm.invoke.call_count == 2
        assert len(result) == 1
        assert result[0]["title"] == "公司X公布创纪录利润"

    def test_raises_when_structured_output_always_returns_none(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = None

        with pytest.raises(RuntimeError, match="仍返回空结果"):
            curate_news(llm, "AAPL", "Apple Inc.", _raw_items(), max_attempts=3)

        assert structured_llm.invoke.call_count == 3

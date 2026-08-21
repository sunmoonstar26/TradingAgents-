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

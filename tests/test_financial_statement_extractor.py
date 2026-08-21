"""Tests for tradingagents.dataflows.financial_statement_extractor.

Mirrors the mocking style in tests/test_news_curator.py: a MagicMock stands
in for the LangChain chat model, and `.with_structured_output(...)` is wired
to return another MagicMock whose `.invoke(...)` returns a pre-built
Pydantic instance.
"""

from unittest.mock import MagicMock

import pytest

from tradingagents.dataflows.financial_statement_extractor import (
    FinancialStatementAnalysis,
    extract_financial_statement_analysis,
)


@pytest.mark.unit
class TestExtractFinancialStatementAnalysis:
    def test_empty_report_returns_empty_without_calling_llm(self):
        llm = MagicMock()
        result = extract_financial_statement_analysis(llm, "AAPL", "")
        assert result == ""
        llm.with_structured_output.assert_not_called()

    def test_returns_extracted_analysis(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = FinancialStatementAnalysis(
            analysis_zh="## 利润表\n营收同比增长5%。"
        )

        result = extract_financial_statement_analysis(
            llm, "AAPL", "# Fundamentals report...\n## Rating: Overweight..."
        )

        assert result == "## 利润表\n营收同比增长5%。"

    def test_with_structured_output_failure_propagates(self):
        llm = MagicMock()
        llm.with_structured_output.side_effect = RuntimeError("provider unavailable")

        with pytest.raises(RuntimeError, match="provider unavailable"):
            extract_financial_statement_analysis(llm, "AAPL", "some report")

    def test_structured_invoke_failure_propagates(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.side_effect = RuntimeError("timeout")

        with pytest.raises(RuntimeError, match="timeout"):
            extract_financial_statement_analysis(llm, "AAPL", "some report")

    def test_retries_when_structured_output_returns_none_then_succeeds(self):
        """某些模型（如 DeepSeek）偶尔 finish_reason=tool_calls 但参数为空，
        with_structured_output 会静默返回 None 而不抛错；应内部重试而不是让
        调用方把这当作硬失败并回退到空字符串（导致财报解读版本历史缺失）。"""
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.side_effect = [
            None,
            FinancialStatementAnalysis(analysis_zh="## 资产负债表\n负债率低。"),
        ]

        result = extract_financial_statement_analysis(llm, "AAPL", "some report")

        assert structured_llm.invoke.call_count == 2
        assert result == "## 资产负债表\n负债率低。"

    def test_raises_when_structured_output_always_returns_none(self):
        llm = MagicMock()
        structured_llm = MagicMock()
        llm.with_structured_output.return_value = structured_llm
        structured_llm.invoke.return_value = None

        with pytest.raises(RuntimeError, match="仍返回空结果"):
            extract_financial_statement_analysis(
                llm, "AAPL", "some report", max_attempts=3
            )

        assert structured_llm.invoke.call_count == 3

from langchain_core.messages import HumanMessage, RemoveMessage

# Import tools from separate utility files
from tradingagents.agents.utils.core_stock_tools import (
    get_stock_data
)
from tradingagents.agents.utils.technical_indicators_tools import (
    get_indicators
)
from tradingagents.agents.utils.fundamental_data_tools import (
    get_fundamentals,
    get_balance_sheet,
    get_cashflow,
    get_income_statement
)
from tradingagents.agents.utils.news_data_tools import (
    get_news,
    get_insider_transactions,
    get_global_news
)


def get_language_instruction() -> str:
    """Return a prompt instruction for the configured output language."""
    from tradingagents.dataflows.config import get_config
    lang = get_config().get("output_language", "English")
    if lang.strip().lower() in ("english", "en"):
        return ""

    # 对中文明确要求简体，避免 DeepSeek 等模型输出繁体
    if "chinese" in lang.strip().lower():
        return (
            "\n\n**CRITICAL LANGUAGE REQUIREMENT — SIMPLIFIED CHINESE (简体中文) ONLY:**\n"
            "You MUST write your ENTIRE response in Simplified Chinese (简体中文).\n"
            "All headers, analysis content, data labels, table text, "
            "conclusions, and commentary must be in Simplified Chinese.\n"
            "Do NOT use Traditional Chinese (繁體中文). Do NOT include any English in your output.\n"
            "Use mainland China standard simplified characters throughout.\n"
            "这是强制要求：必须全部使用简体中文（大陆标准）回复，禁止使用繁体字。"
        )
    return (
        f"\n\n**CRITICAL LANGUAGE REQUIREMENT — {lang} ONLY:**\n"
        f"You MUST write your ENTIRE response in {lang}.\n"
        f"All headers, analysis content, data labels, table text, "
        f"conclusions, and commentary must be in {lang}.\n"
        f"Do NOT include any English in your output.\n"
        f"这是强制要求，必须全部使用{lang}回复。"
    )


def build_instrument_context(ticker: str, asset_type: str = "stock") -> str:
    """Describe the exact instrument so agents preserve exchange-qualified tickers."""
    instrument_label = "asset" if asset_type == "crypto" else "instrument"
    extra_hint = (
        " Treat it as a crypto asset rather than a company, and do not assume company fundamentals are available."
        if asset_type == "crypto"
        else ""
    )
    return (
        f"The {instrument_label} to analyze is `{ticker}`. "
        "Use this exact ticker in every tool call, report, and recommendation, "
        "preserving any exchange suffix (e.g. `.TO`, `.L`, `.HK`, `.T`, `-USD`)."
        + extra_hint
    )

def create_msg_delete():
    def delete_messages(state):
        """Clear messages and add placeholder for Anthropic compatibility"""
        messages = state["messages"]

        # Remove all messages
        removal_operations = [RemoveMessage(id=m.id) for m in messages]

        # Add a minimal placeholder message (空格而非 "Continue"，避免 LLM 将其输出到报告中)
        placeholder = HumanMessage(content=" ")

        return {"messages": removal_operations + [placeholder]}

    return delete_messages


        

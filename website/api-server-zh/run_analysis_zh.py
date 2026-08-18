#!/usr/bin/env python3
"""
TradingAgents 中文分析包装器 — 由 api-server-zh 以独立子进程调用

每次分析请求启动一个新进程，Python 全局状态完全隔离，消除并发时语言混杂问题。
语言固定为简体中文，通过环境变量 TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese 保证。

用法:
  python3 run_analysis_zh.py --ticker BILI --date 2026-05-21 --market US --output /path/result.json
"""

import argparse
import json
import os
import sys
import datetime
import time
from pathlib import Path
from typing import Optional

# 路径: api-server-zh/run_analysis_zh.py → api-server-zh → website → TradingAgents 项目
TA_ROOT = Path(__file__).resolve().parent.parent.parent
sys.path.insert(0, str(TA_ROOT))

# 加载 .env
env_path = TA_ROOT / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                k, _, v = line.partition("=")
                k, v = k.strip(), v.strip()
                if k and v:
                    os.environ[k] = v

# 强制中文输出，覆盖 .env 中可能存在的 TRADINGAGENTS_OUTPUT_LANGUAGE=en
os.environ["TRADINGAGENTS_OUTPUT_LANGUAGE"] = "Chinese"


def emit(data: dict) -> None:
    sys.stdout.write(json.dumps(data, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def run_analysis(ticker: str, analysis_date: str, market: str) -> dict:
    from tradingagents.graph.trading_graph import TradingAgentsGraph
    from tradingagents.default_config import DEFAULT_CONFIG
    from langchain_core.callbacks.usage import UsageMetadataCallbackHandler

    asset_type = "crypto" if market.upper() == "CRYPTO" else "stock"
    config = DEFAULT_CONFIG.copy()
    config["results_dir"] = str(TA_ROOT / "logs")
    config["data_cache_dir"] = str(TA_ROOT / "cache")
    # 进程内再显式覆盖一次，防止 DEFAULT_CONFIG.copy() 拿到旧值
    config["output_language"] = "Chinese"

    emit({"type": "status", "step": "init", "message": f"初始化分析引擎", "ticker": ticker})

    usage_handler = UsageMetadataCallbackHandler()
    graph = TradingAgentsGraph(debug=False, config=config, callbacks=[usage_handler])

    emit({"type": "status", "step": "running", "message": f"多智能体分析中: {ticker}"})

    started_at = time.time()
    final_state, decision = graph.propagate(ticker, analysis_date, asset_type=asset_type)
    runtime_ms = int((time.time() - started_at) * 1000)

    total_tokens = sum(
        (usage.get("total_tokens") or 0) for usage in usage_handler.usage_metadata.values()
    )
    model_label = f"{config['deep_think_llm']}/{config['quick_think_llm']}"

    emit({"type": "status", "step": "completed", "message": f"分析完成，决策: {decision}"})

    report_dir = _save_report_files(ticker, final_state, decision)
    market_data = _fetch_market_data(ticker)
    company_name = final_state.get("company_of_interest", ticker)
    news_items = _fetch_news_items(
        ticker, analysis_date, llm=graph.quick_thinking_llm, company_name=company_name
    )
    financial_statement_analysis = _extract_financial_statement_analysis(
        ticker, final_state.get("fundamentals_report", ""), llm=graph.quick_thinking_llm
    )
    business_engine_scan = _extract_business_engines(
        ticker,
        company_name,
        final_state.get("fundamentals_report", ""),
        financial_statement_analysis,
        news_items,
        llm=graph.quick_thinking_llm,
    )

    return {
        "ticker": ticker.upper(),
        "company_name": final_state.get("company_of_interest", ticker),
        "trade_date": str(final_state.get("trade_date", analysis_date)),
        "signal": decision,
        "report_dir": str(report_dir) if report_dir else None,
        "market_report": final_state.get("market_report", ""),
        "sentiment_report": final_state.get("sentiment_report", ""),
        "news_report": final_state.get("news_report", ""),
        "fundamentals_report": final_state.get("fundamentals_report", ""),
        "investment_plan": final_state.get("investment_plan", ""),
        "investment_debate_state": {
            "bull_history": final_state.get("investment_debate_state", {}).get("bull_history", ""),
            "bear_history": final_state.get("investment_debate_state", {}).get("bear_history", ""),
            "judge_decision": final_state.get("investment_debate_state", {}).get("judge_decision", ""),
        },
        "trader_investment_plan": final_state.get("trader_investment_plan", ""),
        "risk_debate_state": {
            "aggressive_history": final_state.get("risk_debate_state", {}).get("aggressive_history", ""),
            "conservative_history": final_state.get("risk_debate_state", {}).get("conservative_history", ""),
            "neutral_history": final_state.get("risk_debate_state", {}).get("neutral_history", ""),
            "judge_decision": final_state.get("risk_debate_state", {}).get("judge_decision", ""),
        },
        "final_trade_decision": final_state.get("final_trade_decision", ""),
        "price": market_data["price"],
        "change": market_data["change"],
        "changePercent": market_data["changePercent"],
        "marketCap": market_data["marketCap"],
        "pe": market_data["pe"],
        "runtime_ms": runtime_ms,
        "token_usage": total_tokens,
        "model": model_label,
        "news_items": news_items,
        "financial_statement_analysis": financial_statement_analysis,
        "business_engine_scan": business_engine_scan,
    }


def _fetch_market_data(ticker: str) -> dict:
    try:
        import requests
        key = os.environ.get("FINNHUB_API_KEY", "")
        sym = ticker.upper()
        quote = requests.get(f"https://finnhub.io/api/v1/quote?symbol={sym}&token={key}", timeout=10).json()
        profile = requests.get(f"https://finnhub.io/api/v1/stock/profile2?symbol={sym}&token={key}", timeout=10).json()
        metric_data = requests.get(f"https://finnhub.io/api/v1/stock/metric?symbol={sym}&metric=all&token={key}", timeout=10).json()
        metric = metric_data.get("metric", {}) if isinstance(metric_data, dict) else {}

        price = quote.get("c", 0)
        change = quote.get("d", 0)
        change_pct = quote.get("dp", 0)
        mcap_m = metric.get("marketCapitalization") or profile.get("marketCapitalization")
        if mcap_m:
            mcap_m = float(mcap_m)
            market_cap = f"{mcap_m/1000:.2f}B" if mcap_m >= 1000 else f"{mcap_m:.0f}M"
        else:
            market_cap = "待更新"
        pe_val = metric.get("peNormalizedAnnual") or metric.get("peBasicExclExtraTTM") or metric.get("peTTM")
        pe = f"{float(pe_val):.1f}" if pe_val else "待更新"
        return {"price": price, "change": change, "changePercent": change_pct, "marketCap": market_cap, "pe": pe}
    except Exception as e:
        emit({"type": "warning", "message": f"市场数据获取失败: {e}"})
        return {"price": 0, "change": 0, "changePercent": 0, "marketCap": "待更新", "pe": "待更新"}


def _fetch_news_items(
    ticker: str, end_date: str, llm=None, company_name: str = ""
) -> list[dict]:
    try:
        from tradingagents.dataflows.finnhub_api import get_news_structured
        raw_items = get_news_structured(ticker, end_date=end_date, limit=10)
    except Exception as e:
        emit({"type": "warning", "message": f"新闻抓取失败: {e}"})
        return []

    if not raw_items or llm is None:
        return raw_items

    try:
        from tradingagents.dataflows.news_curator import curate_news
        return curate_news(llm, ticker, company_name, raw_items)
    except Exception as e:
        emit({"type": "warning", "message": f"新闻筛选/翻译失败，使用未处理的原始新闻: {e}"})
        from tradingagents.dataflows.news_curator import NewsCategory
        return [{**item, "category": NewsCategory.OTHER.value} for item in raw_items]


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


def _save_report_files(ticker: str, final_state: dict, decision: str) -> Optional[Path]:
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        report_dir = TA_ROOT / "reports" / f"{ticker}_{timestamp}"
        report_dir.mkdir(parents=True, exist_ok=True)

        sections = []

        analysts_dir = report_dir / "1_analysts"
        analyst_parts = []
        for key, name in [
            ("market_report", "Market Analyst"),
            ("sentiment_report", "Sentiment Analyst"),
            ("news_report", "News Analyst"),
            ("fundamentals_report", "Fundamentals Analyst"),
        ]:
            content = final_state.get(key)
            if content:
                analysts_dir.mkdir(exist_ok=True)
                (analysts_dir / (key.replace("_report", "") + ".md")).write_text(content, encoding="utf-8")
                analyst_parts.append((name, content))
        if analyst_parts:
            sections.append("## I. Analyst Team Reports\n\n" + "\n\n".join(f"### {n}\n{c}" for n, c in analyst_parts))

        debate = final_state.get("investment_debate_state", {})
        if debate:
            research_dir = report_dir / "2_research"
            research_parts = []
            for key, name, fname in [
                ("bull_history", "Bull Researcher", "bull"),
                ("bear_history", "Bear Researcher", "bear"),
                ("judge_decision", "Research Manager", "manager"),
            ]:
                content = debate.get(key)
                if content:
                    research_dir.mkdir(exist_ok=True)
                    (research_dir / f"{fname}.md").write_text(content, encoding="utf-8")
                    research_parts.append((name, content))
            if research_parts:
                sections.append("## II. Research Team Decision\n\n" + "\n\n".join(f"### {n}\n{c}" for n, c in research_parts))

        trader = final_state.get("trader_investment_plan")
        if trader:
            trading_dir = report_dir / "3_trading"
            trading_dir.mkdir(exist_ok=True)
            (trading_dir / "trader.md").write_text(trader, encoding="utf-8")
            sections.append(f"## III. Trading Team Plan\n\n### Trader\n{trader}")

        risk = final_state.get("risk_debate_state", {})
        if risk:
            risk_dir = report_dir / "4_risk"
            risk_parts = []
            for key, name, fname in [
                ("aggressive_history", "Aggressive Analyst", "aggressive"),
                ("conservative_history", "Conservative Analyst", "conservative"),
                ("neutral_history", "Neutral Analyst", "neutral"),
            ]:
                content = risk.get(key)
                if content:
                    risk_dir.mkdir(exist_ok=True)
                    (risk_dir / f"{fname}.md").write_text(content, encoding="utf-8")
                    risk_parts.append((name, content))
            if risk_parts:
                sections.append("## IV. Risk Management\n\n" + "\n\n".join(f"### {n}\n{c}" for n, c in risk_parts))

            judge = risk.get("judge_decision")
            if judge:
                portfolio_dir = report_dir / "5_portfolio"
                portfolio_dir.mkdir(exist_ok=True)
                (portfolio_dir / "decision.md").write_text(judge, encoding="utf-8")
                sections.append(f"## V. Portfolio Manager Decision\n\n### Portfolio Manager\n{judge}")

        header = f"# Trading Analysis Report: {ticker}\n\nGenerated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\nSignal: **{decision}**\n\n"
        (report_dir / "complete_report.md").write_text(header + "\n\n".join(sections), encoding="utf-8")
        return report_dir
    except Exception as e:
        emit({"type": "warning", "message": f"保存报告失败: {e}"})
        return None


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--ticker", required=True)
    parser.add_argument("--date", required=True)
    parser.add_argument("--market", default="US")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    try:
        result = run_analysis(args.ticker, args.date, args.market)
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(result, ensure_ascii=False, indent=2), encoding="utf-8")
        emit({"type": "result", "output_file": str(output_path), "ticker": args.ticker, "signal": result["signal"]})
        sys.exit(0)
    except Exception as e:
        emit({"type": "error", "message": str(e)})
        error_result = {"ticker": args.ticker, "signal": "错误", "error": str(e), "status": "failed"}
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        output_path.write_text(json.dumps(error_result, ensure_ascii=False, indent=2), encoding="utf-8")
        sys.exit(1)


if __name__ == "__main__":
    main()

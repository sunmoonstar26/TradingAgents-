#!/usr/bin/env python3
"""
TradingAgents 分析包装器 — 供 Next.js 后端调用

用法:
  python3 run_analysis.py --ticker BILI --date 2026-05-21 --market US --output /path/to/result.json

输出:
  - 逐行打印进度 JSON 到 stdout
  - 完成后输出最终结果 JSON 到 stdout (以 "RESULT:" 前缀标记)
  - 同时写入 --output 指定的文件
"""

import argparse
import json
import os
import sys
import datetime
from pathlib import Path

# 将 TradingAgents 项目路径加入 sys.path
# 路径: web/scripts/run_analysis.py → web → 网站开发 → TradingAgents 项目
TA_ROOT = Path(__file__).resolve().parent.parent.parent.parent
PROJECT_ROOT = Path(__file__).resolve().parent.parent.parent  # 网站开发（web 项目根）
sys.path.insert(0, str(TA_ROOT))

# 加载 .env（在 TradingAgents 项目根目录）
env_path = TA_ROOT / ".env"
if env_path.exists():
    with open(env_path) as f:
        for line in f:
            line = line.strip()
            if line and not line.startswith("#") and "=" in line:
                key, _, value = line.partition("=")
                k = key.strip()
                v = value.strip()
                # 用直接赋值（非 setdefault），覆盖任何已存在的空值
                if k and v:
                    os.environ[k] = v


def emit_progress(data: dict):
    """打印进度到 stdout（刷新缓冲区，确保实时输出）"""
    sys.stdout.write(json.dumps(data, ensure_ascii=False) + "\n")
    sys.stdout.flush()


def emit_env_check():
    """启动时报告 API key 配置情况，便于前端展示数据源失败的根本原因"""
    keys = ["FINNHUB_API_KEY", "ALPHA_VANTAGE_API_KEY", "OPENAI_API_KEY", "ANTHROPIC_API_KEY"]
    missing = [k for k in keys if not os.environ.get(k)]
    present = [k for k in keys if os.environ.get(k)]
    emit_progress({
        "type": "env_check",
        "message": f"API keys present: {','.join(present) or 'none'}; missing: {','.join(missing) or 'none'}",
        "present": present,
        "missing": missing,
    })


def run_analysis(ticker: str, analysis_date: str, market: str) -> dict:
    """运行 TradingAgents 分析并返回结构化结果"""
    from tradingagents.graph.trading_graph import TradingAgentsGraph
    from tradingagents.default_config import DEFAULT_CONFIG

    asset_type = "crypto" if market.upper() in ("CRYPTO",) else "stock"

    config = DEFAULT_CONFIG.copy()
    config["results_dir"] = str(TA_ROOT / "logs")
    config["data_cache_dir"] = str(TA_ROOT / "cache")

    emit_env_check()
    emit_progress({"type": "status", "step": "init", "message": f"初始化 TradingAgents 分析引擎", "ticker": ticker, "date": analysis_date})

    try:
        graph = TradingAgentsGraph(debug=False, config=config)
        emit_progress({"type": "status", "step": "started", "message": f"开始分析 {ticker}", "agents_total": 11})
    except Exception as e:
        emit_progress({"type": "error", "message": f"初始化失败: {str(e)}"})
        raise

    emit_progress({"type": "status", "step": "running", "message": "智能体分析中..."})

    try:
        final_state, decision = graph.propagate(ticker, analysis_date, asset_type=asset_type)
        emit_progress({"type": "status", "step": "completed", "message": f"分析完成，决策: {decision}"})
    except Exception as e:
        emit_progress({"type": "error", "message": f"分析执行失败: {str(e)}"})
        raise

    # ── 保存报告到 reports 目录（供 web 三级页面读取）──
    report_dir = _save_report_files(ticker, final_state, decision)

    company_name = final_state.get("company_of_interest", ticker)
    trade_date = final_state.get("trade_date", analysis_date)

    # ── 获取实时市场数据（Finnhub 报价）──
    market_data = _fetch_market_data(ticker)

    result = {
        "ticker": ticker.upper(),
        "company_name": company_name,
        "trade_date": str(trade_date),
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
    }

    return result



def _fetch_market_data(ticker: str) -> dict:
    """从 Finnhub 获取实时价格、市值、PE"""
    try:
        import requests
        key = os.environ.get("FINNHUB_API_KEY", "d7g9kcpr01qqb8rirc20d7g9kcpr01qqb8rirc2g")
        sym = ticker.upper()
        
        # 获取报价
        quote_url = f"https://finnhub.io/api/v1/quote?symbol={sym}&token={key}"
        quote_resp = requests.get(quote_url, timeout=10)
        quote = quote_resp.json() if quote_resp.ok else {}
        
        # 获取公司基本信息（市值/PE）
        profile_url = f"https://finnhub.io/api/v1/stock/profile2?symbol={sym}&token={key}"
        profile_resp = requests.get(profile_url, timeout=10)
        profile = profile_resp.json() if profile_resp.ok else {}
        
        # 获取估值指标
        metric_url = f"https://finnhub.io/api/v1/stock/metric?symbol={sym}&metric=all&token={key}"
        metric_resp = requests.get(metric_url, timeout=10)
        metric_data = metric_resp.json() if metric_resp.ok else {}
        metric = metric_data.get("metric", {}) if isinstance(metric_data, dict) else {}
        
        price = quote.get("c", 0)  # current price
        change = quote.get("d", 0)  # change
        change_pct = quote.get("dp", 0)  # change percent
        
        mcap_m = metric.get("marketCapitalization") or profile.get("marketCapitalization")
        if mcap_m:
            mcap_m = float(mcap_m)
            if mcap_m >= 1000:
                market_cap = f"{mcap_m/1000:.2f}B"
            else:
                market_cap = f"{mcap_m:.0f}M"
        else:
            market_cap = "待更新"
        
        pe_val = (metric.get("peNormalizedAnnual") or metric.get("peBasicExclExtraTTM") 
                  or metric.get("peTTM"))
        pe = f"{float(pe_val):.1f}" if pe_val else "待更新"
        
        return {
            "price": price,
            "change": change,
            "changePercent": change_pct,
            "marketCap": market_cap,
            "pe": pe,
        }
    except Exception as e:
        emit_progress({"type": "warning", "message": f"市场数据获取失败({ticker}): {str(e)}"})
        return {"price": 0, "change": 0, "changePercent": 0, "marketCap": "待更新", "pe": "待更新"}


def _save_report_files(ticker: str, final_state: dict, decision: str) -> Path | None:
    """将分析报告保存为 markdown 文件，与 CLI 格式兼容"""
    try:
        timestamp = datetime.datetime.now().strftime("%Y%m%d_%H%M%S")
        reports_base = TA_ROOT / "reports"
        report_dir = reports_base / f"{ticker}_{timestamp}"
        report_dir.mkdir(parents=True, exist_ok=True)

        sections = []

        # 1. Analysts
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
                fname = key.replace("_report", "") + ".md"
                (analysts_dir / fname).write_text(content, encoding="utf-8")
                analyst_parts.append((name, content))
        if analyst_parts:
            content = "\n\n".join(f"### {name}\n{text}" for name, text in analyst_parts)
            sections.append(f"## I. Analyst Team Reports\n\n{content}")

        # 2. Research
        debate = final_state.get("investment_debate_state", {})
        if debate:
            research_dir = report_dir / "2_research"
            research_parts = []
            for key, name in [
                ("bull_history", "Bull Researcher"),
                ("bear_history", "Bear Researcher"),
                ("judge_decision", "Research Manager"),
            ]:
                content = debate.get(key)
                if content:
                    research_dir.mkdir(exist_ok=True)
                    fname_map = {"bull_history": "bull", "bear_history": "bear", "judge_decision": "manager"}
                    (research_dir / f"{fname_map[key]}.md").write_text(content, encoding="utf-8")
                    research_parts.append((name, content))
            if research_parts:
                content = "\n\n".join(f"### {name}\n{text}" for name, text in research_parts)
                sections.append(f"## II. Research Team Decision\n\n{content}")

        # 3. Trading
        trader = final_state.get("trader_investment_plan")
        if trader:
            trading_dir = report_dir / "3_trading"
            trading_dir.mkdir(exist_ok=True)
            (trading_dir / "trader.md").write_text(trader, encoding="utf-8")
            sections.append(f"## III. Trading Team Plan\n\n### Trader\n{trader}")

        # 4. Risk
        risk = final_state.get("risk_debate_state", {})
        if risk:
            risk_dir = report_dir / "4_risk"
            risk_parts = []
            for key, name in [
                ("aggressive_history", "Aggressive Analyst"),
                ("conservative_history", "Conservative Analyst"),
                ("neutral_history", "Neutral Analyst"),
            ]:
                content = risk.get(key)
                if content:
                    risk_dir.mkdir(exist_ok=True)
                    fname_map = {"aggressive_history": "aggressive", "conservative_history": "conservative", "neutral_history": "neutral"}
                    (risk_dir / f"{fname_map[key]}.md").write_text(content, encoding="utf-8")
                    risk_parts.append((name, content))
            if risk_parts:
                content = "\n\n".join(f"### {name}\n{text}" for name, text in risk_parts)
                sections.append(f"## IV. Risk Management Team Decision\n\n{content}")

            # 5. Portfolio
            judge = risk.get("judge_decision")
            if judge:
                portfolio_dir = report_dir / "5_portfolio"
                portfolio_dir.mkdir(exist_ok=True)
                (portfolio_dir / "decision.md").write_text(judge, encoding="utf-8")
                sections.append(f"## V. Portfolio Manager Decision\n\n### Portfolio Manager\n{judge}")

        # Complete report
        header = f"# Trading Analysis Report: {ticker}\n\nGenerated: {datetime.datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n\nSignal: **{decision}**\n\n"
        (report_dir / "complete_report.md").write_text(header + "\n\n".join(sections), encoding="utf-8")

        return report_dir
    except Exception as e:
        emit_progress({"type": "warning", "message": f"保存报告失败: {str(e)}"})
        return None


def _run_insight_extraction(report_dir: Path, ticker: str):
    """调用洞察萃取引擎，从完整报告中提取结构化洞察"""
    try:
        import subprocess

        extractor_script = Path(__file__).resolve().parent / "insight_extractor.py"
        if not extractor_script.exists():
            emit_progress({"type": "warning", "message": "洞察萃取脚本不存在，跳过"})
            return

        output_path = report_dir / "insights.json"

        emit_progress({"type": "status", "step": "extracting_insights",
                       "message": f"萃取 AI 洞察: {ticker}"})

        result = subprocess.run(
            [sys.executable, str(extractor_script),
             "--report-dir", str(report_dir),
             "--output", str(output_path)],
            capture_output=True, text=True, timeout=300,
            env=os.environ.copy(),
            cwd=str(TA_ROOT),
        )

        if result.returncode == 0:
            emit_progress({"type": "status", "step": "insights_ready",
                           "message": f"洞察萃取完成: {output_path}"})
        else:
            emit_progress({"type": "warning",
                           "message": f"洞察萃取失败(code={result.returncode}): {result.stderr[:200]}"})

    except subprocess.TimeoutExpired:
        emit_progress({"type": "warning", "message": "洞察萃取超时（>180s），跳过"})
    except Exception as e:
        emit_progress({"type": "warning", "message": f"洞察萃取异常: {str(e)}"})


def main():
    parser = argparse.ArgumentParser(description="TradingAgents Analysis Wrapper")
    parser.add_argument("--ticker", required=True, help="股票代码 (e.g. BILI, NVDA)")
    parser.add_argument("--date", required=True, help="分析日期 (YYYY-MM-DD)")
    parser.add_argument("--market", default="US", help="市场 (US/HK/CN)")
    parser.add_argument("--output", required=True, help="输出 JSON 文件路径")
    args = parser.parse_args()

    try:
        result = run_analysis(args.ticker, args.date, args.market)

        # 写入输出文件 — 在洞察萃取之前写，让前端 pollForResult 立即检测到结果
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(result, f, ensure_ascii=False, indent=2)

        emit_progress({"type": "result", "output_file": str(output_path), "ticker": args.ticker, "signal": result["signal"]})

        # ── 洞察萃取在结果写入之后异步运行，不阻塞主流程 ──
        report_dir = result.get("report_dir")
        if report_dir:
            _run_insight_extraction(Path(report_dir), args.ticker)

        sys.exit(0)

    except Exception as e:
        emit_progress({"type": "error", "message": str(e)})
        # 写入错误结果文件，让前端 pollForResult 能检测到
        error_result = {
            "ticker": args.ticker,
            "signal": "错误",
            "error": str(e),
            "status": "failed",
        }
        output_path = Path(args.output)
        output_path.parent.mkdir(parents=True, exist_ok=True)
        with open(output_path, "w", encoding="utf-8") as f:
            json.dump(error_result, f, ensure_ascii=False, indent=2)
        sys.exit(1)


if __name__ == "__main__":
    main()

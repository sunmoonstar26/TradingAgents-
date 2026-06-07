"""
TradingAgents FastAPI 后端服务
本地开发: uvicorn main:app --reload --port 8000
生产部署: Railway / Render（同一份代码）
"""

from __future__ import annotations

import os
import sys
import threading
import json
import logging
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# 分析线程日志单独写文件，不混入 uvicorn stdout
_analysis_log = logging.getLogger("tradingagents.analysis")
_analysis_log.setLevel(logging.INFO)
_log_handler = logging.FileHandler("/tmp/tradingagents-analysis.log")
_log_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
_analysis_log.addHandler(_log_handler)
_analysis_log.propagate = False  # 不传播到 root logger，避免混入 uvicorn 输出

# ── 路径配置 ──
API_SERVER_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = API_SERVER_DIR.parent
TA_ROOT = WEBSITE_DIR.parent
sys.path.insert(0, str(TA_ROOT))

# 加载 TA_ROOT/.env
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

# ── 进度状态存储（内存） ──
_sessions: dict[str, dict[str, Any]] = {}
_sessions_lock = threading.Lock()

PROGRESS_FIELDS = ["fundamental", "technical", "sentiment", "macro", "news", "risk", "report"]

def _default_progress() -> dict[str, str]:
    return {f: "waiting" for f in PROGRESS_FIELDS}

def _get_session(session_id: str) -> dict[str, Any] | None:
    with _sessions_lock:
        return _sessions.get(session_id)

def _set_session(session_id: str, data: dict[str, Any]) -> None:
    with _sessions_lock:
        _sessions[session_id] = data

def _update_session(session_id: str, **kwargs: Any) -> None:
    with _sessions_lock:
        if session_id in _sessions:
            _sessions[session_id].update(kwargs)

# ── FastAPI 应用 ──
app = FastAPI(title="TradingAgents API Server")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

class StartRequest(BaseModel):
    ticker: str
    date: str
    market: str
    session_id: str
    output_path: str

class StartResponse(BaseModel):
    session_id: str
    status: str

@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analysis/start", response_model=StartResponse)
def start_analysis(req: StartRequest):
    session_id = req.session_id
    existing = _get_session(session_id)
    if existing and existing.get("status") not in ("failed", None):
        return StartResponse(session_id=session_id, status=existing["status"])

    _set_session(session_id, {
        "status": "running",
        "current_step": "Starting",
        "progress": _default_progress(),
        "result": None,
        "error": None,
    })

    t = threading.Thread(
        target=_run_analysis_thread,
        args=(session_id, req.ticker, req.date, req.market, req.output_path),
        daemon=True,
    )
    t.start()
    return StartResponse(session_id=session_id, status="running")

@app.get("/analysis/{session_id}")
def get_analysis(session_id: str):
    data = _get_session(session_id)
    if data is None:
        raise HTTPException(status_code=404, detail="Session not found")
    return {
        "session_id": session_id,
        "status": data["status"],
        "current_step": data["current_step"],
        "progress": data["progress"],
        "result": data["result"],
        "error": data["error"],
    }

_AGENT_TO_FIELD: dict[str, str] = {
    "fundamentals_analyst": "fundamental",
    "market_analyst":       "technical",
    "sentiment_analyst":    "sentiment",
    "macro_analyst":        "macro",
    "news_analyst":         "news",
    "risk_manager":         "risk",
    "portfolio_manager":    "report",
}

def _progress_callback(session_id: str, agent: str, status: str, step_msg: str = "") -> None:
    field = _AGENT_TO_FIELD.get(agent)
    with _sessions_lock:
        if session_id not in _sessions:
            return
        if field:
            _sessions[session_id]["progress"][field] = status
        if step_msg:
            _sessions[session_id]["current_step"] = step_msg

def _run_analysis_thread(
    session_id: str,
    ticker: str,
    analysis_date: str,
    market: str,
    output_path: str,
) -> None:
    try:
        _update_session(session_id, current_step="Initializing analysis engine")

        from tradingagents.graph.trading_graph import TradingAgentsGraph
        from tradingagents.default_config import DEFAULT_CONFIG

        asset_type = "crypto" if market.upper() == "CRYPTO" else "stock"
        config = DEFAULT_CONFIG.copy()
        config["results_dir"] = str(TA_ROOT / "logs")
        config["data_cache_dir"] = str(TA_ROOT / "cache")

        _update_session(session_id, current_step=f"Launching multi-agent analysis for {ticker}")
        graph = TradingAgentsGraph(debug=False, config=config)

        agent_sequence = [
            "fundamentals_analyst",
            "market_analyst",
            "sentiment_analyst",
            "macro_analyst",
            "news_analyst",
            "risk_manager",
            "portfolio_manager",
        ]
        for ag in agent_sequence[:-1]:
            _progress_callback(session_id, ag, "running", f"Running {ag.replace('_', ' ')}")

        final_state, decision = graph.propagate(ticker, analysis_date, asset_type=asset_type)

        for ag in agent_sequence:
            _progress_callback(session_id, ag, "completed", "Generating final report")

        _update_session(session_id, current_step="Extracting insights")

        result = _build_result(ticker, analysis_date, final_state, decision)

        out = Path(output_path)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(json.dumps(result, ensure_ascii=False, indent=2))

        _update_session(session_id,
            status="completed",
            current_step="Analysis complete",
            result=result,
        )

    except Exception as exc:
        import traceback
        err_msg = f"{type(exc).__name__}: {exc}"
        _analysis_log.error("Analysis thread failed for session %s: %s\n%s",
                            session_id, err_msg, traceback.format_exc())
        _update_session(session_id,
            status="failed",
            current_step="Analysis failed",
            error=err_msg,
        )


def _build_result(ticker: str, analysis_date: str, final_state: dict, decision: str) -> dict:
    market_data = _fetch_market_data(ticker)
    return {
        "ticker": ticker.upper(),
        "company_name": final_state.get("company_of_interest", ticker),
        "trade_date": str(final_state.get("trade_date", analysis_date)),
        "signal": decision,
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
            market_cap = "N/A"
        pe_val = metric.get("peNormalizedAnnual") or metric.get("peBasicExclExtraTTM") or metric.get("peTTM")
        pe = f"{float(pe_val):.1f}" if pe_val else "N/A"
        return {"price": price, "change": change, "changePercent": change_pct, "marketCap": market_cap, "pe": pe}
    except Exception:
        return {"price": 0, "change": 0, "changePercent": 0, "marketCap": "N/A", "pe": "N/A"}

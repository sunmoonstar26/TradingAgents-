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

@app.get("/analysis/latest/{ticker}")
def get_latest_analysis(ticker: str):
    """返回该 ticker 最新完成的分析结果（按 session 创建时间倒序）。"""
    ticker_upper = ticker.upper()
    with _sessions_lock:
        completed = [
            (sid, s) for sid, s in _sessions.items()
            if s.get("status") == "completed"
            and sid.split("_")[1].upper() == ticker_upper
            and s.get("result") is not None
        ]
    if not completed:
        # 内存里没有，尝试从磁盘读
        results_dir = API_SERVER_DIR / "data" / "analysis_results"
        if results_dir.exists():
            ticker_lower = ticker_upper.lower()
            candidates = sorted(
                [f for f in results_dir.glob(f"sess_{ticker_lower}_*.json")],
                key=lambda f: f.stem,
                reverse=True,
            )
            for f in candidates:
                try:
                    data = json.loads(f.read_text())
                    if data.get("status") == "failed" or data.get("error"):
                        continue
                    return {"session_id": f.stem, "status": "completed", "result": data}
                except Exception:
                    continue
        raise HTTPException(status_code=404, detail="No completed analysis found for this ticker")

    # 按 session_id 时间戳排序，取最新
    completed.sort(key=lambda x: x[0], reverse=True)
    sid, s = completed[0]
    return {"session_id": sid, "status": "completed", "result": s["result"]}

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

# graph.stream() 节点名 → (progress field, event)
# "start": 节点开始执行时设为 running
# "done":  节点完成后设为 completed（用 clear 节点作为完成信号）
_NODE_EVENTS: dict[str, tuple[str, str]] = {
    # 分析师节点：出现即为开始
    "Market Analyst":        ("technical",   "start"),
    "Sentiment Analyst":     ("sentiment",   "start"),
    "News Analyst":          ("news",        "start"),
    "Fundamentals Analyst":  ("fundamental", "start"),
    # Clear 节点：出现代表对应分析师完成
    "Msg Clear Market":       ("technical",   "done"),
    "Msg Clear Sentiment":    ("sentiment",   "done"),
    "Msg Clear News":         ("news",        "done"),
    "Msg Clear Fundamentals": ("fundamental", "done"),
    # risk debate 节点
    "Aggressive Analyst":    ("risk",   "start"),
    "Conservative Analyst":  ("risk",   "start"),
    "Neutral Analyst":       ("risk",   "start"),
    # Portfolio Manager 出现：risk 结束 + report 开始
    "Portfolio Manager":     ("report",  "start"),
}

def _set_progress(session_id: str, field: str, status: str, step_msg: str = "") -> None:
    with _sessions_lock:
        if session_id not in _sessions:
            return
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
        ta_graph = TradingAgentsGraph(debug=False, config=config)

        # 用 stream 模式（updates）执行，逐节点更新进度
        # updates 模式：每个 chunk 是 {node_name: state_delta}
        # propagate() 会设置 self.ticker，绕过它需手动设置，_log_state 依赖此值
        ta_graph.ticker = ticker
        ta_graph._resolve_pending_entries(ticker)
        past_context = ta_graph.memory_log.get_past_context(ticker)
        init_state = ta_graph.propagator.create_initial_state(
            ticker, analysis_date, asset_type=asset_type, past_context=past_context
        )
        # 用 updates 模式获取节点名；config 沿用 propagator 的 recursion_limit
        stream_config = {"recursion_limit": ta_graph.propagator.max_recur_limit}

        _risk_started = False
        # init_state 를 기본값으로 복사 — company_of_interest 등 초기 키 보존
        # updates 모드에서는 각 node 가 변경한 key 만 delta 에 포함되므로
        # init_state 키가 없으면 _log_state 에서 KeyError 발생
        final_state: dict = dict(init_state)

        for chunk in ta_graph.graph.stream(init_state, stream_mode="updates", config=stream_config):
            for node_name, node_delta in chunk.items():
                # 合并 delta 到 final_state
                if isinstance(node_delta, dict):
                    final_state.update(node_delta)

                event = _NODE_EVENTS.get(node_name)
                if not event:
                    continue
                field, ev_type = event

                if ev_type == "start":
                    if field == "risk":
                        if not _risk_started:
                            _risk_started = True
                            _set_progress(session_id, "risk", "running", "Running risk analysis")
                    elif field == "report":
                        # Portfolio Manager 开始：risk 标记完成
                        _set_progress(session_id, "risk", "completed", "Risk analysis done")
                        _set_progress(session_id, "report", "running", "Generating final report")
                    else:
                        _set_progress(session_id, field, "running", f"Running {node_name}")

                elif ev_type == "done":
                    _set_progress(session_id, field, "completed", f"{node_name.replace('Msg Clear ', '')} done")

        # stream 结束，确保所有字段都是 completed
        for f in ["fundamental", "technical", "sentiment", "news", "risk", "report"]:
            _set_progress(session_id, f, "completed")

        _update_session(session_id, current_step="Extracting insights")

        decision = ta_graph.process_signal(final_state.get("final_trade_decision", ""))
        ta_graph._log_state(analysis_date, final_state)
        ta_graph.memory_log.store_decision(
            ticker=ticker,
            trade_date=analysis_date,
            final_trade_decision=final_state.get("final_trade_decision", ""),
        )

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

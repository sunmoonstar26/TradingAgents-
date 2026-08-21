"""
TradingAgents 中文专用 FastAPI 后端

架构要点：
- 每次分析请求启动独立子进程（subprocess），Python 全局状态完全隔离
- 语言硬编码为简体中文，不接受 language 参数
- 结果写入 data/analysis_results/{session_id}.json

本地开发: uvicorn main:app --reload --port 8001
生产部署: Railway（独立服务，PYTHON_BACKEND_ZH_URL 指向此实例）
"""

from __future__ import annotations

import json
import logging
import os
import subprocess
import sys
import threading
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

from memory_log_reader import get_entries_for_ticker

# 分析日志写文件，不混入 uvicorn stdout
_log = logging.getLogger("tradingagents.zh")
_log.setLevel(logging.INFO)
_log_handler = logging.FileHandler("/tmp/tradingagents-zh-analysis.log")
_log_handler.setFormatter(logging.Formatter("%(asctime)s %(levelname)s %(message)s"))
_log.addHandler(_log_handler)
_log.propagate = False

API_SERVER_DIR = Path(__file__).resolve().parent
WEBSITE_DIR = API_SERVER_DIR.parent
TA_ROOT = WEBSITE_DIR.parent
ANALYSIS_SCRIPT = API_SERVER_DIR / "run_analysis_zh.py"
RESULTS_DIR = API_SERVER_DIR / "data" / "analysis_results"

# 优先用 TA_ROOT/.venv，保证子进程能加载 TradingAgents 依赖
_VENV_PYTHON = TA_ROOT / ".venv" / "bin" / "python"
PYTHON_BIN = str(_VENV_PYTHON) if _VENV_PYTHON.exists() else sys.executable

# ── 会话状态存储 ──
_sessions: dict[str, dict[str, Any]] = {}
_sessions_lock = threading.Lock()

PROGRESS_FIELDS = ["fundamental", "technical", "sentiment", "macro", "news", "risk", "report"]


def _default_progress() -> dict[str, str]:
    return {f: "waiting" for f in PROGRESS_FIELDS}


def _get_session(sid: str) -> dict[str, Any] | None:
    with _sessions_lock:
        return _sessions.get(sid)


def _set_session(sid: str, data: dict[str, Any]) -> None:
    with _sessions_lock:
        _sessions[sid] = data


def _update_session(sid: str, **kwargs: Any) -> None:
    with _sessions_lock:
        if sid in _sessions:
            _sessions[sid].update(kwargs)


# ── FastAPI ──
app = FastAPI(title="TradingAgents ZH API Server")

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
    sid = req.session_id
    existing = _get_session(sid)
    if existing and existing.get("status") not in ("failed", None):
        return StartResponse(session_id=sid, status=existing["status"])

    _set_session(sid, {
        "status": "running",
        "current_step": "Starting",
        "progress": _default_progress(),
        "result": None,
        "error": None,
    })

    t = threading.Thread(
        target=_run_subprocess,
        args=(sid, req.ticker, req.date, req.market, req.output_path),
        daemon=True,
    )
    t.start()
    return StartResponse(session_id=sid, status="running")


@app.get("/analysis/latest/{ticker}")
def get_latest_analysis(ticker: str):
    ticker_upper = ticker.upper()
    with _sessions_lock:
        completed = [
            (sid, s) for sid, s in _sessions.items()
            if s.get("status") == "completed"
            and sid.split("_")[1].upper() == ticker_upper
            and s.get("result") is not None
        ]
    if not completed:
        if RESULTS_DIR.exists():
            ticker_lower = ticker_upper.lower()
            candidates = sorted(
                [f for f in RESULTS_DIR.glob(f"sess_{ticker_lower}_*.json")],
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


@app.get("/memory/{ticker}")
def get_memory(ticker: str):
    """该 ticker 的系统学习记忆（反思日志），最近的排在最前面。"""
    return {"entries": get_entries_for_ticker(ticker)}


# ── 子进程节点进度映射（与 api-server 相同的 stdout 解析逻辑）──
_STEP_TO_PROGRESS: dict[str, tuple[str, str]] = {
    "init":      ("fundamental", "running"),
    "started":   ("technical",   "running"),
    "running":   ("sentiment",   "running"),
    "completed": ("report",      "running"),
}


def _run_subprocess(
    sid: str,
    ticker: str,
    analysis_date: str,
    market: str,
    output_path: str,
) -> None:
    """在独立子进程中运行分析，进程间完全隔离 Python 全局状态。"""
    env = os.environ.copy()
    env["TRADINGAGENTS_OUTPUT_LANGUAGE"] = "Chinese"  # 进程级强制覆盖

    result_path = RESULTS_DIR / f"{sid}.json"
    result_path.parent.mkdir(parents=True, exist_ok=True)

    cmd = [
        PYTHON_BIN,
        str(ANALYSIS_SCRIPT),
        "--ticker", ticker,
        "--date", analysis_date,
        "--market", market,
        "--output", str(result_path),
    ]

    _update_session(sid, current_step="Launching analysis subprocess")

    try:
        proc = subprocess.Popen(
            cmd,
            stdout=subprocess.PIPE,
            stderr=subprocess.PIPE,
            text=True,
            env=env,
            cwd=str(TA_ROOT),
        )

        # 逐行读取进度 JSON
        assert proc.stdout is not None
        for raw_line in proc.stdout:
            line = raw_line.strip()
            if not line:
                continue
            try:
                msg = json.loads(line)
            except json.JSONDecodeError:
                continue

            msg_type = msg.get("type", "")
            step = msg.get("step", "")
            message = msg.get("message", "")

            _update_session(sid, current_step=message or step)

            if msg_type == "status" and step in _STEP_TO_PROGRESS:
                field, status = _STEP_TO_PROGRESS[step]
                with _sessions_lock:
                    if sid in _sessions:
                        _sessions[sid]["progress"][field] = status

            _log.info("[%s] %s", sid, line)

        proc.wait()

        if proc.returncode != 0:
            stderr_out = (proc.stderr.read() if proc.stderr else "")[:500]
            _log.error("[%s] subprocess exited %d: %s", sid, proc.returncode, stderr_out)
            _update_session(sid,
                status="failed",
                current_step="Analysis failed",
                error=f"Process exited with code {proc.returncode}: {stderr_out}",
            )
            return

        # 读取结果文件
        if not result_path.exists():
            _update_session(sid, status="failed", current_step="Result file missing",
                            error="Subprocess completed but result file not found")
            return

        result = json.loads(result_path.read_text(encoding="utf-8"))

        if result.get("status") == "failed" or result.get("error"):
            _update_session(sid,
                status="failed",
                current_step="Analysis failed",
                error=result.get("error", "Unknown error"),
            )
            return

        # 标记全部进度完成
        with _sessions_lock:
            if sid in _sessions:
                for f in PROGRESS_FIELDS:
                    _sessions[sid]["progress"][f] = "completed"

        _update_session(sid,
            status="completed",
            current_step="Analysis complete",
            result=result,
        )

    except Exception as exc:
        import traceback
        err = f"{type(exc).__name__}: {exc}"
        _log.error("[%s] %s\n%s", sid, err, traceback.format_exc())
        _update_session(sid, status="failed", current_step="Analysis failed", error=err)

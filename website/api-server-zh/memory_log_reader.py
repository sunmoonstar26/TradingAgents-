"""只读解析 TradingAgents 的 append-only 反思日志（trading_memory.md）。

与 tradingagents/agents/utils/memory.py 里 TradingMemoryLog 的解析逻辑保持一致，
但独立实现、不 import tradingagents 包 —— 该包的 __init__ 链会拉入 langchain 等重依赖，
不适合塞进这个常驻 FastAPI 进程（分析本身已经用子进程隔离，见 run_analysis_zh.py）。
只做读取，不做任何写入（写入仍由分析子进程里的 TradingMemoryLog 负责）。
"""

from __future__ import annotations

import os
import re
from pathlib import Path
from typing import Any

_SEPARATOR = "\n\n<!-- ENTRY_END -->\n\n"
_DECISION_RE = re.compile(r"DECISION:\n(.*?)(?=\nREFLECTION:|\Z)", re.DOTALL)
_REFLECTION_RE = re.compile(r"REFLECTION:\n(.*?)$", re.DOTALL)


def _memory_log_path() -> Path:
    default = Path.home() / ".tradingagents" / "memory" / "trading_memory.md"
    raw = os.environ.get("TRADINGAGENTS_MEMORY_LOG_PATH")
    return Path(raw).expanduser() if raw else default


def _parse_entry(raw: str) -> dict[str, Any] | None:
    lines = raw.strip().splitlines()
    if not lines:
        return None
    tag_line = lines[0].strip()
    if not (tag_line.startswith("[") and tag_line.endswith("]")):
        return None
    fields = [f.strip() for f in tag_line[1:-1].split("|")]
    if len(fields) < 4:
        return None

    body = "\n".join(lines[1:]).strip()
    decision_match = _DECISION_RE.search(body)
    reflection_match = _REFLECTION_RE.search(body)

    return {
        "date": fields[0],
        "ticker": fields[1],
        "rating": fields[2],
        "pending": fields[3] == "pending",
        "raw_return": None if fields[3] == "pending" else fields[3],
        "alpha_return": fields[4] if len(fields) > 4 else None,
        "holding_days": fields[5] if len(fields) > 5 else None,
        "decision": decision_match.group(1).strip() if decision_match else "",
        "reflection": reflection_match.group(1).strip() if reflection_match else "",
    }


def load_entries() -> list[dict[str, Any]]:
    """解析日志全部条目（最旧在前，与文件写入顺序一致）。"""
    path = _memory_log_path()
    if not path.exists():
        return []
    text = path.read_text(encoding="utf-8")
    raw_entries = [e.strip() for e in text.split(_SEPARATOR) if e.strip()]
    entries = []
    for raw in raw_entries:
        parsed = _parse_entry(raw)
        if parsed:
            entries.append(parsed)
    return entries


def get_entries_for_ticker(ticker: str, limit: int = 20) -> list[dict[str, Any]]:
    """按 ticker 过滤，最近的排在最前面。"""
    ticker_upper = ticker.upper()
    matched = [e for e in load_entries() if e["ticker"].upper() == ticker_upper]
    matched.reverse()
    return matched[:limit]

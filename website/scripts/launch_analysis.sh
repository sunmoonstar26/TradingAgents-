#!/usr/bin/env bash
# TradingAgents 分析启动器 — 由 Next.js 后端调用
# nohup + disown + </dev/null 让分析进程完全脱离父进程组，dev server 重启不会带走它
# 不使用 set -e，避免 disown 在 macOS 上非 0 退出导致脚本失败

TICKER="$1"
DATE="$2"
MARKET="${3:-US}"
OUTPUT="$4"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(dirname "$SCRIPT_DIR")"
TA_ROOT="$(dirname "$PROJECT_ROOT")"
VENV_PYTHON="$TA_ROOT/.venv/bin/python3"
PYTHON_SCRIPT="$PROJECT_ROOT/web/scripts/run_analysis.py"
LOG_FILE="$OUTPUT.log"

if [[ ! -x "$VENV_PYTHON" ]]; then
  echo "{\"error\": \"venv python not found at $VENV_PYTHON\"}" >&2
  exit 2
fi

if [[ ! -f "$PYTHON_SCRIPT" ]]; then
  echo "{\"error\": \"run_analysis.py not found at $PYTHON_SCRIPT\"}" >&2
  exit 3
fi

cd "$TA_ROOT"

nohup "$VENV_PYTHON" -u "$PYTHON_SCRIPT" \
  --ticker "$TICKER" \
  --date "$DATE" \
  --market "$MARKET" \
  --output "$OUTPUT" \
  > "$LOG_FILE" 2>&1 < /dev/null &

PID=$!
disown $PID 2>/dev/null || true

echo "{\"pid\": $PID, \"ticker\": \"$TICKER\", \"output\": \"$OUTPUT\"}"
echo "Started TradingAgents for $TICKER (PID: $PID)" >> "$LOG_FILE"
exit 0

# DEPRECATED: replaced by website/api-server/main.py (FastAPI HTTP backend)
# This script is no longer called by analysis-store.ts

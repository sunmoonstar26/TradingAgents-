#!/usr/bin/env bash
# 一键启动开发环境：FastAPI 后端 + Next.js 前端
# 用法: ./start-dev.sh [en|zh]
# 默认启动中文版 (port 3000)，传 en 启动英文版 (port 3001)

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
VENV_PYTHON="$SCRIPT_DIR/.venv/bin/python3"
VENV_UVICORN="$SCRIPT_DIR/.venv/bin/uvicorn"
API_DIR="$SCRIPT_DIR/website/api-server"
WEB_DIR="$SCRIPT_DIR/website/web"

LOCALE="${1:-zh}"

# 检查 venv 存在
if [[ ! -x "$VENV_UVICORN" ]]; then
  echo "❌ venv not found at $SCRIPT_DIR/.venv"
  echo "   Run: python3 -m venv .venv && .venv/bin/pip install -r website/api-server/requirements.txt"
  exit 1
fi

# 关闭已占用的端口
cleanup() {
  echo ""
  echo "🛑 Stopping services..."
  kill $UVICORN_PID 2>/dev/null || true
  kill $NEXTJS_PID 2>/dev/null || true
  wait $UVICORN_PID 2>/dev/null || true
  wait $NEXTJS_PID 2>/dev/null || true
  echo "   Done."
}
trap cleanup EXIT INT TERM

# 清理已占用的端口（8000 后端、3000/3001/3002 前端）
if lsof -ti:8000 > /dev/null 2>&1; then
  echo "⚠️  Port 8000 in use, clearing..."
  lsof -ti:8000 | xargs kill -9 2>/dev/null || true
  sleep 1
fi
for port in 3000 3001 3002; do
  if lsof -ti:$port > /dev/null 2>&1; then
    echo "⚠️  Port $port in use, clearing..."
    lsof -ti:$port | xargs kill -9 2>/dev/null || true
  fi
done
sleep 1

# 启动 FastAPI
echo "🚀 Starting Python backend (port 8000)..."
cd "$API_DIR"
"$VENV_UVICORN" main:app --port 8000 &
UVICORN_PID=$!

# 等待后端就绪
echo "   Waiting for backend..."
for i in $(seq 1 30); do
  if curl -s http://localhost:8000/health > /dev/null 2>&1; then
    echo "   ✅ Backend ready"
    break
  fi
  sleep 1
  if [[ $i -eq 30 ]]; then
    echo "   ❌ Backend failed to start"
    exit 1
  fi
done

# 启动 Next.js
echo ""
if [[ "$LOCALE" == "en" ]]; then
  echo "🌐 Starting Next.js frontend (English, port 3001)..."
  cd "$WEB_DIR"
  npm run dev:en &
  NEXTJS_PID=$!
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Backend:  http://localhost:8000"
  echo "  Frontend: http://localhost:3001  (EN)"
  echo "  API Docs: http://localhost:8000/docs"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
else
  echo "🌐 Starting Next.js frontend (Chinese, port 3000)..."
  cd "$WEB_DIR"
  npm run dev &
  NEXTJS_PID=$!
  echo ""
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
  echo "  Backend:  http://localhost:8000"
  echo "  Frontend: http://localhost:3000  (ZH)"
  echo "  API Docs: http://localhost:8000/docs"
  echo "━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━"
fi

echo ""
echo "Press Ctrl+C to stop all services."
echo ""

wait $NEXTJS_PID

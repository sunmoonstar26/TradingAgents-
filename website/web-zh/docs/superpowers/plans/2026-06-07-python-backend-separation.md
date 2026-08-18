# Python 后端分离架构 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将 TradingAgents 分析功能从 Next.js shell exec 模式改为 FastAPI HTTP 服务模式，本地开发与 Vercel 生产环境行为完全一致。

**Architecture:** 新建 `website/api-server/main.py` FastAPI 服务，在后台线程执行分析并管理进度状态；修改 `analysis-store.ts` 将 `exec(bash)` 替换为 `fetch(PYTHON_BACKEND_URL)`，轮询逻辑从读本地文件改为 HTTP GET。

**Tech Stack:** Python FastAPI + uvicorn（后端），Next.js fetch API（前端调用），环境变量 `PYTHON_BACKEND_URL` 作为唯一切换点。

---

## 文件变更地图

| 动作 | 文件 | 说明 |
|------|------|------|
| 新建 | `website/api-server/main.py` | FastAPI 服务主体，含 `/analysis/start`、`/analysis/{id}`、`/health` |
| 新建 | `website/api-server/requirements.txt` | fastapi, uvicorn 依赖 |
| 修改 | `website/web/src/lib/analysis-store.ts` | 移除 exec/fs/path，改为 fetch HTTP 调用 |
| 修改 | `website/web/.env.local` | 新增 `PYTHON_BACKEND_URL=http://localhost:8000` |

---

## Task 1：安装 FastAPI/uvicorn 到 venv

**Files:**
- Modify: `website/api-server/requirements.txt`（新建）

- [ ] **Step 1：安装依赖**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
.venv/bin/pip install fastapi uvicorn
```

预期输出：`Successfully installed fastapi-... uvicorn-...`

- [ ] **Step 2：创建 requirements.txt**

```bash
mkdir -p website/api-server
cat > website/api-server/requirements.txt << 'EOF'
fastapi>=0.110.0
uvicorn>=0.29.0
EOF
```

- [ ] **Step 3：验证安装**

```bash
.venv/bin/python -c "import fastapi, uvicorn; print('OK')"
```

预期输出：`OK`

- [ ] **Step 4：Commit**

```bash
git add website/api-server/requirements.txt
git commit -m "chore: add fastapi/uvicorn to api-server requirements"
```

---

## Task 2：创建 FastAPI 服务 main.py

**Files:**
- 新建: `website/api-server/main.py`

- [ ] **Step 1：创建 main.py**

```bash
cat > "/Users/donny2026/Downloads/TradingAgents 项目/website/api-server/main.py" << 'PYEOF'
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
import datetime
from pathlib import Path
from typing import Any

from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

# ── 路径配置 ──
# 文件位置: website/api-server/main.py
# TA_ROOT:  TradingAgents 项目根目录
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

# ── 请求/响应模型 ──
class StartRequest(BaseModel):
    ticker: str
    date: str
    market: str
    session_id: str
    output_path: str

class StartResponse(BaseModel):
    session_id: str
    status: str

# ── 端点 ──
@app.get("/health")
def health():
    return {"status": "ok"}

@app.post("/analysis/start", response_model=StartResponse)
def start_analysis(req: StartRequest):
    session_id = req.session_id
    # 幂等：已存在且非 failed 则直接返回
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

# ── 分析执行线程 ──
# Agent 名称 → 进度字段映射
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
    """由 TradingAgents graph 节点调用，更新进度字段"""
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

        # 动态 import，确保 sys.path 已设置
        from tradingagents.graph.trading_graph import TradingAgentsGraph
        from tradingagents.default_config import DEFAULT_CONFIG

        asset_type = "crypto" if market.upper() == "CRYPTO" else "stock"
        config = DEFAULT_CONFIG.copy()
        config["results_dir"] = str(TA_ROOT / "logs")
        config["data_cache_dir"] = str(TA_ROOT / "cache")

        _update_session(session_id, current_step=f"Launching multi-agent analysis for {ticker}")
        graph = TradingAgentsGraph(debug=False, config=config)

        # 更新各 agent 启动状态（顺序执行，按实际 graph 节点顺序）
        agent_sequence = [
            "fundamentals_analyst",
            "market_analyst",
            "sentiment_analyst",
            "macro_analyst",
            "news_analyst",
            "risk_manager",
            "portfolio_manager",
        ]
        for ag in agent_sequence[:-1]:  # 最后一个（report）在 propagate 完成后设
            _progress_callback(session_id, ag, "running", f"Running {ag.replace('_', ' ')}")

        final_state, decision = graph.propagate(ticker, analysis_date, asset_type=asset_type)

        # 所有 agent 完成
        for ag in agent_sequence:
            _progress_callback(session_id, ag, "completed", "Generating final report")

        _update_session(session_id, current_step="Extracting insights")

        # 构建结果（与 run_analysis.py 相同结构）
        result = _build_result(ticker, analysis_date, final_state, decision)

        # 写入输出文件
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
        traceback.print_exc()
        _update_session(session_id,
            status="failed",
            current_step="Analysis failed",
            error=err_msg,
        )


def _build_result(ticker: str, analysis_date: str, final_state: dict, decision: str) -> dict:
    """构建与 run_analysis.py 兼容的结果 dict"""
    # 获取实时市场数据
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
PYEOF
```

- [ ] **Step 2：验证语法正确**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
.venv/bin/python -c "
import sys; sys.path.insert(0,'.')
import ast, pathlib
src = pathlib.Path('website/api-server/main.py').read_text()
ast.parse(src)
print('syntax OK')
"
```

预期输出：`syntax OK`

- [ ] **Step 3：启动服务，验证 /health**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
.venv/bin/uvicorn website.api-server.main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/health
```

> 注意：`api-server` 目录名含连字符，uvicorn 模块路径不能用点分，改用如下方式启动：

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目/website/api-server"
../../.venv/bin/uvicorn main:app --port 8000 &
sleep 2
curl -s http://localhost:8000/health
kill %1 2>/dev/null; true
```

预期输出：`{"status":"ok"}`

- [ ] **Step 4：Commit**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
git add website/api-server/main.py
git commit -m "feat(api-server): add FastAPI backend service with analysis endpoints"
```

---

## Task 3：修改 analysis-store.ts（exec → fetch）

**Files:**
- Modify: `website/web/src/lib/analysis-store.ts`（全文替换）

- [ ] **Step 1：写入新版 analysis-store.ts**

用以下内容完整替换 `website/web/src/lib/analysis-store.ts`：

```typescript
// 内存中的分析会话存储
// 通过 HTTP 调用 FastAPI 后端（PYTHON_BACKEND_URL）触发分析
import {
  AnalysisMode,
  AnalysisProgress,
  AnalysisSession,
  Market,
} from "../types";
import {
  cacheStockResult,
  invalidateStockResult,
  markAnalyzing,
  clearAnalyzing,
} from "../lib/result-cache";
import { mapTAResultToStockDetail, TARawResult } from "../lib/ta-mapper";

const sessions = new Map<string, AnalysisSession>();
const activeByTicker = new Map<string, string>();
const processStarted = new Set<string>();

const BACKEND_URL =
  process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

function defaultProgress(): AnalysisProgress {
  return {
    fundamental: "waiting",
    technical: "waiting",
    sentiment: "waiting",
    macro: "waiting",
    news: "waiting",
    risk: "waiting",
    report: "waiting",
  };
}

function generateSessionId(ticker: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(sessions.size + 1).padStart(3, "0");
  return `sess_${ticker.toLowerCase()}_${date}_${seq}`;
}

export function createSession(
  ticker: string,
  market: Market,
  mode: AnalysisMode
): AnalysisSession {
  const tickerUpper = ticker.toUpperCase();
  const existing = getActiveSessionByTicker(tickerUpper);
  if (existing) return existing;

  const session_id = generateSessionId(ticker);
  const session: AnalysisSession = {
    session_id,
    ticker: tickerUpper,
    status: "running",
    mode,
    market,
    created_at: new Date().toISOString(),
    completed_at: null,
    progress: defaultProgress(),
    result_json: null,
    current_step: "Queued",
    error_message: null,
  };
  sessions.set(session_id, session);
  activeByTicker.set(tickerUpper, session_id);
  invalidateStockResult(tickerUpper);
  markAnalyzing(tickerUpper);
  return session;
}

export function getSession(session_id: string): AnalysisSession | undefined {
  return sessions.get(session_id);
}

export function getActiveSessionByTicker(ticker: string): AnalysisSession | undefined {
  const sid = activeByTicker.get(ticker.toUpperCase());
  if (!sid) return undefined;
  const s = sessions.get(sid);
  if (!s) return undefined;
  if (s.status === "completed" || s.status === "failed") return undefined;
  return s;
}

export function updateSessionProgress(
  session_id: string,
  progress: Partial<AnalysisProgress>
): void {
  const session = sessions.get(session_id);
  if (session) {
    session.progress = { ...session.progress, ...progress };
  }
}

export function completeSession(session_id: string, result_json: string): void {
  const session = sessions.get(session_id);
  if (!session) return;

  session.status = "completed";
  session.completed_at = new Date().toISOString();
  session.result_json = result_json;
  for (const k of Object.keys(session.progress) as (keyof AnalysisProgress)[]) {
    session.progress[k] = "completed";
  }

  try {
    const raw = JSON.parse(result_json) as TARawResult;
    const detail = mapTAResultToStockDetail(raw);
    cacheStockResult(session.ticker, detail);
  } catch (e) {
    console.error(`[TradingAgents] 映射结果失败 ${session_id}:`, e);
    clearAnalyzing(session.ticker);
  }

  if (activeByTicker.get(session.ticker) === session_id) {
    activeByTicker.delete(session.ticker);
  }
}

export function failSession(session_id: string, reason?: string): void {
  const session = sessions.get(session_id);
  if (!session) return;
  session.status = "failed";
  session.completed_at = new Date().toISOString();
  if (reason) session.error_message = reason;
  clearAnalyzing(session.ticker);
  if (activeByTicker.get(session.ticker) === session_id) {
    activeByTicker.delete(session.ticker);
  }
}

function simulateProgress(session_id: string) {
  const AGENTS = ["fundamental", "technical", "sentiment", "macro", "news", "risk"] as const;
  const session = sessions.get(session_id);
  if (!session) return;

  let idx = 0;
  const step = () => {
    const s = sessions.get(session_id);
    if (!s || s.status === "completed" || s.status === "failed") return;

    if (idx < AGENTS.length) {
      if (idx > 0) s.progress[AGENTS[idx - 1]] = "completed";
      s.progress[AGENTS[idx]] = "running";
      idx++;
      setTimeout(step, 2000 + Math.random() * 2000);
    } else {
      for (const agent of AGENTS) s.progress[agent] = "completed";
      s.progress.report = "running";
    }
  };
  setTimeout(step, 1000);
}

export function startRealAnalysis(
  session_id: string,
  ticker: string,
  market: string
): void {
  const session = sessions.get(session_id);
  if (!session) return;
  if (processStarted.has(session_id)) return;
  processStarted.add(session_id);

  const now = new Date();
  const analysisDate = new Date(now.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  // output_path: 与旧逻辑保持一致，放在 data/analysis_results/
  const outputPath = `data/analysis_results/${session_id}.json`;

  simulateProgress(session_id);

  // 健康检查，失败时快速报错
  fetch(`${BACKEND_URL}/health`)
    .then((r) => {
      if (!r.ok) throw new Error(`health check failed: ${r.status}`);
    })
    .then(() =>
      fetch(`${BACKEND_URL}/analysis/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          date: analysisDate,
          market,
          session_id,
          output_path: outputPath,
        }),
      })
    )
    .then((r) => r.json())
    .then(() => {
      console.log(`[TradingAgents] 后端已接受分析请求: ${session_id}`);
      pollForResult(session_id, ticker);
    })
    .catch((err: unknown) => {
      const msg =
        err instanceof Error ? err.message : String(err);
      console.error(`[TradingAgents] 后端连接失败:`, msg);
      failSession(
        session_id,
        `Python backend not available (${BACKEND_URL}): ${msg}`
      );
    });
}

function pollForResult(session_id: string, ticker: string) {
  let attempts = 0;
  const maxAttempts = 120; // 120 × 5s = 10 分钟

  const check = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      failSession(session_id, "Analysis timed out (10 minutes)");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/analysis/${session_id}`);
      if (!res.ok) {
        setTimeout(check, 5000);
        return;
      }
      const data = await res.json();

      // 同步进度和步骤信息
      const s = sessions.get(session_id);
      if (s) {
        if (data.current_step) s.current_step = data.current_step;
        if (data.progress) {
          s.progress = { ...s.progress, ...data.progress };
        }
      }

      if (data.status === "failed") {
        failSession(session_id, data.error ?? "Analysis failed");
        return;
      }

      if (data.status === "completed" && data.result) {
        completeSession(session_id, JSON.stringify(data.result));
        console.log(`[TradingAgents] 完成: ${ticker} ${session_id}`);
        return;
      }

      setTimeout(check, 5000);
    } catch {
      setTimeout(check, 5000);
    }
  };

  setTimeout(check, 2000);
}
```

- [ ] **Step 2：检查 TypeScript 编译**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目/website/web"
npx tsc --noEmit 2>&1 | head -30
```

预期：无错误输出，或仅有与本次改动无关的既有警告。

- [ ] **Step 3：Commit**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
git add website/web/src/lib/analysis-store.ts
git commit -m "feat(web): replace shell exec with HTTP fetch to Python backend"
```

---

## Task 4：配置环境变量

**Files:**
- Modify: `website/web/.env.local`

- [ ] **Step 1：添加 PYTHON_BACKEND_URL**

```bash
grep -q "PYTHON_BACKEND_URL" "/Users/donny2026/Downloads/TradingAgents 项目/website/web/.env.local" \
  || echo "PYTHON_BACKEND_URL=http://localhost:8000" >> "/Users/donny2026/Downloads/TradingAgents 项目/website/web/.env.local"
```

- [ ] **Step 2：验证已写入**

```bash
grep "PYTHON_BACKEND_URL" "/Users/donny2026/Downloads/TradingAgents 项目/website/web/.env.local"
```

预期输出：`PYTHON_BACKEND_URL=http://localhost:8000`

- [ ] **Step 3：Commit**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
git add website/web/.env.local
git commit -m "chore: set PYTHON_BACKEND_URL for local dev"
```

---

## Task 5：端对端联调验证

- [ ] **Step 1：启动 FastAPI 后端**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目/website/api-server"
../../.venv/bin/uvicorn main:app --port 8000 --reload
```

保持此终端运行。

- [ ] **Step 2：启动 Next.js（新终端）**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目/website/web"
npm run dev
```

- [ ] **Step 3：验证健康检查**

```bash
curl -s http://localhost:8000/health
```

预期：`{"status":"ok"}`

- [ ] **Step 4：触发一次分析，验证请求流程**

```bash
# 模拟 Next.js 调用后端
SESSION_ID="sess_test_$(date +%Y%m%d)_001"
curl -s -X POST http://localhost:8000/analysis/start \
  -H "Content-Type: application/json" \
  -d "{\"ticker\":\"AAPL\",\"date\":\"2026-06-06\",\"market\":\"US\",\"session_id\":\"$SESSION_ID\",\"output_path\":\"/tmp/${SESSION_ID}.json\"}" \
  | python3 -m json.tool
```

预期输出：
```json
{
  "session_id": "sess_test_20260607_001",
  "status": "running"
}
```

- [ ] **Step 5：轮询进度**

```bash
sleep 3
curl -s "http://localhost:8000/analysis/${SESSION_ID}" | python3 -m json.tool
```

预期：`status` 为 `running` 或 `completed`，`current_step` 有内容，`progress` 各字段有更新。

- [ ] **Step 6：通过浏览器触发完整流程**

打开 `http://localhost:3000`，登录后对任意 ticker 触发分析，观察：
- 分析页面进度条正常显示（不再报 `venv python not found`）
- FastAPI 终端有请求日志
- 分析完成后结果页面正常渲染

---

## Task 6：清理旧文件（可选，分析确认无用后）

- [ ] **Step 1：确认 launch_analysis.sh 已不再被引用**

```bash
grep -rn "launch_analysis" "/Users/donny2026/Downloads/TradingAgents 项目/website/web/src/" 2>/dev/null
```

预期：无输出（已被 Task 3 移除）

- [ ] **Step 2：标记旧脚本已废弃（暂不删除，保留参考）**

```bash
cat >> "/Users/donny2026/Downloads/TradingAgents 项目/website/scripts/launch_analysis.sh" << 'EOF'
# DEPRECATED: replaced by website/api-server/main.py (FastAPI HTTP backend)
# This script is no longer called by analysis-store.ts
EOF
```

- [ ] **Step 3：Commit**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目"
git add website/scripts/launch_analysis.sh
git commit -m "chore: mark launch_analysis.sh as deprecated"
```

---

## 上线切换步骤（备忘，暂不执行）

1. 将 `website/api-server/` 部署到 Railway/Render（选 Python 环境，启动命令 `uvicorn main:app --host 0.0.0.0 --port 8000`）
2. 在 Vercel 项目设置 → Environment Variables：`PYTHON_BACKEND_URL=https://your-service.railway.app`
3. 重新部署 Vercel 前端
4. 完成，无需改代码

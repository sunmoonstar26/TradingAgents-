# Python 后端分离架构设计

**日期：** 2026-06-07  
**状态：** 已批准  
**目标：** 开发阶段搭好与上线同构的前后端分离架构，前端 Vercel + Python 后端独立服务，本地开发与生产行为一致。

---

## 背景与问题

当前 `analysis-store.ts` 通过 `exec(bash launch_analysis.sh)` 启动 Python 子进程，依赖本地文件系统的 `.venv`。Vercel Serverless Functions 没有持久文件系统和 venv，导致部署后分析功能完全失效（报错 `venv python not found at /var/task/.venv/bin/python3`）。

---

## 目标架构

```
用户浏览器
    ↓ HTTPS
Vercel（Next.js）                 本地开发：localhost:3000
    ↓ HTTP POST/GET                    ↓ HTTP POST/GET
PYTHON_BACKEND_URL                本地：localhost:8000
    ↓
FastAPI 服务                      生产：Railway / Render
    ↓
run_analysis.py + TradingAgents
```

环境变量 `PYTHON_BACKEND_URL` 是唯一的切换点：
- 本地开发：`http://localhost:8000`
- 生产：`https://your-service.railway.app`

---

## 新增组件：FastAPI 服务

### 位置
`website/api-server/main.py`

### 端点设计

| 方法 | 路径 | 说明 |
|------|------|------|
| `POST` | `/analysis/start` | 启动分析，返回 `session_id` |
| `GET` | `/analysis/{session_id}` | 轮询进度与结果 |
| `GET` | `/health` | 健康检查 |

### 启动分析流程

1. 接收 `{ ticker, date, market, session_id, output_path }` 
2. 在后台线程执行 `run_analysis.py` 逻辑（直接 import，不再用 subprocess）
3. 将进度写入内存 dict，结果写入 output_path
4. 立即返回 `{ session_id, status: "started" }`

### 进度轮询

`GET /analysis/{session_id}` 读取内存中的进度状态，返回：
```json
{
  "status": "running" | "completed" | "failed",
  "current_step": "Agents analyzing",
  "progress": { "fundamental": "completed", "technical": "running", ... },
  "result": null | { ...完整结果 },
  "error": null | "错误信息"
}
```

### 依赖文件
```
website/api-server/
├── main.py          # FastAPI 应用主体
├── requirements.txt # fastapi, uvicorn（其他依赖继承 TA venv）
└── README.md        # 本地启动说明
```

---

## 修改 analysis-store.ts

### 核心改动：`startRealAnalysis` 函数

**现在（shell exec）：**
```typescript
exec(`bash "${LAUNCH_SCRIPT}" ...`, callback)
// 轮询本地文件系统 outputFile
```

**改后（HTTP fetch）：**
```typescript
const backendUrl = process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000"
await fetch(`${backendUrl}/analysis/start`, {
  method: "POST",
  body: JSON.stringify({ ticker, date, market, session_id, output_path })
})
// 轮询 GET ${backendUrl}/analysis/${session_id}
```

### 轮询改动：`pollForResult`

从读本地文件改为 `fetch GET /analysis/{session_id}`，每 5 秒一次，逻辑与现有保持一致（超时、进度更新、完成/失败处理）。

### 移除的依赖
- `import { exec } from "child_process"` — 删除
- `import fs from "fs"` — 删除（仅分析相关部分，其他地方若有使用则保留）
- `import path from "path"` — 删除（仅分析相关部分）
- `LAUNCH_SCRIPT` 常量 — 删除

---

## 环境变量

### `website/web/.env.local`（新增一行）
```
PYTHON_BACKEND_URL=http://localhost:8000
```

### Vercel 生产配置（上线时设置）
```
PYTHON_BACKEND_URL=https://your-service.railway.app
```

---

## 本地开发启动方式

开两个终端：

```bash
# 终端 1：Python 后端
cd "TradingAgents 项目"
source .venv/bin/activate
cd website/api-server
uvicorn main:app --reload --port 8000

# 终端 2：Next.js 前端
cd "TradingAgents 项目/website/web"
npm run dev
```

或者后续用一个 `Makefile` / `concurrently` 合并成一条命令。

---

## 进度映射

FastAPI 后端通过回调机制实时更新进度，将 TradingAgents 的 agent 状态映射到前端已有的 7 个进度字段：

| TradingAgents 阶段 | 前端进度字段 |
|--------------------|-------------|
| `fundamentals_analyst` | `fundamental` |
| `market_analyst` | `technical` |
| `sentiment_analyst` | `sentiment` |
| `macro_analyst` | `macro` |
| `news_analyst` | `news` |
| `risk_manager` | `risk` |
| `portfolio_manager` | `report` |

---

## 错误处理

| 场景 | 处理方式 |
|------|---------|
| Python 后端未启动 | fetch 抛 `ECONNREFUSED`，`failSession` 并提示"Python backend not available" |
| 分析超时（>10分钟） | 与现在一致，120次轮询后 failSession |
| Python 后端返回 error | `failSession(session_id, result.error)` |
| 后端健康检查失败 | 启动前 `GET /health`，失败直接 failSession |

---

## 不改动的范围

- `createSession` / `completeSession` / `failSession` — 保持原样
- `simulateProgress` — 保持原样（用于 UI 动画）
- `readLogStep` / `stepToMessage` — 可删除（逻辑移到后端），或保留兼容
- 所有前端 UI 组件 — 零改动
- `/api/analysis/start` 和 `/api/analysis/[session_id]` API routes — 零改动
- Supabase auth、credits、其他功能 — 零改动

---

## 实施顺序

1. 创建 `website/api-server/main.py`（FastAPI 服务）
2. 创建 `website/api-server/requirements.txt`
3. 修改 `website/web/src/lib/analysis-store.ts`（exec → fetch）
4. 在 `.env.local` 加 `PYTHON_BACKEND_URL=http://localhost:8000`
5. 本地联调验证

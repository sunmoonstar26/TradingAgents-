# Railway 后端部署 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 在 Railway 上部署 FastAPI Python 后端，使 Vercel 前端可以通过 `PYTHON_BACKEND_URL` 调用它运行 TradingAgents 多智能体分析。

**Architecture:** Railway 从项目根目录构建，先用 `pip install -e .` 安装 `tradingagents` 包及其全部依赖，再安装 `website/api-server/requirements.txt`，最后从根目录启动 `uvicorn website/api-server/main:app`。`main.py` 在启动时将根目录加入 `sys.path`（已有此逻辑），因此 `tradingagents` 包可正常 import。

**Tech Stack:** Railway（nixpacks 构建），Python 3.11，FastAPI，uvicorn，TradingAgents（langchain/langgraph），DeepSeek API，FinnHub API，Alpha Vantage API。

---

## 文件变更概览

| 操作 | 路径 | 说明 |
|------|------|------|
| 新建 | `railway.toml` | Railway 构建和启动配置（根目录） |
| 修改 | `website/api-server/requirements.txt` | 补全 fastapi/uvicorn 固定版本 |

---

### Task 1：在根目录创建 `railway.toml`

**Files:**
- Create: `railway.toml`（项目根目录 `/Users/donny2026/Downloads/TradingAgents 项目/railway.toml`）

Railway 使用 nixpacks 构建。配置文件指定：构建时安装两份依赖，启动命令指向 api-server/main.py。

- [ ] **Step 1: 创建 `railway.toml`**

在项目根目录创建文件，内容如下：

```toml
[build]
builder = "nixpacks"
buildCommand = "pip install -e . && pip install -r website/api-server/requirements.txt"

[deploy]
startCommand = "uvicorn website.api-server.main:app --host 0.0.0.0 --port $PORT"
restartPolicyType = "on_failure"
restartPolicyMaxRetries = 3
```

> **注意**：Railway 自动注入 `$PORT` 环境变量。`uvicorn` 必须绑定 `0.0.0.0` 而非 `127.0.0.1`。

- [ ] **Step 2: 验证文件路径正确**

```bash
ls -la railway.toml
```

Expected: 文件存在，大小 > 0。

- [ ] **Step 3: 提交**

```bash
git add railway.toml
git commit -m "feat(deploy): add railway.toml for Python backend deployment"
```

---

### Task 2：修复 `website/api-server/requirements.txt`

**Files:**
- Modify: `website/api-server/requirements.txt`

当前文件只有 `fastapi>=0.110.0` 和 `uvicorn>=0.29.0`，版本未固定，Railway 构建时可能拉到不兼容版本。固定版本确保可重现构建。

- [ ] **Step 1: 更新 requirements.txt**

```
fastapi==0.115.0
uvicorn[standard]==0.30.6
```

> `uvicorn[standard]` 包含 `httptools` 和 `uvloop`，在 Linux 上性能更好。

- [ ] **Step 2: 提交**

```bash
git add website/api-server/requirements.txt
git commit -m "fix(deploy): pin fastapi and uvicorn versions for reproducible build"
```

---

### Task 3：在 Railway 控制台创建项目并配置环境变量

这一步在 Railway 网页控制台操作，不需要改代码。

- [ ] **Step 1: 登录 Railway，新建 Project**

访问 https://railway.app → New Project → Deploy from GitHub repo → 选择你的仓库。

- [ ] **Step 2: 确认 Root Directory 设为空（即项目根目录）**

Railway 设置页 → Settings → Source → Root Directory 留空（默认）。这样 `railway.toml` 在根目录可被正确读取，`pip install -e .` 也能找到 `pyproject.toml`。

- [ ] **Step 3: 在 Railway 添加环境变量**

在 Railway → Variables 页面添加以下变量（值填你本地 `.env` 里对应的内容）：

```
DEEPSEEK_API_KEY=<你的 DeepSeek key>
FINNHUB_API_KEY=<你的 FinnHub key>
ALPHA_VANTAGE_API_KEY=<你的 Alpha Vantage key>
TRADINGAGENTS_LLM_PROVIDER=deepseek
TRADINGAGENTS_DEEP_THINK_LLM=deepseek-v4-pro
TRADINGAGENTS_QUICK_THINK_LLM=deepseek-v4-flash
TRADINGAGENTS_OUTPUT_LANGUAGE=en
```

- [ ] **Step 4: 触发 Deploy**

Railway 会在 push 或手动触发时自动构建。在 Deployments 页面查看构建日志，确认出现：

```
Successfully installed tradingagents-0.2.5 ...
INFO:     Application startup complete.
```

- [ ] **Step 5: 记录 Railway 给出的公网 URL**

格式类似 `https://xxx.up.railway.app`，下一步要填入 Vercel。

---

### Task 4：在 Vercel 更新 `PYTHON_BACKEND_URL`

这一步在 Vercel 控制台操作。

- [ ] **Step 1: 登录 Vercel → 进入你的项目 → Settings → Environment Variables**

- [ ] **Step 2: 添加/更新变量**

```
PYTHON_BACKEND_URL=https://xxx.up.railway.app
```

将 `xxx` 替换为上一步 Railway 给出的真实域名。Environment 选 Production（和 Preview 都勾上）。

- [ ] **Step 3: 在 Vercel 重新部署**

Vercel → Deployments → 点最新那次 → Redeploy，让新环境变量生效。

---

### Task 5：端到端验证

- [ ] **Step 1: 验证 Railway 后端健康检查**

```bash
curl https://xxx.up.railway.app/health
```

Expected:
```json
{"status": "ok"}
```

- [ ] **Step 2: 从 Vercel 前端触发一次 Radar 分析**

打开线上 Vercel URL → 进入 Dashboard → Opportunity Radar → 点任意股票右侧的刷新按钮。

Expected: 按钮出现 spinning 动画，状态变为 "Analyzing"，约 5 分钟后变为 "Completed"，数据更新。

- [ ] **Step 3: 如果 Step 2 失败，检查 Railway 日志**

Railway → 你的服务 → Logs，搜索 `ERROR` 或 `Exception`。

常见问题：
- `ModuleNotFoundError: tradingagents` → 检查 `buildCommand` 是否执行了 `pip install -e .`
- `Connection refused` / CORS 错误 → 检查 `PYTHON_BACKEND_URL` 是否正确、是否包含 `https://`
- `DEEPSEEK_API_KEY not set` → 检查 Railway 环境变量是否保存成功

---

## 已知限制

**Railway 免费层会在 30 分钟无流量后休眠。** 如果冷启动期间前端发起分析请求，Railway 会先唤醒（约 10 秒），然后开始分析。这会导致前端看到轮询等待时间略长，但不会丢失任务。

如需保活，可在 Railway 添加一个 Cron Job：
- Schedule: `*/20 * * * *`
- Command: `curl https://xxx.up.railway.app/health`

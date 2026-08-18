# 中文后端独立部署设计文档

## 问题背景

`api-server/main.py` 使用线程并发处理分析请求，但 TradingAgents 的 `set_config()` 写的是进程级全局单例。多线程并发时，线程 A 设 "Chinese"，线程 B 设 "English"，互相覆盖，导致输出报告中英文混杂。

## 解决方案

新建 `api-server-zh/` 作为中文网站（`web-zh`）的独立后端：

1. **进程隔离**：每次分析请求启动独立子进程（`subprocess.Popen`），Python 全局状态完全隔离
2. **语言硬编码**：`run_analysis_zh.py` 在进程启动时强制设置 `TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese`，`api-server-zh/main.py` 也在子进程 env 中覆盖，双重保证
3. **完全独立**：独立的结果目录 `api-server-zh/data/analysis_results/`，不与英文后端共享

## 文件结构

```
website/
├── api-server/          # 英文后端（不变）
└── api-server-zh/       # 中文专用后端（新增）
    ├── main.py          # FastAPI，subprocess 模型
    ├── run_analysis_zh.py  # 分析包装脚本（进程入口）
    ├── requirements.txt
    └── data/
        └── analysis_results/
```

## 架构

```
web-zh (Next.js)
  → PYTHON_BACKEND_ZH_URL
  → api-server-zh (FastAPI :8001)
      → POST /analysis/start
          → threading.Thread (仅做进度管理，不运行 TA)
              → subprocess.Popen(run_analysis_zh.py)
                  → 独立进程，TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese
                  → TradingAgentsGraph.propagate()
                  → 结果写入 data/analysis_results/{session_id}.json
              ← stdout 逐行读取进度 JSON
      → GET /analysis/{session_id}  (前端轮询)
      → GET /analysis/latest/{ticker}
```

## 环境变量

| 变量 | 值 | 位置 |
|------|-----|------|
| `PYTHON_BACKEND_ZH_URL` | `http://localhost:8001`（本地）/ Railway URL（生产） | web-zh .env.local |
| `TRADINGAGENTS_OUTPUT_LANGUAGE` | `Chinese`（由 api-server-zh 在子进程 env 注入，覆盖 .env） | api-server-zh 运行时 |

## 本地启动

```bash
cd website/api-server-zh
uvicorn main:app --reload --port 8001
```

`web-zh` 在 `.env.local` 中添加：
```
PYTHON_BACKEND_ZH_URL=http://localhost:8001
```

## 生产部署（Railway）

在 Railway 新建一个服务，指向 `website/api-server-zh/`，配置：
- Root Directory: `website/api-server-zh`
- Start Command: `uvicorn main:app --host 0.0.0.0 --port $PORT`
- 环境变量：与 `api-server` 相同的 API keys，无需设置 `TRADINGAGENTS_OUTPUT_LANGUAGE`（由代码注入）

将服务 URL 填入 `web-zh` 的 `PYTHON_BACKEND_ZH_URL` 环境变量。

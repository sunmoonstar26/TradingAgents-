# TradingAgents 项目文档

> 生成日期：2026-07-20  
> 工作目录：`website/web-zh`（中文专用前端 + 专属 Python 后端）

---

## ① 当前项目目录树

```
TradingAgents 项目/
├── .env                          # 全局环境变量（LLM key、数据源 key）
├── main.py                       # 顶层 CLI 入口（legacy，被 cli/ 替代）
├── pyproject.toml / uv.lock      # Python 依赖管理（uv）
├── Dockerfile / docker-compose.yml / railway.toml
├── tradingagents/                # 核心 Python AI 引擎
│   ├── agents/
│   │   ├── analysts/             # 4 个分析师 Agent
│   │   ├── managers/             # 2 个管理者 Agent
│   │   ├── researchers/          # 多空研究员
│   │   ├── risk_mgmt/            # 3 个风险辩论 Agent
│   │   ├── trader/               # 交易员 Agent
│   │   └── utils/                # 状态、工具、内存、评分
│   ├── dataflows/                # 数据源接入层（yfinance、Finnhub、Alpha Vantage 等）
│   ├── graph/                    # LangGraph 工作流编排
│   │   ├── trading_graph.py      # 主图对象（TradingAgentsGraph）
│   │   ├── setup.py              # StateGraph 构建与 Agent 节点注册
│   │   ├── propagation.py        # graph.propagate() 执行入口
│   │   ├── conditional_logic.py  # 节点间条件跳转逻辑
│   │   ├── signal_processing.py  # 最终信号解析
│   │   ├── reflection.py         # 反思学习层
│   │   └── checkpointer.py       # LangGraph checkpoint（可选）
│   ├── llm_clients/              # 多 LLM Provider 抽象层
│   └── default_config.py         # 全局配置（单一来源）
├── cli/                          # 交互式命令行工具
├── tests/                        # Python 单元测试
├── cache/                        # 数据缓存（ticker-level JSON）
├── logs/                         # Agent 报告输出目录
├── reports/                      # 历史分析报告
│
└── website/
    ├── api-server/               # 原版 FastAPI 后端（英文）
    ├── api-server-zh/            # 中文专用 FastAPI 后端
    │   ├── main.py               # FastAPI 服务入口（端口 8001）
    │   ├── run_analysis_zh.py    # 子进程分析包装器
    │   └── data/analysis_results/  # 分析结果 JSON 缓存
    ├── web/                      # 原版 Next.js 前端（英文，已弃用）
    ├── web-en/                   # 重构后英文前端
    └── web-zh/                   # 中文前端（当前工作目录）
        ├── src/
        │   ├── app/              # Next.js App Router 页面 + API
        │   ├── components/       # UI 组件（auth / dashboard / layout / stock / ui）
        │   ├── content/          # 所有展示文案（labels.ts、analysis.ts）
        │   ├── data/             # 静态数据（stocks.ts 股票列表）
        │   ├── lib/              # 业务逻辑（stores、mapper、auth）
        │   └── types/            # TypeScript 类型（enums.ts、index.ts）
        ├── supabase/schema.sql   # 数据库建表 DDL
        ├── next.config.ts        # Next.js 16 配置
        └── package.json          # 依赖清单
```

---

## ② 当前系统架构图

```
┌──────────────────────────────────────────────────────────────────┐
│                         用户浏览器                               │
│          Next.js 16 (web-zh，端口 3001)                          │
│   React 19 · TanStack Query · Zustand · Framer Motion            │
└─────────────────┬──────────────────────────────────────────────┘
                  │ HTTP（fetch）
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│               Next.js API Routes（/src/app/api/）                │
│  /api/analysis/start     → 创建会话，调用 Python 后端            │
│  /api/analysis/[id]      → 查询分析进度（转发到 FastAPI）        │
│  /api/stocks/[ticker]    → 查询股票结果（in-memory cache）       │
│  /api/stocks/[ticker]/*  → insights / agents / debate / risk … │
│  /api/dashboard          → mock 数据（待替换）                   │
│  /api/market             → 读取 data/market.json                │
│  /api/status             → 活跃任务统计                          │
│  /api/radar/update       → 自定义雷达写 localStorage            │
└─────────────────┬──────────────────────────────────────────────┘
                  │ HTTP + 5s polling
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│              FastAPI api-server-zh（端口 8001）                  │
│  POST /analysis/start   → 启动子进程                            │
│  GET  /analysis/{id}    → 返回进度 + 结果                       │
│  GET  /analysis/latest/{ticker}                                  │
│  GET  /health                                                    │
│  语言：TRADINGAGENTS_OUTPUT_LANGUAGE=Chinese（进程级强制）       │
└─────────────────┬──────────────────────────────────────────────┘
                  │ subprocess（Python venv）
                  ▼
┌──────────────────────────────────────────────────────────────────┐
│          run_analysis_zh.py（独立子进程，进程隔离）              │
│          TradingAgentsGraph.propagate(ticker, date)              │
│          LangGraph StateGraph → 多 Agent 并行/串行执行           │
└─────────────────┬──────────────────────────────────────────────┘
                  │ 写入 JSON
                  ▼
         api-server-zh/data/analysis_results/{session_id}.json
```

**外部依赖：**

| 服务 | 用途 |
|------|------|
| Supabase | 用户认证（auth.users）+ Credits 表 + 分析历史表 |
| Resend API | 注册邮件发送 |
| Creem | Credits 购买支付 |
| yfinance / Finnhub / Alpha Vantage | 股价、基本面、新闻数据 |
| OpenAI / Anthropic / Gemini / GLM / Qwen … | LLM 推理（多 Provider 可切换） |

---

## ③ 当前模块关系图

```
src/app/stock/[ticker]/page.tsx
    ├── useQuery("/api/stocks/[ticker]")
    │       └── lib/mock-stock.ts → result-cache.ts
    ├── useQuery("/api/analysis/[session_id]")
    │       └── app/api/analysis/[session_id]/route.ts
    │               └── → PYTHON_BACKEND_ZH_URL/analysis/{id}
    └── [components/stock/*]
            ├── final-decision.tsx    (ThesisInsight)
            ├── bull-bear-debate.tsx  (DebateInsight)
            ├── agent-analysis.tsx    (AnalystInsight × 6)
            ├── risk-analysis.tsx     (RiskInsight)
            ├── portfolio-decision.tsx
            ├── reflection-memory.tsx (MemoryInsight)
            └── live-rail.tsx         (livefeed-store)

src/app/page.tsx（首页 Dashboard）
    ├── useQuery("/api/dashboard") → mock-data.ts
    └── [components/dashboard/*]
            ├── research-console.tsx   (股票搜索 → 触发分析)
            ├── opportunity-radar.tsx  (radar-store + localStorage)
            ├── live-feed.tsx          (livefeed-store)
            ├── risk-terminal.tsx      (risk-alert-store)
            └── conviction-ideas.tsx   (result-cache → ConvictionIdeas)

lib/analysis-store.ts
    ├── createSession() → 内存 Map
    ├── startRealAnalysis() → fetch PYTHON_BACKEND_ZH_URL
    ├── pollForResult()    → 5s 轮询
    └── completeSession() → ta-mapper.ts → result-cache.ts

lib/ta-mapper.ts（TARawResult → StockDetail 唯一转换器）
    └── 读取 types/enums.ts、content/labels.ts

src/types/enums.ts（枚举唯一来源）
src/content/labels.ts（展示文案唯一来源）
```

---

## ④ 当前数据流

**发起一次分析的完整流程：**

```
1. 用户在 research-console 输入 ticker + 选择市场
2. POST /api/analysis/start
   → createSession(ticker, market, mode)
   → startRealAnalysis()
      → GET  {BACKEND}/health
      → POST {BACKEND}/analysis/start  { ticker, date, market, session_id, output_path }
      → pollForResult()（每 5s 轮询 GET {BACKEND}/analysis/{id}）
3. FastAPI api-server-zh
   → 开启 Thread → Popen run_analysis_zh.py
   → 逐行解析 stdout JSON 更新 _sessions 进度
4. run_analysis_zh.py（独立进程）
   → TradingAgentsGraph.propagate(ticker, date)
   → 多 Agent 并行分析 → 生成 final_state
   → 写 data/analysis_results/{session_id}.json
5. pollForResult 检测到 status="completed"
   → completeSession(session_id, result_json)
   → ta-mapper.ts 映射 → result-cache.ts 缓存
6. 前端 /api/stocks/[ticker] 路由检查 result-cache
   → 返回 StockDetail 给页面组件渲染
7. 分析结果同步到：
   - radar-store（机会雷达）
   - livefeed-store（实时动态）
   - risk-alert-store（风险告警）
   - analysis-history（Supabase 历史表，待接入）
```

**进度跟踪字段（AnalysisProgress）：**  
`fundamental / technical / sentiment / macro / news / risk / report`  
每个字段状态：`waiting → running → completed`

---

## ⑤ 当前数据库设计（Supabase）

### 表结构

```sql
-- auth.users（Supabase 内置）
--   id uuid, email, created_at, ...

-- public.user_credits
CREATE TABLE user_credits (
  id         uuid PRIMARY KEY REFERENCES auth.users(id),
  credits    integer NOT NULL DEFAULT 5,   -- 新用户赠 5 Credits
  updated_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: 用户只能读写自己的行

-- public.analysis_history
CREATE TABLE analysis_history (
  id          uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id     uuid NOT NULL REFERENCES auth.users(id),
  ticker      text NOT NULL,
  name        text,                  -- 公司名
  signal      text,                  -- 原始信号字符串
  conviction  integer,               -- 0-100
  mode        text DEFAULT 'standard',
  headline    text,
  analyzed_at timestamptz NOT NULL DEFAULT now()
);
-- RLS: 用户只能读写自己的记录

-- 触发器
-- on_auth_user_created → handle_new_user() → 自动创建 user_credits 记录
```

### 备注

- **当前 web-zh 的 auth.ts 为本地单用户模式**（无认证，始终已登录），Supabase 认证仅在 web-en 中完整接入。
- `analysis_history` 表已建但 web-zh 前端尚未写入（缺失项之一）。

---

## ⑥ 当前页面结构

| 路径 | 文件 | 说明 |
|------|------|------|
| `/` | `app/page.tsx` | 主仪表盘：研究台 + 机会雷达 + 市场状态 |
| `/stock/[ticker]` | `app/stock/[ticker]/page.tsx` | 股票详情：6 大分析模块 + 实时分析状态 |
| `/stock/[ticker]/agent/[type]` | `app/stock/[ticker]/agent/[type]/page.tsx` | 单个 Agent 报告详情页 |
| `/stock/[ticker]/debate/[side]` | `app/stock/[ticker]/debate/[side]/page.tsx` | 多空辩论单方详情 |
| `/stock/[ticker]/risk-detail/[stance]` | `app/stock/[ticker]/risk-detail/[stance]/page.tsx` | 风险视角详情 |
| `/stock/[ticker]/allocation` | `app/stock/[ticker]/allocation/page.tsx` | 仓位分配建议 |
| `/analysis/[session_id]` | `app/analysis/[session_id]/page.tsx` | 分析进度实时追踪页 |
| `/history` | `app/history/page.tsx` | 历史分析记录 |
| `/watchlist` | `app/watchlist/page.tsx` | 自选股列表 |
| `/workspace` | `app/workspace/page.tsx` | 工作空间（待开发） |
| `/settings` | `app/settings/page.tsx` | 用户设置 |

### 布局层级

```
app/layout.tsx
  └── <Providers>（TanStack Query）
        └── <Header>（活跃任务数、用户状态）
              └── [page content]
```

---

## ⑦ 当前有哪些 Agent

### Python AI Agent（tradingagents/agents/）

| Agent | 文件 | 职责 |
|-------|------|------|
| Market Analyst（技术面） | `analysts/market_analyst.py` | 价格走势、技术指标分析 |
| Fundamentals Analyst（基本面） | `analysts/fundamentals_analyst.py` | 财报、估值、基本面研究 |
| Sentiment Analyst（情绪面） | `analysts/sentiment_analyst.py` | 社交媒体情感分析 |
| News Analyst（新闻） | `analysts/news_analyst.py` | 新闻事件分析 |
| Social Media Analyst | `analysts/social_media_analyst.py` | Reddit / StockTwits 信号 |
| Bull Researcher（多方） | `researchers/bull_researcher.py` | 看多论据构建 |
| Bear Researcher（空方） | `researchers/bear_researcher.py` | 看空论据构建 |
| Research Manager（裁判） | `managers/research_manager.py` | 多空辩论主持，形成投资论点 |
| Trader（交易员） | `trader/trader.py` | 生成最终交易决策 |
| Aggressive Debator（激进风险） | `risk_mgmt/aggressive_debator.py` | 激进立场风险辩论 |
| Neutral Debator（中性风险） | `risk_mgmt/neutral_debator.py` | 中性立场风险辩论 |
| Conservative Debator（保守风险） | `risk_mgmt/conservative_debator.py` | 保守立场风险辩论 |
| Portfolio Manager（组合管理） | `managers/portfolio_manager.py` | 综合风险辩论，输出仓位建议 |

### 执行顺序

```
Analysts（并行/串行，默认串行）
  → Bull Researcher ↔ Bear Researcher（多轮辩论，默认 1 轮）
    → Research Manager（多空裁决）
      → Trader（初始交易决策）
        → Aggressive / Neutral / Conservative（风险辩论，默认 1 轮）
          → Portfolio Manager（最终决策）
```

### 前端 Agent 展示（AgentPersonality Enum）

| Enum 值 | 展示名称 | 对应 Python Agent |
|---------|---------|------------------|
| `fundamental` | 基本面分析师 | Fundamentals Analyst |
| `technical` | 技术面分析师 | Market Analyst |
| `sentiment` | 情绪面分析师 | Sentiment Analyst |
| `risk` | 风险管理师 | Risk Debators + Portfolio Manager |
| `news` | 新闻分析师 | News Analyst |
| `macro` | 宏观分析师 | （由 news_analyst 兼任，暂无独立节点） |

---

## ⑧ 当前有哪些 Memory

### Python 层 — TradingMemoryLog

- **文件**：`tradingagents/agents/utils/memory.py`
- **存储位置**：`~/.tradingagents/memory/trading_memory.md`（默认）
- **格式**：Append-only Markdown，每条含 `[日期 | ticker | 评级 | 状态]` 标签 + `DECISION` + `REFLECTION` 段
- **读写流程**：
  - 阶段 A（propagate 后）：`store_decision()` 追加 pending 条目
  - 阶段 B（reflection 后）：`store_reflection()` 写入反思内容，状态改为 resolved
- **旋转策略**：`memory_log_max_entries` 控制保留条目数（默认 None = 不限）

### 前端层 — LocalStorage

| Key | 内容 | 管理模块 |
|-----|------|---------|
| `tradingagents_radar_custom` | 用户自定义机会雷达列表 | `lib/radar-store.ts` |
| `tradingagents_radar_initialized` | 是否已初始化雷达 | `lib/radar-store.ts` |
| `tradingagents_memo_custom` | 用户自定义备忘录 | `lib/memo-store.ts` |
| `tradingagents_livefeed` | 实时动态条目（最多 30 条）| `lib/livefeed-store.ts` |
| `tradingagents_risk_alerts` | 风险告警条目 | `lib/risk-alert-store.ts` |

### 前端层 — In-Memory（进程级）

| 存储 | 位置 | 生命周期 |
|------|------|---------|
| 分析会话状态 | `lib/analysis-store.ts` → `sessions Map` | Next.js 服务端进程存活期 |
| 活跃 ticker 映射 | `lib/analysis-store.ts` → `activeByTicker Map` | 同上 |
| 完成结果缓存 | `lib/result-cache.ts` → `completedResults Map` | 同上 |

---

## ⑨ 当前有哪些 Workflow

### LangGraph 编排（Python 侧）

| Workflow 名称 | 描述 | 文件 |
|--------------|------|------|
| `TradingAgentsGraph` | 完整分析主流程 | `tradingagents/graph/trading_graph.py` |
| `AnalystExecutionPlan` | 分析师执行计划（串行/并行自适应）| `tradingagents/graph/analyst_execution.py` |
| `InvestDebateState` | 多空研究员辩论子图状态 | `tradingagents/agents/utils/agent_states.py` |
| `RiskDebateState` | 风险辩论子图状态 | 同上 |
| Reflection（反思层）| propagate 后触发，写 memory | `tradingagents/graph/reflection.py` |
| Signal Processing | 最终信号解析（BUY/SELL/HOLD） | `tradingagents/graph/signal_processing.py` |

### Next.js 侧数据流 Workflow

| Workflow 名称 | 描述 |
|--------------|------|
| 分析启动流程 | `POST /api/analysis/start → createSession → startRealAnalysis → subprocess` |
| 进度轮询流程 | `pollForResult()` 每 5s 轮询 FastAPI，直到 completed/failed 或超时（10 分钟）|
| 模拟进度流程 | `simulateProgress()` 在等待后端期间给前端展示假进度动画 |
| 结果映射流程 | `completeSession → ta-mapper → result-cache → 触发 localStorage 同步` |

---

## ⑩ 当前有哪些缺失

### 🔴 高优先级（功能缺失）

1. **`/api/dashboard` 返回 mock 数据**  
   `app/api/dashboard/route.ts` 固定返回 `mockDashboardData`，未接入真实股市数据或 Supabase。

2. **分析历史未写入 Supabase**  
   `public.analysis_history` 表已建，但 `completeSession()` 和各 API 路由均未执行 INSERT 操作。

3. **Auth 为本地单用户模式**  
   `lib/auth.ts` 硬编码 `LOCAL_USER`，Credits 扣减、Supabase 登录注册、会话验证均未接入。  
   对比：web-en 已有完整 Supabase Auth 集成。

4. **Credits 系统未接通**  
   `.env.local` 中已配置 Creem API Key 和 Product ID，但前端无购买页、后端无扣减 API。

5. **宏观分析师无独立 Agent 节点**  
   前端展示 `AgentPersonality.MACRO`（宏观分析师），但 Python 侧无对应专属节点，内容由 news_analyst 间接覆盖。

### 🟡 中优先级（稳定性 / 一致性）

6. **进度映射不完整**  
   `api-server-zh/main.py` 的 `_STEP_TO_PROGRESS` 仅映射 4 个步骤（init/started/running/completed），无法精确反映 7 个进度字段。

7. **`/api/radar/update` 未实现服务端持久化**  
   雷达数据写 localStorage，刷新/换设备丢失，无 Supabase 同步。

8. **`/workspace` 页面为空页**  
   路由已注册，但 `app/workspace/page.tsx` 无实质内容。

9. **`/history` 页面无真实数据**  
   路由已注册，但依赖 Supabase analysis_history，认证未接入时返回空。

10. **`data/market.json` 无自动更新机制**  
    `/api/market` 路由读取静态文件，无 cron 任务或 webhook 更新市场行情。

### 🟢 低优先级（技术债）

11. **`mock-data.ts` 和 `mock-stock.ts` 未清理**  
    `lib/mock-data.ts`、`lib/mock-stock.ts` 仍被 dashboard 和 stock 路由引用，真实数据接入后应移除。

12. **前端 `TRADINGAGENTS_OUTPUT_LANGUAGE=en` 与后端冲突**  
    `.env.local` 中配置 `TRADINGAGENTS_OUTPUT_LANGUAGE=en`，但 `run_analysis_zh.py` 进程内强制覆盖为 `Chinese`，易造成认知混乱，建议清理此环境变量。

13. **`src/proxy.ts` 用途不明**  
    文件存在但未被任何模块 import，疑为废弃代码。

14. **`web/`（旧版前端）残留**  
    `website/web/` 目录仍存在，与 `web-zh/`、`web-en/` 并列，增加混淆风险。

---

*本文档由代码阅读生成，不含任何推测内容。所有描述均可回溯至源码。*

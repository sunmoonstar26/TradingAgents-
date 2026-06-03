# TradingAgents 网站 — 中文开发 / 英文产品 架构方案

**日期：** 2026-06-02  
**状态：** 待执行  

---

## 核心原则

```
开发注释 / 任务说明   →  简体中文（允许）
代码逻辑 / 枚举判断   →  英文（强制）
数据库 / API 传输     →  英文（强制）
用户可见界面          →  英文（强制）
TradingAgents AI 输出 →  英文（强制）
后台管理界面          →  中文（允许）
```

**禁止在业务逻辑中使用中文字符串进行条件判断。**  
**所有用户界面文案统一放置于 `src/content/` 目录，不允许在组件中直接硬编码字符串。**

---

## 目录结构

```
src/
├── types/
│   ├── index.ts        ← 现有（保留接口定义，中文枚举值清理）
│   └── enums.ts        ← 新建（所有 TypeScript Enum）
│
└── content/
    ├── labels.ts       ← 新建（Signal/Risk/Agent 等系统枚举展示文案）
    ├── nav.ts          ← 新建
    ├── analysis.ts     ← 新建
    ├── billing.ts      ← 新建
    ├── dashboard.ts    ← 新建
    ├── history.ts      ← 新建
    ├── auth.ts         ← 新建
    └── toast.ts        ← 新建（后续加）
```

---

## 第一步：`types/enums.ts`

替换 `types/index.ts` 中所有中文联合类型（`"强烈买入" | "买入" | ...`、`"低" | "中" | "高"` 等）。

```ts
// src/types/enums.ts

export enum Signal {
  STRONG_BUY  = "STRONG_BUY",
  BUY         = "BUY",
  HOLD        = "HOLD",
  SELL        = "SELL",
  STRONG_SELL = "STRONG_SELL",
}

export enum RiskLevel {
  LOW    = "LOW",
  MEDIUM = "MEDIUM",
  HIGH   = "HIGH",
  DANGER = "DANGER",
}

export enum AlertLevel {
  DANGER  = "DANGER",
  WARNING = "WARNING",
  WATCH   = "WATCH",
}

export enum Verdict {
  BULLISH = "BULLISH",
  BEARISH = "BEARISH",
  NEUTRAL = "NEUTRAL",
}

export enum AgentPersonality {
  FUNDAMENTAL = "fundamental",
  TECHNICAL   = "technical",
  SENTIMENT   = "sentiment",
  RISK        = "risk",
  NEWS        = "news",
  MACRO       = "macro",
}
```

---

## 第二步：`content/labels.ts`

系统枚举的展示文案，全项目复用。颜色逻辑也集中在此，不再散落各组件。

```ts
// src/content/labels.ts

import { Signal, RiskLevel, AlertLevel, AgentPersonality } from "@/types/enums";

export const SIGNAL_LABELS: Record<Signal, string> = {
  [Signal.STRONG_BUY]:  "Strong Buy",
  [Signal.BUY]:         "Buy",
  [Signal.HOLD]:        "Hold",
  [Signal.SELL]:        "Sell",
  [Signal.STRONG_SELL]: "Strong Sell",
};

export const SIGNAL_COLORS: Record<Signal, string> = {
  [Signal.STRONG_BUY]:  "#22c55e",
  [Signal.BUY]:         "#22c55e",
  [Signal.HOLD]:        "#f59e0b",
  [Signal.SELL]:        "#ef4444",
  [Signal.STRONG_SELL]: "#ef4444",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]:    "Low",
  [RiskLevel.MEDIUM]: "Medium",
  [RiskLevel.HIGH]:   "High",
  [RiskLevel.DANGER]: "Critical",
};

export const ALERT_LABELS: Record<AlertLevel, string> = {
  [AlertLevel.DANGER]:  "Critical",
  [AlertLevel.WARNING]: "Warning",
  [AlertLevel.WATCH]:   "Watch",
};

export const AGENTS: Record<AgentPersonality, { name: string; role: string }> = {
  [AgentPersonality.FUNDAMENTAL]: { name: "Fundamental Analyst",  role: "Financial Modeling · Valuation" },
  [AgentPersonality.TECHNICAL]:   { name: "Technical Analyst",    role: "Price Action · Pattern Recognition" },
  [AgentPersonality.SENTIMENT]:   { name: "Sentiment Analyst",    role: "Social Signals · News Tone" },
  [AgentPersonality.RISK]:        { name: "Risk Manager",         role: "Risk Modeling · Stress Testing" },
  [AgentPersonality.NEWS]:        { name: "News Analyst",         role: "Event-Driven · Catalysts" },
  [AgentPersonality.MACRO]:       { name: "Macro Analyst",        role: "Macro Trends · Capital Flows" },
};
```

---

## 第三步：修复 `ta-mapper.ts`

这是当前最大的 bug 风险点。`mapSignal()` 现在把 Python 输出映射到中文字符串，然后业务逻辑再判断中文字符串，形成脆弱的链路。

```ts
// 改前（有问题）
function mapSignal(taSignal: string): Signal {
  if (s === "buy") return "强烈买入";  // 中文进入业务逻辑
  ...
}

// 改后
import { Signal } from "@/types/enums";

function mapSignal(taSignal: string): Signal {
  const s = taSignal.toLowerCase();
  if (s === "buy")         return Signal.STRONG_BUY;
  if (s === "overweight")  return Signal.BUY;
  if (s === "underweight") return Signal.SELL;
  if (s === "sell")        return Signal.STRONG_SELL;
  return Signal.HOLD;
}
```

同时删除 `EN_LABEL_ZH` 常量中映射到中文的部分（`BUY: "买入"` 等），以及 `stripEnLabels()` 函数（LLM 配置输出英文后不再需要）。

---

## 第四步：清理 `types/index.ts`

将所有中文联合类型替换为 Enum 引用：

```ts
// 改前
risk: "低" | "中" | "高";
level: "危险" | "警告" | "关注";
signal: "强烈买入" | "买入" | "增持" | "持有" | "减持" | "卖出";

// 改后
import { RiskLevel, AlertLevel, Signal } from "./enums";
risk: RiskLevel;
level: AlertLevel;
signal: Signal;
```

---

## 第五步：各页面 `content/*.ts` 文件（按开发节奏逐步迁移）

新写的功能直接走 `content/`，存量组件按迭代节奏逐步迁移。

### 示例：`content/analysis.ts`

```ts
export const ANALYSIS_TEXT = {
  title:        "AI Investment Committee",
  start:        "Start Analysis",
  running:      "Running Multi-Agent Analysis...",
  modes: {
    standard:   "Standard",
    deep:       "Deep Research",
  },
  markets: {
    US:         "US Stocks",
    HK:         "HK Stocks",
    CN:         "A-Shares",
  },
  bootSteps: [
    "Connecting to market data",
    "Fundamental analyst ready",
    "Sentiment engine ready",
    "Debate system online",
    "Portfolio engine ready",
  ],
};
```

---

## 关于 TradingAgents LLM 输出语言

Python 框架 v0.2.5 已支持 `output_language` 环境变量配置。网站部署时设置：

```env
TRADINGAGENTS_OUTPUT_LANGUAGE=en
```

这样 AI 生成的分析内容（摘要、观点、理由）直接以英文输出，不需要前端二次翻译。

---

## 迁移优先级

| 步骤 | 内容 | 估时 | 优先级 |
|------|------|------|--------|
| 1 | 新建 `types/enums.ts` | 30 min | 最高（其他步骤依赖） |
| 2 | 修复 `ta-mapper.ts` | 1 h | 最高（现有 bug 风险） |
| 3 | 新建 `content/labels.ts` | 30 min | 高 |
| 4 | 清理 `types/index.ts` | 1 h | 高 |
| 5 | 各页面 `content/*.ts` | 按节奏 | 中（新功能直接走，存量慢慢迁） |

步骤 1-4 一次性完成，约半天工作量，之后代码库进入干净状态。

---

## 项目规则（可放入 CLAUDE.md）

```
本项目采用「中文开发、英文产品」模式。

- 开发文档、任务说明、代码注释允许使用简体中文。
- 所有用户可见内容必须使用英文。
- 所有数据库字段、API、组件名、类型定义、枚举值必须使用英文。
- TradingAgents 生成的分析结果默认输出英文（TRADINGAGENTS_OUTPUT_LANGUAGE=en）。
- 禁止在业务逻辑中使用中文字符串进行判断。
- 所有业务逻辑统一基于英文枚举和 TypeScript Enum 实现。
- 所有用户界面文案统一放置于 src/content/ 目录，不允许在组件中直接硬编码字符串。
```

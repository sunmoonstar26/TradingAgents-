# i18n Architecture — 中文开发/英文产品 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 将前端代码库从中文字符串业务逻辑迁移至英文枚举体系，用户界面统一由 `src/content/` 管理。

**Architecture:** 新建 `src/types/enums.ts` 定义所有枚举；`src/content/labels.ts` 集中存放枚举展示文案与颜色映射；修复 `ta-mapper.ts` 中的中文字符串映射链路；最后将 `types/index.ts` 中的中文联合类型全部替换为枚举引用。

**Tech Stack:** TypeScript, Next.js (App Router), React

---

## File Map

| 操作 | 路径 | 说明 |
|------|------|------|
| 新建 | `src/types/enums.ts` | 所有 TS Enum 定义 |
| 新建 | `src/content/labels.ts` | 枚举 → 展示文案 + 颜色 |
| 新建 | `src/content/analysis.ts` | 分析页文案 |
| 修改 | `src/types/index.ts` | 中文联合类型 → Enum 引用 |
| 修改 | `src/lib/ta-mapper.ts` | mapSignal 返回 Enum，删除 EN_LABEL_ZH 中文部分 |

---

## Task 1: 新建 `src/types/enums.ts`

**Files:**
- Create: `website/web/src/types/enums.ts`

- [ ] **Step 1: 创建枚举文件**

```ts
// website/web/src/types/enums.ts

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

- [ ] **Step 2: 确认 TypeScript 编译通过**

```bash
cd "website/web" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 暂时无错误（此时其他文件还未引用新枚举）

- [ ] **Step 3: Commit**

```bash
git add website/web/src/types/enums.ts
git commit -m "feat(types): add enums.ts with Signal/RiskLevel/AlertLevel/Verdict/AgentPersonality"
```

---

## Task 2: 新建 `src/content/labels.ts`

**Files:**
- Create: `website/web/src/content/labels.ts`

- [ ] **Step 1: 创建 content 目录并写入 labels.ts**

```ts
// website/web/src/content/labels.ts

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

export const RISK_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]:    "#22c55e",
  [RiskLevel.MEDIUM]: "#f59e0b",
  [RiskLevel.HIGH]:   "#ef4444",
  [RiskLevel.DANGER]: "#dc2626",
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

- [ ] **Step 2: 确认编译**

```bash
cd "website/web" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add website/web/src/content/labels.ts
git commit -m "feat(content): add labels.ts with signal/risk/alert display text and colors"
```

---

## Task 3: 修复 `src/lib/ta-mapper.ts`

**Files:**
- Modify: `website/web/src/lib/ta-mapper.ts`

这是当前最高优先级 bug：`mapSignal()` 返回中文字符串，导致下游逻辑依赖脆弱的中文判断。

- [ ] **Step 1: 修改 mapSignal 返回 Signal enum**

将文件顶部 import 改为：

```ts
import { StockDetail, Signal } from "../types";
import { Signal as SignalEnum } from "../types/enums";
import { findStock } from "../data/stocks";
```

> 注意：`types/index.ts` 里的 `Signal` 还是旧的中文联合类型，Task 4 会替换它。这里先用 `SignalEnum` 别名引入新枚举，避免 Task 3 和 Task 4 之间的顺序依赖。

- [ ] **Step 2: 替换 mapSignal 函数体**

将：
```ts
function mapSignal(taSignal: string): Signal {
  const s = taSignal.toLowerCase();
  if (s === "buy") return "强烈买入";
  if (s === "overweight") return "增持";
  if (s === "underweight") return "减持";
  if (s === "sell") return "卖出";
  return "持有";
}
```

改为：
```ts
function mapSignal(taSignal: string): SignalEnum {
  const s = taSignal.toLowerCase();
  if (s === "buy")         return SignalEnum.STRONG_BUY;
  if (s === "overweight")  return SignalEnum.BUY;
  if (s === "underweight") return SignalEnum.SELL;
  if (s === "sell")        return SignalEnum.STRONG_SELL;
  return SignalEnum.HOLD;
}
```

- [ ] **Step 3: 清理 EN_LABEL_ZH 中的中文映射**

在 `EN_LABEL_ZH` 对象中，删除以下几行（这些是将英文信号映射为中文的条目，LLM 输出英文后不再需要）：

```ts
// 删除这三行：
BUY: "买入",
SELL: "卖出",
HOLD: "持有",
OVERWEIGHT: "增持",
UNDERWEIGHT: "减持",
```

保留其余英文 label → 中文翻译条目（Rating、Recommendation 等），因为 `stripEnLabels` 用于处理 LLM 报告中残留的 Markdown 标签，与信号枚举无关。

- [ ] **Step 4: 替换 mapTAResultToStockDetail 中所有中文信号字面量**

在 `mapTAResultToStockDetail` 函数体内，找到所有 `signal === "强烈买入"` 等中文比较，替换为枚举：

```ts
// 改前
conviction: confKeywordMatch
  ? parseInt(confKeywordMatch[1])
  : signal === "强烈买入" ? 82
  : signal === "增持" ? 68
  : signal === "减持" ? 35
  : signal === "卖出" ? 22
  : 55;

// 改后
conviction: confKeywordMatch
  ? parseInt(confKeywordMatch[1])
  : signal === SignalEnum.STRONG_BUY  ? 82
  : signal === SignalEnum.BUY         ? 68
  : signal === SignalEnum.SELL        ? 35
  : signal === SignalEnum.STRONG_SELL ? 22
  : 55;
```

同样替换 `recommendedExposure` 和 `suggestedExposure` 行：

```ts
// 改前
recommendedExposure: signal === "强烈买入" ? "15-20%" : signal === "增持" ? "10-15%" : "5-10%",
// 改后
recommendedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : signal === SignalEnum.BUY ? "10-15%" : "5-10%",

// 改前
suggestedExposure: signal === "强烈买入" ? "15-20%" : "5-10%",
// 改后
suggestedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : "5-10%",
```

同样替换 consensus 默认值块：

```ts
// 改前
const consensus =
  raw.signal.toLowerCase() === "buy"        ? "6/8 看涨" :
  raw.signal.toLowerCase() === "overweight" ? "5/8 看涨" :
  raw.signal.toLowerCase() === "hold"       ? "4/8 看涨" :
  raw.signal.toLowerCase() === "underweight"? "3/8 看涨" :
  "2/8 看涨";

// 改后（consensus 展示文案可直接英文）
const consensus =
  raw.signal.toLowerCase() === "buy"        ? "6/8 Bullish" :
  raw.signal.toLowerCase() === "overweight" ? "5/8 Bullish" :
  raw.signal.toLowerCase() === "hold"       ? "4/8 Bullish" :
  raw.signal.toLowerCase() === "underweight"? "3/8 Bullish" :
  "2/8 Bullish";
```

- [ ] **Step 5: 确认编译**

```bash
cd "website/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: `ta-mapper.ts` 相关错误已消除（types/index.ts 的 Signal 类型不匹配错误在 Task 4 解决）

- [ ] **Step 6: Commit**

```bash
git add website/web/src/lib/ta-mapper.ts
git commit -m "fix(ta-mapper): replace Chinese string signals with Signal enum, clean EN_LABEL_ZH"
```

---

## Task 4: 清理 `src/types/index.ts`

**Files:**
- Modify: `website/web/src/types/index.ts`

- [ ] **Step 1: 在文件顶部添加 enum 导入**

在文件第一行前插入：

```ts
import { Signal, RiskLevel, AlertLevel, AgentPersonality } from "./enums";
export { Signal, RiskLevel, AlertLevel, AgentPersonality };
```

（re-export 确保现有 `import { Signal } from "@/types"` 的组件无需改 import 路径）

- [ ] **Step 2: 替换中文联合类型 `Signal`**

删除：
```ts
export type Signal = "强烈买入" | "买入" | "增持" | "持有" | "减持" | "卖出";
```

（已通过 re-export 提供）

- [ ] **Step 3: 替换 `SystemStatus.modelStatus`**

```ts
// 改前
modelStatus: "在线" | "降级" | "离线";

// 改后
modelStatus: "online" | "degraded" | "offline";
```

- [ ] **Step 4: 替换 `OpportunityEntry.risk`**

```ts
// 改前
risk: "低" | "中" | "高";

// 改后
risk: RiskLevel;
```

- [ ] **Step 5: 替换 `RiskAlert.level`**

```ts
// 改前
level: "危险" | "警告" | "关注";

// 改后
level: AlertLevel;
```

- [ ] **Step 6: 替换 `SectorFlow.flow`**

```ts
// 改前
flow: "↑ 强劲" | "↗ 改善" | "→ 平稳" | "↘ 走弱" | "↓ 流出";

// 改后（保留箭头符号但英文化）
flow: "↑ Strong" | "↗ Improving" | "→ Stable" | "↘ Weakening" | "↓ Outflow";
```

- [ ] **Step 7: 替换 `RiskExposure.level`**

```ts
// 改前
level: "低" | "中" | "高" | "危险";

// 改后
level: RiskLevel;
```

- [ ] **Step 8: 替换 `AgentPersonality` 类型别名**

删除：
```ts
export type AgentPersonality = "fundamental" | "technical" | "sentiment" | "risk" | "news" | "macro";
```

（已通过 re-export 提供）

- [ ] **Step 9: 替换 `ReasonCapsule.impact` 和相关 insight 中文联合类型**

```ts
// ReasonCapsule
impact: "high" | "medium" | "low";  // 改前: "高" | "中" | "低"

// AnalystInsight.verdict — 改为 Verdict enum（或保留 string，由 LLM 输出控制）
// 保持 verdict: string 即可，不强制枚举（LLM 输出内容）

// DebateInsight.conflict_strength
conflict_strength: "high" | "medium" | "low";  // 改前: "高" | "中" | "低"

// RiskInsightItem.severity
severity: "high" | "medium" | "low";  // 改前: "高" | "中" | "低"

// RiskInsight.overall_risk_level
overall_risk_level: "high" | "medium" | "low";  // 改前: "高" | "中" | "低"
```

- [ ] **Step 10: 确认编译无错误**

```bash
cd "website/web" && npx tsc --noEmit 2>&1 | head -40
```

Expected: 0 errors，或仅有组件层中使用旧字面量的 TS 错误（记录下来，Task 5 修复）

- [ ] **Step 11: Commit**

```bash
git add website/web/src/types/index.ts
git commit -m "refactor(types): replace Chinese union types with enums and English literals"
```

---

## Task 5: 修复 ta-mapper.ts 中 agentAnalyses 的中文字段

**Files:**
- Modify: `website/web/src/lib/ta-mapper.ts`

Task 3 清理了信号映射，但 `mapTAResultToStockDetail` 的 `agentAnalyses` 数组中仍有中文 agentName/role/summary 硬编码，以及 `riskExposures` 和 `positionAllocation` 中的中文文案。引入 `AGENTS` map 后一次清理完。

- [ ] **Step 1: 在 ta-mapper.ts 顶部添加 labels import**

```ts
import { AGENTS } from "@/content/labels";
import { AgentPersonality } from "@/types/enums";
```

- [ ] **Step 2: 替换 agentAnalyses 数组**

将整个 `agentAnalyses` 数组替换为：

```ts
agentAnalyses: [
  {
    agentName: AGENTS[AgentPersonality.FUNDAMENTAL].name,
    role:      AGENTS[AgentPersonality.FUNDAMENTAL].role,
    personality: AgentPersonality.FUNDAMENTAL,
    signal: SignalEnum.HOLD,
    conviction: 55,
    summary: stripEnLabels(raw.fundamentals_report?.slice(0, 200) || "") || "Fundamental analysis in progress",
    keyPoints: [],
    riskFactors: [],
  },
  {
    agentName: AGENTS[AgentPersonality.TECHNICAL].name,
    role:      AGENTS[AgentPersonality.TECHNICAL].role,
    personality: AgentPersonality.TECHNICAL,
    signal: SignalEnum.HOLD,
    conviction: 55,
    summary: stripEnLabels(raw.market_report?.slice(0, 200) || "") || "Technical analysis in progress",
    keyPoints: [],
    riskFactors: [],
  },
  {
    agentName: AGENTS[AgentPersonality.SENTIMENT].name,
    role:      AGENTS[AgentPersonality.SENTIMENT].role,
    personality: AgentPersonality.SENTIMENT,
    signal: SignalEnum.HOLD,
    conviction: 55,
    summary: stripEnLabels(raw.sentiment_report?.slice(0, 200) || "") || "Sentiment analysis in progress",
    keyPoints: [],
    riskFactors: [],
    sentimentPulse: 50,
  },
  {
    agentName: AGENTS[AgentPersonality.RISK].name,
    role:      AGENTS[AgentPersonality.RISK].role,
    personality: AgentPersonality.RISK,
    signal: SignalEnum.HOLD,
    conviction: 50,
    summary: stripEnLabels(raw.risk_debate_state?.judge_decision?.slice(0, 200) || "") || "Risk analysis in progress",
    keyPoints: [],
    riskFactors: [],
  },
  {
    agentName: AGENTS[AgentPersonality.NEWS].name,
    role:      AGENTS[AgentPersonality.NEWS].role,
    personality: AgentPersonality.NEWS,
    signal: SignalEnum.HOLD,
    conviction: 55,
    summary: stripEnLabels(raw.news_report?.slice(0, 200) || "") || "News analysis in progress",
    keyPoints: [],
    riskFactors: [],
  },
  {
    agentName: AGENTS[AgentPersonality.MACRO].name,
    role:      AGENTS[AgentPersonality.MACRO].role,
    personality: AgentPersonality.MACRO,
    signal: SignalEnum.HOLD,
    conviction: 50,
    summary: "Macro environment analysis complete. See full report for details.",
    keyPoints: [],
    riskFactors: [],
  },
],
```

- [ ] **Step 3: 替换 riskExposures 中文文案**

```ts
riskExposures: [
  {
    label: "Volatility Risk",
    value: RiskLevel.MEDIUM,
    level: RiskLevel.MEDIUM,
    detail: raw.risk_debate_state?.neutral_history?.slice(0, 100) || "Risk analysis in progress",
    score: 50,
  },
  {
    label: "Expected Drawdown",
    value: "-15%",
    level: RiskLevel.MEDIUM,
    detail: "Estimated by AI risk model",
    score: 45,
  },
  { label: "Sector Exposure", value: sector, level: RiskLevel.MEDIUM, detail: "Moderate sector concentration", score: 50 },
  { label: "Correlation",     value: "Market Neutral", level: RiskLevel.MEDIUM, detail: "Beta near 1.0", score: 50 },
],
```

- [ ] **Step 4: 替换 positionAllocation 中文文案**

```ts
positionAllocation: {
  suggestedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : "5-10%",
  sizingFactors: {
    positive: ["Positive AI agent signals"],
    negative: ["Monitor macro risk"],
  },
  scenarioMatrix: [
    { scenario: "Breakout",     action: "Add to position" },
    { scenario: "Range-bound",  action: "Hold current position" },
    { scenario: "Market pullback", action: "Reduce or hedge" },
  ],
  entryStrategy: "Scale in — start with 3-5%",
  exitTrigger: "Break below key support or fundamental deterioration",
},
```

- [ ] **Step 5: 替换 learningMemory 和 liveRail 中文文案**

```ts
learningMemory: [
  {
    date: raw.trade_date,
    whatHappened: `TradingAgents completed first analysis of ${raw.ticker}`,
    whatAgentsMissed: "No historical reference for first analysis",
    systemAdjustment: "Establishing baseline data for future comparisons",
    pnl: "N/A",
  },
],
liveRail: [
  {
    time: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" }),
    agent: "System",
    message: `${raw.ticker} analysis complete · Signal: ${raw.signal}`,
  },
],
```

- [ ] **Step 6: 确认编译**

```bash
cd "website/web" && npx tsc --noEmit 2>&1 | head -30
```

Expected: 0 errors 或仅剩下游组件层错误

- [ ] **Step 7: Commit**

```bash
git add website/web/src/lib/ta-mapper.ts
git commit -m "fix(ta-mapper): replace Chinese hardcoded strings with AGENTS map and English text"
```

---

## Task 6: 新建 `src/content/analysis.ts`

**Files:**
- Create: `website/web/src/content/analysis.ts`

将 analysis 页面文案从组件中抽离（新功能直接走 content/）。

- [ ] **Step 1: 创建 analysis.ts**

```ts
// website/web/src/content/analysis.ts

export const ANALYSIS_TEXT = {
  title:   "AI Investment Committee",
  start:   "Start Analysis",
  running: "Running Multi-Agent Analysis...",
  modes: {
    standard: "Standard",
    deep:     "Deep Research",
  },
  markets: {
    US: "US Stocks",
    HK: "HK Stocks",
    CN: "A-Shares",
  },
  bootSteps: [
    "Connecting to market data",
    "Fundamental analyst ready",
    "Sentiment engine ready",
    "Debate system online",
    "Portfolio engine ready",
  ],
  errors: {
    tickerRequired: "Please enter a ticker symbol",
    analysisLaunchFailed: "Failed to launch analysis. Please try again.",
  },
};
```

- [ ] **Step 2: 确认编译**

```bash
cd "website/web" && npx tsc --noEmit 2>&1 | head -20
```

Expected: 无错误

- [ ] **Step 3: Commit**

```bash
git add website/web/src/content/analysis.ts
git commit -m "feat(content): add analysis.ts with UI copy"
```

---

## Task 7: 验证整体编译与类型检查

- [ ] **Step 1: 全量 TypeScript 检查**

```bash
cd "website/web" && npx tsc --noEmit 2>&1
```

记录所有剩余错误（预期为下游组件使用旧字面量的错误，按迭代节奏后续修复）。

- [ ] **Step 2: 验证 mapSignal 路径正确性**

```bash
cd "website/web" && node -e "
const { Signal } = require('./src/types/enums');
console.log('Signal.STRONG_BUY:', Signal.STRONG_BUY);
console.log('Signal.HOLD:', Signal.HOLD);
"
```

Expected:
```
Signal.STRONG_BUY: STRONG_BUY
Signal.HOLD: HOLD
```

- [ ] **Step 3: 设置环境变量（记录到 .env.local）**

在 `website/web/.env.local` 末尾添加（若文件不存在则创建）：

```env
TRADINGAGENTS_OUTPUT_LANGUAGE=en
```

- [ ] **Step 4: 最终 commit**

```bash
git add website/web/.env.local
git commit -m "chore: set TRADINGAGENTS_OUTPUT_LANGUAGE=en for English AI output"
```

---

## 范围外（按迭代节奏推进）

以下文件包含中文字面量，但属于"存量组件按节奏迁移"范畴，不在本次 Tasks 1-7 内：

- `src/app/stock/[ticker]/page.tsx` — Signal 文字比较
- `src/components/stock/final-decision.tsx` — Signal 展示文案
- `src/components/dashboard/opportunity-radar.tsx` — Signal 颜色逻辑
- `src/lib/radar-store.ts` / `livefeed-store.ts` — 中文信号字符串
- `src/lib/mock-data.ts` — mock 数据中文字段

这些文件在 Task 4 后会产生 TypeScript 错误，修复策略：将 `signal === "强烈买入"` 替换为 `signal === Signal.STRONG_BUY`，并从 `@/content/labels` 读取展示文案。

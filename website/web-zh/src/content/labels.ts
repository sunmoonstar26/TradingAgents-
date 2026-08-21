// website/web/src/content/labels.ts

import { Signal, RiskLevel, AlertLevel, AgentPersonality } from "@/types/enums";

export const SIGNAL_LABELS: Record<Signal, string> = {
  [Signal.STRONG_BUY]:  "强力买入",
  [Signal.BUY]:         "买入",
  [Signal.HOLD]:        "持有",
  [Signal.SELL]:        "卖出",
  [Signal.STRONG_SELL]: "强力卖出",
};

export const SIGNAL_COLORS: Record<Signal, string> = {
  [Signal.STRONG_BUY]:  "#22c55e",
  [Signal.BUY]:         "#22c55e",
  [Signal.HOLD]:        "#f59e0b",
  [Signal.SELL]:        "#ef4444",
  [Signal.STRONG_SELL]: "#ef4444",
};

export const RISK_LABELS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]:    "低风险",
  [RiskLevel.MEDIUM]: "中风险",
  [RiskLevel.HIGH]:   "高风险",
  [RiskLevel.DANGER]: "危险",
};

export const RISK_COLORS: Record<RiskLevel, string> = {
  [RiskLevel.LOW]:    "#22c55e",
  [RiskLevel.MEDIUM]: "#f59e0b",
  [RiskLevel.HIGH]:   "#ef4444",
  [RiskLevel.DANGER]: "#dc2626",
};

export const ALERT_LABELS: Record<AlertLevel, string> = {
  [AlertLevel.DANGER]:  "危险",
  [AlertLevel.WARNING]: "警告",
  [AlertLevel.WATCH]:   "关注",
};

export const AGENTS: Record<AgentPersonality, { name: string; role: string }> = {
  [AgentPersonality.FUNDAMENTAL]: { name: "基本面分析师",  role: "财务建模 · 估值分析" },
  [AgentPersonality.TECHNICAL]:   { name: "技术面分析师",  role: "价格走势 · 形态识别" },
  [AgentPersonality.SENTIMENT]:   { name: "情绪面分析师",  role: "社交信号 · 新闻情感" },
  [AgentPersonality.RISK]:        { name: "风险管理师",    role: "风险建模 · 压力测试" },
  [AgentPersonality.NEWS]:        { name: "新闻分析师",    role: "事件驱动 · 催化因素" },
  [AgentPersonality.MACRO]:       { name: "宏观分析师",    role: "宏观趋势 · 资金流向" },
};

// ── 公司工作区 Tab 标签 ──

export const STOCK_WORKSPACE_TABS = {
  analysis: "最新分析",
  timeline: "公司时间轴",
  thesis:   "财报解读",
  overview: "公司概览",
  research: "研究档案",
} as const;

// ── Timeline 事件类型标签（留好扩展位，未来接入 news/earnings 等真实事件源）──

export const TIMELINE_EVENT_LABELS: Record<string, string> = {
  analysis_completed: "AI 分析完成",
  manual_event: "手动记录",
  news_company: "公司新闻",
  news_executive: "高管新闻",
  news_earnings: "财报新闻",
  news_industry: "行业新闻",
  news_macro: "宏观新闻",
  news_other: "其他",
};

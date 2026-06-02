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

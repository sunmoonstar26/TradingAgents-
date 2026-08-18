import { DashboardData } from "../types";
import { Signal, RiskLevel, AlertLevel } from "../types/enums";

export const mockDashboardData: DashboardData = {
  // ── AI 系统状态层 ──
  systemStatus: {
    agentsOnline: 12,
    running: 4,
    debating: 2,
    consensusUpdated: "14s",
    lastSync: new Date().toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    modelStatus: "online",
  },

  // ── 全球市场状态 ──
  marketState: {
    usMarket: { label: "US Market", value: "S&P 500", change: 0.34, status: "up" },
    hkMarket: { label: "HK Market", value: "Hang Seng", change: -0.87, status: "down" },
    cnMarket: { label: "CN Market", value: "CSI 300", change: 0.12, status: "neutral" },
    vix: { label: "VIX", value: "17.22", change: null, status: "warning" },
    aiSectorMomentum: { label: "AI Momentum", value: "Strong", change: null, status: "up" },
    marketRiskLevel: { label: "Market Risk", value: "Moderate-Low", change: null, status: "warning" },
  },

  // ── AI 机会雷达（Hero） ──
  opportunities: [
    { ticker: "NVDA", name: "NVIDIA", signal: Signal.STRONG_BUY, conviction: 84, risk: RiskLevel.MEDIUM, consensus: { bullish: 7, neutral: 0, bearish: 1 }, exposure: "15-20%", agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-24T09:15:00Z" },
    { ticker: "META", name: "Meta", signal: Signal.BUY, conviction: 76, risk: RiskLevel.MEDIUM, consensus: { bullish: 6, neutral: 0, bearish: 2 }, exposure: "10-15%", agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-23T14:30:00Z" },
    { ticker: "TSLA", name: "Tesla", signal: Signal.BUY, conviction: 72, risk: RiskLevel.MEDIUM, consensus: { bullish: 6, neutral: 0, bearish: 2 }, exposure: "10-15%", agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: true }, updatedAt: "2026-05-25T08:00:00Z" },
    { ticker: "AMZN", name: "Amazon", signal: Signal.BUY, conviction: 71, risk: RiskLevel.LOW, consensus: { bullish: 6, neutral: 0, bearish: 2 }, exposure: "10-15%", agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-22T11:00:00Z" },
    { ticker: "GOOGL", name: "Alphabet", signal: Signal.BUY, conviction: 68, risk: RiskLevel.LOW, consensus: { bullish: 5, neutral: 0, bearish: 3 }, exposure: "8-12%", agentAlignment: { fundamental: true, technical: false, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-21T16:45:00Z" },
    { ticker: "MSFT", name: "Microsoft", signal: Signal.HOLD, conviction: 58, risk: RiskLevel.LOW, consensus: { bullish: 4, neutral: 0, bearish: 4 }, exposure: "5-10%", agentAlignment: { fundamental: true, technical: false, sentiment: true, macro: false, risk: false }, updatedAt: "2026-05-20T10:00:00Z" },
    { ticker: "AMD", name: "AMD", signal: Signal.HOLD, conviction: 52, risk: RiskLevel.HIGH, consensus: { bullish: 4, neutral: 0, bearish: 4 }, exposure: "5-8%", agentAlignment: { fundamental: false, technical: true, sentiment: false, macro: true, risk: true }, updatedAt: "2026-05-19T13:20:00Z" },
    { ticker: "AAPL", name: "Apple", signal: Signal.SELL, conviction: 35, risk: RiskLevel.LOW, consensus: { bullish: 3, neutral: 0, bearish: 5 }, exposure: "0-5%", agentAlignment: { fundamental: false, technical: false, sentiment: false, macro: false, risk: true }, updatedAt: "2026-05-18T09:00:00Z" },
    { ticker: "LI", name: "Li Auto", signal: Signal.HOLD, conviction: 52, risk: RiskLevel.HIGH, consensus: { bullish: 4, neutral: 0, bearish: 4 }, exposure: "Underweight", agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: false }, updatedAt: "2026-05-24T15:45:00Z" },
  ],

  // ── 投资备忘录（替代 Conviction Ideas） ──
  memos: [
    { ticker: "NVDA", name: "NVIDIA", signal: Signal.STRONG_BUY, conviction: 84, agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, timeHorizon: "Medium 3-6M", primaryRisk: "Elevated valuation, geopolitical risk", consensus: "7/8 Bullish", exposure: "15-20%", keyDriver: "Surging AI chip demand, Blackwell architecture in mass production" },
    { ticker: "META", name: "Meta", signal: Signal.BUY, conviction: 76, agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, timeHorizon: "Medium 3-6M", primaryRisk: "Uncertain ROI on AI capex cycle", consensus: "6/8 Bullish", exposure: "10-15%", keyDriver: "Llama 4 open-source ecosystem lead" },
    { ticker: "TSLA", name: "Tesla", signal: Signal.BUY, conviction: 72, agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: true }, timeHorizon: "Long 6-12M", primaryRisk: "Slowing auto volume growth", consensus: "6/8 Bullish", exposure: "10-15%", keyDriver: "FSD commercialization accelerating, energy business doubling" },
    { ticker: "PLTR", name: "Palantir", signal: Signal.BUY, conviction: 69, agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: false, risk: false }, timeHorizon: "Medium 3-6M", primaryRisk: "High government revenue concentration", consensus: "5/8 Bullish", exposure: "5-10%", keyDriver: "AIP platform commercial customer count +200%" },
    { ticker: "LI", name: "Li Auto", signal: Signal.HOLD, conviction: 52, agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: false }, timeHorizon: "Short 1-3M", primaryRisk: "Negative FCF, China auto demand contraction", consensus: "4/8 Bullish", exposure: "Underweight", keyDriver: "L9 AI flagship SUV deliveries + Middle East expansion" },
  ],

  // ── 风险终端 ──
  riskAlerts: [],

  // ── 板块流向热度 ──
  sectorFlow: [
    { name: "Artificial Intelligence", flow: "↑ Strong", momentum: 92, change: 3.4 },
    { name: "Semiconductors", flow: "↑ Strong", momentum: 88, change: 2.8 },
    { name: "Cloud Computing", flow: "↗ Improving", momentum: 78, change: 1.5 },
    { name: "Crypto", flow: "↗ Improving", momentum: 71, change: 0.8 },
    { name: "EV", flow: "↘ Weakening", momentum: 65, change: -1.2 },
    { name: "Cybersecurity", flow: "→ Stable", momentum: 62, change: -0.3 },
    { name: "Fintech", flow: "↓ Outflow", momentum: 55, change: -1.8 },
  ],

  // ── AI 实时信息流 ──
  liveFeed: [],

  updatedAt: new Date().toISOString(),
};

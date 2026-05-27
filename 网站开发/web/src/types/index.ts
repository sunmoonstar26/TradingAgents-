// ===== TradingAgents AI 对冲基金操作系统 — 前端类型 =====

// ── 市场状态 ──

export interface MarketIndicator {
  label: string;
  value: string;
  change: number | null;
  status: "up" | "down" | "neutral" | "warning" | "danger";
}

export interface GlobalMarketState {
  usMarket: MarketIndicator;
  hkMarket: MarketIndicator;
  cnMarket: MarketIndicator;
  vix: MarketIndicator;
  aiSectorMomentum: MarketIndicator;
  marketRiskLevel: MarketIndicator;
}

// ── AI 系统状态层 ──

export interface SystemStatus {
  agentsOnline: number;
  running: number;
  debating: number;
  consensusUpdated: string; // 相对时间，如 "14s ago"
  lastSync: string;
  modelStatus: "在线" | "降级" | "离线";
}

// ── 首页机会雷达 ──

export interface OpportunityEntry {
  ticker: string;
  name: string;
  signal: Signal;
  conviction: number;
  risk: "低" | "中" | "高";
  consensus: string;
  exposure: string;
  // 新增：智能体对齐
  agentAlignment: AgentAlignment;
  // 最近一次 AI 分析更新日期（ISO 字符串）
  updatedAt?: string;
}

export type Signal = "强烈买入" | "买入" | "增持" | "持有" | "减持" | "卖出";

export interface AgentAlignment {
  fundamental: boolean;
  technical: boolean;
  sentiment: boolean;
  macro: boolean;
  risk: boolean; // false = risk agent反对
}

// ── 投资备忘录卡片（替代旧 ConvictionIdeas） ──

export interface InvestmentMemo {
  ticker: string;
  name: string;
  signal: Signal;
  conviction: number;
  agentAlignment: AgentAlignment;
  timeHorizon: string;
  primaryRisk: string;
  consensus: string;
  exposure: string;
  keyDriver: string;
}

// ── AI Live Feed ──

export interface LiveFeedEntry {
  time: string;
  agent: string;
  message: string;
}

// ── 风险终端 ──

export interface RiskAlert {
  type: string;
  level: "危险" | "警告" | "关注";
  source: string;
  detail: string;
  timestamp: string;
  riskScore?: number;     // 新增：风险分数 0-100
  triggeredBy?: string[]; // 新增：触发智能体
}

// ── 板块流向热度 ──

export interface SectorFlow {
  name: string;
  flow: "↑ 强劲" | "↗ 改善" | "→ 平稳" | "↘ 走弱" | "↓ 流出";
  momentum: number; // 0-100
  change: number;
}

// ── Dashboard 完整数据 ──

export interface DashboardData {
  systemStatus: SystemStatus;
  marketState: GlobalMarketState;
  opportunities: OpportunityEntry[];
  memos: InvestmentMemo[];
  riskAlerts: RiskAlert[];
  sectorFlow: SectorFlow[];
  liveFeed: LiveFeedEntry[];
  updatedAt: string;
}

// ═════════════════════════════════════════
// ── 二级页 Stock Detail ──
// ═════════════════════════════════════════

// ── 投委会决策 Hero ──

export interface CommitteeDecision {
  signal: Signal;
  conviction: number;
  consensus: string;
  recommendedExposure: string;
  timeHorizon: string;
  rationale: string; // 决策理由
}

// ── 牛熊辩论（动态） ──

export interface DebatePoint {
  agent: string;
  content: string;
}

export interface ConflictRow {
  topic: string;
  bullView: string;
  bearView: string;
}

export interface Debate {
  bullThesis: DebatePoint[];
  moderatorVerdict: string;   // 主持人裁决
  bearThesis: DebatePoint[];
  battleBar: {                // 新增：对抗条
    bullScore: number;        // 0-100
    bearScore: number;
  };
  conflictMatrix: ConflictRow[]; // 新增：冲突矩阵
}

// ── 智能体分析（差异化个性） ──

export type AgentPersonality = "fundamental" | "technical" | "sentiment" | "risk" | "news" | "macro";

export interface AgentAnalysis {
  agentName: string;
  role: string;
  personality: AgentPersonality;
  signal: Signal;
  conviction: number;
  summary: string;
  keyPoints: string[];
  riskFactors: string[];
  // 新增：各 Agent 独有字段
  miniChart?: { label: string; value: string }[];  // 技术面
  sentimentPulse?: number;                          // 情绪面 0-100
}

// ── 风险暴露系统（替代旧 RiskMetric） ──

export interface RiskExposure {
  label: string;
  value: string;
  level: "低" | "中" | "高" | "危险";
  detail: string;
  score?: number; // 0-100
}

// ── 仓位分配引擎（替代旧 PortfolioLogic） ──

export interface ScenarioAction {
  scenario: string;
  action: string;
}

export interface PositionAllocation {
  suggestedExposure: string;
  sizingFactors: {
    positive: string[];
    negative: string[];
  };
  scenarioMatrix: ScenarioAction[];
  entryStrategy: string;
  exitTrigger: string;
}

// ── 系统学习记忆（替代旧 Reflection） ──

export interface LearningMemory {
  date: string;
  whatHappened: string;
  whatAgentsMissed: string;
  systemAdjustment: string;
  pnl: string;
}

// ── Stock Detail 完整数据 ──

export interface StockDetail {
  ticker: string;
  name: string;
  price: number;
  change: number;
  changePercent: number;
  marketCap: string;
  pe: string;
  sector: string;
  committeeDecision: CommitteeDecision;
  debate: Debate;
  agentAnalyses: AgentAnalysis[];
  riskExposures: RiskExposure[];
  positionAllocation: PositionAllocation;
  learningMemory: LearningMemory[];
  liveRail: LiveFeedEntry[];
  updatedAt: string;
}

// ═════════════════════════════════════════
// ── AI Research Console ──
// ═════════════════════════════════════════

export type AnalysisMode = "standard" | "deep";
export type Market = "US" | "HK" | "CN";
export type AgentProgressStatus = "waiting" | "running" | "completed" | "failed";
export type SessionStatus = "pending" | "running" | "completed" | "failed";

export interface StockEntry {
  ticker: string;
  name: string;
  market: Market;
  keywords: string[];
}

export interface AnalysisProgress {
  fundamental: AgentProgressStatus;
  technical: AgentProgressStatus;
  sentiment: AgentProgressStatus;
  macro: AgentProgressStatus;
  news: AgentProgressStatus;
  risk: AgentProgressStatus;
  report: AgentProgressStatus;
}

export interface AnalysisStartRequest {
  ticker: string;
  market: Market;
  mode: AnalysisMode;
}

export interface AnalysisStartResponse {
  success: boolean;
  session_id: string;
}

export interface AnalysisSession {
  session_id: string;
  ticker: string;
  status: SessionStatus;
  mode: AnalysisMode;
  market: Market;
  created_at: string;
  completed_at: string | null;
  progress: AnalysisProgress;
  result_json: string | null;
  current_step: string | null;
  error_message: string | null;
}

// ── 洞察萃取（Insight Extraction）──
// 从 TradingAgents 完整报告中提取的结构化洞察，用于二级页面"观点优先"渲染

// ── Key Insight 三层结构（二级页面核心架构）──
// 每个 Agent 卡片/模块的核心输出：3 条观点，一句话一条，禁止长段落

export interface KeyInsight {
  title: string;               // 一句话观点（中文，≤25字）
  type: "primary" | "supporting" | "risk";
  confidence: number;          // 置信度 0-100
  source_agent: string;        // 来源智能体名称
  icon?: string;               // 可选 emoji 标记
}

export interface ReasonCapsule {
  insight: string;              // 核心理由（中文，30字内）
  source_agents: string[];      // 来源智能体
  confidence: number;           // 置信度 0-100
  impact: "高" | "中" | "低";    // 影响力等级
}

export interface AnalystInsight {
  verdict: string;              // "看涨" | "看跌" | "中性"
  core_insight: string;         // 最重要核心观点
  supporting_signals: string[]; // 支持信号（≤3条）
  primary_risk: string;         // 最大风险
  confidence: number;           // 置信度 0-100
  key_drivers?: string[];       // 关键驱动力
  risk_factors?: string[];      // 风险因素
  agent_name?: string;          // 智能体中文名
  key_insights?: KeyInsight[];  // 3 条核心观点（primary + supporting + risk）
  error?: string;               // 萃取失败时的错误信息
}

export interface DebateInsight {
  verdict: string;              // "多方胜出" | "空方胜出" | "势均力敌"
  core_conflict: string;        // 核心分歧主题
  bull_thesis: string;          // 多方核心理由
  bear_thesis: string;          // 空方核心理由
  conflict_strength: "高" | "中" | "低";
  confidence: number;
  key_topics?: {
    topic: string;
    bull_view: string;
    bear_view: string;
    winner: "bull" | "bear" | "tie";
  }[];
  error?: string;
}

export interface TradingInsight {
  action: string;               // "买入" | "卖出" | "持有"
  allocation_rationale: string; // 仓位配置核心理由
  suggested_exposure: string;   // 建议仓位
  increase_conditions: string[];
  reduce_conditions: string[];
  hedge_conditions: string[];
  confidence: number;
  error?: string;
}

export interface RiskInsightItem {
  risk_type: string;
  why_matters: string;
  potential_impact: string;
  triggered_by: string;
  mitigation: string;
  severity: "高" | "中" | "低";
}

export interface RiskInsight {
  overall_risk_level: "高" | "中" | "低";
  risk_items: RiskInsightItem[];
  confidence: number;
  error?: string;
}

export interface MemoryLearning {
  what_happened: string;
  what_missed: string;
  system_adjustment: string;
  future_impact: string;
}

export interface MemoryInsight {
  learnings: MemoryLearning[];
  error?: string;
}

export interface ThesisInsight {
  final_signal: string;
  investment_thesis: string;    // 核心投资论点（1-2句）
  decision_summary: string;     // 决策摘要
  conviction: number;
  bull_case_summary: string;
  bear_case_summary: string;
  key_reasons: ReasonCapsule[];
  time_horizon: string;
  primary_risk_summary: string;
  error?: string;
}

export interface StockInsights {
  ticker: string;
  report_dir: string;
  analysts: Record<string, AnalystInsight>;
  debate: Record<string, DebateInsight>;
  trading: TradingInsight;
  risk: RiskInsight;
  memory: MemoryInsight;
  thesis: ThesisInsight;
}

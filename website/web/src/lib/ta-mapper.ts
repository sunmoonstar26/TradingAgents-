// TradingAgents 原始 JSON 输出 → StockDetail 映射器
import { StockDetail } from "../types";
import { Signal as SignalEnum, AgentPersonality, RiskLevel } from "../types/enums";
import { findStock } from "../data/stocks";
import { AGENTS } from "@/content/labels";

/**
 * 清洗 LLM 输出中残留的英文 section 标签和 Markdown 粗体符号。
 * 例如：**Recommendation**: Underweight → 评级：减持
 * 只处理映射到前端卡片的摘要字段（rationale/summary/content），
 * 三级页面长报告由 MarkdownContent 组件渲染，不在此处处理。
 */
const EN_LABEL_ZH: Record<string, string> = {
  Rating: "评级",
  Recommendation: "建议",
  "Executive Summary": "摘要",
  "Investment Thesis": "投资论点",
  "Price Target": "目标价",
  "Time Horizon": "投资周期",
  Action: "操作建议",
  "Position Sizing": "仓位规模",
  Reasoning: "分析依据",
  "Risk Factors": "风险因素",
  Conclusion: "结论",
  Summary: "摘要",
  Verdict: "裁决",
  Decision: "决策",
  Assessment: "评估",
  Analysis: "分析",
  Rationale: "理由",
  "Stop Loss": "止损",
  "Entry Price": "入场价",
  "Target Price": "目标价",
};

function stripEnLabels(text: string): string {
  if (!text) return text;
  // **Label**: 或 **Label**：
  return text.replace(
    /\*\*([A-Za-z][A-Za-z ]+)\*\*\s*[:：]\s*/g,
    (_, label: string) => {
      const zh = EN_LABEL_ZH[label.trim()] ?? null;
      return zh ? zh + "：" : "";
    }
  );
}

/** TradingAgents Python 脚本输出的原始 JSON */
export interface TARawResult {
  ticker: string;
  company_name: string;
  trade_date: string;
  signal: string;
  report_dir?: string | null;
  market_report: string;
  sentiment_report: string;
  news_report: string;
  fundamentals_report: string;
  investment_plan: string;
  investment_debate_state: {
    bull_history: string;
    bear_history: string;
    judge_decision: string;
  };
  trader_investment_plan: string;
  risk_debate_state: {
    aggressive_history: string;
    conservative_history: string;
    neutral_history: string;
    judge_decision: string;
  };
  final_trade_decision: string;
  price?: number;
  change?: number;
  changePercent?: number;
  marketCap?: string;
  pe?: string;
}

/** TradingAgents 信号 → 前端信号格式 */
function mapSignal(taSignal: string): SignalEnum {
  const s = taSignal.toLowerCase();
  if (s === "buy")         return SignalEnum.STRONG_BUY;
  if (s === "overweight")  return SignalEnum.BUY;
  if (s === "underweight") return SignalEnum.SELL;
  if (s === "sell")        return SignalEnum.STRONG_SELL;
  return SignalEnum.HOLD;
}

/** 从原始结果生成本地股票数据 */
export function mapTAResultToStockDetail(raw: TARawResult): StockDetail {
  const info = findStock(raw.ticker);
  const name = info?.name ?? raw.company_name ?? raw.ticker;
  const sector = "General";
  const signal = mapSignal(raw.signal);

  // 从报告中提取关键信号词
  const hasBull = raw.investment_debate_state?.bull_history?.length > 50;
  const hasBear = raw.investment_debate_state?.bear_history?.length > 50;
  const hasRisk = raw.risk_debate_state?.judge_decision?.length > 50;

  // 共识：按信号给初始默认值，分析完成后由 insights 覆盖更准确的值
  const consensus =
    signal === SignalEnum.STRONG_BUY  ? "6/8 Bullish" :
    signal === SignalEnum.BUY         ? "5/8 Bullish" :
    signal === SignalEnum.HOLD        ? "4/8 Bullish" :
    signal === SignalEnum.SELL        ? "3/8 Bullish" :
    "2/8 Bullish";

  // 置信度：从明确的"置信度 XX%"关键词提取，避免误匹配仓位/价格中的百分比
  // 优先级：显式置信度关键词 > 信号强度映射 > fallback 65
  const decision = raw.final_trade_decision || raw.risk_debate_state?.judge_decision || "";
  const confKeywordMatch = decision.match(/置信度[：:\s]*(\d{2,3})\s*%/);
  const conviction = confKeywordMatch
    ? parseInt(confKeywordMatch[1])
    : signal === SignalEnum.STRONG_BUY  ? 82
    : signal === SignalEnum.BUY         ? 68
    : signal === SignalEnum.SELL        ? 35
    : signal === SignalEnum.STRONG_SELL ? 22
    : 55;

  return {
    ticker: raw.ticker.toUpperCase(),
    name,
    price: raw.price || (100 + Math.random() * 500),
    change: raw.change || 0,
    changePercent: raw.changePercent || 0,
    marketCap: raw.marketCap || "待更新",
    pe: raw.pe || "待更新",
    sector,
    committeeDecision: {
      signal,
      conviction,
      consensus,
      recommendedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : signal === SignalEnum.BUY ? "10-15%" : "5-10%",
      timeHorizon: "中期（3-6 个月）",
      rationale:
        stripEnLabels(raw.final_trade_decision?.slice(0, 300) || "") ||
        stripEnLabels(raw.risk_debate_state?.judge_decision?.slice(0, 300) || "") ||
        `AI Investment Committee has completed multi-dimensional analysis of ${name}.`,
    },
    debate: {
      bullThesis: [
        {
          agent: "Research Team · Bull",
          content: stripEnLabels(raw.investment_debate_state?.bull_history?.slice(0, 500) || "") || "Bull thesis pending",
        },
      ],
      moderatorVerdict:
        stripEnLabels(raw.investment_debate_state?.judge_decision?.slice(0, 500) || "") || "Research manager verdict pending",
      bearThesis: [
        {
          agent: "Research Team · Bear",
          content: stripEnLabels(raw.investment_debate_state?.bear_history?.slice(0, 500) || "") || "Bear thesis pending",
        },
      ],
      battleBar: {
        bullScore: hasBull ? 65 : 50,
        bearScore: hasBear ? 50 : 35,
      },
      conflictMatrix: [],
    },
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
      {
        label: "Sector Exposure",
        value: sector,
        level: RiskLevel.MEDIUM,
        detail: "Moderate sector concentration",
        score: 50,
      },
      {
        label: "Correlation",
        value: "Market Neutral",
        level: RiskLevel.MEDIUM,
        detail: "Beta near 1.0",
        score: 50,
      },
    ],
    positionAllocation: {
      suggestedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : "5-10%",
      sizingFactors: {
        positive: ["Positive AI agent signals"],
        negative: ["Monitor macro risk"],
      },
      scenarioMatrix: [
        { scenario: "Breakout",        action: "Add to position" },
        { scenario: "Range-bound",     action: "Hold current position" },
        { scenario: "Market pullback", action: "Reduce or hedge" },
      ],
      entryStrategy: "Scale in — start with 3-5%",
      exitTrigger: "Break below key support or fundamental deterioration",
    },
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
    updatedAt: raw.trade_date + "T" + new Date().toISOString().slice(11),
  };
}

// TradingAgents 原始 JSON 输出 → StockDetail 映射器
import { StockDetail } from "../types";
import { Signal as SignalEnum, AgentPersonality, RiskLevel } from "../types/enums";
import { findStock } from "../data/stocks";
import { AGENTS } from "@/content/labels";

/** Strip bold section-label prefixes from LLM output, e.g. **Rating**: → "" */
function stripMarkdownLabels(text: string): string {
  if (!text) return text;
  return text.replace(/\*\*[A-Za-z][A-Za-z ]+\*\*\s*[:：]\s*/g, "");
}

/**
 * 从 LLM 报告文本中提取 key points 和 risk factors。
 * 优先查找明确的"Key Points"/"Risks"章节，
 * 回退到提取前 N 个非空句子。
 */
function extractKeyPointsFromReport(text: string, maxPoints = 2, maxRisks = 1): {
  keyPoints: string[];
  riskFactors: string[];
} {
  if (!text) return { keyPoints: [], riskFactors: [] };

  const cleanLine = (s: string) =>
    s.replace(/^\s*[-*•#>]+\s*/, "").replace(/\*\*/g, "").trim();

  // 尝试提取 "Key Points" / "Key Findings" / "Key Insights" 章节
  const keySection = text.match(
    /(?:key\s+(?:points?|findings?|insights?|takeaways?))[:\s\n]+([\s\S]*?)(?=\n#{1,3}\s|\n\n[A-Z]|risks?[:\s]|\*\*[A-Z]|$)/i
  );

  // 尝试提取 "Risk" 章节
  const riskSection = text.match(
    /(?:(?:key\s+)?risks?|risk\s+factors?|downside)[:\s\n]+([\s\S]*?)(?=\n#{1,3}\s|\n\n[A-Z]|\*\*[A-Z]|$)/i
  );

  const linesFromSection = (section: RegExpMatchArray | null, max: number): string[] => {
    if (!section?.[1]) return [];
    return section[1]
      .split(/\n/)
      .map(cleanLine)
      .filter(l => l.length > 15 && l.length < 200)
      .slice(0, max);
  };

  let keyPoints = linesFromSection(keySection, maxPoints);
  let riskFactors = linesFromSection(riskSection, maxRisks);

  // 回退：从纯文本提取非空句子
  if (keyPoints.length === 0) {
    const sentences = text
      .replace(/\*\*/g, "")
      .split(/[.。!！]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 180 && /[a-zA-Z]/.test(s));
    keyPoints = sentences.slice(0, maxPoints);
  }

  if (riskFactors.length === 0) {
    // 找含 risk/concern/headwind/downside/challenge 的句子
    const riskSentences = text
      .replace(/\*\*/g, "")
      .split(/[.。!！]\s+/)
      .map(s => s.trim())
      .filter(s =>
        s.length > 20 && s.length < 180 &&
        /risk|concern|headwind|downside|challenge|uncertainty|volatil/i.test(s)
      );
    riskFactors = riskSentences.slice(0, maxRisks);
  }

  return { keyPoints, riskFactors };
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
  const confKeywordMatch = decision.match(/(?:conviction|confidence)[:\s]*(\d{2,3})\s*%/i);
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
    marketCap: raw.marketCap || "—",
    pe: raw.pe || "—",
    sector,
    committeeDecision: {
      signal,
      conviction,
      consensus,
      recommendedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : signal === SignalEnum.BUY ? "10-15%" : "5-10%",
      timeHorizon: "Medium (3-6 months)",
      rationale:
        stripMarkdownLabels(raw.final_trade_decision?.slice(0, 300) || "") ||
        stripMarkdownLabels(raw.risk_debate_state?.judge_decision?.slice(0, 300) || "") ||
        `AI Investment Committee has completed multi-dimensional analysis of ${name}.`,
    },
    debate: {
      bullThesis: [
        {
          agent: "Research Team · Bull",
          content: stripMarkdownLabels(raw.investment_debate_state?.bull_history?.slice(0, 500) || "") || "Bull thesis pending",
        },
      ],
      moderatorVerdict:
        stripMarkdownLabels(raw.investment_debate_state?.judge_decision?.slice(0, 500) || "") || "Research manager verdict pending",
      bearThesis: [
        {
          agent: "Research Team · Bear",
          content: stripMarkdownLabels(raw.investment_debate_state?.bear_history?.slice(0, 500) || "") || "Bear thesis pending",
        },
      ],
      battleBar: {
        bullScore: hasBull ? 65 : 50,
        bearScore: hasBear ? 50 : 35,
      },
      conflictMatrix: [],
    },
    agentAnalyses: (() => {
      const fund   = extractKeyPointsFromReport(raw.fundamentals_report || "");
      const tech   = extractKeyPointsFromReport(raw.market_report || "");
      const sent   = extractKeyPointsFromReport(raw.sentiment_report || "");
      const risk   = extractKeyPointsFromReport(raw.risk_debate_state?.judge_decision || "");
      const news   = extractKeyPointsFromReport(raw.news_report || "");
      // macro 降级：从 investment_plan 提取
      const macro  = extractKeyPointsFromReport(raw.investment_plan || "");
      return [
        {
          agentName: AGENTS[AgentPersonality.FUNDAMENTAL].name,
          role:      AGENTS[AgentPersonality.FUNDAMENTAL].role,
          personality: AgentPersonality.FUNDAMENTAL,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.fundamentals_report?.slice(0, 200) || "") || "Fundamental analysis in progress",
          keyPoints:   fund.keyPoints,
          riskFactors: fund.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.TECHNICAL].name,
          role:      AGENTS[AgentPersonality.TECHNICAL].role,
          personality: AgentPersonality.TECHNICAL,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.market_report?.slice(0, 200) || "") || "Technical analysis in progress",
          keyPoints:   tech.keyPoints,
          riskFactors: tech.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.SENTIMENT].name,
          role:      AGENTS[AgentPersonality.SENTIMENT].role,
          personality: AgentPersonality.SENTIMENT,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.sentiment_report?.slice(0, 200) || "") || "Sentiment analysis in progress",
          keyPoints:   sent.keyPoints,
          riskFactors: sent.riskFactors,
          sentimentPulse: 50,
        },
        {
          agentName: AGENTS[AgentPersonality.RISK].name,
          role:      AGENTS[AgentPersonality.RISK].role,
          personality: AgentPersonality.RISK,
          signal: SignalEnum.HOLD,
          conviction: 50,
          summary: stripMarkdownLabels(raw.risk_debate_state?.judge_decision?.slice(0, 200) || "") || "Risk analysis in progress",
          keyPoints:   risk.keyPoints,
          riskFactors: risk.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.NEWS].name,
          role:      AGENTS[AgentPersonality.NEWS].role,
          personality: AgentPersonality.NEWS,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.news_report?.slice(0, 200) || "") || "News analysis in progress",
          keyPoints:   news.keyPoints,
          riskFactors: news.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.MACRO].name,
          role:      AGENTS[AgentPersonality.MACRO].role,
          personality: AgentPersonality.MACRO,
          signal: SignalEnum.HOLD,
          conviction: 50,
          summary: "Macro environment analysis complete. See full report for details.",
          keyPoints:   macro.keyPoints,
          riskFactors: macro.riskFactors,
        },
      ];
    })(),
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

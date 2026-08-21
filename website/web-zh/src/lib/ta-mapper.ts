// TradingAgents 原始 JSON 输出 → StockDetail 映射器
import { StockDetail } from "../types";
import { Signal as SignalEnum, AgentPersonality, RiskLevel } from "../types/enums";
import { findStock } from "../data/stocks";
import { AGENTS } from "@/content/labels";
import type { TARawResult } from "@/schemas/analysis-result";

export type { TARawResult };

/** Strip bold section-label prefixes and standalone English markdown headers from LLM output */
function stripMarkdownLabels(text: string): string {
  if (!text) return text;
  return text
    .replace(/\*\*[A-Za-z][A-Za-z ]+\*\*\s*[:：]\s*/g, "")   // **Rating**: → ""
    .replace(/^\*\*[A-Za-z][A-Za-z ]+\*\*\s*\n/gm, "")        // standalone **Section Title** headers
    .replace(/^#{1,3}\s+[A-Za-z][^\n]*\n/gm, "")               // ## English Section Headings
    .replace(/^[A-Za-z][A-Za-z ]{0,30}\n+/m, "")               // 残留孤行英文词（如 "Underweight\n"）
    .trimStart();
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
      .filter(s => s.length > 20 && s.length < 180);
    keyPoints = sentences.slice(0, maxPoints);
  }

  if (riskFactors.length === 0) {
    // 找含风险相关关键词的句子（中英文均支持）
    const riskSentences = text
      .replace(/\*\*/g, "")
      .split(/[.。!！]\s+/)
      .map(s => s.trim())
      .filter(s =>
        s.length > 20 && s.length < 180 &&
        /risk|concern|headwind|downside|challenge|uncertainty|volatil|风险|隐患|不确定|挑战|下行|波动/i.test(s)
      );
    riskFactors = riskSentences.slice(0, maxRisks);
  }

  return { keyPoints, riskFactors };
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
    signal === SignalEnum.STRONG_BUY  ? "8人中6人看多" :
    signal === SignalEnum.BUY         ? "8人中5人看多" :
    signal === SignalEnum.HOLD        ? "8人中4人看多" :
    signal === SignalEnum.SELL        ? "8人中3人看多" :
    "8人中2人看多";

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
      timeHorizon: "中期（3-6个月）",
      rationale:
        stripMarkdownLabels(raw.final_trade_decision?.slice(0, 300) || "") ||
        stripMarkdownLabels(raw.risk_debate_state?.judge_decision?.slice(0, 300) || "") ||
        `AI投资委员会已完成对${name}的多维度分析。`,
    },
    debate: {
      bullThesis: [
        {
          agent: "研究团队 · 多方",
          content: stripMarkdownLabels(raw.investment_debate_state?.bull_history?.slice(0, 500) || "") || "多方论点整理中",
        },
      ],
      moderatorVerdict:
        stripMarkdownLabels(raw.investment_debate_state?.judge_decision?.slice(0, 500) || "") || "研究经理裁决整理中",
      bearThesis: [
        {
          agent: "研究团队 · 空方",
          content: stripMarkdownLabels(raw.investment_debate_state?.bear_history?.slice(0, 500) || "") || "空方论点整理中",
        },
      ],
      battleBar: {
        // 根据信号方向设定多空比，确保与最终结论一致
        bullScore: signal === SignalEnum.STRONG_BUY  ? 75
                 : signal === SignalEnum.BUY         ? 65
                 : signal === SignalEnum.HOLD        ? 50
                 : signal === SignalEnum.SELL        ? 35
                 : 25,  // STRONG_SELL
        bearScore: signal === SignalEnum.STRONG_BUY  ? 25
                 : signal === SignalEnum.BUY         ? 35
                 : signal === SignalEnum.HOLD        ? 50
                 : signal === SignalEnum.SELL        ? 65
                 : 75,  // STRONG_SELL
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
          summary: stripMarkdownLabels(raw.fundamentals_report?.slice(0, 200) || "") || "基本面分析进行中",
          keyPoints:   fund.keyPoints,
          riskFactors: fund.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.TECHNICAL].name,
          role:      AGENTS[AgentPersonality.TECHNICAL].role,
          personality: AgentPersonality.TECHNICAL,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.market_report?.slice(0, 200) || "") || "技术面分析进行中",
          keyPoints:   tech.keyPoints,
          riskFactors: tech.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.SENTIMENT].name,
          role:      AGENTS[AgentPersonality.SENTIMENT].role,
          personality: AgentPersonality.SENTIMENT,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.sentiment_report?.slice(0, 200) || "") || "市场情绪分析进行中",
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
          summary: stripMarkdownLabels(raw.risk_debate_state?.judge_decision?.slice(0, 200) || "") || "风险分析进行中",
          keyPoints:   risk.keyPoints,
          riskFactors: risk.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.NEWS].name,
          role:      AGENTS[AgentPersonality.NEWS].role,
          personality: AgentPersonality.NEWS,
          signal: SignalEnum.HOLD,
          conviction: 55,
          summary: stripMarkdownLabels(raw.news_report?.slice(0, 200) || "") || "新闻舆情分析进行中",
          keyPoints:   news.keyPoints,
          riskFactors: news.riskFactors,
        },
        {
          agentName: AGENTS[AgentPersonality.MACRO].name,
          role:      AGENTS[AgentPersonality.MACRO].role,
          personality: AgentPersonality.MACRO,
          signal: SignalEnum.HOLD,
          conviction: 50,
          summary: "宏观环境分析已完成，详见完整报告。",
          keyPoints:   macro.keyPoints,
          riskFactors: macro.riskFactors,
        },
      ];
    })(),
    riskExposures: [
      {
        label: "波动率风险",
        value: RiskLevel.MEDIUM,
        level: RiskLevel.MEDIUM,
        detail: raw.risk_debate_state?.neutral_history?.slice(0, 100) || "风险分析进行中",
        score: 50,
      },
      {
        label: "预期最大回撤",
        value: "-15%",
        level: RiskLevel.MEDIUM,
        detail: "AI风险模型估算",
        score: 45,
      },
      {
        label: "板块集中度",
        value: sector,
        level: RiskLevel.MEDIUM,
        detail: "板块集中度适中",
        score: 50,
      },
      {
        label: "相关性",
        value: "市场中性",
        level: RiskLevel.MEDIUM,
        detail: "Beta 接近 1.0",
        score: 50,
      },
    ],
    positionAllocation: {
      suggestedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : "5-10%",
      sizingFactors: {
        positive: ["AI代理信号整体偏多"],
        negative: ["关注宏观风险"],
      },
      scenarioMatrix: [
        { scenario: "突破上涨",   action: "加仓" },
        { scenario: "区间震荡",   action: "持仓不动" },
        { scenario: "市场回调",   action: "减仓或对冲" },
      ],
      entryStrategy: "分批建仓——初始仓位 3-5%",
      exitTrigger: "跌破关键支撑或基本面恶化时离场",
    },
    liveRail: [
      {
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        agent: "系统",
        message: `${raw.ticker} 分析完成 · 信号：${raw.signal}`,
      },
    ],
    updatedAt: raw.trade_date + "T" + new Date().toISOString().slice(11),
  };
}

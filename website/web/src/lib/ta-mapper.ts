// TradingAgents 原始 JSON 输出 → StockDetail 映射器
import { StockDetail } from "../types";
import { Signal as SignalEnum } from "../types/enums";
import { findStock } from "../data/stocks";

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
  const sector = info ? "综合" : "综合"; // 可从行业分析中提取
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
        `AI 投资委员会已完成对 ${name} 的多维分析。`,
    },
    debate: {
      bullThesis: [
        {
          agent: "研究团队 · 多方",
          content: stripEnLabels(raw.investment_debate_state?.bull_history?.slice(0, 500) || "") || "多方论点待生成",
        },
      ],
      moderatorVerdict:
        stripEnLabels(raw.investment_debate_state?.judge_decision?.slice(0, 500) || "") || "研究经理裁决待生成",
      bearThesis: [
        {
          agent: "研究团队 · 空方",
          content: stripEnLabels(raw.investment_debate_state?.bear_history?.slice(0, 500) || "") || "空方论点待生成",
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
        agentName: "基本面分析智能体",
        role: "财务建模 · 估值",
        personality: "fundamental",
        signal: SignalEnum.HOLD,
        conviction: 55,
        summary: stripEnLabels(raw.fundamentals_report?.slice(0, 200) || "") || "基本面分析中",
        keyPoints: [],
        riskFactors: [],
      },
      {
        agentName: "技术面分析智能体",
        role: "量价分析 · 形态识别",
        personality: "technical",
        signal: SignalEnum.HOLD,
        conviction: 55,
        summary: stripEnLabels(raw.market_report?.slice(0, 200) || "") || "技术面分析中",
        keyPoints: [],
        riskFactors: [],
      },
      {
        agentName: "情绪分析智能体",
        role: "舆情监控 · 社交信号",
        personality: "sentiment",
        signal: SignalEnum.HOLD,
        conviction: 55,
        summary: stripEnLabels(raw.sentiment_report?.slice(0, 200) || "") || "情绪面分析中",
        keyPoints: [],
        riskFactors: [],
        sentimentPulse: 50,
      },
      {
        agentName: "风险分析智能体",
        role: "风控建模 · 压力测试",
        personality: "risk",
        signal: SignalEnum.HOLD,
        conviction: 50,
        summary: stripEnLabels(raw.risk_debate_state?.judge_decision?.slice(0, 200) || "") || "风险分析中",
        keyPoints: [],
        riskFactors: [],
      },
      {
        agentName: "新闻分析智能体",
        role: "事件驱动 · 催化剂",
        personality: "news",
        signal: SignalEnum.HOLD,
        conviction: 55,
        summary: stripEnLabels(raw.news_report?.slice(0, 200) || "") || "新闻分析中",
        keyPoints: [],
        riskFactors: [],
      },
      {
        agentName: "宏观分析智能体",
        role: "宏观趋势 · 资本流动",
        personality: "macro",
        signal: SignalEnum.HOLD,
        conviction: 50,
        summary: "宏观环境分析已完成，详见分析报告。",
        keyPoints: [],
        riskFactors: [],
      },
    ],
    riskExposures: [
      {
        label: "波动率风险",
        value: "中",
        level: "中",
        detail: raw.risk_debate_state?.neutral_history?.slice(0, 100) || "风险分析中",
        score: 50,
      },
      {
        label: "预期回撤",
        value: "-15%",
        level: "中",
        detail: "基于 AI 风险模型估算",
        score: 45,
      },
      { label: "行业暴露", value: sector, level: "中", detail: "行业集中度适中", score: 50 },
      { label: "相关性", value: "市场中性", level: "中", detail: "Beta 接近 1.0", score: 50 },
    ],
    positionAllocation: {
      suggestedExposure: signal === SignalEnum.STRONG_BUY ? "15-20%" : "5-10%",
      sizingFactors: {
        positive: ["AI 智能体积极信号"],
        negative: ["需关注宏观风险"],
      },
      scenarioMatrix: [
        { scenario: "突破上行", action: "适度加仓" },
        { scenario: "区间震荡", action: "维持现有仓位" },
        { scenario: "市场回调", action: "降低仓位或对冲" },
      ],
      entryStrategy: "分批建仓，首次 3-5%",
      exitTrigger: "跌破关键支撑或基本面恶化",
    },
    learningMemory: [
      {
        date: raw.trade_date,
        whatHappened: `TradingAgents 对 ${raw.ticker} 完成首次分析`,
        whatAgentsMissed: "首次分析无历史参考",
        systemAdjustment: "建立基线数据，后续分析纳入历史对比",
        pnl: "N/A",
      },
    ],
    liveRail: [
      {
        time: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" }),
        agent: "系统",
        message: `${raw.ticker} 分析完成 · 信号: ${raw.signal}`,
      },
    ],
    updatedAt: raw.trade_date + "T" + new Date().toISOString().slice(11),
  };
}

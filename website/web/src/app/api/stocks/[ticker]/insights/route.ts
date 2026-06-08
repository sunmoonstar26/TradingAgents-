import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const RESULTS_DIR = join(process.cwd(), "..", "api-server", "data", "analysis_results");

function stripMd(text: string): string {
  return text
    .replace(/\*\*[A-Za-z][A-Za-z ]+\*\*\s*[:：]\s*/g, "")
    .replace(/\*\*/g, "")
    .replace(/#{1,3}\s*/g, "")
    .replace(/\n{2,}/g, " ")
    .trim();
}

/** 从 final_trade_decision 提取一句核心投资论点（去掉 Rating 行，取 Exec Summary 首句） */
function extractThesisOneLiner(decision: string): string {
  if (!decision) return "";
  // 尝试取 Executive Summary 段首句
  const execMatch = decision.match(/\*\*Executive Summary\*\*\s*[:：]?\s*([\s\S]*?)(?=\n\n\*\*|\n#{1,3}|$)/i);
  if (execMatch?.[1]) {
    const firstSentence = execMatch[1]
      .replace(/\*\*/g, "")
      .split(/(?<=[.!?])\s+/)[0]
      ?.trim();
    if (firstSentence && firstSentence.length > 30) return firstSentence;
  }
  // 回退：去掉 **Rating**: 行后取第一段
  return stripMd(decision.replace(/^\*\*Rating\*\*[^\n]*\n*/i, "")).slice(0, 180);
}

/** 判断一行是否是纯标题行（不含实质内容） */
function isTitleLine(line: string): boolean {
  const clean = line.replace(/\*\*/g, "").trim();
  // 全大写或首字母大写的短词组，且不含动词关键词
  if (/^[A-Z][A-Z\s']+:?\s*$/.test(clean)) return true;
  // 以 # 开头
  if (/^#+/.test(line)) return true;
  // 形如 "**SECTION TITLE**" 或 "---"
  if (/^\*\*[A-Z\s]+\*\*\s*$/.test(line)) return true;
  if (/^[-=]{3,}$/.test(clean)) return true;
  return false;
}

/** 从自由文本中提取 N 条核心要点（含实质内容的句子） */
function extractBullets(text: string, max = 3): string[] {
  if (!text) return [];
  // 优先：markdown 列表条目 (- 或 * 开头的行)
  const listLines = text
    .split(/\n/)
    .filter(l => /^\s*[-*•]\s+\S/.test(l))
    .map(l => l.replace(/^\s*[-*•]\s*/, "").replace(/\*\*/g, "").trim())
    .filter(l => l.length > 25 && l.length < 220 && !isTitleLine(l) && /[a-zA-Z]/.test(l));
  if (listLines.length >= 2) return listLines.slice(0, max);

  // 次选：普通行，过滤掉标题行
  const contentLines = text
    .split(/\n/)
    .map(l => l.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim())
    .filter(l => l.length > 30 && l.length < 220 && !isTitleLine(l) && /[a-z]/.test(l));
  if (contentLines.length >= 2) return contentLines.slice(0, max);

  // 回退：分句
  return text
    .replace(/\*\*/g, "")
    .split(/[.。!！]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 25 && s.length < 200 && /[a-z]/.test(s) && !isTitleLine(s))
    .slice(0, max);
}

/** 从 final_trade_decision / investment_plan 推断置信度 */
function extractConviction(text: string, fallback = 65): number {
  const m = text?.match(/(?:conviction|confidence)[:\s]*(\d{2,3})\s*%/i);
  return m ? Math.min(100, parseInt(m[1])) : fallback;
}

/** 从 final_trade_decision 提取 key_reasons (ReasonCapsule[]) */
function buildKeyReasons(raw: Record<string, unknown>): unknown[] {
  const decision = (raw.final_trade_decision as string) || "";
  const plan     = (raw.investment_plan as string) || "";
  const risk     = ((raw.risk_debate_state as Record<string, string>)?.judge_decision) || "";

  // 优先：从 Executive Summary 段落按句子提取
  const execMatch = decision.match(/\*\*Executive Summary\*\*\s*[:：]?\s*([\s\S]*?)(?=\n\n\*\*|\n#{1,3}|$)/i);
  const execText = execMatch?.[1] || decision;

  // 从 Executive Summary 段分句提取
  const execSentences = execText
    .replace(/\*\*/g, "")
    .split(/(?<=[.!?])\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 35 && s.length < 320 && /[a-z]/.test(s) && !isTitleLine(s));

  // 若 exec 句子够用则用，否则回退到全文列表行
  const bullets = execSentences.length >= 2 ? execSentences.slice(0, 4) : extractBullets([decision, plan, risk].filter(Boolean).join("\n\n"), 4);

  const signal = ((raw.signal as string) || "hold").toLowerCase();
  const defaultImpact = signal === "buy" || signal === "overweight" ? "high" : "medium";

  return bullets.map((insight, i) => ({
    insight,
    source_agents: i === 0 ? ["Portfolio Mgr"] : i === 1 ? ["Risk Mgr"] : ["Research"],
    confidence: Math.max(50, extractConviction(decision + plan, 65) - i * 5),
    impact: i === 0 ? defaultImpact : i === 1 ? "medium" : "low",
  }));
}

/** 找最新的 session JSON for ticker */
function findLatestSession(ticker: string): string | null {
  if (!existsSync(RESULTS_DIR)) return null;
  const upper = ticker.toUpperCase();
  const files = readdirSync(RESULTS_DIR)
    .filter(f => f.endsWith(".json") && !f.endsWith(".log") && f.toUpperCase().includes(`_${upper}_`))
    .sort()
    .reverse();
  return files.length > 0 ? join(RESULTS_DIR, files[0]) : null;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const filePath = findLatestSession(ticker);

  if (!filePath) {
    return NextResponse.json({ success: false, error: "Analysis report not found" }, { status: 404 });
  }

  let raw: Record<string, unknown>;
  try {
    raw = JSON.parse(readFileSync(filePath, "utf-8"));
  } catch {
    return NextResponse.json({ success: false, error: "Failed to parse report" }, { status: 500 });
  }

  const decision  = (raw.final_trade_decision as string) || "";
  const plan      = (raw.investment_plan as string) || "";
  const debate    = raw.investment_debate_state as Record<string, string> | undefined;
  const riskState = raw.risk_debate_state as Record<string, string> | undefined;
  const signal    = ((raw.signal as string) || "hold").toLowerCase();

  // ── thesis ──────────────────────────────────────────────────────────────
  const convFallback =
    signal === "buy"         ? 82 :
    signal === "overweight"  ? 68 :
    signal === "underweight" ? 35 :
    signal === "sell"        ? 22 : 55;

  const thesis = {
    final_signal: raw.signal as string,
    investment_thesis: extractThesisOneLiner(decision),
    decision_summary:  stripMd(decision).slice(0, 300),
    conviction: extractConviction(decision + plan, convFallback),
    bull_case_summary: stripMd(debate?.bull_history || "").slice(0, 200),
    bear_case_summary: stripMd(debate?.bear_history || "").slice(0, 200),
    key_reasons: buildKeyReasons(raw),
    time_horizon: "Medium (3-6 months)",
    primary_risk_summary: stripMd(riskState?.judge_decision || "").slice(0, 120),
  };

  // ── analysts ─────────────────────────────────────────────────────────────
  const mapAnalyst = (text: string, name: string) => {
    const pts = extractBullets(text, 3);
    return {
      verdict: signal === "buy" || signal === "overweight" ? "Bullish" : signal === "sell" || signal === "underweight" ? "Bearish" : "Neutral",
      core_insight: pts[0] || `${name} analysis complete`,
      supporting_signals: pts.slice(1),
    };
  };

  const analysts = {
    fundamental: mapAnalyst(raw.fundamentals_report as string, "Fundamental"),
    technical:   mapAnalyst(raw.market_report as string,       "Technical"),
    sentiment:   mapAnalyst(raw.sentiment_report as string,    "Sentiment"),
    news:        mapAnalyst(raw.news_report as string,         "News"),
  };

  // ── debate ────────────────────────────────────────────────────────────────
  const debateData = {
    bull: {
      stance: "Bullish",
      core_argument: stripMd(debate?.bull_history || "").slice(0, 200),
      key_evidence: extractBullets(debate?.bull_history || "", 2),
    },
    bear: {
      stance: "Bearish",
      core_argument: stripMd(debate?.bear_history || "").slice(0, 200),
      key_evidence: extractBullets(debate?.bear_history || "", 2),
    },
    judge: {
      verdict: signal === "buy" || signal === "overweight" ? "Bullish" : signal === "sell" || signal === "underweight" ? "Bearish" : "Neutral",
      reasoning: stripMd(debate?.judge_decision || "").slice(0, 200),
    },
  };

  // ── trading ───────────────────────────────────────────────────────────────
  const tradingData = {
    action: signal === "buy" || signal === "overweight" ? "Buy" : signal === "sell" || signal === "underweight" ? "Sell" : "Hold",
    suggested_exposure: signal === "buy" ? "15-20%" : signal === "overweight" ? "10-15%" : "5-10%",
    rationale: stripMd(raw.trader_investment_plan as string || "").slice(0, 200),
  };

  // ── risk ──────────────────────────────────────────────────────────────────
  const riskData = {
    level: signal === "sell" || signal === "underweight" ? "HIGH" : signal === "hold" ? "MEDIUM" : "LOW",
    primary_concern: stripMd(riskState?.judge_decision || "").slice(0, 150),
    factors: extractBullets(riskState?.judge_decision || "", 2),
  };

  const insights = {
    ticker: raw.ticker as string,
    report_dir: raw.report_dir as string || filePath,
    thesis,
    analysts,
    debate: debateData,
    trading: tradingData,
    risk: riskData,
    memory: { recent_decisions: [] },
  };

  return NextResponse.json({ success: true, data: insights });
}

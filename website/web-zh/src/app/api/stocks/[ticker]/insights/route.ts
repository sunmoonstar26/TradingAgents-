import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

const RESULTS_DIR = join(process.cwd(), "..", "api-server-zh", "data", "analysis_results");

function stripMd(text: string): string {
  return text
    .replace(/\*\*[A-Za-z][A-Za-z ]+\*\*\s*[:：]\s*/g, "")  // **Rating**: → ""
    .replace(/^\*\*[A-Za-z][A-Za-z ]+\*\*\s*\n/gm, "")       // standalone **Section Title** headers
    .replace(/^#{1,3}\s+[A-Za-z][^\n]*\n/gm, "")              // ## English headings
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

/** 定位报告中的总结/结论段落，优先从此提取而非全文扫描 */
function locateConclusionSection(text: string): string {
  const m = text.match(
    /(?:^|\n)#{1,3}[^\n]*(?:总结|结论|综合研判|综合评估|投资建议|交易建议|操作建议|核心观点|关键结论|核心发现|交易策略)[^\n]*\n([\s\S]{50,}?)(?=\n#{1,3}|$)/i
  );
  return m ? m[1] : text;
}

/** 从自由文本中提取 N 条核心要点（含实质内容的句子） */
function extractBullets(text: string, max = 3): string[] {
  if (!text) return [];

  // 1. 优先：编号列表 (1. 2. 3.)，通常是结论段落的高质量摘要
  const numberedLines = text
    .split(/\n/)
    .map(l => { const m = l.match(/^\s*\d+\.\s+\*?\*?(.+)/); return m ? m[1].replace(/\*\*/g, "").trim() : ""; })
    .filter(l => l.length > 20 && l.length < 250 && !isTitleLine(l));
  if (numberedLines.length >= 2) return numberedLines.slice(0, max);

  // 2. 定位到总结段后再扫 - / * 列表
  const section = locateConclusionSection(text);
  const listLines = section
    .split(/\n/)
    .filter(l => /^\s*[-*•✅❌]\s+\S/.test(l))
    .map(l => l.replace(/^\s*[-*•✅❌]\s*/, "").replace(/\*\*/g, "").trim())
    // 过滤掉纯财务数字行，如 "毛利率：81.94% ——"
    .filter(l => l.length > 20 && l.length < 220 && !isTitleLine(l) && !/^\d[\d.%]+\s*[-—]/.test(l));
  if (listLines.length >= 2) return listLines.slice(0, max);

  // 3. **报告总结：** 段落提取句子
  const summaryM = text.match(/\*\*报告总结[：:]\*\*\s*([\s\S]{30,400}?)(?=\n\n|---|$)/);
  if (summaryM) {
    const sents = summaryM[1].replace(/\n/g, "").replace(/\*\*/g, "").split(/[。！？!?]\s*/)
      .map(s => s.trim()).filter(s => s.length > 20 && s.length < 200 && !isTitleLine(s));
    if (sents.length >= 1) return sents.slice(0, max);
  }

  // 4. 回退：总结段内容行（跳过表格行）
  const contentLines = section
    .split(/\n/)
    .filter(l => !/^\|/.test(l.trim()))
    .map(l => l.replace(/\*\*/g, "").replace(/^#+\s*/, "").trim())
    .filter(l => l.length > 25 && l.length < 220 && !isTitleLine(l));
  if (contentLines.length >= 2) return contentLines.slice(0, max);

  // 5. 最终回退：全文分句
  return text
    .replace(/\*\*/g, "")
    .split(/[.。!！]\s+/)
    .map(s => s.trim())
    .filter(s => s.length > 20 && s.length < 200 && !isTitleLine(s))
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

  // 优先：从各分析章节（一、二、三...）提取首句，每章是一个独立观点
  const sectionMatches = [...decision.matchAll(
    /\*\*[一二三四五六七八九十]\S*[、．.]\s*[^*]+?\*\*\s*[:：]?\s*([\s\S]*?)(?=\n\n\*\*[一二三四五六七八九十]|\n\n\*\*[A-Z]|\n#{1,3}|\Z)/g
  )];
  const sectionBullets = sectionMatches
    .map(m => m[1].replace(/\*\*/g, "").replace(/\n/g, "").split("。")[0].trim())
    .filter(s => s.length > 30 && s.length < 320);

  // 次选：Investment Thesis 段分句（通常是高质量总结）
  const thesisMatch = decision.match(/\*\*Investment Thesis\*\*\s*[:：]?\s*([\s\S]*?)(?=\n\n\*\*|\n#{1,3}|$)/i);
  const thesisSentences = (thesisMatch?.[1] || "")
    .replace(/\*\*/g, "")
    .split(/[。！？]\s*/)
    .map(s => s.trim())
    .filter(s => s.length > 30 && s.length < 320 && !isTitleLine(s));

  const bullets = sectionBullets.length >= 2
    ? sectionBullets.slice(0, 4)
    : thesisSentences.length >= 2
    ? thesisSentences.slice(0, 4)
    : extractBullets([decision, plan, risk].filter(Boolean).join("\n\n"), 4);

  const signal = ((raw.signal as string) || "hold").toLowerCase();
  const defaultImpact = signal === "buy" || signal === "overweight" ? "high" : "medium";

  return bullets.map((insight, i) => ({
    insight,
    source_agents: i === 0 ? ["组合经理"] : i === 1 ? ["风险经理"] : ["研究团队"],
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
    decision_summary:  (() => {
      // 取 Investment Thesis 段，避免与 investment_thesis（Executive Summary）重复
      const m = decision.match(/\*\*Investment Thesis\*\*\s*[:：]?\s*([\s\S]*?)(?=\n\n\*\*|\n#{1,3}|$)/i);
      return stripMd(m?.[1] || decision).slice(0, 300);
    })(),
    conviction: extractConviction(decision + plan, convFallback),
    bull_case_summary: stripMd(debate?.bull_history || "").slice(0, 200),
    bear_case_summary: stripMd(debate?.bear_history || "").slice(0, 200),
    key_reasons: buildKeyReasons(raw),
    time_horizon: "中期（3-6个月）",
    primary_risk_summary: stripMd(riskState?.judge_decision || "").slice(0, 120),
  };

  // ── analysts ─────────────────────────────────────────────────────────────
  const mapAnalyst = (text: string, name: string) => {
    const pts = extractBullets(text, 3);
    return {
      verdict: signal === "buy" || signal === "overweight" ? "看多" : signal === "sell" || signal === "underweight" ? "看空" : "中性",
      core_insight: pts[0] || `${name}分析已完成`,
      supporting_signals: pts.slice(1),
    };
  };

  const analysts = {
    fundamental: mapAnalyst(raw.fundamentals_report as string, "基本面"),
    technical:   mapAnalyst(raw.market_report as string,       "技术面"),
    sentiment:   mapAnalyst(raw.sentiment_report as string,    "情绪面"),
    news:        mapAnalyst(raw.news_report as string,         "新闻舆情"),
  };

  // ── debate ────────────────────────────────────────────────────────────────
  // 从辩论文本中提取核心争议话题
  const judgeText = debate?.judge_decision || "";
  const bullText  = debate?.bull_history  || "";
  const bearText  = debate?.bear_history  || "";

  // 提取 judge 的核心冲突描述（取 judge_decision 第一句实质内容）
  const coreConflict = (() => {
    const sentences = judgeText
      .replace(/\*\*/g, "")
      .split(/[。！？.!?]\s+/)
      .map(s => s.trim())
      .filter(s => s.length > 20 && s.length < 200 && !isTitleLine(s));
    return sentences[0] || "";
  })();

  // 尝试从 judge_decision 中提取争议话题列表
  // 格式通常是：「xxx」或 **xxx** 作为话题标题
  const topicMatches = judgeText.match(/[「『【]([^」』】]{2,20})[」』】]/g) || [];
  const topicNames = topicMatches.slice(0, 4).map(t => t.replace(/[「『【」』】]/g, "").trim());

  // 如果话题不足，从 bull/bear 文本里补充
  const allTopics = topicNames.length >= 2 ? topicNames : (() => {
    const combined = bullText + "\n" + bearText;
    const m = combined.match(/[「『【]([^」』】]{2,20})[」』】]/g) || [];
    return [...new Set([...topicNames, ...m.map(t => t.replace(/[「『【」』】]/g, "").trim())])].slice(0, 4);
  })();

  // 构建 key_topics（供 BullBearDebate 组件用）
  const judgeVerdictText = signal === "buy" || signal === "overweight" ? "多方胜出"
                         : signal === "sell" || signal === "underweight" ? "空方胜出"
                         : "势均力敌";

  const keyTopics = allTopics.length > 0
    ? allTopics.map((topic) => {
        // 从 bull/bear 各自文本中找到含该话题的句子作为论点
        const findView = (text: string) => {
          const lines = text.replace(/\*\*/g, "").split(/\n/)
            .map(l => l.trim())
            .filter(l => l.includes(topic) && l.length > 15 && l.length < 200);
          return lines[0] || "";
        };
        return {
          topic,
          bull_view: findView(bullText),
          bear_view: findView(bearText),
          winner: signal === "buy" || signal === "overweight" ? "bull"
                : signal === "sell" || signal === "underweight" ? "bear"
                : "tie" as "bull" | "bear" | "tie",
        };
      })
    : [];

  const debateData = {
    bull: {
      stance: "看多",
      core_argument: stripMd(bullText).slice(0, 200),
      key_evidence: extractBullets(bullText, 2),
      key_topics: keyTopics,
    },
    bear: {
      stance: "看空",
      core_argument: stripMd(bearText).slice(0, 200),
      key_evidence: extractBullets(bearText, 2),
      key_topics: keyTopics,
    },
    judge: {
      verdict: judgeVerdictText,
      reasoning: stripMd(judgeText).slice(0, 200),
      core_conflict: coreConflict,
      confidence: extractConviction(judgeText, 70),
      key_topics: keyTopics,
    },
  };

  // ── trading ───────────────────────────────────────────────────────────────
  const traderPlan = stripMd(raw.trader_investment_plan as string || "");
  const tradingAction = signal === "buy" || signal === "overweight" ? "买入" : signal === "sell" || signal === "underweight" ? "卖出" : "持有";
  const tradingData = {
    action: tradingAction,
    allocation_rationale: traderPlan.slice(0, 200) || decision.slice(0, 200),
    suggested_exposure: signal === "buy" ? "15-20%" : signal === "overweight" ? "10-15%" : "5-10%",
    confidence: extractConviction(decision + plan, convFallback),
    increase_conditions: extractBullets(plan, 2).filter(b => /increase|add|overweight|buy/i.test(b)).slice(0, 2),
    reduce_conditions: extractBullets(riskState?.judge_decision || "", 2).filter(b => /reduce|cut|risk|downside/i.test(b)).slice(0, 2),
    hedge_conditions: extractBullets(riskState?.judge_decision || plan, 2).filter(b => /hedge|protect|risk|volatil/i.test(b)).slice(0, 2),
  };

  // ── risk ──────────────────────────────────────────────────────────────────
  const riskLevel: "high" | "medium" | "low" =
    signal === "sell" || signal === "underweight" ? "high" :
    signal === "hold" ? "medium" : "low";
  const riskBullets = extractBullets(riskState?.judge_decision || "", 3);
  const riskData = {
    overall_risk_level: riskLevel,
    confidence: extractConviction(riskState?.judge_decision || "", 60),
    risk_items: riskBullets.map((b, i) => ({
      risk_type: i === 0 ? "市场风险" : i === 1 ? "基本面风险" : "宏观风险",
      why_matters: b,
      potential_impact: riskLevel === "high" ? "可能面临较大下行风险" : "影响程度适中",
      triggered_by: "风险经理",
      mitigation: "关注仓位大小并设置止损位",
      severity: riskLevel,
    })),
  };

  const insights = {
    ticker: raw.ticker as string,
    report_dir: raw.report_dir as string || filePath,
    thesis,
    analysts,
    debate: debateData,
    trading: tradingData,
    risk: riskData,
  };

  return NextResponse.json({ success: true, data: insights });
}

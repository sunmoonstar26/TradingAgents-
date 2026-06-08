import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// JSON 结果目录（api-server 写入位置）
const RESULTS_DIR = join(
  process.cwd(),
  "..",
  "api-server",
  "data",
  "analysis_results"
);

// section/subsection → JSON 字段路径（字符串=顶层字段，数组=嵌套路径）
type FieldPath = string | string[];

const FIELD_MAP: Record<string, Record<string, FieldPath>> = {
  analysts: {
    fundamental:  "fundamentals_report",
    fundamentals: "fundamentals_report",
    technical:    "market_report",
    market:       "market_report",
    sentiment:    "sentiment_report",
    news:         "news_report",
  },
  research: {
    bull:     ["investment_debate_state", "bull_history"],
    bear:     ["investment_debate_state", "bear_history"],
    verdict:  ["investment_debate_state", "judge_decision"],
    manager:  "investment_plan",
  },
  trading: {
    trader: "trader_investment_plan",
  },
  risk: {
    aggressive:   ["risk_debate_state", "aggressive_history"],
    conservative: ["risk_debate_state", "conservative_history"],
    neutral:      ["risk_debate_state", "neutral_history"],
  },
  portfolio: {
    decision: "final_trade_decision",
  },
};

function getNestedValue(obj: Record<string, unknown>, path: FieldPath): string {
  if (typeof path === "string") return (obj[path] as string) ?? "";
  let cur: unknown = obj;
  for (const key of path) {
    if (cur == null || typeof cur !== "object") return "";
    cur = (cur as Record<string, unknown>)[key];
  }
  return (cur as string) ?? "";
}

/** 找到 ticker 最新的 sess_*.json 文件路径，没有则返回 null */
function findLatestResultFile(ticker: string): string | null {
  if (!existsSync(RESULTS_DIR)) return null;

  const lower = ticker.toLowerCase();
  let bestFile: string | null = null;
  let bestKey = "";

  for (const name of readdirSync(RESULTS_DIR)) {
    if (!name.endsWith(".json")) continue;
    // 格式: sess_{ticker}_{YYYYMMDD}_{seq}.json
    const match = name.match(/^sess_([a-z0-9]+)_(\d{8}_\d+)\.json$/i);
    if (!match || match[1].toLowerCase() !== lower) continue;
    const key = match[2];
    if (key > bestKey) { bestKey = key; bestFile = join(RESULTS_DIR, name); }
  }

  return bestFile;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string; section: string; subsection: string }> }
) {
  const { ticker, section, subsection } = await params;

  // 1. 找到最新 JSON 文件
  const filePath = findLatestResultFile(ticker);
  if (!filePath) {
    return NextResponse.json(
      { success: false, error: `Report data not found for ${ticker.toUpperCase()}` },
      { status: 404 }
    );
  }

  // 2. 验证 section / subsection
  const sectionMap = FIELD_MAP[section];
  if (!sectionMap) {
    return NextResponse.json(
      { success: false, error: `Invalid analysis type: ${section}` },
      { status: 400 }
    );
  }

  const fieldPath = sectionMap[subsection];
  if (!fieldPath) {
    return NextResponse.json(
      { success: false, error: `Invalid subsection: ${subsection}` },
      { status: 400 }
    );
  }

  // 3. 读 JSON，提取对应字段
  try {
    const raw = readFileSync(filePath, "utf-8");
    const data = JSON.parse(raw) as Record<string, unknown>;
    const content = getNestedValue(data, fieldPath);

    if (!content) {
      return NextResponse.json(
        { success: false, error: `Report not available: ${section}/${subsection}` },
        { status: 404 }
      );
    }

    return NextResponse.json({
      success: true,
      data: { content, ticker: ticker.toUpperCase(), section, subsection },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to read report file" },
      { status: 500 }
    );
  }
}

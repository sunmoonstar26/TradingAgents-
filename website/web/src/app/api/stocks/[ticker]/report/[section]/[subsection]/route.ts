import { NextRequest, NextResponse } from "next/server";
import { readFileSync, existsSync, readdirSync } from "fs";
import { join } from "path";

// 报告根目录
const REPORTS_DIR = join(
  process.cwd(),
  "..",
  "..",
  "reports"
);

// section 到文件夹名的映射
const SECTION_MAP: Record<string, string> = {
  analysts: "1_analysts",
  research: "2_research",
  trading: "3_trading",
  risk: "4_risk",
  portfolio: "5_portfolio",
};

// subsection 到文件名的映射（各 section 下）
const SUBSECTION_MAP: Record<string, Record<string, string>> = {
  analysts: {
    fundamental: "fundamentals",
    fundamentals: "fundamentals",
    technical: "market",
    market: "market",
    sentiment: "sentiment",
    news: "news",
    risk: "risk",
    macro: "macro",
  },
  research: {
    bull: "bull",
    bear: "bear",
    verdict: "manager",
    manager: "manager",
  },
  trading: {
    trader: "trader",
  },
  risk: {
    aggressive: "aggressive",
    conservative: "conservative",
    neutral: "neutral",
  },
  portfolio: {
    decision: "decision",
  },
};

/**
 * 根据 ticker 在 reports 目录查找对应报告文件夹
 * 返回文件夹路径或 null
 */
function findReportFolder(ticker: string): string | null {
  if (!existsSync(REPORTS_DIR)) return null;

  const upperTicker = ticker.toUpperCase();
  const entries = readdirSync(REPORTS_DIR, { withFileTypes: true });

  let bestMatch: string | null = null;
  let bestTimestamp = "";

  for (const entry of entries) {
    if (!entry.isDirectory()) continue;
    // 文件夹格式: TICKER_TIMESTAMP，如 LI_20260519_101446
    const parts = entry.name.split("_");
    const folderTicker = parts[0]?.toUpperCase();
    if (folderTicker !== upperTicker) continue;

    // 选择时间戳最新的文件夹
    const ts = parts.slice(1).join("_");
    if (ts > bestTimestamp) {
      bestTimestamp = ts;
      bestMatch = join(REPORTS_DIR, entry.name);
    }
  }

  return bestMatch;
}

export async function GET(
  _request: NextRequest,
  { params }: { params: Promise<{ ticker: string; section: string; subsection: string }> }
) {
  const { ticker, section, subsection } = await params;

  // 1. 查找报告文件夹
  const reportFolder = findReportFolder(ticker);
  if (!reportFolder) {
    return NextResponse.json(
      { success: false, error: `Report data not found for ${ticker}` },
      { status: 404 }
    );
  }

  // 2. 映射 section → 文件夹
  const sectionFolder = SECTION_MAP[section];
  if (!sectionFolder) {
    return NextResponse.json(
      { success: false, error: `Invalid analysis type: ${section}` },
      { status: 400 }
    );
  }

  // 3. 映射 subsection → 文件名
  const subsectionMap = SUBSECTION_MAP[section];
  if (!subsectionMap) {
    return NextResponse.json(
      { success: false, error: `Invalid analysis type: ${section}` },
      { status: 400 }
    );
  }

  const fileName = subsectionMap[subsection];
  if (!fileName) {
    return NextResponse.json(
      { success: false, error: `Invalid subsection: ${subsection}` },
      { status: 400 }
    );
  }

  // 4. 读取文件
  const filePath = join(reportFolder, sectionFolder, `${fileName}.md`);
  if (!existsSync(filePath)) {
    return NextResponse.json(
      {
        success: false,
        error: `Report file not found: ${section}/${subsection}`,
      },
      { status: 404 }
    );
  }

  try {
    const content = readFileSync(filePath, "utf-8");
    return NextResponse.json({
      success: true,
      data: {
        content,
        ticker: ticker.toUpperCase(),
        section,
        subsection,
      },
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Failed to read report file" },
      { status: 500 }
    );
  }
}

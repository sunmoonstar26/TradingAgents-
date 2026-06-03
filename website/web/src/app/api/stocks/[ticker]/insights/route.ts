import { NextRequest, NextResponse } from "next/server";
import { readFileSync, readdirSync, existsSync } from "fs";
import { join } from "path";

// 报告根目录: 网站开发/web → ../.. → TradingAgents 项目/reports/
const REPORTS_DIR = join(process.cwd(), "..", "..", "reports");

function findReportWithInsights(ticker: string): string | null {
  if (!existsSync(REPORTS_DIR)) return null;
  const dirs = readdirSync(REPORTS_DIR, { withFileTypes: true })
    .filter(d => d.isDirectory() && d.name.toUpperCase().startsWith(ticker.toUpperCase()))
    .map(d => ({ name: d.name, time: d.name.split("_").slice(1).join("_") }))
    .sort((a, b) => b.time.localeCompare(a.time));  // 最新优先

  // 找到第一个包含 insights.json 的目录
  for (const d of dirs) {
    if (existsSync(join(REPORTS_DIR, d.name, "insights.json"))) {
      return d.name;
    }
  }
  // 回退：返回最新目录（即使无 insights）
  return dirs.length > 0 ? dirs[0].name : null;
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  // 查找最新报告目录
  const reportFolder = findReportWithInsights(ticker);
  if (!reportFolder) {
    return NextResponse.json({ success: false, error: "Analysis report not found" }, { status: 404 });
  }

  const insightsPath = join(REPORTS_DIR, reportFolder, "insights.json");

  if (!existsSync(insightsPath)) {
    return NextResponse.json({
      success: false,
      error: "Insights not yet generated — run insight_extractor.py",
      reportDir: reportFolder,
    }, { status: 404 });
  }

  try {
    const raw = readFileSync(insightsPath, "utf-8");
    const data = JSON.parse(raw);
    return NextResponse.json({ success: true, data });
  } catch (e) {
    return NextResponse.json({ success: false, error: "Failed to parse insights data" }, { status: 500 });
  }
}

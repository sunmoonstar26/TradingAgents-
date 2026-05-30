import { NextRequest, NextResponse } from "next/server";
import { createSession, startRealAnalysis } from "../../../../lib/analysis-store";

/** POST /api/radar/update — 触发单只股票的 AI 分析刷新 */
export async function POST(req: NextRequest) {
  try {
    const { ticker } = await req.json();
    if (!ticker) {
      return NextResponse.json({ success: false, error: "缺少 ticker" }, { status: 400 });
    }

    const tickerUpper = ticker.toUpperCase();
    // 创建分析会话并启动后台分析
    const session = createSession(tickerUpper, "US", "standard");
    startRealAnalysis(session.session_id, tickerUpper, "US");

    return NextResponse.json({
      success: true,
      session_id: session.session_id,
      message: "分析已启动",
    });
  } catch (e) {
    const msg = e instanceof Error ? e.message : "启动分析失败";
    return NextResponse.json({ success: false, error: msg }, { status: 500 });
  }
}

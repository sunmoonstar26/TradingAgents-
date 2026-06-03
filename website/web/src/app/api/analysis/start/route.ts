import { NextRequest, NextResponse } from "next/server";
import { createSession, startRealAnalysis } from "../../../../lib/analysis-store";
import { AnalysisStartRequest } from "../../../../types";

export async function POST(req: NextRequest) {
  try {
    const body: AnalysisStartRequest = await req.json();
    const { ticker, market, mode } = body;

    if (!ticker || !market || !mode) {
      return NextResponse.json(
        { success: false, error: "Missing required parameters: ticker / market / mode" },
        { status: 400 }
      );
    }

    // 创建分析会话
    const session = createSession(ticker, market, mode);

    // 启动真实 TradingAgents 子进程（异步）
    startRealAnalysis(session.session_id, ticker, market);

    return NextResponse.json({
      success: true,
      session_id: session.session_id,
    });
  } catch {
    return NextResponse.json(
      { success: false, error: "Internal server error" },
      { status: 500 }
    );
  }
}

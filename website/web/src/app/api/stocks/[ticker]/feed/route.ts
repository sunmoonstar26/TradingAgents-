import { NextRequest, NextResponse } from "next/server";
import { getStockDetail } from "../../../../../lib/mock-stock";
import { getActiveSessionByTicker } from "../../../../../lib/analysis-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const tickerUpper = ticker.toUpperCase();
  const active = getActiveSessionByTicker(tickerUpper);
  if (active) {
    return NextResponse.json(
      { success: false, status: "analyzing", session_id: active.session_id },
      { status: 202 }
    );
  }
  const data = getStockDetail(tickerUpper);
  if (!data) return NextResponse.json({ success: false, error: "未找到" }, { status: 404 });
  return NextResponse.json({ success: true, data: data.liveRail });
}

import { NextRequest, NextResponse } from "next/server";
import { getSession } from "../../../../lib/analysis-store";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ session_id: string }> },
) {
  const { session_id } = await params;
  const session = getSession(session_id);

  if (!session) {
    return NextResponse.json(
      { success: false, error: "会话未找到" },
      { status: 404 },
    );
  }

  return NextResponse.json({
    success: true,
    data: {
      session_id: session.session_id,
      ticker: session.ticker,
      status: session.status,
      progress: session.progress,
      created_at: session.created_at,
      completed_at: session.completed_at,
      current_step: session.current_step,
      error_message: session.error_message,
    },
  });
}

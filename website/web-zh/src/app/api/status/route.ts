import { NextResponse } from "next/server";
import { getAllActiveSessions } from "@/lib/analysis-store";

/** GET /api/status — 返回当前活跃分析任务统计，供 Header 展示真实状态 */
export async function GET() {
  const active = getAllActiveSessions();
  const running = active.filter((s) => s.status === "running").length;

  return NextResponse.json({
    running,
    total: active.length,
  });
}

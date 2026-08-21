import { NextRequest, NextResponse } from "next/server";
import type { LearningMemoryEntry } from "@/types";

const BACKEND_URL =
  process.env.PYTHON_BACKEND_ZH_URL ?? "http://localhost:8001";

interface BackendMemoryEntry {
  date: string;
  ticker: string;
  rating: string;
  pending: boolean;
  raw_return: string | null;
  alpha_return: string | null;
  holding_days: string | null;
  decision: string;
  reflection: string;
}

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  let entries: LearningMemoryEntry[] = [];
  try {
    const res = await fetch(`${BACKEND_URL}/memory/${ticker.toUpperCase()}`, {
      cache: "no-store",
    });
    if (res.ok) {
      const body: { entries: BackendMemoryEntry[] } = await res.json();
      entries = body.entries.map((e) => ({
        date: e.date,
        rating: e.rating,
        pending: e.pending,
        rawReturn: e.raw_return,
        alphaReturn: e.alpha_return,
        holdingDays: e.holding_days,
        decision: e.decision,
        reflection: e.reflection,
      }));
    }
  } catch {
    // 后端不可达时返回空列表，前端展示"暂无历史"而非报错
  }

  return NextResponse.json({ success: true, data: entries });
}

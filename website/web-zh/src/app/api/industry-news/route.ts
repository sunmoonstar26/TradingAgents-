import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const INDUSTRY = "nev";
const HISTORY_LIMIT = 14;

interface BriefingEntry {
  briefingDate: string;
  content: string;
}

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql<{ briefing_date: string | Date; content: string }[]>`
      select briefing_date, content
      from industry_briefings
      where industry = ${INDUSTRY}
      order by briefing_date desc
      limit ${HISTORY_LIMIT}
    `;

    const history: BriefingEntry[] = rows.map((r) => ({
      briefingDate:
        r.briefing_date instanceof Date
          ? r.briefing_date.toISOString().slice(0, 10)
          : r.briefing_date,
      content: r.content,
    }));

    return NextResponse.json({
      success: true,
      data: {
        latest: history[0] ?? null,
        history,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

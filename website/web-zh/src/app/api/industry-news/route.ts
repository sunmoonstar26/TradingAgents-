import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const INDUSTRY = "nev";
const HISTORY_LIMIT = 14;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface BriefingEntry {
  briefingDate: string;
  content: string;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
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

export async function POST(req: Request) {
  if (isProduction()) {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 });
  }

  try {
    const { briefingDate, content } = (await req.json()) as {
      briefingDate?: string;
      content?: string;
    };

    if (!briefingDate || !DATE_PATTERN.test(briefingDate)) {
      return NextResponse.json({ success: false, error: "Invalid briefingDate format" }, { status: 400 });
    }
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: "content is required" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      insert into industry_briefings (industry, briefing_date, content)
      values (${INDUSTRY}, ${briefingDate}, ${content})
      on conflict (industry, briefing_date) do update set content = excluded.content
    `;

    return NextResponse.json({ success: true, data: { briefingDate, content } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (isProduction()) {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 });
  }

  try {
    const { briefingDate } = (await req.json()) as { briefingDate?: string };

    if (!briefingDate || !DATE_PATTERN.test(briefingDate)) {
      return NextResponse.json({ success: false, error: "Invalid briefingDate format" }, { status: 400 });
    }

    const sql = getDb();
    await sql`delete from industry_briefings where industry = ${INDUSTRY} and briefing_date = ${briefingDate}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

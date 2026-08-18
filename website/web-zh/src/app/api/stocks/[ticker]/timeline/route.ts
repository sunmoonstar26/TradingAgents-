import { NextRequest, NextResponse } from "next/server";
import {
  getTimelineEvents,
  createTimelineEvent,
} from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getTimelineEvents(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}

export async function POST(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;

  let body;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json(
      { success: false, error: "Invalid JSON" },
      { status: 400 }
    );
  }

  const { title, description, source_url, occurred_at } = body;

  if (typeof title !== "string" || title.trim() === "") {
    return NextResponse.json(
      { success: false, error: "title must be a non-empty string" },
      { status: 400 }
    );
  }

  if (typeof occurred_at !== "string" || Number.isNaN(Date.parse(occurred_at))) {
    return NextResponse.json(
      { success: false, error: "occurred_at must be a valid date string" },
      { status: 400 }
    );
  }

  const data = await createTimelineEvent(ticker.toUpperCase(), {
    title: title.trim(),
    description:
      typeof description === "string" ? description.trim() || null : null,
    source_url:
      typeof source_url === "string" ? source_url.trim() || null : null,
    occurred_at,
  });
  return NextResponse.json({ success: true, data }, { status: 201 });
}

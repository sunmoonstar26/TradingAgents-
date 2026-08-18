import { NextRequest, NextResponse } from "next/server";
import { deleteTimelineEvent } from "@/lib/company-research";

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string; eventId: string }> }
) {
  const { ticker, eventId } = await params;

  const deleted = await deleteTimelineEvent(ticker.toUpperCase(), eventId);
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: `Timeline event not found: ${eventId}` },
      { status: 404 }
    );
  }

  return NextResponse.json({ success: true });
}

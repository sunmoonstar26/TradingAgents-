import { NextRequest, NextResponse } from "next/server";
import { getThesisHistory } from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getThesisHistory(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}

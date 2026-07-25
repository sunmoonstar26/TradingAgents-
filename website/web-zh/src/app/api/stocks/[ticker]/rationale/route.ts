import { NextRequest, NextResponse } from "next/server";
import {
  getInvestmentRationale,
  saveInvestmentRationale,
} from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getInvestmentRationale(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}

export async function PUT(
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

  const { content } = body;

  if (typeof content !== "string" || content.trim() === "") {
    return NextResponse.json(
      { success: false, error: "content must be a non-empty string" },
      { status: 400 }
    );
  }

  const data = await saveInvestmentRationale(ticker.toUpperCase(), content.trim());
  return NextResponse.json({ success: true, data });
}

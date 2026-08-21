import { NextRequest, NextResponse } from "next/server";
import {
  getBusinessEngines,
  createBusinessEngine,
  validateBusinessEngineInput,
} from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getBusinessEngines(ticker.toUpperCase());
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
    return NextResponse.json({ success: false, error: "Invalid JSON" }, { status: 400 });
  }

  const validated = validateBusinessEngineInput(body);
  if (!validated.ok) {
    return NextResponse.json({ success: false, error: validated.error }, { status: 400 });
  }

  const data = await createBusinessEngine(ticker.toUpperCase(), validated.value);
  if (!data) {
    return NextResponse.json(
      { success: false, error: `Company not found: ${ticker}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data }, { status: 201 });
}

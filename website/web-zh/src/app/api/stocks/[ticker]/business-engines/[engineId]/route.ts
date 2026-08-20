import { NextRequest, NextResponse } from "next/server";
import {
  updateBusinessEngine,
  deleteBusinessEngine,
  validateBusinessEngineInput,
} from "@/lib/company-research";

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string; engineId: string }> }
) {
  const { ticker, engineId } = await params;

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

  const data = await updateBusinessEngine(ticker.toUpperCase(), engineId, validated.value);
  if (!data) {
    return NextResponse.json(
      { success: false, error: `Engine not found: ${engineId}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true, data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string; engineId: string }> }
) {
  const { ticker, engineId } = await params;

  const deleted = await deleteBusinessEngine(ticker.toUpperCase(), engineId);
  if (!deleted) {
    return NextResponse.json(
      { success: false, error: `Engine not found: ${engineId}` },
      { status: 404 }
    );
  }
  return NextResponse.json({ success: true });
}

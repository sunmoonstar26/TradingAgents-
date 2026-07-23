import { NextResponse } from "next/server";
import { getAllCompanies } from "@/lib/company-research";

export async function GET() {
  const data = await getAllCompanies();
  return NextResponse.json({ success: true, data });
}

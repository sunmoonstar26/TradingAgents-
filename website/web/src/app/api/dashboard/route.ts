import { NextResponse } from "next/server";
import { mockDashboardData } from "../../../lib/mock-data";

export async function GET() {
  return NextResponse.json({
    success: true,
    data: mockDashboardData,
  });
}

import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { GlobalMarketState } from "../../../types";

const MARKET_FILE = join(process.cwd(), "data", "market.json");

const FALLBACK: GlobalMarketState = {
  usMarket:          { label: "US Market",      value: "—", change: null, status: "neutral" },
  hkMarket:          { label: "HK Market",      value: "—", change: null, status: "neutral" },
  cnMarket:          { label: "CN Market",      value: "—", change: null, status: "neutral" },
  vix:               { label: "VIX",            value: "—", change: null, status: "neutral" },
  aiSectorMomentum:  { label: "AI Momentum",    value: "—", change: null, status: "neutral" },
  marketRiskLevel:   { label: "Market Risk",    value: "—", change: null, status: "neutral" },
};

export async function GET() {
  try {
    if (!existsSync(MARKET_FILE)) {
      return NextResponse.json({ success: true, data: FALLBACK, source: "fallback" });
    }
    const raw = JSON.parse(readFileSync(MARKET_FILE, "utf-8"));
    return NextResponse.json({
      success: true,
      data: raw.marketState as GlobalMarketState,
      updatedAt: raw.updatedAt,
      fetchDate: raw.fetchDate,
      source: "file",
    });
  } catch {
    return NextResponse.json({ success: true, data: FALLBACK, source: "fallback" });
  }
}

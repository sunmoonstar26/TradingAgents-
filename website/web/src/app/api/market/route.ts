import { NextResponse } from "next/server";
import { readFileSync, existsSync } from "fs";
import { join } from "path";
import { GlobalMarketState } from "../../../types";

const MARKET_FILE = join(process.cwd(), "data", "market.json");

// fallback：当文件不存在或解析失败时返回 mock 数据
const FALLBACK: GlobalMarketState = {
  usMarket:          { label: "美股",       value: "—",  change: null, status: "neutral" },
  hkMarket:          { label: "港股",       value: "—",  change: null, status: "neutral" },
  cnMarket:          { label: "A 股",       value: "—",  change: null, status: "neutral" },
  vix:               { label: "VIX",        value: "—",  change: null, status: "neutral" },
  aiSectorMomentum:  { label: "AI 板块动量", value: "—", change: null, status: "neutral" },
  marketRiskLevel:   { label: "市场风险",   value: "—",  change: null, status: "neutral" },
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

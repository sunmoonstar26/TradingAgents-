"use client";

import { OpportunityEntry, AgentAlignment, ConsensusBreakdown } from "@/types";

const STORAGE_KEY = "tradingagents_radar_custom";

const EMPTY_CONSENSUS: ConsensusBreakdown = { bullish: 0, neutral: 0, bearish: 0 };

/**
 * 把任意历史/外部 consensus 表示统一成结构化对象。
 * 支持：对象（透传）、"3↑ 2— 1↓"、"4/8 看涨" / "4/8"、null/其他。
 * 旧 X/Y 格式无中性信息，按 bullish=X, bearish=Y-X 拆分。
 */
export function parseConsensus(
  input: ConsensusBreakdown | string | null | undefined,
): ConsensusBreakdown {
  if (!input) return { ...EMPTY_CONSENSUS };
  if (typeof input === "object") {
    return {
      bullish: input.bullish ?? 0,
      neutral: input.neutral ?? 0,
      bearish: input.bearish ?? 0,
    };
  }
  const triad = input.match(/(\d+)↑\s*(\d+)—\s*(\d+)↓/);
  if (triad) {
    return {
      bullish: parseInt(triad[1], 10),
      neutral: parseInt(triad[2], 10),
      bearish: parseInt(triad[3], 10),
    };
  }
  const ratio = input.match(/(\d+)\s*\/\s*(\d+)/);
  if (ratio) {
    const bull = parseInt(ratio[1], 10);
    const total = parseInt(ratio[2], 10);
    return { bullish: bull, neutral: 0, bearish: Math.max(0, total - bull) };
  }
  return { ...EMPTY_CONSENSUS };
}

/** 结构化共识 → "3↑ 2— 1↓" 字符串（写回 InvestmentMemo 等字符串字段时使用）。 */
export function formatConsensus(c: ConsensusBreakdown): string {
  return `${c.bullish}↑ ${c.neutral}— ${c.bearish}↓`;
}

export function getCustomRadarEntries(): OpportunityEntry[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw) as Array<Omit<OpportunityEntry, "consensus"> & { consensus: ConsensusBreakdown | string | null }>;
    return parsed.map((e) => ({ ...e, consensus: parseConsensus(e.consensus) }));
  } catch {
    return [];
  }
}

export function saveCustomRadarEntries(entries: OpportunityEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

export function addToRadar(entry: OpportunityEntry): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries();
  const filtered = existing.filter((e) => e.ticker !== entry.ticker);
  filtered.push(entry);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(filtered));
}

export function isInRadar(ticker: string): boolean {
  return getCustomRadarEntries().some((e) => e.ticker === ticker);
}

export function removeFromRadar(ticker: string): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries();
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing.filter((e) => e.ticker !== ticker)));
}

/** 用 StockDetail 完整结果同步雷达条目所有指标（不存在则新建） */
export function syncRadarFull(
  ticker: string,
  name: string,
  fields: {
    signal?: string;
    conviction?: number;
    risk?: "低" | "中" | "高";
    consensus?: ConsensusBreakdown;
    exposure?: string;
    agentAlignment?: AgentAlignment;
    updatedAt?: string;
  }
): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries();
  let entry = existing.find((e) => e.ticker === ticker);

  if (!entry) {
    entry = {
      ticker,
      name: name || ticker,
      signal: "持有",
      conviction: 50,
      risk: "中",
      consensus: { ...EMPTY_CONSENSUS },
      exposure: "低配",
      agentAlignment: { fundamental: false, technical: false, sentiment: false, macro: false, risk: false },
      updatedAt: new Date().toISOString(),
    };
    existing.push(entry);
  }

  if (fields.signal) entry.signal = fields.signal as OpportunityEntry["signal"];
  if (fields.conviction !== undefined) entry.conviction = fields.conviction;
  if (fields.risk) entry.risk = fields.risk;
  if (fields.consensus) entry.consensus = fields.consensus;
  if (fields.exposure) entry.exposure = fields.exposure;
  if (fields.agentAlignment) entry.agentAlignment = fields.agentAlignment;
  if (fields.updatedAt) entry.updatedAt = fields.updatedAt;

  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

export function updateRadarEntryDate(ticker: string, date: string): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries();
  const entry = existing.find((e) => e.ticker === ticker);
  if (!entry) return;
  entry.updatedAt = date;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(existing));
}

"use client";

import { OpportunityEntry, AgentAlignment, ConsensusBreakdown } from "../types";
import { Signal, RiskLevel } from "../types/enums";

const STORAGE_KEY = "tradingagents_radar_custom";
// 标记用户已主动初始化过雷达（区分"未配置"和"用户清空"）
const INITIALIZED_KEY = "tradingagents_radar_initialized";

const EMPTY_CONSENSUS: ConsensusBreakdown = { bullish: 0, neutral: 0, bearish: 0 };

/** 根据雷达中现有的 ticker 集合，裁剪其他板块的 localStorage 数据 */
export function pruneByRadarTickers(tickers: Set<string>): void {
  if (typeof window === "undefined") return;

  // Memo store
  const MEMO_KEY = "tradingagents_memo_custom";
  try {
    const raw = localStorage.getItem(MEMO_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as { ticker: string }[];
      const pruned = arr.filter((m) => tickers.has(m.ticker));
      if (pruned.length !== arr.length) localStorage.setItem(MEMO_KEY, JSON.stringify(pruned));
    }
  } catch { /* ignore */ }

  // Risk alert store
  const RISK_KEY = "tradingagents_risk_alerts";
  try {
    const raw = localStorage.getItem(RISK_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as { source?: string }[];
      const pruned = arr.filter((a) => !a.source || tickers.has(a.source));
      if (pruned.length !== arr.length) {
        localStorage.setItem(RISK_KEY, JSON.stringify(pruned));
        setTimeout(() => window.dispatchEvent(new Event("ta_risk_change")), 0);
      }
    }
  } catch { /* ignore */ }

  // Live feed store
  const FEED_KEY = "tradingagents_livefeed";
  try {
    const raw = localStorage.getItem(FEED_KEY);
    if (raw) {
      const arr = JSON.parse(raw) as { ticker?: string }[];
      const pruned = arr.filter((f) => !f.ticker || f.ticker === "—" || tickers.has(f.ticker));
      if (pruned.length !== arr.length) {
        localStorage.setItem(FEED_KEY, JSON.stringify(pruned));
        setTimeout(() => window.dispatchEvent(new Event("ta_feed_change")), 0);
      }
    }
  } catch { /* ignore */ }
}

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

/** 返回用户自定义的雷达条目；null 表示用户从未初始化（应回退到 API 数据） */
export function getCustomRadarEntries(): OpportunityEntry[] | null {
  if (typeof window === "undefined") return null;
  try {
    if (!localStorage.getItem(INITIALIZED_KEY)) return null;
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = (raw ? JSON.parse(raw) : []) as Array<Omit<OpportunityEntry, "consensus"> & { consensus: ConsensusBreakdown | string | null }>;
    return parsed.map((e) => ({ ...e, consensus: parseConsensus(e.consensus) }));
  } catch {
    return null;
  }
}

/** 用户是否已主动初始化过雷达 */
export function hasCustomRadarEntries(): boolean {
  if (typeof window === "undefined") return false;
  return localStorage.getItem(INITIALIZED_KEY) !== null;
}

export function saveCustomRadarEntries(entries: OpportunityEntry[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(INITIALIZED_KEY, "1");
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));

  // 雷达变更后，裁剪其他板块中不再属于雷达的股票
  const tickers = new Set(entries.map((e) => e.ticker));
  pruneByRadarTickers(tickers);
  // setTimeout(0) 保证事件在当前渲染帧结束后才触发，避免 React 报 setState-in-render 错误
  setTimeout(() => {
    window.dispatchEvent(new Event("ta_memo_change"));
    window.dispatchEvent(new Event("ta_radar_change"));
  }, 0);
}

export function addToRadar(entry: OpportunityEntry): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries() ?? [];
  const filtered = existing.filter((e) => e.ticker !== entry.ticker);
  filtered.push(entry);
  saveCustomRadarEntries(filtered);
}

export function isInRadar(ticker: string): boolean {
  const entries = getCustomRadarEntries();
  if (!entries) return false;
  return entries.some((e) => e.ticker === ticker);
}

export function removeFromRadar(ticker: string): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries() ?? [];
  saveCustomRadarEntries(existing.filter((e) => e.ticker !== ticker));
}

/** 用 StockDetail 完整结果同步雷达条目所有指标（不存在则新建） */
export function syncRadarFull(
  ticker: string,
  name: string,
  fields: {
    signal?: string;
    conviction?: number;
    risk?: RiskLevel;
    consensus?: ConsensusBreakdown;
    exposure?: string;
    agentAlignment?: AgentAlignment;
    updatedAt?: string;
  }
): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries() ?? [];
  let entry = existing.find((e) => e.ticker === ticker);

  if (!entry) {
    entry = {
      ticker,
      name: name || ticker,
      signal: Signal.HOLD,
      conviction: 50,
      risk: RiskLevel.MEDIUM,
      consensus: { ...EMPTY_CONSENSUS },
      exposure: "Underweight",
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

  saveCustomRadarEntries(existing);
  // 通知所有监听方（首页雷达）刷新
  window.dispatchEvent(new Event("ta_radar_change"));
}

export function updateRadarEntryDate(ticker: string, date: string): void {
  if (typeof window === "undefined") return;
  const existing = getCustomRadarEntries() ?? [];
  const entry = existing.find((e) => e.ticker === ticker);
  if (!entry) return;
  entry.updatedAt = date;
  saveCustomRadarEntries(existing);
}

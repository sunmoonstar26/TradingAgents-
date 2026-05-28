"use client";

import { InvestmentMemo, OpportunityEntry } from "@/types";
import { formatConsensus } from "@/lib/radar-store";

const STORAGE_KEY = "tradingagents_memo_custom";

/** 从 localStorage 读取用户自定义备忘录条目 */
export function getCustomMemoEntries(): InvestmentMemo[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as InvestmentMemo[];
  } catch {
    return [];
  }
}

/** 首次加载时用 API 数据初始化 localStorage（仅在 localStorage 为空时写入） */
export function seedMemosFromApi(memos: InvestmentMemo[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY)) return; // 已有数据，不覆盖
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

/** 批量保存全部备忘录条目 */
export function saveCustomMemoEntries(entries: InvestmentMemo[]): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(entries));
}

/**
 * 用雷达分析结果同步更新备忘录中对应股票。
 * 覆盖信号/置信度/共识/智能体对齐/仓位等分析相关字段，
 * 保留备忘录独有的 keyDriver / primaryRisk / timeHorizon。
 */
export function syncMemoFromRadar(radarEntry: OpportunityEntry): void {
  if (typeof window === "undefined") return;
  const memos = getCustomMemoEntries();
  const idx = memos.findIndex((m) => m.ticker === radarEntry.ticker);
  if (idx === -1) return; // 备忘录中没有这只股票，不操作

  const existing = memos[idx];
  memos[idx] = {
    ...existing,
    signal: radarEntry.signal,
    conviction: radarEntry.conviction,
    consensus: formatConsensus(radarEntry.consensus),
    exposure: radarEntry.exposure,
    agentAlignment: { ...radarEntry.agentAlignment },
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
}

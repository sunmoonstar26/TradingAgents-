"use client";

import { InvestmentMemo, OpportunityEntry } from "../types";
import { formatConsensus } from "../lib/radar-store";

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

/** 检查条目是否为默认占位符状态（用户未真正编辑过） */
function isUninitialized(entries: InvestmentMemo[]): boolean {
  if (entries.length === 0) return true;
  return entries.every(
    (m) => m.keyDriver === "—" && m.primaryRisk === "—" && m.timeHorizon === "—"
  );
}

/** 首次加载时用 API 数据初始化 localStorage；若存量数据全为占位符也重新写入。返回是否实际写入 */
export function seedMemosFromApi(memos: InvestmentMemo[]): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const existing = JSON.parse(raw) as InvestmentMemo[];
      if (!isUninitialized(existing)) return false; // 用户有真实数据，不覆盖
    } catch {
      // 解析失败则覆盖
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  return true;
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

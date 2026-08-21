"use client";

import { InvestmentMemo, OpportunityEntry } from "../types";
import { Signal } from "../types/enums";
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

/** 用户是否已真实编辑过备忘录（有任意一条非占位符内容） */
export function hasUserEditedMemos(): boolean {
  const entries = getCustomMemoEntries();
  return !isUninitialized(entries);
}

/** 从雷达条目构建占位 InvestmentMemo（保留分析字段，文本字段用 "—"） */
export function buildMemosFromRadar(radarEntries: OpportunityEntry[]): InvestmentMemo[] {
  return radarEntries.slice(0, 8).map((e) => ({
    ticker: e.ticker,
    name: e.name,
    signal: e.signal as Signal,
    conviction: e.conviction,
    agentAlignment: { ...e.agentAlignment },
    consensus: formatConsensus(e.consensus),
    exposure: e.exposure ?? "—",
    keyDriver: "—",
    primaryRisk: "—",
    timeHorizon: "—",
  }));
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

/** 判断字符串是否主要为英文（ASCII 字母占比超过 40%） */
function isEnglishContent(text: string): boolean {
  if (!text || text === "—") return false;
  const total = text.length;
  const asciiAlpha = text.split("").filter(c => /[a-zA-Z]/.test(c)).length;
  return asciiAlpha / total > 0.4;
}

/**
 * 用 insights 数据更新备忘录中对应股票的 keyDriver / primaryRisk / timeHorizon。
 * 覆盖条件：当前值为 "—"，或当前值主要是英文（旧版数据残留）。
 */
export function syncMemoFromInsights(
  ticker: string,
  keyDriver: string,
  primaryRisk: string,
  timeHorizon?: string,
): void {
  if (typeof window === "undefined") return;
  const memos = getCustomMemoEntries();
  const idx = memos.findIndex((m) => m.ticker === ticker);
  if (idx === -1) return;
  const existing = memos[idx];

  const shouldUpdate = (current: string, newVal: string) =>
    !!newVal && (current === "—" || isEnglishContent(current));

  memos[idx] = {
    ...existing,
    keyDriver:   shouldUpdate(existing.keyDriver,   keyDriver)   ? keyDriver   : existing.keyDriver,
    primaryRisk: shouldUpdate(existing.primaryRisk, primaryRisk) ? primaryRisk : existing.primaryRisk,
    timeHorizon: shouldUpdate(existing.timeHorizon, timeHorizon ?? "") && timeHorizon ? timeHorizon : existing.timeHorizon,
  };
  localStorage.setItem(STORAGE_KEY, JSON.stringify(memos));
  window.dispatchEvent(new Event("ta_memo_change"));
}

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

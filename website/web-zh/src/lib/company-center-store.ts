"use client";

const STORAGE_KEY = "tradingagents_company_center_hidden";

function readHiddenSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed.map((t) => t.toUpperCase()));
  } catch {
    return new Set();
  }
}

function writeHiddenSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/** 当前被隐藏（从公司研究档案展示区移除，但未删除任何数据）的 ticker 列表 */
export function getHiddenTickers(): string[] {
  return [...readHiddenSet()];
}

export function hideTicker(ticker: string): void {
  const set = readHiddenSet();
  set.add(ticker.toUpperCase());
  writeHiddenSet(set);
}

export function unhideTicker(ticker: string): void {
  const set = readHiddenSet();
  set.delete(ticker.toUpperCase());
  writeHiddenSet(set);
}

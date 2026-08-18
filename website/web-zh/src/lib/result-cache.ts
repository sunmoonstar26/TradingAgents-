import { StockDetail } from "../types";

const completedResults = new Map<string, StockDetail>();
const analyzingTickers = new Set<string>();

export function cacheStockResult(ticker: string, detail: StockDetail): void {
  const key = ticker.toUpperCase();
  completedResults.set(key, detail);
  analyzingTickers.delete(key);
}

export function getCachedStockResult(ticker: string): StockDetail | undefined {
  return completedResults.get(ticker.toUpperCase());
}

export function getCachedTickers(): string[] {
  return Array.from(completedResults.keys());
}

export function invalidateStockResult(ticker: string): void {
  completedResults.delete(ticker.toUpperCase());
}

export function markAnalyzing(ticker: string): void {
  analyzingTickers.add(ticker.toUpperCase());
}

export function clearAnalyzing(ticker: string): void {
  analyzingTickers.delete(ticker.toUpperCase());
}

export function isAnalyzing(ticker: string): boolean {
  return analyzingTickers.has(ticker.toUpperCase());
}

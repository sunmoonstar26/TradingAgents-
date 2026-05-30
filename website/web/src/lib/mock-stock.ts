import { StockDetail } from "../types";
import { getCachedStockResult } from "../lib/result-cache";
import { mapTAResultToStockDetail, TARawResult } from "../lib/ta-mapper";
import fs from "fs";
import path from "path";

/**
 * 读取并返回某 ticker 的最新分析结果。
 * 优先级:
 *   1) result-cache 内存缓存（completeSession 时写入）
 *   2) data/analysis_results 中按 mtime 排序最新含 ticker 的 sess_*.json
 * 没有任何分析结果 → 返回 null（前端会显示"启动 AI 分析"）。
 *
 * 旧版本里 NVDA/TSLA/LI 走硬编码 makeXxx()，导致真实分析永远拿不到。已删除。
 */
export function getStockDetail(ticker: string): StockDetail | null {
  const key = ticker.toUpperCase();

  const cached = getCachedStockResult(key);
  if (cached) return cached;

  const taResult = getLatestTAResult(key);
  if (taResult) return taResult;

  return null;
}

function getLatestTAResult(ticker: string): StockDetail | null {
  try {
    const resultsDir = path.resolve(process.cwd(), "data/analysis_results");
    if (!fs.existsSync(resultsDir)) return null;

    const tickerLower = ticker.toLowerCase();
    const files = fs
      .readdirSync(resultsDir)
      .filter((f: string) => f.endsWith(".json") && f.toLowerCase().includes(`_${tickerLower}_`));
    if (files.length === 0) return null;

    const sorted = files
      .map((f: string) => ({
        name: f,
        time: fs.statSync(path.join(resultsDir, f)).mtimeMs,
      }))
      .sort((a, b) => b.time - a.time);

    for (const { name } of sorted) {
      try {
        const raw = JSON.parse(
          fs.readFileSync(path.join(resultsDir, name), "utf-8")
        ) as TARawResult & { status?: string; error?: string };
        if (raw.status === "failed" || raw.error) continue;
        return mapTAResultToStockDetail(raw);
      } catch {
        continue;
      }
    }
    return null;
  } catch {
    return null;
  }
}

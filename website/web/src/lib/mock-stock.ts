import { StockDetail } from "../types";
import { getCachedStockResult } from "../lib/result-cache";
import { mapTAResultToStockDetail, TARawResult } from "../lib/ta-mapper";
import fs from "fs";
import path from "path";

/**
 * 读取并返回某 ticker 的最新分析结果。
 * 优先级:
 *   1) result-cache 内存缓存（completeSession 时写入）
 *   2) api-server/data/analysis_results 中按文件名时间戳排序最新的 sess_*.json
 *   3) data/analysis_results 中按 mtime 排序最新含 ticker 的 sess_*.json（兼容旧路径）
 * 没有任何分析结果 → 返回 null（前端会显示"启动 AI 分析"）。
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
  const tickerLower = ticker.toLowerCase();

  // 搜索目录列表，优先 api-server 目录
  const searchDirs = [
    path.resolve(process.cwd(), "..", "api-server", "data", "analysis_results"),
    path.resolve(process.cwd(), "data", "analysis_results"),
  ];

  // 收集所有候选文件（跨两个目录），按文件名时间戳排序取最新
  const candidates: { file: string; key: string }[] = [];

  for (const dir of searchDirs) {
    if (!fs.existsSync(dir)) continue;
    for (const name of fs.readdirSync(dir)) {
      if (!name.endsWith(".json")) continue;
      const match = name.match(/^sess_([a-z0-9]+)_(\d{8}_\d+)\.json$/i);
      if (!match || match[1].toLowerCase() !== tickerLower) continue;
      candidates.push({ file: path.join(dir, name), key: match[2] });
    }
  }

  if (candidates.length === 0) return null;

  // 按时间戳字符串降序（YYYYMMDD_NNN 字典序即时间序）
  candidates.sort((a, b) => b.key.localeCompare(a.key));

  for (const { file } of candidates) {
    try {
      const raw = JSON.parse(
        fs.readFileSync(file, "utf-8")
      ) as TARawResult & { status?: string; error?: string };
      if (raw.status === "failed" || raw.error) continue;
      return mapTAResultToStockDetail(raw);
    } catch {
      continue;
    }
  }
  return null;
}


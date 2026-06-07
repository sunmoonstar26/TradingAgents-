// 内存中的分析会话存储
// 通过 HTTP 调用 FastAPI 后端（PYTHON_BACKEND_URL）触发分析
import {
  AnalysisMode,
  AnalysisProgress,
  AnalysisSession,
  Market,
} from "../types";
import {
  cacheStockResult,
  invalidateStockResult,
  markAnalyzing,
  clearAnalyzing,
} from "../lib/result-cache";
import { mapTAResultToStockDetail, TARawResult } from "../lib/ta-mapper";

const sessions = new Map<string, AnalysisSession>();
const activeByTicker = new Map<string, string>();
const processStarted = new Set<string>();

const BACKEND_URL =
  process.env.PYTHON_BACKEND_URL ?? "http://localhost:8000";

function defaultProgress(): AnalysisProgress {
  return {
    fundamental: "waiting",
    technical: "waiting",
    sentiment: "waiting",
    macro: "waiting",
    news: "waiting",
    risk: "waiting",
    report: "waiting",
  };
}

function generateSessionId(ticker: string): string {
  const now = new Date();
  const date = now.toISOString().slice(0, 10).replace(/-/g, "");
  const seq = String(sessions.size + 1).padStart(3, "0");
  return `sess_${ticker.toLowerCase()}_${date}_${seq}`;
}

export function createSession(
  ticker: string,
  market: Market,
  mode: AnalysisMode
): AnalysisSession {
  const tickerUpper = ticker.toUpperCase();
  const existing = getActiveSessionByTicker(tickerUpper);
  if (existing) return existing;

  const session_id = generateSessionId(ticker);
  const session: AnalysisSession = {
    session_id,
    ticker: tickerUpper,
    status: "running",
    mode,
    market,
    created_at: new Date().toISOString(),
    completed_at: null,
    progress: defaultProgress(),
    result_json: null,
    current_step: "Queued",
    error_message: null,
  };
  sessions.set(session_id, session);
  activeByTicker.set(tickerUpper, session_id);
  invalidateStockResult(tickerUpper);
  markAnalyzing(tickerUpper);
  return session;
}

export function getSession(session_id: string): AnalysisSession | undefined {
  return sessions.get(session_id);
}

export function getActiveSessionByTicker(ticker: string): AnalysisSession | undefined {
  const sid = activeByTicker.get(ticker.toUpperCase());
  if (!sid) return undefined;
  const s = sessions.get(sid);
  if (!s) return undefined;
  if (s.status === "completed" || s.status === "failed") return undefined;
  return s;
}

export function updateSessionProgress(
  session_id: string,
  progress: Partial<AnalysisProgress>
): void {
  const session = sessions.get(session_id);
  if (session) {
    session.progress = { ...session.progress, ...progress };
  }
}

export function completeSession(session_id: string, result_json: string): void {
  const session = sessions.get(session_id);
  if (!session) return;

  session.status = "completed";
  session.completed_at = new Date().toISOString();
  session.result_json = result_json;
  for (const k of Object.keys(session.progress) as (keyof AnalysisProgress)[]) {
    session.progress[k] = "completed";
  }

  try {
    const raw = JSON.parse(result_json) as TARawResult;
    const detail = mapTAResultToStockDetail(raw);
    cacheStockResult(session.ticker, detail);
  } catch (e) {
    console.error(`[TradingAgents] 映射结果失败 ${session_id}:`, e);
    clearAnalyzing(session.ticker);
  }

  if (activeByTicker.get(session.ticker) === session_id) {
    activeByTicker.delete(session.ticker);
  }
}

export function failSession(session_id: string, reason?: string): void {
  const session = sessions.get(session_id);
  if (!session) return;
  session.status = "failed";
  session.completed_at = new Date().toISOString();
  if (reason) session.error_message = reason;
  clearAnalyzing(session.ticker);
  if (activeByTicker.get(session.ticker) === session_id) {
    activeByTicker.delete(session.ticker);
  }
}

function simulateProgress(session_id: string) {
  const AGENTS = ["fundamental", "technical", "sentiment", "macro", "news", "risk"] as const;
  const session = sessions.get(session_id);
  if (!session) return;

  let idx = 0;
  const step = () => {
    const s = sessions.get(session_id);
    if (!s || s.status === "completed" || s.status === "failed") return;

    if (idx < AGENTS.length) {
      if (idx > 0) s.progress[AGENTS[idx - 1]] = "completed";
      s.progress[AGENTS[idx]] = "running";
      idx++;
      setTimeout(step, 2000 + Math.random() * 2000);
    } else {
      for (const agent of AGENTS) s.progress[agent] = "completed";
      s.progress.report = "running";
    }
  };
  setTimeout(step, 1000);
}

export function startRealAnalysis(
  session_id: string,
  ticker: string,
  market: string
): void {
  const session = sessions.get(session_id);
  if (!session) return;
  if (processStarted.has(session_id)) return;
  processStarted.add(session_id);

  const now = new Date();
  const analysisDate = new Date(now.getTime() - 86400000)
    .toISOString()
    .slice(0, 10);

  const outputPath = `data/analysis_results/${session_id}.json`;

  simulateProgress(session_id);

  fetch(`${BACKEND_URL}/health`)
    .then((r) => {
      if (!r.ok) throw new Error(`health check failed: ${r.status}`);
    })
    .then(() =>
      fetch(`${BACKEND_URL}/analysis/start`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          date: analysisDate,
          market,
          session_id,
          output_path: outputPath,
        }),
      })
    )
    .then((r) => r.json())
    .then(() => {
      console.log(`[TradingAgents] 后端已接受分析请求: ${session_id}`);
      pollForResult(session_id, ticker);
    })
    .catch((err: unknown) => {
      const msg =
        err instanceof Error ? err.message : String(err);
      console.error(`[TradingAgents] 后端连接失败:`, msg);
      failSession(
        session_id,
        `Python backend not available (${BACKEND_URL}): ${msg}`
      );
    });
}

function pollForResult(session_id: string, ticker: string) {
  let attempts = 0;
  const maxAttempts = 120;

  const check = async () => {
    attempts++;
    if (attempts > maxAttempts) {
      failSession(session_id, "Analysis timed out (10 minutes)");
      return;
    }

    try {
      const res = await fetch(`${BACKEND_URL}/analysis/${session_id}`);
      if (!res.ok) {
        setTimeout(check, 5000);
        return;
      }
      const data = await res.json();

      const s = sessions.get(session_id);
      if (s) {
        if (data.current_step) s.current_step = data.current_step;
        if (data.progress) {
          s.progress = { ...s.progress, ...data.progress };
        }
      }

      if (data.status === "failed") {
        failSession(session_id, data.error ?? "Analysis failed");
        return;
      }

      if (data.status === "completed" && data.result) {
        completeSession(session_id, JSON.stringify(data.result));
        console.log(`[TradingAgents] 完成: ${ticker} ${session_id}`);
        return;
      }

      setTimeout(check, 5000);
    } catch {
      setTimeout(check, 5000);
    }
  };

  setTimeout(check, 2000);
}

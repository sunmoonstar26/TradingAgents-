// 内存中的分析会话存储
// 调用真实 TradingAgents Python 子进程
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
import { exec } from "child_process";
import path from "path";
import fs from "fs";

const sessions = new Map<string, AnalysisSession>();
const activeByTicker = new Map<string, string>();
const processStarted = new Set<string>(); // session_id → Python 进程已启动

const WEB_DIR = process.cwd();
const LAUNCH_SCRIPT = path.resolve(WEB_DIR, "..", "scripts", "launch_analysis.sh");

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

  // 同 ticker 已有进行中的 session，直接复用，不重复启动分析进程
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
      if (idx > 0) {
        s.progress[AGENTS[idx - 1]] = "completed";
      }
      s.progress[AGENTS[idx]] = "running";
      idx++;
      setTimeout(step, 2000 + Math.random() * 2000);
    } else {
      for (const agent of AGENTS) {
        s.progress[agent] = "completed";
      }
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

  // 幂等：同一 session 不重复启动 Python 进程
  if (processStarted.has(session_id)) return;
  processStarted.add(session_id);

  const now = new Date();
  const analysisDate = new Date(now.getTime() - 86400000).toISOString().slice(0, 10);
  const outputDir = path.resolve(WEB_DIR, "data/analysis_results");
  const outputFile = path.join(outputDir, `${session_id}.json`);

  try {
    fs.mkdirSync(outputDir, { recursive: true });
  } catch {}

  simulateProgress(session_id);

  const cmd = `bash "${LAUNCH_SCRIPT}" "${ticker}" "${analysisDate}" "${market}" "${outputFile}"`;
  console.log(`[TradingAgents] 启动: ${cmd}`);

  exec(cmd, { cwd: path.resolve(WEB_DIR, "..") }, (error, stdout, stderr) => {
    if (stdout) console.log(`[TradingAgents] stdout: ${stdout}`);
    if (stderr) console.error(`[TradingAgents] stderr: ${stderr}`);

    if (error) {
      console.warn(`[TradingAgents] launch_analysis.sh 非零退出（可能是 disown 信号，检查 log 文件）:`, error.message);
      // disown / nohup 在 macOS 下有时让 bash 以非 0 退出，但 Python 进程已在后台运行
      // 只有在 log 文件也不存在时才真正失败
      const logFile = outputFile + ".log";
      if (!fs.existsSync(logFile)) {
        failSession(session_id, `启动失败: ${error.message}`);
        return;
      }
      console.log(`[TradingAgents] log 文件存在，继续轮询...`);
    }

    pollForResult(session_id, outputFile, ticker);
  });
}

function readLogStep(outputFile: string): { step: string; message: string } | null {
  const logFile = outputFile + ".log";
  try {
    if (!fs.existsSync(logFile)) return null;
    const content = fs.readFileSync(logFile, "utf-8");
    const lines = content.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const obj = JSON.parse(lines[i]);
        if (obj.type === "status" && obj.step) {
          return { step: obj.step, message: obj.message || "" };
        }
        if (obj.type === "warning") {
          return { step: "warning", message: obj.message || "" };
        }
        if (obj.type === "error") {
          return { step: "error", message: obj.message || "" };
        }
        if (obj.type === "env_check") {
          return { step: "env_check", message: obj.message || "" };
        }
      } catch { continue; }
    }
  } catch {}
  return null;
}

function stepToMessage(step: string, rawMessage: string): string {
  const MAP: Record<string, string> = {
    init: "Initializing analysis engine",
    started: "Launching multi-agent analysis",
    running: "Agents analyzing",
    completed: "Agents done, generating report",
    extracting_insights: "Extracting AI insights",
    insights_ready: "Insights ready, writing report",
    env_check: rawMessage,
    warning: rawMessage,
    error: rawMessage,
  };
  return MAP[step] || rawMessage || step;
}

function pollForResult(session_id: string, outputFile: string, ticker: string) {
  let attempts = 0;
  const maxAttempts = 120;

  const check = () => {
    attempts++;
    if (attempts > maxAttempts) {
      const lastStep = readLogStep(outputFile);
      const detail = lastStep ? `（最后阶段：${stepToMessage(lastStep.step, lastStep.message)}）` : "";
      const reason = `分析超时（10 分钟未返回）${detail}`;
      console.error(`[TradingAgents] 超时: ${ticker} ${detail}`);
      failSession(session_id, reason);
      return;
    }

    const logStep = readLogStep(outputFile);
    if (logStep) {
      const s = sessions.get(session_id);
      if (s) {
        s.current_step = stepToMessage(logStep.step, logStep.message);
      }
    }

    try {
      if (fs.existsSync(outputFile)) {
        const raw = fs.readFileSync(outputFile, "utf-8");
        if (raw.trim()) {
          const result = JSON.parse(raw);
          if (result.status === "failed" || result.error) {
            const reason = result.error || "Analysis process returned a failure status";
            failSession(session_id, reason);
            console.error(`[TradingAgents] 会话 ${session_id} 失败: ${reason}`);
            return;
          }
          completeSession(session_id, JSON.stringify(result));
          console.log(`[TradingAgents] 会话 ${session_id} 完成, 信号: ${result.signal}`);
          return;
        }
      }
    } catch {
      // 文件还在写入中，继续轮询
    }

    const logFile = outputFile + ".log";
    try {
      if (fs.existsSync(logFile)) {
        const logContent = fs.readFileSync(logFile, "utf-8");
        if (logContent.includes('"step": "completed"')) {
          setTimeout(() => check(), 1000);
          return;
        }
      }
    } catch {}

    setTimeout(check, 5000);
  };

  setTimeout(check, 2000);
}

"use client";

import { useEffect, useRef } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Cpu, Loader2, AlertTriangle, ArrowLeft } from "lucide-react";
import { findStock } from "@/data/stocks";

interface SessionStatusResponse {
  success: boolean;
  data?: {
    session_id: string;
    ticker: string;
    status: "pending" | "running" | "completed" | "failed";
    progress: Record<string, "waiting" | "running" | "completed">;
    current_step: string | null;
    error_message: string | null;
    created_at: string;
    completed_at: string | null;
  };
}

const AGENT_LABELS: Record<string, string> = {
  fundamental: "基本面",
  technical: "技术面",
  sentiment: "情绪面",
  macro: "宏观",
  news: "新闻",
  risk: "风控",
  report: "综合报告",
};

interface Props {
  ticker: string;
  sessionId: string;
  /** 完成后要 invalidate 的 react-query keys（默认 ["stock", ticker]）*/
  invalidateKeys?: readonly unknown[][];
  /** 子页面里使用时，让骨架更紧凑 */
  compact?: boolean;
}

/**
 * 分析进行中的占位面板。
 * 轮询 /api/analysis/{sessionId}，状态变 completed 时自动 invalidate 调用方的 query
 * 让上层组件 refetch 真实数据 → 切回正常 UI。
 */
export function AnalyzingState({ ticker, sessionId, invalidateKeys, compact }: Props) {
  const qc = useQueryClient();
  const finishedRef = useRef(false);
  const stockInfo = findStock(ticker);
  const displayName = stockInfo?.name ?? ticker;

  const { data } = useQuery<SessionStatusResponse>({
    queryKey: ["analysis-session", sessionId],
    queryFn: () =>
      fetch(`/api/analysis/${sessionId}`).then((r) => r.json()),
    refetchInterval: 3000,
    refetchIntervalInBackground: true,
  });

  const session = data?.data;
  const status = session?.status;

  useEffect(() => {
    if (finishedRef.current) return;
    if (status !== "completed" && status !== "failed") return;
    finishedRef.current = true;

    const keys = invalidateKeys ?? [["stock", ticker]];
    keys.forEach((key) => {
      qc.invalidateQueries({ queryKey: key });
    });
  }, [status, qc, ticker, invalidateKeys]);

  const progress = session?.progress ?? {};
  const completedCount = Object.values(progress).filter((v) => v === "completed").length;
  const total = Object.keys(progress).length || 7;
  const pct = Math.round((completedCount / total) * 100);

  const isFailed = status === "failed";

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[75vh] px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.4 }}
          className="max-w-lg w-full"
        >
          <div className="text-center mb-6">
            <button
              onClick={() => window.history.back()}
              className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]/50 hover:text-[var(--text-secondary)] transition-colors font-mono mb-6"
            >
              <ArrowLeft className="w-3 h-3" />
              返回
            </button>
            <div className="mb-4 flex justify-center">
              <motion.div
                animate={isFailed ? {} : { rotate: [0, 360] }}
                transition={isFailed ? {} : { duration: 8, repeat: Infinity, ease: "linear" }}
                className={`w-16 h-16 rounded-2xl flex items-center justify-center border ${
                  isFailed
                    ? "bg-[var(--red)]/10 border-[var(--red)]/30"
                    : "bg-[var(--blue)]/10 border-[var(--blue)]/20"
                }`}
              >
                {isFailed ? (
                  <AlertTriangle className="w-8 h-8 text-[var(--red)]" />
                ) : (
                  <Cpu className="w-8 h-8 text-[var(--blue)]" />
                )}
              </motion.div>
            </div>
            <h1 className="text-xl font-bold text-[var(--text-primary)] mb-1">
              {ticker} <span className="text-[var(--text-secondary)] font-normal">{displayName}</span>
            </h1>
            <p className="text-sm text-[var(--text-secondary)] mb-1">
              {isFailed ? "本次分析失败" : "AI 投资委员会正在重新分析"}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-secondary)]/50">
              {isFailed
                ? "请稍后重试，或检查数据源 / API key 配置"
                : "完成后此页面将自动刷新为最新结果"}
            </p>
          </div>

          {!isFailed && (
            <>
              <div className="w-full h-1.5 rounded-full bg-[var(--panel2)] overflow-hidden mb-3">
                <motion.div
                  className="h-full bg-[var(--blue)]"
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.5 }}
                />
              </div>
              <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-4">
                <span className="flex items-center gap-1.5">
                  <Loader2 className="w-3 h-3 animate-spin text-[var(--blue)]" />
                  {session?.current_step || "排队中"}
                </span>
                <span>{completedCount}/{total}</span>
              </div>
            </>
          )}

          {isFailed && session?.error_message && (
            <div className="card-terminal p-4 text-[11px] text-[var(--red)]/80 font-mono leading-relaxed">
              {session.error_message}
            </div>
          )}

          {!isFailed && !compact && (
            <div className="card-terminal p-4">
              <ul className="space-y-2 text-[11px] font-mono">
                {Object.entries(AGENT_LABELS).map(([key, label]) => {
                  const s = progress[key] ?? "waiting";
                  const color =
                    s === "completed"
                      ? "text-[var(--green)]"
                      : s === "running"
                      ? "text-[var(--blue)]"
                      : "text-[var(--text-secondary)]/40";
                  const symbol =
                    s === "completed" ? "✓" : s === "running" ? "▸" : "·";
                  return (
                    <li key={key} className={`flex items-center gap-2 ${color}`}>
                      <span className="w-3 inline-block">{symbol}</span>
                      <span>{label}</span>
                    </li>
                  );
                })}
              </ul>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

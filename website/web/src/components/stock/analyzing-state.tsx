"use client";

import { useEffect, useRef, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Header } from "../../components/layout/header";
import { Cpu, Loader2, AlertTriangle, ArrowLeft, FileText } from "lucide-react";
import { findStock } from "../../data/stocks";
import { useTranslations } from "next-intl";

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
  fundamental: "agentLabelFundamental",
  technical: "agentLabelTechnical",
  sentiment: "agentLabelSentiment",
  news: "agentLabelNews",
  risk: "agentLabelRisk",
};

// report 单独展示，不参与 6 个智能体的进度计算
const AGENT_KEYS = ["fundamental", "technical", "sentiment", "news", "risk"];

interface Props {
  ticker: string;
  sessionId: string;
  invalidateKeys?: readonly unknown[][];
  compact?: boolean;
}

/** 不定长动画进度条（indeterminate）— 用于耗时不确定的阶段 */
function IndeterminateBar() {
  return (
    <div className="w-full h-1.5 rounded-full bg-[var(--panel2)] overflow-hidden relative">
      <motion.div
        className="absolute h-full w-1/3 rounded-full bg-[var(--blue)]"
        animate={{ x: ["0%", "300%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ left: "-33%" }}
      />
    </div>
  );
}

export function AnalyzingState({ ticker, sessionId, invalidateKeys, compact }: Props) {
  const t = useTranslations("stockComponents");
  const qc = useQueryClient();
  const finishedRef = useRef(false);
  const stockInfo = findStock(ticker);
  const displayName = stockInfo?.name ?? ticker;

  // 记录 report 开始运行的时间，用于显示已用时
  const reportStartRef = useRef<number | null>(null);
  const [reportElapsed, setReportElapsed] = useState(0);

  const { data } = useQuery<SessionStatusResponse>({
    queryKey: ["analysis-session", sessionId],
    queryFn: () =>
      fetch(`/api/analysis/${sessionId}`).then((r) => r.json()),
    refetchInterval: (query) => {
      const d = query.state.data as SessionStatusResponse | undefined;
      if (!d?.success) return false;
      const s = d?.data?.status;
      if (s === "completed" || s === "failed") return false;
      return 3000;
    },
    refetchIntervalInBackground: true,
  });

  const session = data?.data;
  const status = session?.status;
  const progress = session?.progress ?? {};

  const reportStatus = progress["report"] ?? "waiting";
  const isReportRunning = reportStatus === "running";
  const isReportDone = reportStatus === "completed";

  // 记录 report 开始时间
  useEffect(() => {
    if (isReportRunning && reportStartRef.current === null) {
      reportStartRef.current = Date.now();
    }
  }, [isReportRunning]);

  // 每秒更新已用时
  useEffect(() => {
    if (!isReportRunning) return;
    const id = setInterval(() => {
      if (reportStartRef.current) {
        setReportElapsed(Math.floor((Date.now() - reportStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isReportRunning]);

  useEffect(() => {
    if (finishedRef.current) return;
    if (status !== "completed" && status !== "failed") return;
    finishedRef.current = true;
    const keys = invalidateKeys ?? [["stock", ticker]];
    keys.forEach((key) => qc.invalidateQueries({ queryKey: key }));
  }, [status, qc, ticker, invalidateKeys]);

  // 只统计前 6 个智能体
  const completedCount = AGENT_KEYS.filter((k) => progress[k] === "completed").length;
  const total = AGENT_KEYS.length;
  const pct = Math.round((completedCount / total) * 100);

  const isFailed = status === "failed";
  const allAgentsDone = completedCount >= total;

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
              {t("back")}
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
              {isFailed ? t("analysisFailedShort") : t("aiAnalyzing")}
            </p>
            <p className="text-[10px] font-mono text-[var(--text-secondary)]/50">
              {isFailed
                ? t("failedRetry")
                : t("autoRefresh")}
            </p>
          </div>

          {!isFailed && (
            <>
              {/* ── 阶段一：6 个智能体进度条 ── */}
              {!allAgentsDone ? (
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
                      {session?.current_step || t("agentAnalyzingStep")}
                    </span>
                    <span>{t("agentsCountLabel", { completed: completedCount, total })}</span>
                  </div>
                </>
              ) : (
                /* ── 阶段二：综合报告（indeterminate）── */
                <>
                  <IndeterminateBar />
                  <div className="flex items-center justify-between text-[10px] font-mono text-[var(--text-secondary)] mb-4 mt-3">
                    <span className="flex items-center gap-1.5">
                      <FileText className="w-3 h-3 text-[var(--blue)]" />
                      {isReportDone ? t("reportGenerated") : t("generatingReport")}
                    </span>
                    {isReportRunning && reportElapsed > 0 && (
                      <span className="text-[var(--text-secondary)]/40">
                        {t("reportElapsedLabel", { elapsed: reportElapsed })}
                      </span>
                    )}
                    {!isReportRunning && !isReportDone && (
                      <span className="text-[var(--text-secondary)]/40">{t("waitingGenerate")}</span>
                    )}
                  </div>
                </>
              )}
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
                {AGENT_KEYS.map((key) => {
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
                      <span>{t(AGENT_LABELS[key] as Parameters<typeof t>[0])}</span>
                    </li>
                  );
                })}
                {/* 综合报告单独一行 */}
                <li className={`flex items-center gap-2 pt-1 border-t border-[var(--border-custom)]/30 ${
                  isReportDone
                    ? "text-[var(--green)]"
                    : isReportRunning
                    ? "text-[var(--blue)]"
                    : "text-[var(--text-secondary)]/40"
                }`}>
                  <span className="w-3 inline-block">
                    {isReportDone ? "✓" : isReportRunning ? "▸" : "·"}
                  </span>
                  <span>{t("comprehensiveReport")}</span>
                  {isReportRunning && (
                    <span className="ml-auto text-[9px] text-[var(--text-secondary)]/30">
                      {t("waitingPatience")}
                    </span>
                  )}
                </li>
              </ul>
            </div>
          )}
        </motion.div>
      </main>
    </div>
  );
}

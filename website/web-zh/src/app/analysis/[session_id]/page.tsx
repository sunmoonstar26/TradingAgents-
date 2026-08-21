"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion, useMotionValue, useSpring } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, CheckCircle2, Cpu } from "lucide-react";

const AGENT_KEYS = ["fundamental", "technical", "sentiment", "news", "risk"];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "text-[var(--green)]"
      : status === "running"
        ? "text-[var(--blue)]"
        : status === "failed"
          ? "text-[var(--red)]"
          : "text-[var(--text-secondary)]/40";

  const label =
    status === "completed" ? "已完成" :
    status === "running" ? "运行中..." :
    status === "failed" ? "失败" :
    "等待中";

  return (
    <span className={`flex items-center gap-1.5 ${color}`}>
      {status === "running" && (
        <span className="inline-block w-2 h-2 border-2 border-[var(--blue)] border-t-transparent rounded-full animate-spin" />
      )}
      {status === "completed" && "✓"}
      {status === "failed" && "✗"}
      {status === "waiting" && "○"}
      {label}
    </span>
  );
}

/**
 * 单条进度条。
 * - 用 useMotionValue + useSpring 持久化进度，不因父组件 re-render 而重置。
 * - running：从当前值缓慢爬到 85%（180s 模拟）；completed：弹到 100%；其余：保持 0%。
 */
function CrawlingBar({ status }: { status: string }) {
  const pct = useMotionValue(0);
  const width = useSpring(pct, { stiffness: 40, damping: 18, mass: 0.6 });
  const prevStatus = useRef<string>("waiting");
  const crawlTimer = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    const prev = prevStatus.current;
    prevStatus.current = status;

    if (status === "running" && prev !== "running") {
      if (crawlTimer.current) clearInterval(crawlTimer.current);
      const DURATION_S = 180;
      const STEP = 85 / DURATION_S; // 线性推进，每秒固定步长
      crawlTimer.current = setInterval(() => {
        const current = pct.get();
        if (current >= 85) {
          if (crawlTimer.current) clearInterval(crawlTimer.current);
          return;
        }
        pct.set(Math.min(85, current + STEP));
      }, 1000);
    }

    if (status === "completed") {
      if (crawlTimer.current) clearInterval(crawlTimer.current);
      width.set(100); // 绕过弹簧，立即跳到 100%
    }

    if (status === "waiting" && prev !== "waiting") {
      if (crawlTimer.current) clearInterval(crawlTimer.current);
      pct.set(0);
    }

    return () => {
      if (crawlTimer.current) clearInterval(crawlTimer.current);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [status]);

  const color = status === "completed" ? "var(--green)" : "var(--blue)";

  return (
    <div className="flex-1 h-1 bg-[var(--panel)] rounded-full overflow-hidden ml-2">
      <motion.div
        className="h-full rounded-full"
        style={{ width, backgroundColor: color }}
      />
    </div>
  );
}

/** Indeterminate bar — used during the comprehensive report stage */
function IndeterminateBar() {
  return (
    <div className="flex-1 h-1 bg-[var(--panel)] rounded-full overflow-hidden ml-2 relative">
      <motion.div
        className="absolute h-full w-1/3 rounded-full bg-[var(--blue)]"
        animate={{ x: ["0%", "300%"] }}
        transition={{ duration: 1.8, repeat: Infinity, ease: "easeInOut" }}
        style={{ left: "-33%" }}
      />
    </div>
  );
}

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.session_id as string;

  const reportStartRef = useRef<number | null>(null);
  const sessionStartRef = useRef<number | null>(null);
  const [reportElapsed, setReportElapsed] = useState(0);
  const [sessionElapsed, setSessionElapsed] = useState(0);

  // Timeout threshold: stop polling after 15 minutes
  const SESSION_TIMEOUT_SECONDS = 900;

  const { data, isLoading } = useQuery<{
    success: boolean;
    data: {
      session_id: string;
      ticker: string;
      status: string;
      progress: Record<string, string>;
      created_at: string;
      completed_at: string | null;
      current_step: string | null;
      error_message: string | null;
    };
  }>({
    queryKey: ["analysis", sessionId],
    queryFn: () =>
      fetch(`/api/analysis/${sessionId}`).then((r) => r.json()),
    refetchInterval: (query) => {
      const d = query.state.data;
      if (!d?.success) return false;
      if (d?.data?.status === "completed" || d?.data?.status === "failed")
        return false;
      // Stop polling when session has been running too long (timeout)
      // Use either the tracked start time or the created_at from server
      const startTime = sessionStartRef.current
        || (d?.data?.created_at ? new Date(d.data.created_at).getTime() : null);
      if (startTime) {
        const elapsed = Math.floor((Date.now() - startTime) / 1000);
        if (elapsed >= SESSION_TIMEOUT_SECONDS) return false;
      }
      return 3000;
    },
  });

  const session = data?.data;
  const isComplete = session?.status === "completed";
  const isFailed = session?.status === "failed";
  const isTimedOut = !isComplete && !isFailed && sessionElapsed >= SESSION_TIMEOUT_SECONDS;
  const tickerFromSession =
    session?.ticker || sessionId.split("_")[1]?.toUpperCase() || "???";

  const reportStatus = session?.progress?.report ?? "waiting";
  const isReportRunning = reportStatus === "running";

  // record report start time
  useEffect(() => {
    if (isReportRunning && reportStartRef.current === null) {
      reportStartRef.current = Date.now();
    }
  }, [isReportRunning]);

  // record overall session start time (once session data arrives)
  useEffect(() => {
    if (session && sessionStartRef.current === null) {
      // use created_at if available, otherwise use now
      const ts = session.created_at
        ? new Date(session.created_at).getTime()
        : Date.now();
      sessionStartRef.current = Number.isFinite(ts) ? ts : Date.now();
    }
  }, [session]);

  useEffect(() => {
    if (!isReportRunning) return;
    const id = setInterval(() => {
      if (reportStartRef.current) {
        setReportElapsed(Math.floor((Date.now() - reportStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isReportRunning]);

  // session-level elapsed timer (runs the whole time session is active, stops on timeout)
  const isSessionActive = session && !isComplete && !isFailed && !isTimedOut;
  useEffect(() => {
    if (!isSessionActive) return;
    const id = setInterval(() => {
      if (sessionStartRef.current) {
        setSessionElapsed(Math.floor((Date.now() - sessionStartRef.current) / 1000));
      }
    }, 1000);
    return () => clearInterval(id);
  }, [isSessionActive]);

  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push(`/stock/${tickerFromSession}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, tickerFromSession, router]);

  const completedCount =
    session?.progress
      ? AGENT_KEYS.filter((k) => session.progress[k] === "completed").length
      : 0;
  const totalAgents = AGENT_KEYS.length;
  const isReportRunningOrDone =
    session?.progress?.report === "running" || session?.progress?.report === "completed";

  const AGENT_LABEL_KEYS: Record<string, string> = {
    fundamental: "基本面分析",
    technical: "技术面分析",
    sentiment: "情绪分析",
    news: "新闻分析",
    risk: "风险分析",
    report: "综合报告",
  };

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 md:px-6 py-8 max-w-[900px] mx-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {"返回首页"}
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 rounded-lg bg-[var(--panel2)]" />
            <Skeleton className="h-64 rounded-[20px] bg-[var(--panel2)]" />
          </div>
        ) : !session ? (
          <div className="card-hero !p-10 text-center">
            <span className="text-5xl font-mono text-[var(--text-secondary)]/40">404</span>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">{"分析会话未找到"}</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--blue)]" />
                {"AI 投资委员会工作台"}
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                {`会话 ${session.session_id} · 标的 ${tickerFromSession}`}{" "}
                · {new Date(session.created_at).toLocaleTimeString("zh-CN")}
              </p>
            </div>

            {isComplete && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-hero !p-8 text-center mb-6 border-[var(--green)]/30"
              >
                <CheckCircle2 className="w-10 h-10 text-[var(--green)] mx-auto mb-3" />
                <h2 className="text-sm font-semibold text-[var(--green)]">
                  {"分析完成 · AI 投资委员会已生成完整报告"}
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  {"正在跳转到详细结果页面..."}
                </p>
              </motion.div>
            )}

            {isFailed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-hero !p-8 text-center mb-6 border-[var(--red)]/30"
              >
                <h2 className="text-sm font-semibold text-[var(--red)]">{"分析失败"}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
                  {session.error_message || "分析过程中发生未知错误，请稍后重试。"}
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-4 px-4 py-1.5 text-xs rounded-lg bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors"
                >
                  {"返回首页"}
                </button>
              </motion.div>
            )}

            {isTimedOut && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-hero !p-8 text-center mb-6 border-[var(--amber)]/30"
              >
                <h2 className="text-sm font-semibold text-[var(--amber)]">{"分析超时"}</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
                  {"分析已运行超过 15 分钟仍未完成，后端进程可能已卡住。请返回首页重新启动分析。"}
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-4 px-4 py-1.5 text-xs rounded-lg bg-[var(--amber)]/10 text-[var(--amber)] hover:bg-[var(--amber)]/20 transition-colors"
                >
                  {"返回首页"}
                </button>
              </motion.div>
            )}

            {!isComplete && !isFailed && !isTimedOut && (
              <div className="card-hero !p-6 mb-5 text-center">
                {isReportRunningOrDone ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-[var(--blue)]/30 border-t-[var(--blue)]"
                    />
                    <p className="text-sm text-[var(--text-primary)] font-semibold mb-1">
                      {"正在生成综合报告"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]/60 font-mono">
                      {reportElapsed > 0
                        ? `已用时 ${reportElapsed}s · 通常需 1-3 分钟，请耐心等待`
                        : "AI 智能体分析中"}
                    </p>
                  </>
                ) : (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-[var(--blue)]/30 border-t-[var(--blue)]"
                    />
                    <p className="text-sm text-[var(--text-primary)] font-semibold mb-1">
                      {"AI 智能体分析中"}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]/60 font-mono">
                      {`${completedCount} / ${totalAgents} 个智能体已完成`}
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]/40 font-mono mt-1">
                      {sessionElapsed > 0
                        ? `已用时 ${sessionElapsed}s · 全程通常需 3-5 分钟`
                        : "预计需要 3-5 分钟 · 请耐心等待"}
                    </p>
                  </>
                )}
              </div>
            )}

            <div className="card-terminal !p-6">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Loader2
                  className={`w-3.5 h-3.5 ${
                    isComplete ? "text-[var(--green)]" : "text-[var(--blue)] animate-spin"
                  }`}
                />
                {"多智能体分析进度"}
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {AGENT_KEYS.map((key) => {
                  const status = session.progress?.[key] ?? "waiting";
                  return (
                    <div
                      key={key}
                      className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-all duration-300 ${
                        status === "completed"
                          ? "bg-[var(--green)]/5 border-[var(--green)]/15"
                          : status === "running"
                            ? "bg-[var(--blue)]/5 border-[var(--blue)]/15"
                            : "bg-[var(--panel2)] border-[var(--border-custom)]/30"
                      }`}
                    >
                      <span className="w-24 text-[var(--text-secondary)]/60">
                        {AGENT_LABEL_KEYS[key]}
                      </span>
                      <StatusBadge status={status} />
                      <CrawlingBar status={status} />
                    </div>
                  );
                })}

                {session.progress?.report && (
                  <div
                    className={`flex items-center gap-3 py-2.5 px-3 rounded-lg border transition-all duration-300 mt-1 ${
                      reportStatus === "completed"
                        ? "bg-[var(--green)]/5 border-[var(--green)]/15"
                        : reportStatus === "running"
                          ? "bg-[var(--blue)]/8 border-[var(--blue)]/20"
                          : "bg-[var(--panel2)] border-[var(--border-custom)]/30"
                    }`}
                  >
                    <span className="w-24 text-[var(--text-secondary)]/60">
                      {"综合报告"}
                    </span>
                    <StatusBadge status={reportStatus} />
                    {reportStatus === "running" ? (
                      <IndeterminateBar />
                    ) : (
                      <CrawlingBar status={reportStatus} />
                    )}
                    {reportStatus === "running" && reportElapsed > 0 && (
                      <span className="text-[9px] text-[var(--text-secondary)]/30 whitespace-nowrap ml-1">
                        {reportElapsed}s
                      </span>
                    )}
                  </div>
                )}
              </div>

              <div className="mt-5 pt-4 border-t border-[var(--border-custom)]/50 flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]/50">
                <span
                  className={`w-2 h-2 rounded-full ${
                    isTimedOut
                      ? "bg-[var(--amber)]"
                      : session.status === "running"
                        ? "bg-[var(--blue)] pulse-blue"
                        : session.status === "completed"
                          ? "bg-[var(--green)]"
                          : session.status === "failed"
                            ? "bg-[var(--red)]"
                            : "bg-[var(--text-secondary)]/30"
                  }`}
                />
                {isTimedOut && <span className="text-[var(--amber)]/90">{"分析超时 · 已停止轮询"}</span>}
                {!isTimedOut && session.status === "running" && "分析运行中"}
                {session.status === "completed" && "分析已完成"}
                {session.status === "failed" && (
                  <span className="text-[var(--red)]/90">
                    {"分析失败"}{session.error_message ? `：${session.error_message}` : ""}
                  </span>
                )}
                {session.status === "pending" && "等待启动"}
                {session.completed_at && (
                  <>
                    <span className="mx-1">·</span>
                    {`完成于 ${new Date(session.completed_at).toLocaleTimeString("zh-CN")}`}
                  </>
                )}
              </div>
            </div>
          </>
        )}
      </main>
    </div>
  );
}

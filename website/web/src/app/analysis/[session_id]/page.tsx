"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect, useRef, useState } from "react";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Skeleton } from "@/components/ui/skeleton";
import { ArrowLeft, Loader2, CheckCircle2, Cpu } from "lucide-react";

const AGENT_LABELS: Record<string, string> = {
  fundamental: "基本面分析",
  technical: "技术面分析",
  sentiment: "情绪分析",
  macro: "宏观分析",
  news: "新闻分析",
  risk: "风险分析",
  report: "综合报告",
};

const STATUS_TEXT: Record<string, string> = {
  waiting: "等待中",
  running: "运行中...",
  completed: "已完成",
  failed: "失败",
};

const AGENT_KEYS = ["fundamental", "technical", "sentiment", "macro", "news", "risk"];

function StatusBadge({ status }: { status: string }) {
  const color =
    status === "completed"
      ? "text-[var(--green)]"
      : status === "running"
        ? "text-[var(--blue)]"
        : status === "failed"
          ? "text-[var(--red)]"
          : "text-[var(--text-secondary)]/40";

  return (
    <span className={`flex items-center gap-1.5 ${color}`}>
      {status === "running" && (
        <span className="inline-block w-2 h-2 border-2 border-[var(--blue)] border-t-transparent rounded-full animate-spin" />
      )}
      {status === "completed" && "✓"}
      {status === "failed" && "✗"}
      {status === "waiting" && "○"}
      {STATUS_TEXT[status] || status}
    </span>
  );
}

/** 爬行进度条：running 时从 0 缓慢爬向 90%，完成跳 100%。 */
function CrawlingBar({ status }: { status: string }) {
  const startedRef = useRef(false);

  if (status === "completed") {
    return (
      <div className="flex-1 h-1 bg-[var(--panel)] rounded-full overflow-hidden ml-2">
        <motion.div
          className="h-full rounded-full bg-[var(--green)]"
          initial={{ width: "60%" }}
          animate={{ width: "100%" }}
          transition={{ duration: 0.4 }}
        />
      </div>
    );
  }

  if (status === "running") {
    if (!startedRef.current) startedRef.current = true;
    return (
      <div className="flex-1 h-1 bg-[var(--panel)] rounded-full overflow-hidden ml-2">
        <motion.div
          className="h-full rounded-full bg-[var(--blue)]"
          initial={{ width: "5%" }}
          animate={{ width: "90%" }}
          transition={{ duration: 180, ease: "easeOut" }}
        />
      </div>
    );
  }

  return (
    <div className="flex-1 h-1 bg-[var(--panel)] rounded-full overflow-hidden ml-2">
      <div className="h-full w-0 bg-transparent" />
    </div>
  );
}

/** Indeterminate 进度条 — 用于综合报告阶段 */
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
  const [reportElapsed, setReportElapsed] = useState(0);

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
      if (d?.data?.status === "completed" || d?.data?.status === "failed")
        return false;
      return 3000;
    },
  });

  const session = data?.data;
  const isComplete = session?.status === "completed";
  const isFailed = session?.status === "failed";
  const tickerFromSession =
    session?.ticker || sessionId.split("_")[1]?.toUpperCase() || "???";

  const reportStatus = session?.progress?.report ?? "waiting";
  const isReportRunning = reportStatus === "running";

  // 记录综合报告开始时间
  useEffect(() => {
    if (isReportRunning && reportStartRef.current === null) {
      reportStartRef.current = Date.now();
    }
  }, [isReportRunning]);

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

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 md:px-6 py-8 max-w-[900px] mx-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回首页
        </button>

        {isLoading ? (
          <div className="space-y-4">
            <Skeleton className="h-10 w-64 rounded-lg bg-[var(--panel2)]" />
            <Skeleton className="h-64 rounded-[20px] bg-[var(--panel2)]" />
          </div>
        ) : !session ? (
          <div className="card-hero !p-10 text-center">
            <span className="text-5xl font-mono text-[var(--text-secondary)]/40">404</span>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">分析会话未找到</p>
          </div>
        ) : (
          <>
            <div className="mb-6">
              <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-wide flex items-center gap-2">
                <Cpu className="w-4 h-4 text-[var(--blue)]" />
                AI 投资委员会工作台
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                会话 {session.session_id} · 标的 {tickerFromSession} ·{" "}
                {new Date(session.created_at).toLocaleTimeString("zh-CN")}
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
                  分析完成 · AI 投资委员会已生成完整报告
                </h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2">
                  正在跳转到详细结果页面...
                </p>
              </motion.div>
            )}

            {isFailed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-hero !p-8 text-center mb-6 border-[var(--red)]/30"
              >
                <h2 className="text-sm font-semibold text-[var(--red)]">分析失败</h2>
                <p className="text-xs text-[var(--text-secondary)] mt-2 max-w-md mx-auto">
                  数据供应商暂不可用（yfinance 频率限制 / API 未配置），请稍后重试或使用已有分析数据。
                </p>
                <button
                  onClick={() => router.push("/")}
                  className="mt-4 px-4 py-1.5 text-xs rounded-lg bg-[var(--red)]/10 text-[var(--red)] hover:bg-[var(--red)]/20 transition-colors"
                >
                  返回首页
                </button>
              </motion.div>
            )}

            {/* 进度总览 */}
            {!isComplete && !isFailed && (
              <div className="card-hero !p-6 mb-5 text-center">
                {isReportRunningOrDone ? (
                  <>
                    <motion.div
                      animate={{ rotate: 360 }}
                      transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                      className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-[var(--blue)]/30 border-t-[var(--blue)]"
                    />
                    <p className="text-sm text-[var(--text-primary)] font-semibold mb-1">
                      正在生成综合报告
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]/60 font-mono">
                      {reportElapsed > 0
                        ? `已用时 ${reportElapsed}s · 通常需 1-3 分钟，请耐心等待`
                        : "AI 正在综合 6 位智能体的分析结论..."}
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
                      AI 智能体分析中
                    </p>
                    <p className="text-xs text-[var(--text-secondary)]/60 font-mono">
                      {completedCount} / {totalAgents} 个智能体已完成
                    </p>
                  </>
                )}
              </div>
            )}

            {/* 智能体进度列表 */}
            <div className="card-terminal !p-6">
              <h3 className="text-xs font-semibold text-[var(--text-primary)] mb-4 flex items-center gap-2">
                <Loader2
                  className={`w-3.5 h-3.5 ${
                    isComplete ? "text-[var(--green)]" : "text-[var(--blue)] animate-spin"
                  }`}
                />
                多智能体分析进度
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {/* 前 6 个智能体 */}
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
                        {AGENT_LABELS[key]}
                      </span>
                      <StatusBadge status={status} />
                      <CrawlingBar status={status} />
                    </div>
                  );
                })}

                {/* 综合报告 — 单独处理 */}
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
                      {AGENT_LABELS.report}
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

              {/* 底部状态 */}
              <div className="mt-5 pt-4 border-t border-[var(--border-custom)]/50 flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]/50">
                <span
                  className={`w-2 h-2 rounded-full ${
                    session.status === "running"
                      ? "bg-[var(--blue)] pulse-blue"
                      : session.status === "completed"
                        ? "bg-[var(--green)]"
                        : session.status === "failed"
                          ? "bg-[var(--red)]"
                          : "bg-[var(--text-secondary)]/30"
                  }`}
                />
                {session.status === "running" && "分析运行中"}
                {session.status === "completed" && "分析已完成"}
                {session.status === "failed" && (
                  <span className="text-[var(--red)]/90">
                    分析失败{session.error_message ? `：${session.error_message}` : ""}
                  </span>
                )}
                {session.status === "pending" && "等待启动"}
                {session.completed_at && (
                  <>
                    <span className="mx-1">·</span>
                    完成于 {new Date(session.completed_at).toLocaleTimeString("zh-CN")}
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


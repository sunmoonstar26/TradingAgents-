"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useEffect } from "react";
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

export default function AnalysisPage() {
  const params = useParams();
  const router = useRouter();
  const sessionId = params.session_id as string;

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

  // 分析完成后自动跳转到股票详情页
  useEffect(() => {
    if (isComplete) {
      const timer = setTimeout(() => {
        router.push(`/stock/${tickerFromSession}`);
      }, 2000);
      return () => clearTimeout(timer);
    }
  }, [isComplete, tickerFromSession, router]);

  // 只统计前6个智能体（不含 report）
  const AGENT_KEYS = ["fundamental", "technical", "sentiment", "macro", "news", "risk"];
  const completedCount =
    session?.progress
      ? AGENT_KEYS.filter((k) => session.progress[k] === "completed").length
      : 0;
  const totalAgents = AGENT_KEYS.length;
  const isReportRunning = session?.progress?.report === "running";

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 md:px-6 py-8 max-w-[900px] mx-auto">
        {/* 返回按钮 */}
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
            <span className="text-5xl font-mono text-[var(--text-secondary)]/40">
              404
            </span>
            <p className="mt-3 text-sm text-[var(--text-secondary)]">
              分析会话未找到
            </p>
          </div>
        ) : (
          <>
            {/* 标题 */}
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

            {/* 分析完成提示 */}
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

            {/* 分析失败提示 */}
            {isFailed && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                className="card-hero !p-8 text-center mb-6 border-[var(--red)]/30"
              >
                <h2 className="text-sm font-semibold text-[var(--red)]">
                  分析失败
                </h2>
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
                {completedCount >= totalAgents ? (
                  <>
                    {isReportRunning ? (
                      <>
                        <motion.div
                          animate={{ rotate: 360 }}
                          transition={{ duration: 3, repeat: Infinity, ease: "linear" }}
                          className="w-12 h-12 mx-auto mb-3 rounded-full border-2 border-[var(--blue)]/30 border-t-[var(--blue)]"
                        />
                        <p className="text-sm text-[var(--text-primary)] font-semibold mb-1">
                          多智能体分析完毕
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]/60 font-mono">
                          {session.current_step || "正在生成综合报告..."}
                        </p>
                      </>
                    ) : (
                      <>
                        <motion.div
                          animate={{ opacity: [1, 0.5, 1] }}
                          transition={{ duration: 2, repeat: Infinity }}
                          className="w-12 h-12 mx-auto mb-3 rounded-full bg-[var(--green)]/20 flex items-center justify-center"
                        >
                          <CheckCircle2 className="w-6 h-6 text-[var(--green)]" />
                        </motion.div>
                        <p className="text-sm text-[var(--text-primary)] font-semibold mb-1">
                          多智能体分析完毕
                        </p>
                        <p className="text-xs text-[var(--text-secondary)]/60 font-mono">
                          等待真实 AI 分析结果...
                        </p>
                      </>
                    )}
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
                    isComplete || (completedCount >= totalAgents && !isReportRunning)
                      ? "text-[var(--green)]"
                      : "text-[var(--blue)] animate-spin"
                  }`}
                />
                多智能体分析进度
              </h3>
              <div className="space-y-2 font-mono text-xs">
                {Object.entries(session.progress || {}).map(([key, status]) => (
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
                      {AGENT_LABELS[key] || key}
                    </span>
                    <StatusBadge status={status} />
                    {/* 进度条 */}
                    <div className="flex-1 h-1 bg-[var(--panel)] rounded-full overflow-hidden ml-2">
                      <motion.div
                        className={`h-full rounded-full ${
                          status === "completed"
                            ? "bg-[var(--green)]"
                            : status === "running"
                              ? "bg-[var(--blue)]"
                              : "bg-transparent"
                        }`}
                        initial={{ width: "0%" }}
                        animate={{
                          width:
                            status === "completed"
                              ? "100%"
                              : status === "running"
                                ? "60%"
                                : "0%",
                        }}
                        transition={{ duration: 0.5 }}
                      />
                    </div>
                  </div>
                ))}
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
                    完成于{" "}
                    {new Date(session.completed_at).toLocaleTimeString("zh-CN")}
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

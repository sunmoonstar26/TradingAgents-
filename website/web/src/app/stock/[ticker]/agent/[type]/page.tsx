"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Header } from "../../../../../components/layout/header";
import { MarkdownContent } from "../../../../../components/ui/MarkdownContent";
import { Skeleton } from "../../../../../components/ui/skeleton";
import { AnalyzingState } from "../../../../../components/stock/analyzing-state";
import { ArrowLeft, Brain, TrendingUp, MessageCircle, ShieldAlert, Newspaper, Globe, Activity, TrendingDown } from "lucide-react";

// Agent 类型配置
const AGENT_CONFIG: Record<
  string,
  {
    name: string;
    label: string;
    icon: typeof Brain;
    iconColor: string;
    borderClass: string;
    mapping: string | null; // null = under construction; "__risk__" = special multi-file handling
  }
> = {
  fundamental: {
    name: "Fundamental Analysis Agent",
    label: "Fundamentals",
    icon: Brain,
    iconColor: "text-[var(--blue)]",
    borderClass: "agent-fundamental",
    mapping: "fundamentals",
  },
  technical: {
    name: "Technical Analysis Agent",
    label: "Technicals",
    icon: TrendingUp,
    iconColor: "text-[var(--green)]",
    borderClass: "agent-technical",
    mapping: "market",
  },
  sentiment: {
    name: "Sentiment Analysis Agent",
    label: "Sentiment",
    icon: MessageCircle,
    iconColor: "text-[var(--amber)]",
    borderClass: "agent-sentiment",
    mapping: "sentiment",
  },
  risk: {
    name: "Risk Analysis Agent",
    label: "Risk",
    icon: ShieldAlert,
    iconColor: "text-[var(--red)]",
    borderClass: "agent-risk",
    mapping: "__risk__",
  },
  news: {
    name: "News Analysis Agent",
    label: "Event-Driven",
    icon: Newspaper,
    iconColor: "text-[var(--cyan)]",
    borderClass: "agent-news",
    mapping: "news",
  },
  macro: {
    name: "Macro Analysis Agent",
    label: "Macro",
    icon: Globe,
    iconColor: "text-[var(--purple)]",
    borderClass: "agent-macro",
    mapping: null,
  },
};

const RISK_SECTIONS = [
  { key: "aggressive", label: "Aggressive Analyst", icon: Activity, color: "text-[var(--green)]", borderClass: "agent-technical" },
  { key: "conservative", label: "Conservative Analyst", icon: ShieldAlert, color: "text-[var(--blue)]", borderClass: "agent-fundamental" },
  { key: "neutral", label: "Neutral Analyst", icon: TrendingDown, color: "text-[var(--amber)]", borderClass: "agent-sentiment" },
] as const;

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string).toUpperCase();
  const type = params.type as string;

  const cfg = AGENT_CONFIG[type];
  const isRisk = cfg?.mapping === "__risk__";
  const isBuilding = !cfg || cfg.mapping === null;

  // 检测主 ticker 是否在分析中
  const { data: stockStatus } = useQuery<{
    success: boolean;
    status?: "analyzing";
    session_id?: string;
  }>({
    queryKey: ["stock", ticker],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}`).then(async (r) => {
        if (r.status === 202) return r.json();
        if (!r.ok) return { success: false };
        return r.json();
      }),
    retry: false,
  });

  const isAnalyzing = stockStatus?.status === "analyzing";

  // 普通 agent 报告（非 risk）
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: { content: string; ticker: string; section: string; subsection: string };
  }>({
    queryKey: ["agent-report", ticker, type],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}/report/analysts/${cfg?.mapping || type}`).then((r) => {
        if (!r.ok) throw new Error("未找到报告");
        return r.json();
      }),
    enabled: !isBuilding && !isRisk && !isAnalyzing,
  });

  // 风险三段报告并行请求
  const riskResults = useQueries({
    queries: RISK_SECTIONS.map((s) => ({
      queryKey: ["risk-report", ticker, s.key],
      queryFn: () =>
        fetch(`/api/stocks/${ticker}/report/risk/${s.key}`).then((r) => {
          if (!r.ok) throw new Error("未找到");
          return r.json() as Promise<{ success: boolean; data: { content: string } }>;
        }),
      enabled: isRisk && !isAnalyzing,
    })),
  });

  if (isAnalyzing && stockStatus?.session_id) {
    return (
      <AnalyzingState
        ticker={ticker}
        sessionId={stockStatus.session_id}
        invalidateKeys={[
          ["stock", ticker],
          ["agent-report", ticker, type],
          ...RISK_SECTIONS.map((s) => ["risk-report", ticker, s.key]),
        ]}
        compact
      />
    );
  }

  if (!cfg) {
    return (
      <div className="min-h-screen">
        <Header />
        <main className="flex flex-col items-center justify-center min-h-[60vh] gap-4">
          <span className="text-5xl font-mono text-[var(--text-secondary)]/60">404</span>
          <p className="text-sm text-[var(--text-secondary)]">Unknown analysis type</p>
        </main>
      </div>
    );
  }

  const Icon = cfg.icon;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
        {/* 返回按钮 */}
        <button
          onClick={() => router.push(`/stock/${ticker}`)}
          className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]/70 hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to Investment Committee
        </button>

        {/* Hero 标题区 */}
        <div className="card-hero mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--panel2)] flex items-center justify-center">
              <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {cfg.name} · Full Analysis Report
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                {ticker} · {cfg.label} Analysis · AI Agent Report
              </p>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        {isBuilding ? (
          <div className="card-terminal p-8 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--panel2)] flex items-center justify-center">
              <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{cfg.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]/70 text-center max-w-md">
              This analysis agent is under construction. Related data and reports will be available soon.
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-[var(--amber)] pulse-amber" />
              <span className="text-[10px] text-[var(--amber)]/80 font-mono">In Development</span>
            </div>
          </div>
        ) : isRisk ? (
          // 风险智能体：展示三位风控分析师（aggressive / conservative / neutral）
          <div className="space-y-6">
            {riskResults.map((result, idx) => {
              const sec = RISK_SECTIONS[idx];
              const SectionIcon = sec.icon;
              if (result.isLoading) {
                return (
                  <div key={sec.key} className="card-terminal p-6 space-y-4">
                    <Skeleton className="h-6 w-48 rounded bg-[var(--panel2)]" />
                    <Skeleton className="h-4 w-full rounded bg-[var(--panel2)]" />
                    <Skeleton className="h-40 w-full rounded bg-[var(--panel2)]" />
                  </div>
                );
              }
              const content = result.data?.data?.content;
              if (!content) return null;
              return (
                <div key={sec.key} className={`card-terminal p-6 md:p-8 ${sec.borderClass}`}>
                  <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-custom)]">
                    <SectionIcon className={`w-4 h-4 ${sec.color}`} />
                    <span className={`text-[11px] font-semibold uppercase tracking-wider ${sec.color}`}>
                      {sec.label}
                    </span>
                  </div>
                  <MarkdownContent content={content} />
                </div>
              );
            })}
            {riskResults.every((r) => !r.isLoading && !r.data?.data?.content) && (
              <div className="card-terminal p-8 flex flex-col items-center justify-center gap-3">
                <span className="text-4xl font-mono text-[var(--text-secondary)]/60">404</span>
                <p className="text-sm text-[var(--text-secondary)]">No risk analysis report found</p>
              </div>
            )}
          </div>
        ) : isLoading ? (
          <div className="card-terminal p-6 space-y-4">
            <Skeleton className="h-8 w-64 rounded-lg bg-[var(--panel2)]" />
            <Skeleton className="h-4 w-full rounded bg-[var(--panel2)]" />
            <Skeleton className="h-4 w-3/4 rounded bg-[var(--panel2)]" />
            <Skeleton className="h-4 w-full rounded bg-[var(--panel2)]" />
            <Skeleton className="h-4 w-5/6 rounded bg-[var(--panel2)]" />
            <Skeleton className="h-60 w-full rounded-lg bg-[var(--panel2)]" />
          </div>
        ) : error || !data?.data ? (
          <div className="card-terminal p-8 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl font-mono text-[var(--text-secondary)]/60">404</span>
            <p className="text-sm text-[var(--text-secondary)]">No analysis report found for {cfg.name}</p>
          </div>
        ) : (
          <div className={`card-terminal p-6 md:p-8 ${cfg.borderClass}`}>
            <MarkdownContent content={data.data.content} />
          </div>
        )}
      </main>

      {/* 底部 */}
      <div className="text-center pt-4 pb-8">
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
          {cfg.name} Report · {ticker}
        </span>
      </div>
    </div>
  );
}

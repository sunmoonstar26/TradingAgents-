"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { Header } from "@/components/layout/header";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyzingState } from "@/components/stock/analyzing-state";
import { ArrowLeft, ShieldAlert, Activity, TrendingDown } from "lucide-react";

// 风控策略配置
const RISK_CONFIG: Record<
  string,
  {
    name: string;
    label: string;
    icon: typeof ShieldAlert;
    iconColor: string;
    borderClass: string;
    description: string;
  }
> = {
  aggressive: {
    name: "激进策略",
    label: "激进型",
    icon: Activity,
    iconColor: "text-[var(--green)]",
    borderClass: "agent-technical",
    description: "高风险承受 · 追求最大收益",
  },
  conservative: {
    name: "保守策略",
    label: "保守型",
    icon: ShieldAlert,
    iconColor: "text-[var(--blue)]",
    borderClass: "agent-fundamental",
    description: "低风险偏好 · 资本保值为先",
  },
  neutral: {
    name: "中性策略",
    label: "中性型",
    icon: TrendingDown,
    iconColor: "text-[var(--amber)]",
    borderClass: "agent-sentiment",
    description: "风险收益平衡 · 稳健持仓",
  },
};

export default function RiskDetailPage() {
  const params = useParams();
  const router = useRouter();
  const ticker = (params.ticker as string).toUpperCase();
  const stance = params.stance as string;

  const cfg = RISK_CONFIG[stance];

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

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: { content: string; ticker: string; section: string; subsection: string };
  }>({
    queryKey: ["risk-detail", ticker, stance],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}/report/risk/${stance}`).then((r) => {
        if (!r.ok) throw new Error("未找到风控报告");
        return r.json();
      }),
    enabled: !!cfg && stockStatus?.status !== "analyzing",
  });

  if (stockStatus?.status === "analyzing" && stockStatus.session_id) {
    return (
      <AnalyzingState
        ticker={ticker}
        sessionId={stockStatus.session_id}
        invalidateKeys={[["stock", ticker], ["risk-detail", ticker, stance]]}
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
          <p className="text-sm text-[var(--text-secondary)]">未知的风控策略</p>
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
          返回投资委员会工作台
        </button>

        {/* Hero 标题区 */}
        <div className="card-hero mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--panel2)] flex items-center justify-center">
              <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {cfg.name} · 风控决策分析
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                {ticker} · {cfg.description} · 风控团队报告
              </p>
            </div>
          </div>
        </div>

        {/* 内容区域 */}
        {isLoading ? (
          <div className="card-terminal p-6 space-y-4">
            <Skeleton className="h-8 w-64 rounded-lg bg-[var(--panel2)]" />
            <Skeleton className="h-4 w-full rounded bg-[var(--panel2)]" />
            <Skeleton className="h-4 w-3/4 rounded bg-[var(--panel2)]" />
            <Skeleton className="h-60 w-full rounded-lg bg-[var(--panel2)]" />
          </div>
        ) : error || !data?.data ? (
          <div className="card-terminal p-8 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl font-mono text-[var(--text-secondary)]/60">404</span>
            <p className="text-sm text-[var(--text-secondary)]">
              未找到 {cfg.name} 的风控报告
            </p>
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
          {cfg.name} 风控报告 · {ticker}
        </span>
      </div>
    </div>
  );
}

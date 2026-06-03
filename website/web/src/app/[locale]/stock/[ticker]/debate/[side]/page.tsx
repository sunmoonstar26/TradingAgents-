"use client";

import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Header } from "../../../../../../components/layout/header";
import { MarkdownContent } from "../../../../../../components/ui/MarkdownContent";
import { Skeleton } from "../../../../../../components/ui/skeleton";
import { AnalyzingState } from "../../../../../../components/stock/analyzing-state";
import { ArrowLeft, TrendingUp, TrendingDown, Scale } from "lucide-react";

export default function DebateDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("stockComponents");
  const ticker = (params.ticker as string).toUpperCase();
  const side = params.side as string;

  const DEBATE_CONFIG: Record<
    string,
    {
      name: string;
      label: string;
      icon: typeof TrendingUp;
      iconColor: string;
      borderClass: string;
      mapping: string;
    }
  > = {
    bull: {
      name: t("debateBullName"),
      label: t("debateBullLabel"),
      icon: TrendingUp,
      iconColor: "text-[var(--green)]",
      borderClass: "agent-technical",
      mapping: "bull",
    },
    bear: {
      name: t("debateBearName"),
      label: t("debateBearLabel"),
      icon: TrendingDown,
      iconColor: "text-[var(--red)]",
      borderClass: "agent-risk",
      mapping: "bear",
    },
    verdict: {
      name: t("debateVerdictName"),
      label: t("debateVerdictLabel"),
      icon: Scale,
      iconColor: "text-[var(--blue)]",
      borderClass: "agent-fundamental",
      mapping: "manager",
    },
  };

  const cfg = DEBATE_CONFIG[side];

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
    queryKey: ["debate-report", ticker, side],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}/report/research/${cfg?.mapping || side}`).then((r) => {
        if (!r.ok) throw new Error(t("debateNotFound", { name: cfg?.name ?? side }));
        return r.json();
      }),
    enabled: !!cfg && stockStatus?.status !== "analyzing",
  });

  if (stockStatus?.status === "analyzing" && stockStatus.session_id) {
    return (
      <AnalyzingState
        ticker={ticker}
        sessionId={stockStatus.session_id}
        invalidateKeys={[["stock", ticker], ["debate-report", ticker, side]]}
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
          <p className="text-sm text-[var(--text-secondary)]">{t("unknownDebateType")}</p>
        </main>
      </div>
    );
  }

  const Icon = cfg.icon;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto">
        <button
          onClick={() => router.push(`/stock/${ticker}`)}
          className="inline-flex items-center gap-1.5 text-[11px] text-[var(--text-secondary)]/70 hover:text-[var(--text-primary)] transition-colors mb-4"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {t("backToWorkstation")}
        </button>

        <div className="card-hero mb-6">
          <div className="flex items-center gap-3 mb-2">
            <div className="w-10 h-10 rounded-xl bg-[var(--panel2)] flex items-center justify-center">
              <Icon className={`w-5 h-5 ${cfg.iconColor}`} />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {t("debateTitle", { name: cfg.name })}
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                {t("debateSubtitle", { ticker, label: cfg.label })}
              </p>
            </div>
          </div>
        </div>

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
              {t("debateNotFound", { name: cfg.name })}
            </p>
          </div>
        ) : (
          <div className={`card-terminal p-6 md:p-8 ${cfg.borderClass}`}>
            <MarkdownContent content={data.data.content} />
          </div>
        )}
      </main>

      <div className="text-center pt-4 pb-8">
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
          {t("debateFooter", { name: cfg.name, ticker })}
        </span>
      </div>
    </div>
  );
}

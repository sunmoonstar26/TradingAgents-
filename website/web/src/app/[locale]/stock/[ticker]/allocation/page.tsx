"use client";

import { useQueries, useQuery } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRouter } from "@/navigation";
import { useTranslations } from "next-intl";
import { Header } from "@/components/layout/header";
import { MarkdownContent } from "@/components/ui/MarkdownContent";
import { Skeleton } from "@/components/ui/skeleton";
import { AnalyzingState } from "@/components/stock/analyzing-state";
import { ArrowLeft, Target } from "lucide-react";

export default function AllocationDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("stockComponents");
  const ticker = (params.ticker as string).toUpperCase();

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

  const results = useQueries({
    queries: [
      {
        queryKey: ["allocation-trader", ticker],
        queryFn: () =>
          fetch(`/api/stocks/${ticker}/report/trading/trader`).then((r) => {
            if (!r.ok) throw new Error(t("allocationNotFound", { ticker }));
            return r.json() as Promise<{
              success: boolean;
              data: { content: string };
            }>;
          }),
        enabled: stockStatus?.status !== "analyzing",
      },
      {
        queryKey: ["allocation-decision", ticker],
        queryFn: () =>
          fetch(`/api/stocks/${ticker}/report/portfolio/decision`).then((r) => {
            if (!r.ok) throw new Error(t("allocationNotFound", { ticker }));
            return r.json() as Promise<{
              success: boolean;
              data: { content: string };
            }>;
          }),
        enabled: stockStatus?.status !== "analyzing",
      },
    ],
  });

  const [traderResult, decisionResult] = results;
  const isLoading = traderResult.isLoading || decisionResult.isLoading;
  const hasNoData =
    (traderResult.error || !traderResult.data?.data) &&
    (decisionResult.error || !decisionResult.data?.data);

  if (stockStatus?.status === "analyzing" && stockStatus.session_id) {
    return (
      <AnalyzingState
        ticker={ticker}
        sessionId={stockStatus.session_id}
        invalidateKeys={[
          ["stock", ticker],
          ["allocation-trader", ticker],
          ["allocation-decision", ticker],
        ]}
        compact
      />
    );
  }

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
              <Target className="w-5 h-5 text-[var(--blue)]" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">
                {t("allocationTitle")}
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                {t("allocationSubtitle", { ticker })}
              </p>
            </div>
          </div>
        </div>

        {isLoading ? (
          <div className="space-y-4">
            <div className="card-terminal p-6 space-y-4">
              <Skeleton className="h-8 w-64 rounded-lg bg-[var(--panel2)]" />
              <Skeleton className="h-4 w-full rounded bg-[var(--panel2)]" />
              <Skeleton className="h-4 w-3/4 rounded bg-[var(--panel2)]" />
              <Skeleton className="h-60 w-full rounded-lg bg-[var(--panel2)]" />
            </div>
            <div className="card-terminal p-6 space-y-4">
              <Skeleton className="h-8 w-64 rounded-lg bg-[var(--panel2)]" />
              <Skeleton className="h-4 w-full rounded bg-[var(--panel2)]" />
              <Skeleton className="h-4 w-3/4 rounded bg-[var(--panel2)]" />
              <Skeleton className="h-40 w-full rounded-lg bg-[var(--panel2)]" />
            </div>
          </div>
        ) : hasNoData ? (
          <div className="card-terminal p-8 flex flex-col items-center justify-center gap-3">
            <span className="text-4xl font-mono text-[var(--text-secondary)]/60">404</span>
            <p className="text-sm text-[var(--text-secondary)]">
              {t("allocationNotFound", { ticker })}
            </p>
          </div>
        ) : (
          <div className="space-y-6">
            {traderResult.data?.data?.content && (
              <div className="card-terminal p-6 md:p-8 agent-technical">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-custom)]">
                  <span className="text-[10px] font-semibold text-[var(--green)] uppercase tracking-wider">
                    {t("traderDecision")}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
                    {t("traderLayer")}
                  </span>
                </div>
                <MarkdownContent content={traderResult.data.data.content} />
              </div>
            )}

            {decisionResult.data?.data?.content && (
              <div className="card-terminal p-6 md:p-8 agent-fundamental">
                <div className="flex items-center gap-2 mb-4 pb-3 border-b border-[var(--border-custom)]">
                  <span className="text-[10px] font-semibold text-[var(--blue)] uppercase tracking-wider">
                    {t("portfolioDecision")}
                  </span>
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
                    {t("portfolioLayer")}
                  </span>
                </div>
                <MarkdownContent content={decisionResult.data.data.content} />
              </div>
            )}
          </div>
        )}
      </main>

      <div className="text-center pt-4 pb-8">
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
          {t("allocationFooter", { ticker })}
        </span>
      </div>
    </div>
  );
}

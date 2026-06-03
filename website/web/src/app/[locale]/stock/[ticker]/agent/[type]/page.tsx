"use client";

import { useQuery, useQueries } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { Header } from "../../../../../../components/layout/header";
import { MarkdownContent } from "../../../../../../components/ui/MarkdownContent";
import { Skeleton } from "../../../../../../components/ui/skeleton";
import { AnalyzingState } from "../../../../../../components/stock/analyzing-state";
import { ArrowLeft, Brain, TrendingUp, MessageCircle, ShieldAlert, Newspaper, Globe, Activity, TrendingDown } from "lucide-react";

export default function AgentDetailPage() {
  const params = useParams();
  const router = useRouter();
  const t = useTranslations("stockComponents");
  const ticker = (params.ticker as string).toUpperCase();
  const type = params.type as string;

  // Agent type config built from translations
  const AGENT_CONFIG: Record<
    string,
    {
      name: string;
      label: string;
      icon: typeof Brain;
      iconColor: string;
      borderClass: string;
      mapping: string | null;
    }
  > = {
    fundamental: {
      name: t("agentFundamental"),
      label: t("agentFundamentalLabel"),
      icon: Brain,
      iconColor: "text-[var(--blue)]",
      borderClass: "agent-fundamental",
      mapping: "fundamentals",
    },
    technical: {
      name: t("agentTechnical"),
      label: t("agentTechnicalLabel"),
      icon: TrendingUp,
      iconColor: "text-[var(--green)]",
      borderClass: "agent-technical",
      mapping: "market",
    },
    sentiment: {
      name: t("agentSentiment"),
      label: t("agentSentimentLabel"),
      icon: MessageCircle,
      iconColor: "text-[var(--amber)]",
      borderClass: "agent-sentiment",
      mapping: "sentiment",
    },
    risk: {
      name: t("agentRisk"),
      label: t("agentRiskLabel"),
      icon: ShieldAlert,
      iconColor: "text-[var(--red)]",
      borderClass: "agent-risk",
      mapping: "__risk__",
    },
    news: {
      name: t("agentNews"),
      label: t("agentNewsLabel"),
      icon: Newspaper,
      iconColor: "text-[var(--cyan)]",
      borderClass: "agent-news",
      mapping: "news",
    },
    macro: {
      name: t("agentMacro"),
      label: t("agentMacroLabel"),
      icon: Globe,
      iconColor: "text-[var(--purple)]",
      borderClass: "agent-macro",
      mapping: null,
    },
  };

  const RISK_SECTIONS = [
    { key: "aggressive", label: t("riskAggressive"), icon: Activity, color: "text-[var(--green)]", borderClass: "agent-technical" },
    { key: "conservative", label: t("riskConservative"), icon: ShieldAlert, color: "text-[var(--blue)]", borderClass: "agent-fundamental" },
    { key: "neutral", label: t("riskNeutral"), icon: TrendingDown, color: "text-[var(--amber)]", borderClass: "agent-sentiment" },
  ] as const;

  const cfg = AGENT_CONFIG[type];
  const isRisk = cfg?.mapping === "__risk__";
  const isBuilding = !cfg || cfg.mapping === null;

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

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: { content: string; ticker: string; section: string; subsection: string };
  }>({
    queryKey: ["agent-report", ticker, type],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}/report/analysts/${cfg?.mapping || type}`).then((r) => {
        if (!r.ok) throw new Error(t("agentNotFound", { name: cfg?.name ?? type }));
        return r.json();
      }),
    enabled: !isBuilding && !isRisk && !isAnalyzing,
  });

  const riskResults = useQueries({
    queries: RISK_SECTIONS.map((s) => ({
      queryKey: ["risk-report", ticker, s.key],
      queryFn: () =>
        fetch(`/api/stocks/${ticker}/report/risk/${s.key}`).then((r) => {
          if (!r.ok) throw new Error(t("notFound404"));
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
          <p className="text-sm text-[var(--text-secondary)]">{t("unknownAgentType")}</p>
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
                {t("agentReportTitle", { name: cfg.name })}
              </h1>
              <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
                {t("agentReportSubtitle", { ticker, label: cfg.label })}
              </p>
            </div>
          </div>
        </div>

        {isBuilding ? (
          <div className="card-terminal p-8 flex flex-col items-center justify-center gap-4">
            <div className="w-16 h-16 rounded-2xl bg-[var(--panel2)] flex items-center justify-center">
              <Icon className={`w-8 h-8 ${cfg.iconColor}`} />
            </div>
            <h2 className="text-base font-semibold text-[var(--text-primary)]">{cfg.name}</h2>
            <p className="text-sm text-[var(--text-secondary)]/70 text-center max-w-md">
              {t("agentBuilding")}
            </p>
            <div className="flex items-center gap-2 mt-2">
              <span className="w-2 h-2 rounded-full bg-[var(--amber)] pulse-amber" />
              <span className="text-[10px] text-[var(--amber)]/80 font-mono">{t("agentBuildingLabel")}</span>
            </div>
          </div>
        ) : isRisk ? (
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
                <p className="text-sm text-[var(--text-secondary)]">{t("riskNotFound")}</p>
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
            <p className="text-sm text-[var(--text-secondary)]">{t("agentNotFound", { name: cfg.name })}</p>
          </div>
        ) : (
          <div className={`card-terminal p-6 md:p-8 ${cfg.borderClass}`}>
            <MarkdownContent content={data.data.content} />
          </div>
        )}
      </main>

      <div className="text-center pt-4 pb-8">
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
          {t("agentReportFooter", { name: cfg.name, ticker })}
        </span>
      </div>
    </div>
  );
}

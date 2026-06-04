"use client";

import { RiskLevel, Signal } from "@/types/enums";
import { useQuery } from "@tanstack/react-query";
import { useParams, useRouter } from "next/navigation";
import { useState, useCallback, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations, useLocale } from "next-intl";
import { Header } from "../../../../components/layout/header";
import { StockHeader } from "../../../../components/stock/stock-header";
import { FinalDecision } from "../../../../components/stock/final-decision";
import { BullBearDebate } from "../../../../components/stock/bull-bear-debate";
import { MultiAgentAnalysis } from "../../../../components/stock/agent-analysis";
import { RiskAnalysis } from "../../../../components/stock/risk-analysis";
import { PortfolioDecision } from "../../../../components/stock/portfolio-decision";
import { ReflectionMemory } from "../../../../components/stock/reflection-memory";
import { LiveRail } from "../../../../components/stock/live-rail";
import { AnalyzingState } from "../../../../components/stock/analyzing-state";
import { StockDetail, AnalysisStartResponse, StockInsights } from "../../../../types";
import { findStock } from "../../../../data/stocks";
import { syncRadarFull, parseConsensus } from "../../../../lib/radar-store";
import { upsertFeedFromInsights } from "../../../../lib/livefeed-store";
import { Skeleton } from "../../../../components/ui/skeleton";
import { Sparkles, Zap, Loader2, ArrowLeft, Cpu } from "lucide-react";

function StockDetailSkeleton() {
  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 md:px-6 py-6 max-w-[1400px] mx-auto space-y-6">
        <Skeleton className="h-12 w-64 rounded-lg bg-[var(--panel2)]" />
        <Skeleton className="h-44 rounded-[20px] bg-[var(--panel2)]" />
        <div className="grid grid-cols-1 lg:grid-cols-[1fr_280px_1fr] gap-3">
          <Skeleton className="h-64 rounded-[20px] bg-[var(--panel2)]" />
          <Skeleton className="h-64 rounded-[20px] bg-[var(--panel2)]" />
          <Skeleton className="h-64 rounded-[20px] bg-[var(--panel2)]" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-56 rounded-[20px] bg-[var(--panel2)]" />
          ))}
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {Array.from({ length: 4 }).map((_, i) => (
            <Skeleton key={i} className="h-28 rounded-[20px] bg-[var(--panel2)]" />
          ))}
        </div>
      </main>
    </div>
  );
}

/** 未找到分析数据时的 AI 分析启动页 */
function AnalysisLauncher({ ticker }: { ticker: string }) {
  const router = useRouter();
  const locale = useLocale();
  const t = useTranslations("stock");
  const [isStarting, setIsStarting] = useState(false);
  const stockInfo = findStock(ticker);
  const displayName = stockInfo?.name ?? ticker;

  const BOOT_STEPS = [
    t("bootStep1"),
    t("bootStep2"),
    t("bootStep3"),
    t("bootStep4"),
    t("bootStep5"),
  ];
  const [bootStep, setBootStep] = useState(0);

  const handleLaunch = useCallback(async () => {
    setIsStarting(true);
    setBootStep(0);

    for (let i = 0; i < BOOT_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setBootStep(i + 1);
    }
    await new Promise((r) => setTimeout(r, 300));

    const market = stockInfo?.market ?? "US";
    try {
      const res = await fetch("/api/analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, market, mode: "standard" }),
      });
      const data: AnalysisStartResponse = await res.json();
      if (data.success) {
        router.push(`/${locale}/analysis/${data.session_id}`);
      }
    } catch {
      router.push(`/${locale}/analysis/sess_${ticker.toLowerCase()}_${Date.now()}`);
    }
  }, [ticker, router, stockInfo, BOOT_STEPS, locale]);

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex flex-col items-center justify-center min-h-[75vh] px-6">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-lg w-full text-center"
        >
          {/* icon */}
          <div className="mb-6 flex justify-center">
            <motion.div
              animate={{ rotate: [0, 360] }}
              transition={{ duration: 20, repeat: Infinity, ease: "linear" }}
              className="w-16 h-16 rounded-2xl bg-[var(--blue)]/10 border border-[var(--blue)]/20 flex items-center justify-center"
            >
              <Cpu className="w-8 h-8 text-[var(--blue)]" />
            </motion.div>
          </div>

          {/* title */}
          <h1 className="text-xl font-bold text-[var(--text-primary)] mb-2">
            {ticker}{" "}
            {stockInfo && (
              <span className="text-[var(--text-secondary)]">{displayName}</span>
            )}
          </h1>
          <p className="text-sm text-[var(--text-secondary)] mb-1">
            {t("notAnalyzed")}
          </p>
          <p className="text-[10px] font-mono text-[var(--text-secondary)]/50 mb-8">
            {t("analysisDesc")}
          </p>

          {/* CTA button */}
          <motion.button
            onClick={handleLaunch}
            disabled={isStarting}
            whileHover={isStarting ? {} : { scale: 1.03 }}
            whileTap={isStarting ? {} : { scale: 0.97 }}
            className={`inline-flex items-center gap-2.5 rounded-xl font-semibold text-sm tracking-wide transition-all mb-8 ${
              isStarting
                ? "bg-white/[0.04] text-white/20 cursor-not-allowed"
                : "bg-[var(--blue)] text-white hover:bg-[var(--blue)]/90 shadow-xl shadow-[var(--blue)]/30"
            }`}
            style={{ padding: "16px 40px" }}
          >
            {isStarting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                {t("starting")}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {t("startBtn")}
              </>
            )}
          </motion.button>

          {/* back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 mx-auto text-xs text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] transition-colors font-mono"
          >
            <ArrowLeft className="w-3 h-3" />
            {t("back")}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const locale = useLocale();
  const t = useTranslations("stock");
  const ticker = (params.ticker as string).toUpperCase();

  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data?: StockDetail;
    status?: "analyzing";
    session_id?: string;
  }>({
    queryKey: ["stock", ticker],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}`).then(async (r) => {
        if (r.status === 202) return r.json();
        if (!r.ok) throw new Error(t("notFound"));
        return r.json();
      }),
    retry: false,
  });

  const { data: insightsData } = useQuery<{
    success: boolean;
    data: StockInsights;
  }>({
    queryKey: ["stock-insights", ticker],
    queryFn: () =>
      fetch(`/api/stocks/${ticker}/insights`).then((r) => {
        if (!r.ok) return { success: false, data: null };
        return r.json();
      }),
    retry: false,
    enabled: !!data?.data,
  });

  useEffect(() => {
    const d = data?.data;
    if (!d) return;

    const agentAlignment = {
      fundamental: false, technical: false, sentiment: false, macro: false, risk: false,
    };
    (d.agentAnalyses || []).forEach((a) => {
      const bullish = [Signal.STRONG_BUY, Signal.BUY].includes(a.signal as Signal);
      if (a.personality === "fundamental") agentAlignment.fundamental = bullish;
      if (a.personality === "technical") agentAlignment.technical = bullish;
      if (a.personality === "sentiment") agentAlignment.sentiment = bullish;
      if (a.personality === "macro") agentAlignment.macro = bullish;
      if (a.personality === "risk") agentAlignment.risk = bullish;
    });

    syncRadarFull(d.ticker, d.name, {
      signal: d.committeeDecision.signal,
      conviction: d.committeeDecision.conviction,
      risk: d.committeeDecision.conviction >= 60 ? RiskLevel.LOW : RiskLevel.MEDIUM,
      consensus: parseConsensus(d.committeeDecision.consensus),
      exposure: d.committeeDecision.recommendedExposure,
      agentAlignment,
      updatedAt: d.updatedAt || new Date().toISOString(),
    });
  }, [data?.data]);

  useEffect(() => {
    const d = data?.data;
    const insights = insightsData?.data;
    if (!d || !insights) return;

    const overrides: Parameters<typeof syncRadarFull>[2] = {
      updatedAt: d.updatedAt || new Date().toISOString(),
    };

    const judgeConfidence: number | undefined = insights.debate?.["裁判"]?.confidence;
    if (judgeConfidence && judgeConfidence > 0) overrides.conviction = judgeConfidence;

    const suggestedExposure: string | undefined = insights.trading?.suggested_exposure;
    if (suggestedExposure) overrides.exposure = suggestedExposure;

    if (insights.analysts) {
      const analystVerdicts = Object.values(insights.analysts) as { verdict?: string }[];
      const bull = analystVerdicts.filter(v => v?.verdict === "看涨").length;
      const bear = analystVerdicts.filter(v => v?.verdict === "看跌").length;
      const neutral = analystVerdicts.length - bull - bear;
      const judgeVerdict = insights.debate?.["裁判"]?.verdict ?? "";
      const judgeBull = judgeVerdict.includes("多方") ? 1 : 0;
      const judgeBear = judgeVerdict.includes("空方") ? 1 : 0;
      const judgeNeutral = 1 - judgeBull - judgeBear;
      overrides.consensus = {
        bullish: bull + judgeBull,
        neutral: neutral + judgeNeutral,
        bearish: bear + judgeBear,
      };
    }

    syncRadarFull(d.ticker, d.name, overrides);
    upsertFeedFromInsights(d.ticker, insights);
  }, [data?.data, insightsData?.data]);

  if (isLoading) return <StockDetailSkeleton />;

  if (data?.status === "analyzing" && data.session_id) {
    return <AnalyzingState ticker={ticker} sessionId={data.session_id} />;
  }

  if (error || !data?.data) {
    return <AnalysisLauncher ticker={ticker} />;
  }

  const d = data.data;
  const insights = insightsData?.success ? insightsData.data : undefined;

  return (
    <div className="min-h-screen">
      <Header />

      <div className="px-4 md:px-6 pt-6 max-w-[1400px] mx-auto">
        <h1 className="text-lg font-bold text-[var(--text-primary)] tracking-wide">
          {t("workstationTitle")}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
          {t("workstationDesc")}
        </p>
      </div>

      <main className="px-4 md:px-6 py-4 max-w-[1400px] mx-auto space-y-5">
        <StockHeader
          ticker={d.ticker}
          name={d.name}
          price={d.price}
          change={d.change}
          changePercent={d.changePercent}
          marketCap={d.marketCap}
          pe={d.pe}
          sector={d.sector}
        />

        <FinalDecision
          signal={d.committeeDecision.signal}
          conviction={d.committeeDecision.conviction}
          consensus={d.committeeDecision.consensus}
          recommendedExposure={d.committeeDecision.recommendedExposure}
          timeHorizon={d.committeeDecision.timeHorizon}
          rationale={d.committeeDecision.rationale}
          reportDate={d.updatedAt}
          thesis={insights?.thesis}
        />

        <BullBearDebate
          bullThesis={d.debate.bullThesis}
          moderatorVerdict={d.debate.moderatorVerdict}
          bearThesis={d.debate.bearThesis}
          battleBar={d.debate.battleBar}
          conflictMatrix={d.debate.conflictMatrix}
          ticker={ticker}
          debateInsights={insights?.debate}
        />

        <MultiAgentAnalysis data={d.agentAnalyses} ticker={ticker} insights={insights} />

        <RiskAnalysis data={d.riskExposures} ticker={ticker} riskInsight={insights?.risk} />

        <div className="grid grid-cols-1 lg:grid-cols-2 gap-5">
          <PortfolioDecision data={d.positionAllocation} ticker={ticker} tradingInsight={insights?.trading} />
          <LiveRail data={d.liveRail} />
        </div>

        <ReflectionMemory data={d.learningMemory} memoryInsight={insights?.memory} />

        <div className="text-center pt-4 pb-8">
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
            {new Date(d.updatedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")}
          </span>
        </div>
      </main>
    </div>
  );
}

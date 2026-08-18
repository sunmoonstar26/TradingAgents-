"use client";

import { RiskLevel, Signal } from "@/types/enums";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useParams } from "next/navigation";
import { useRouter } from "next/navigation";
import { useState, useCallback, useEffect, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "@/components/layout/header";
import { StockHeader } from "@/components/stock/stock-header";
import { FinalDecision } from "@/components/stock/final-decision";
import { InvestmentRationale } from "@/components/stock/investment-rationale";
import { ProphetIndicator } from "@/components/stock/prophet-indicator";
import { BullBearDebate } from "@/components/stock/bull-bear-debate";
import { MultiAgentAnalysis } from "@/components/stock/agent-analysis";
import { RiskAnalysis } from "@/components/stock/risk-analysis";
import { PortfolioDecision } from "@/components/stock/portfolio-decision";
import { ReflectionMemory } from "@/components/stock/reflection-memory";
import { LiveRail } from "@/components/stock/live-rail";
import { AnalyzingState } from "@/components/stock/analyzing-state";
import { CompanyTimeline } from "@/components/stock/company-timeline";
import { ThesisHistory } from "@/components/stock/thesis-history";
import { BusinessEnginesSection } from "@/components/stock/business-engines";
import { ResearchArchive } from "@/components/stock/research-archive";
import { StockDetail, AnalysisStartResponse, StockInsights } from "@/types";
import { findStock } from "@/data/stocks";
import { syncRadarFull, parseConsensus } from "@/lib/radar-store";
import { upsertFeedFromInsights } from "@/lib/livefeed-store";
import { Skeleton } from "@/components/ui/skeleton";
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
  const [isStarting, setIsStarting] = useState(false);
  const stockInfo = findStock(ticker);
  const displayName = stockInfo?.name ?? ticker;

  const BOOT_STEPS = [
    "连接市场数据",
    "基本面分析智能体就绪",
    "情绪分析引擎就绪",
    "辩论系统在线",
    "仓位引擎就绪",
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
        body: JSON.stringify({ ticker, market, mode: "standard", language: "zh" }),
      });
      const data: AnalysisStartResponse = await res.json();
      if (data.success) {
        router.push(`/analysis/${data.session_id}`);
      }
    } catch {
      router.push(`/analysis/sess_${ticker.toLowerCase()}_${Date.now()}`);
    }
  }, [ticker, router, stockInfo, BOOT_STEPS]);

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
            {"尚未对该标的进行 AI 分析"}
          </p>
          <p className="text-[10px] font-mono text-[var(--text-secondary)]/50 mb-8">
            {"8 个 AI 智能体将组成投资委员会 · 多维分析 · 生成完整研究报告"}
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
                {"正在启动 AI 投资委员会..."}
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                {"启动 AI 分析"}
              </>
            )}
          </motion.button>

          {/* back button */}
          <button
            onClick={() => window.history.back()}
            className="flex items-center gap-1.5 mx-auto text-xs text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] transition-colors font-mono"
          >
            <ArrowLeft className="w-3 h-3" />
            {"返回上一页"}
          </button>
        </motion.div>
      </main>
    </div>
  );
}

export default function StockDetailPage() {
  const params = useParams();
  const ticker = (params.ticker as string).toUpperCase();
  const [reanalyzeSessionId, setReanalyzeSessionId] = useState<string | null>(null);
  const [isStartingReanalysis, setIsStartingReanalysis] = useState(false);
  const [reanalyzeError, setReanalyzeError] = useState<string | null>(null);
  const reanalyzeInvalidatedRef = useRef<string | null>(null);
  const reanalyzeFailedRef = useRef<string | null>(null);

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
        if (!r.ok) throw new Error("未找到");
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

  const qc = useQueryClient();

  const { data: reanalyzeStatus } = useQuery<{
    success: boolean;
    data?: {
      status: "pending" | "running" | "completed" | "failed";
      error_message?: string | null;
    };
  }>({
    queryKey: ["analysis-session", reanalyzeSessionId],
    queryFn: () => fetch(`/api/analysis/${reanalyzeSessionId}`).then((r) => r.json()),
    enabled: !!reanalyzeSessionId,
    refetchInterval: (query) => {
      const s = (query.state.data as { data?: { status?: string } } | undefined)?.data?.status;
      if (s === "completed" || s === "failed") return false;
      return 3000;
    },
    refetchIntervalInBackground: true,
  });

  const reanalyzeSessionStatus = reanalyzeStatus?.data?.status;
  const isReanalyzing =
    !!reanalyzeSessionId &&
    reanalyzeSessionStatus !== "completed" &&
    reanalyzeSessionStatus !== "failed";

  const handleReanalyze = useCallback(async () => {
    setIsStartingReanalysis(true);
    setReanalyzeError(null);
    try {
      const stockInfo = findStock(ticker);
      const res = await fetch("/api/analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ticker,
          market: stockInfo?.market ?? "US",
          mode: "standard",
          language: "zh",
        }),
      });
      const result: AnalysisStartResponse = await res.json();
      if (result.success) {
        reanalyzeInvalidatedRef.current = null;
        reanalyzeFailedRef.current = null;
        setReanalyzeSessionId(result.session_id);
      } else {
        setReanalyzeError(result.error ?? "启动分析失败，请重试");
      }
    } catch {
      setReanalyzeError("启动分析失败，请检查网络后重试");
    } finally {
      setIsStartingReanalysis(false);
    }
  }, [ticker]);

  useEffect(() => {
    if (!reanalyzeSessionId) return;
    if (reanalyzeSessionStatus !== "completed") return;
    if (reanalyzeInvalidatedRef.current === reanalyzeSessionId) return;
    reanalyzeInvalidatedRef.current = reanalyzeSessionId;
    qc.invalidateQueries({ queryKey: ["stock", ticker] });
    qc.invalidateQueries({ queryKey: ["stock-insights", ticker] });
    qc.invalidateQueries({ queryKey: ["stock-timeline", ticker] });
    qc.invalidateQueries({ queryKey: ["stock-theses", ticker] });
    qc.invalidateQueries({ queryKey: ["stock-research-history", ticker] });
    qc.invalidateQueries({ queryKey: ["stock-overview", ticker] });
    qc.invalidateQueries({ queryKey: ["stock-memory", ticker] });
  }, [reanalyzeSessionStatus, reanalyzeSessionId, qc, ticker]);

  useEffect(() => {
    if (!reanalyzeSessionId) return;
    if (reanalyzeSessionStatus !== "failed") return;
    if (reanalyzeFailedRef.current === reanalyzeSessionId) return;
    reanalyzeFailedRef.current = reanalyzeSessionId;
    setReanalyzeError(reanalyzeStatus?.data?.error_message ?? "分析失败，请重试");
  }, [reanalyzeSessionStatus, reanalyzeSessionId, reanalyzeStatus]);

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

    const judgeDebate = insights.debate?.["judge"] ?? insights.debate?.["裁判"];
    const judgeConfidence: number | undefined = judgeDebate?.confidence;
    if (judgeConfidence && judgeConfidence > 0) overrides.conviction = judgeConfidence;

    const suggestedExposure: string | undefined = insights.trading?.suggested_exposure;
    if (suggestedExposure) overrides.exposure = suggestedExposure;

    if (insights.analysts) {
      const analystVerdicts = Object.values(insights.analysts) as { verdict?: string }[];
      const bull = analystVerdicts.filter(v => v?.verdict === "Bullish" || v?.verdict === "看涨" || v?.verdict === "看多").length;
      const bear = analystVerdicts.filter(v => v?.verdict === "Bearish" || v?.verdict === "看跌" || v?.verdict === "看空").length;
      const neutral = analystVerdicts.length - bull - bear;
      const judgeVerdict = judgeDebate?.verdict ?? "";
      const judgeBull = (judgeVerdict === "Bull Wins" || judgeVerdict.includes("多方")) ? 1 : 0;
      const judgeBear = (judgeVerdict === "Bear Wins" || judgeVerdict.includes("空方")) ? 1 : 0;
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
    return (
      <AnalyzingState
        ticker={ticker}
        sessionId={data.session_id}
        invalidateKeys={[
          ["stock", ticker],
          ["stock-insights", ticker],
          ["stock-timeline", ticker],
          ["stock-theses", ticker],
          ["stock-research-history", ticker],
          ["stock-overview", ticker],
          ["stock-memory", ticker],
        ]}
      />
    );
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
          {"⚡ AI 投资委员会工作台"}
        </h1>
        <p className="text-[10px] text-[var(--text-secondary)]/60 mt-0.5 font-mono">
          {"8 个 AI 智能体实时协作 · 多维分析 · 动态决策"}
        </p>
      </div>

      <main className="px-4 md:px-6 py-4 max-w-[1400px] mx-auto space-y-5">
        <StockHeader
          ticker={d.ticker}
          name={d.name}
          marketCap={d.marketCap}
          pe={d.pe}
          sector={d.sector}
        />

        <section className="space-y-5">
          <InvestmentRationale ticker={ticker} />

          <ProphetIndicator ticker={ticker} />

          <FinalDecision
            signal={d.committeeDecision.signal}
            conviction={d.committeeDecision.conviction}
            consensus={d.committeeDecision.consensus}
            recommendedExposure={d.committeeDecision.recommendedExposure}
            timeHorizon={d.committeeDecision.timeHorizon}
            rationale={d.committeeDecision.rationale}
            reportDate={d.updatedAt}
            price={d.price}
            change={d.change}
            changePercent={d.changePercent}
            thesis={insights?.thesis}
            onReanalyze={handleReanalyze}
            isReanalyzing={isStartingReanalysis || isReanalyzing}
            reanalyzeError={reanalyzeError}
          >
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
          </FinalDecision>

          <ReflectionMemory ticker={ticker} />
        </section>

        <CompanyTimeline ticker={ticker} />

        <ThesisHistory ticker={ticker} />

        <BusinessEnginesSection ticker={ticker} />

        <ResearchArchive ticker={ticker} />
      </main>
    </div>
  );
}

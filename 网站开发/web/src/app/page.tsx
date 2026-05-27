"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { GlobalMarketState } from "@/components/dashboard/global-market-state";
import { AIResearchConsole } from "@/components/dashboard/research-console";
import { OpportunityRadar } from "@/components/dashboard/opportunity-radar";
import { ConvictionIdeas } from "@/components/dashboard/conviction-ideas";
import { RiskTerminal } from "@/components/dashboard/risk-terminal";
import { SectorHeatmap } from "@/components/dashboard/sector-heatmap";
import { LiveFeed } from "@/components/dashboard/live-feed";
import { DashboardData, GlobalMarketState as GlobalMarketStateType } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomRadarEntries } from "@/lib/radar-store";
import { getCustomMemoEntries, seedMemosFromApi } from "@/lib/memo-store";
import { getRiskAlerts, seedRiskAlertsFromApi } from "@/lib/risk-alert-store";
import { useMemo, useState, useEffect } from "react";

function DashboardSkeleton() {
  return (
    <div className="space-y-10 px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
      <div>
        <Skeleton className="h-3 w-28 mb-4 bg-[var(--panel2)]" />
        <div className="grid grid-cols-6 gap-3">
          {Array.from({ length: 6 }).map((_, i) => (
            <Skeleton key={i} className="h-20 rounded-[20px] bg-[var(--panel2)]" />
          ))}
        </div>
      </div>
      <div>
        <Skeleton className="h-3.5 w-28 mb-1.5 bg-[var(--panel2)]" />
        <Skeleton className="h-2.5 w-40 bg-[var(--panel2)]" />
        <Skeleton className="h-96 rounded-[24px] bg-[var(--panel2)] mt-4" />
      </div>
    </div>
  );
}

export default function DashboardPage() {
  const { data, isLoading, error } = useQuery<{
    success: boolean;
    data: DashboardData;
  }>({
    queryKey: ["dashboard"],
    queryFn: () => fetch("/api/dashboard").then((r) => r.json()),
    refetchInterval: 30_000,
  });

  // 市场数据 — 独立 query，每天拉一次即可（staleTime 23h）
  const { data: marketData } = useQuery<{
    success: boolean;
    data: GlobalMarketStateType;
    updatedAt?: string;
    fetchDate?: string;
  }>({
    queryKey: ["market"],
    queryFn: () => fetch("/api/market").then((r) => r.json()),
    staleTime: 23 * 60 * 60 * 1000,   // 23 小时内不重新 fetch
    refetchInterval: 24 * 60 * 60 * 1000, // 24 小时自动刷新
  });

  // 雷达编辑版本号 — 编辑保存后 +1 触发 useMemo 重算
  const [radarKey, setRadarKey] = useState(0);

  // 备忘录编辑版本号
  const [memoKey, setMemoKey] = useState(0);

  // 风险警报版本号 — 雷达分析完成后 +1 触发重渲染
  const [riskKey, setRiskKey] = useState(0);

  // 首次 API 数据到达时，种子化 localStorage（仅当 localStorage 为空）
  useEffect(() => {
    if (data?.data?.memos?.length) {
      seedMemosFromApi(data.data.memos);
    }
    if (data?.data?.riskAlerts?.length) {
      seedRiskAlertsFromApi(data.data.riskAlerts);
    }
  }, [data?.data?.memos, data?.data?.riskAlerts]);

  // Hooks 必须在条件返回前调用，保证顺序一致
  const mergedOpportunities = useMemo(() => {
    const apiOpportunities = data?.data?.opportunities ?? [];
    const custom = getCustomRadarEntries();
    // localStorage 有数据 → 以 localStorage 为唯一数据源
    // localStorage 为空 → 首次使用 API 数据
    if (custom.length > 0) return custom;
    return apiOpportunities;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data?.opportunities, radarKey]);

  const mergedMemos = useMemo(() => {
    const apiMemos = data?.data?.memos ?? [];
    const custom = getCustomMemoEntries();
    if (custom.length > 0) return custom;
    return apiMemos;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data?.memos, memoKey]);

  const riskAlerts = useMemo(() => {
    const stored = getRiskAlerts();
    if (stored.length > 0) return stored;
    return data?.data?.riskAlerts ?? [];
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data?.riskAlerts, riskKey]);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data?.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--text-secondary)]">数据加载失败，请稍后重试</p>
      </div>
    );
  }

  const d = data.data;

  // 优先使用实时市场数据（来自 /api/market），fallback 到 dashboard mock
  const ms = marketData?.data ?? d.marketState;
  const marketIndicators = [
    ms.usMarket,
    ms.hkMarket,
    ms.cnMarket,
    ms.vix,
    ms.aiSectorMomentum,
    ms.marketRiskLevel,
  ];

  return (
    <div className="min-h-screen">
      <Header />

      {/* 主内容区 */}
      <main className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto space-y-10">
        {/* 1. 全球市场状态 */}
        <GlobalMarketState data={marketIndicators} fetchDate={marketData?.fetchDate} />

        {/* 1.5. AI 研究控制台 */}
        <AIResearchConsole />

        {/* 2. AI 机会雷达（Hero） */}
        <OpportunityRadar
          data={mergedOpportunities}
          onSave={() => { setRadarKey((k) => k + 1); setMemoKey((k) => k + 1); setRiskKey((k) => k + 1); }}
        />

        {/* 3. 投资备忘录 */}
        <ConvictionIdeas data={mergedMemos} onSave={() => setMemoKey((k) => k + 1)} />

        {/* 4. 风险终端 */}
        <RiskTerminal data={riskAlerts} />

        {/* 4.5. AI 实时信息流 */}
        <LiveFeed data={d.liveFeed} />

        {/* 5. 板块资金流向 */}
        <SectorHeatmap data={d.sectorFlow} />

        {/* 页脚 */}
        <div className="text-center pt-4 pb-8">
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
            数据更新 ·{" "}
            {new Date(d.updatedAt).toLocaleString("zh-CN", {
              year: "numeric",
              month: "2-digit",
              day: "2-digit",
              hour: "2-digit",
              minute: "2-digit",
            })}
          </span>
        </div>
      </main>
    </div>
  );
}

"use client";

import { useQuery } from "@tanstack/react-query";
import { Header } from "@/components/layout/header";
import { AIResearchConsole } from "@/components/dashboard/research-console";
import { CompanyCenter } from "@/components/dashboard/company-center";
import { OpportunityRadar } from "@/components/dashboard/opportunity-radar";
import { PrivateZone } from "@/components/auth/PrivateZone";
import { DashboardData } from "@/types";
import { Skeleton } from "@/components/ui/skeleton";
import { getCustomRadarEntries } from "@/lib/radar-store";
import { useMemo, useState, useEffect } from "react";

function DashboardSkeleton() {
  return (
    <div className="space-y-10 px-4 md:px-6 py-6 max-w-[1600px] mx-auto">
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

  const [radarKey, setRadarKey] = useState(0);

  useEffect(() => {
    function onRadarChange() {
      setRadarKey((k) => k + 1);
    }
    window.addEventListener("ta_radar_change", onRadarChange);
    setRadarKey((k) => k + 1);
    return () => window.removeEventListener("ta_radar_change", onRadarChange);
  }, []);

  const mergedOpportunities = useMemo(() => {
    const apiOpportunities = data?.data?.opportunities ?? [];
    const custom = getCustomRadarEntries();
    if (custom !== null) return custom;
    return apiOpportunities;
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [data?.data?.opportunities, radarKey]);

  if (isLoading) return <DashboardSkeleton />;
  if (error || !data?.data) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <p className="text-[var(--text-secondary)]">{"数据加载失败，请稍后重试"}</p>
      </div>
    );
  }

  const d = data.data;

  return (
    <div className="min-h-screen">
      <Header />

      <main className="px-4 md:px-6 py-6 max-w-[1600px] mx-auto space-y-10">
        {/* 0. 已研究公司 */}
        <CompanyCenter />

        {/* 1. AI 研究控制台 */}
        <PrivateZone label={"AI 研究控制台"}>
          <AIResearchConsole />
        </PrivateZone>

        {/* 2. AI 机会雷达 */}
        <OpportunityRadar
          data={mergedOpportunities}
          onSave={() => setRadarKey((k) => k + 1)}
        />

        {/* 底部 */}
        <div className="text-center pt-4 pb-8">
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
            {"全部更新于"} ·{" "}
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

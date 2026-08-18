"use client";

import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Gauge, Sparkles, TrendingUp, ShieldAlert, Target } from "lucide-react";
import { CompanyDashboardSnapshot } from "../../types";
import { RiskLevel } from "../../types/enums";
import { RISK_LABELS, RISK_COLORS } from "../../content/labels";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

interface Props {
  ticker: string;
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function StatCard({
  icon,
  label,
  value,
  valueColor,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
  valueColor?: string;
}) {
  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3">
      <div className="flex items-center gap-1.5 mb-1.5 text-[var(--text-secondary)]/60">
        {icon}
        <span className="text-[10px]">{label}</span>
      </div>
      <div
        className="text-[15px] font-semibold"
        style={{ color: valueColor ?? "var(--text-primary)" }}
      >
        {value}
      </div>
    </div>
  );
}

export function CompanyOverview({ ticker }: Props) {
  const { data, isLoading } = useQuery<{
    success: boolean;
    data: CompanyDashboardSnapshot | null;
  }>({
    queryKey: ["stock-overview", ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}/overview`).then((r) => r.json()),
    retry: false,
  });

  const overview = data?.data ?? null;
  const riskLevel =
    overview?.risk_level && overview.risk_level in RiskLevel
      ? (overview.risk_level as RiskLevel)
      : null;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"公司概览"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Gauge className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {"一分钟了解公司"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : !overview ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无公司概览数据"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"运行首次分析后自动生成公司概览"}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
              <StatCard
                icon={<Target className="w-3 h-3" />}
                label="当前评分"
                value={overview.score != null ? String(overview.score) : "暂无数据"}
              />
              <StatCard
                icon={<TrendingUp className="w-3 h-3" />}
                label="投资建议"
                value={overview.rating ?? "暂无数据"}
              />
              <StatCard
                icon={<ShieldAlert className="w-3 h-3" />}
                label="风险等级"
                value={riskLevel ? RISK_LABELS[riskLevel] : overview.risk_level ?? "暂无数据"}
                valueColor={riskLevel ? RISK_COLORS[riskLevel] : undefined}
              />
              <StatCard
                icon={<Sparkles className="w-3 h-3" />}
                label="所属行业"
                value={overview.industry ?? "暂无数据"}
              />
              <StatCard
                icon={<Sparkles className="w-3 h-3" />}
                label="所属板块"
                value={overview.sector ?? "暂无数据"}
              />
              <StatCard
                icon={<Target className="w-3 h-3" />}
                label="建议敞口"
                value={overview.opportunity ?? "暂无数据"}
              />
            </div>

            {overview.summary && (
              <div className="p-3 rounded-xl bg-[var(--panel2)]/40 border border-[var(--border-custom)]">
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed">
                  {stripAllMarkdown(overview.summary)}
                </p>
              </div>
            )}

            <div className="text-[10px] text-[var(--text-secondary)]/50 font-mono">
              {`更新时间：${formatUpdatedAt(overview.updated_at)}`}
            </div>
          </div>
        )}
      </div>
    </motion.section>
  );
}

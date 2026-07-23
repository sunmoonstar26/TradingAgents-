"use client";

import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Building2, Sparkles } from "lucide-react";
import { CompanyDashboardSnapshot } from "@/types";
import { RiskLevel } from "@/types/enums";
import { RISK_LABELS, RISK_COLORS } from "@/content/labels";

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

// company.updated_at 来自 LEFT JOIN company_dashboard，类型标注为 string，
// 但公司还没有 dashboard 记录时运行期实际是 null，直接 new Date(null) 会显示 1970/01/01，
// 这里按其他字段（如 rating ?? "暂无数据"）同样的兜底风格处理，而不改动共享类型。
function formatUpdatedAtOrFallback(iso: string | null | undefined): string {
  return iso ? formatUpdatedAt(iso) : "暂无数据";
}

function CompanyCard({ company }: { company: CompanyDashboardSnapshot }) {
  const router = useRouter();
  const riskLevel =
    company.risk_level && company.risk_level in RiskLevel
      ? (company.risk_level as RiskLevel)
      : null;

  return (
    <button
      onClick={() => router.push(`/stock/${company.ticker}`)}
      className="text-left rounded-xl border border-[var(--border-custom)] p-3 hover:border-[var(--blue)]/50 transition-colors"
    >
      <div className="flex items-center justify-between mb-2">
        <span className="text-[13px] font-semibold text-[var(--text-primary)]">
          {company.ticker}
        </span>
        {riskLevel && (
          <span
            className="text-[10px] font-mono px-1.5 py-0.5 rounded"
            style={{ color: RISK_COLORS[riskLevel], backgroundColor: `${RISK_COLORS[riskLevel]}1A` }}
          >
            {RISK_LABELS[riskLevel]}
          </span>
        )}
      </div>
      <p className="text-[11px] text-[var(--text-secondary)] truncate mb-2">
        {company.name}
      </p>
      <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]/60 font-mono">
        <span>{company.rating ?? "暂无数据"}</span>
        <span>{company.score != null ? `评分 ${company.score}` : "—"}</span>
      </div>
      <div className="text-[10px] text-[var(--text-secondary)]/40 font-mono mt-1">
        {formatUpdatedAtOrFallback(company.updated_at)}
      </div>
    </button>
  );
}

export function CompanyCenter() {
  const { data, isLoading } = useQuery<{
    success: boolean;
    data: CompanyDashboardSnapshot[];
  }>({
    queryKey: ["companies"],
    queryFn: () => fetch("/api/companies").then((r) => r.json()),
    retry: false,
  });

  const companies = data?.data ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"已研究公司"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Building2 className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {"公司研究档案"}
          </span>
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : companies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无已研究公司"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"运行下方的 AI 分析开始第一次研究"}
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
            {companies.map((c) => (
              <CompanyCard key={c.ticker} company={c} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

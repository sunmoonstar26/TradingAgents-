"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Sparkles, Pencil, Check, X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { CompanyDashboardSnapshot } from "@/types";
import { RiskLevel } from "@/types/enums";
import { RISK_LABELS, RISK_COLORS } from "@/content/labels";
import { getHiddenTickers, hideTicker, unhideTicker } from "@/lib/company-center-store";

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

function CompanyCard({
  company,
  isEditing,
  onRemove,
}: {
  company: CompanyDashboardSnapshot;
  isEditing: boolean;
  onRemove: (ticker: string) => void;
}) {
  const router = useRouter();
  const riskLevel =
    company.risk_level && company.risk_level in RiskLevel
      ? (company.risk_level as RiskLevel)
      : null;

  return (
    <div className="relative">
      <button
        onClick={() => router.push(`/stock/${company.ticker}`)}
        className="w-full text-left rounded-xl border border-[var(--border-custom)] p-3 hover:border-[var(--blue)]/50 transition-colors"
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
      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(company.ticker);
          }}
          aria-label="移除公司"
          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[var(--panel2)] border border-[var(--border-custom)] text-[var(--text-secondary)] hover:text-[var(--red)] hover:border-[var(--red)]/50 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}

function AddCompanyInput({
  allCompanies,
  hiddenTickers,
  onAdd,
}: {
  allCompanies: CompanyDashboardSnapshot[];
  hiddenTickers: Set<string>;
  onAdd: (ticker: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startAdding = () => {
    setTicker("");
    setError(null);
    setIsAdding(true);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setError(null);
  };

  const submitAdd = () => {
    const target = ticker.trim().toUpperCase();
    if (target === "") return;

    const found = allCompanies.find((c) => c.ticker.toUpperCase() === target);
    if (!found) {
      setError("该公司还没有分析记录，请先运行 AI 分析");
      return;
    }
    if (!hiddenTickers.has(target)) {
      setError("该公司已在列表中");
      return;
    }
    onAdd(target);
    setIsAdding(false);
    setError(null);
  };

  if (!isAdding) {
    return (
      <button
        onClick={startAdding}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border-custom)] p-3 h-full min-h-[96px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--blue)]/50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[11px]">{"添加公司"}</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3 flex flex-col gap-2">
      <input
        autoFocus
        value={ticker}
        onChange={(e) => {
          setTicker(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitAdd();
          if (e.key === "Escape") cancelAdding();
        }}
        placeholder="输入股票代码"
        className="w-full bg-transparent border border-[var(--border-custom)] rounded-lg px-2 py-1 text-[12px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/60"
      />
      {error && <p className="text-[10px] text-[var(--red)]">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submitAdd}
          className="flex-1 text-[11px] rounded-lg bg-[var(--blue)]/10 text-[var(--blue)] py-1 hover:bg-[var(--blue)]/20 transition-colors"
        >
          {"确认"}
        </button>
        <button
          onClick={cancelAdding}
          className="flex-1 text-[11px] rounded-lg border border-[var(--border-custom)] text-[var(--text-secondary)] py-1 hover:text-[var(--text-primary)] transition-colors"
        >
          {"取消"}
        </button>
      </div>
    </div>
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

  const allCompanies = data?.data ?? [];

  const [isEditing, setIsEditing] = useState(false);
  const [hiddenTickers, setHiddenTickers] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    setHiddenTickers(new Set(getHiddenTickers()));
  }, []);

  const handleRemove = (ticker: string) => {
    hideTicker(ticker);
    setHiddenTickers(new Set(getHiddenTickers()));
  };

  const handleUnhide = (ticker: string) => {
    unhideTicker(ticker);
    setHiddenTickers(new Set(getHiddenTickers()));
  };

  const visibleCompanies = allCompanies.filter(
    (c) => !hiddenTickers.has(c.ticker.toUpperCase())
  );
  const hiddenCompanies = allCompanies.filter((c) =>
    hiddenTickers.has(c.ticker.toUpperCase())
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--blue)]" />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {"公司研究档案"}
            </span>
          </div>
          {!isLoading && allCompanies.length > 0 && (
            <button
              onClick={() => setIsEditing((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isEditing ? (
                <>
                  <Check className="w-3 h-3" />
                  {"完成"}
                </>
              ) : (
                <>
                  <Pencil className="w-3 h-3" />
                  {"编辑"}
                </>
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : allCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无已研究公司"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"运行下方的 AI 分析开始第一次研究"}
            </p>
          </div>
        ) : visibleCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[12px] text-[var(--text-secondary)]">
              {"所有公司已从展示区移除"}
            </p>
            <button
              onClick={() => setShowHidden(true)}
              className="mt-2 text-[11px] text-[var(--blue)] hover:underline"
            >
              {`查看已移除的 ${hiddenCompanies.length} 家公司`}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <AnimatePresence>
              {visibleCompanies.map((c) => (
                <motion.div
                  key={c.ticker}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <CompanyCard company={c} isEditing={isEditing} onRemove={handleRemove} />
                </motion.div>
              ))}
            </AnimatePresence>
            {isEditing && (
              <AddCompanyInput
                allCompanies={allCompanies}
                hiddenTickers={hiddenTickers}
                onAdd={handleUnhide}
              />
            )}
          </div>
        )}

        {isEditing && hiddenCompanies.length > 0 && (
          <div className="mt-4 border-t border-[var(--border-custom)] pt-3">
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="flex w-full items-center justify-between text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span>{`已移除 (${hiddenCompanies.length})`}</span>
              {showHidden ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showHidden && (
              <div className="mt-2 flex flex-col gap-1.5">
                {hiddenCompanies.map((c) => (
                  <div
                    key={c.ticker}
                    className="flex items-center justify-between rounded-lg bg-[var(--panel2)]/40 px-2.5 py-1.5"
                  >
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {c.ticker}
                      </span>{" "}
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleUnhide(c.ticker)}
                      className="text-[10px] text-[var(--blue)] hover:underline"
                    >
                      {"加回"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}


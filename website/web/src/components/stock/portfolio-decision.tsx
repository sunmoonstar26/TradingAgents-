"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { PositionAllocation, TradingInsight } from "../../types";
import { Target, TrendingUp, TrendingDown, Shield, ChevronRight, FileText, CheckCircle2, AlertTriangle } from "lucide-react";
import { useTranslations } from "next-intl";

interface Props {
  data: PositionAllocation;
  ticker: string;
  tradingInsight?: TradingInsight;
}

export function PortfolioDecision({ data, ticker, tradingInsight }: Props) {
  const t = useTranslations("stockComponents");
  const hasInsight = tradingInsight && !tradingInsight.error;
  const action = hasInsight ? tradingInsight.action : "";
  const rationale = hasInsight ? tradingInsight.allocation_rationale : "";
  const suggested = hasInsight ? tradingInsight.suggested_exposure : data.suggestedExposure;
  const confidence = hasInsight ? tradingInsight.confidence : 80;
  const increaseConds = hasInsight ? tradingInsight.increase_conditions.slice(0, 1) : [];
  const reduceConds = hasInsight ? tradingInsight.reduce_conditions.slice(0, 1) : [];
  const hedgeConds = hasInsight ? tradingInsight.hedge_conditions.slice(0, 1) : [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {t("positionDecisionFramework")}
      </h2>

      <div className="card-terminal !p-0 overflow-hidden h-[320px] md:h-[400px] flex flex-col">
        {/* 头部 */}
        <div className="px-4 py-3 border-b border-[var(--border-custom)] flex items-center gap-2 shrink-0">
          <Target className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">{t("positionDecision")}</span>
          <span className="ml-auto text-[10px] font-mono text-[var(--text-secondary)]/60">
            {t("positionConfidence", { confidence })}
          </span>
        </div>

        <div className="p-4 space-y-3 overflow-y-auto flex-1">
          {/* 建议仓位 + 核心理由 */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
            <div className="text-center p-3 rounded-xl bg-[var(--blue)]/5 border border-[var(--blue)]/10">
              <div className="text-[10px] text-[var(--text-secondary)]/60 mb-1">{t("suggestedExposure")}</div>
              <div className="text-2xl font-mono font-bold text-[var(--blue)]">{suggested}</div>
            </div>
            <div className="sm:col-span-2 flex flex-col justify-center">
              {rationale ? (
                <p className="text-[12px] text-[var(--text-primary)] font-medium leading-relaxed line-clamp-2">
                  {rationale}
                </p>
              ) : (
                <p className="text-[12px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                  {data.sizingFactors.positive.slice(0, 2).join(" · ")}
                </p>
              )}
            </div>
          </div>

          {/* ── 3 个仓位核心逻辑 ── */}
          <div className="space-y-2 pt-1">
            {/* 逻辑 1：核心持仓理由 */}
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.05 }}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--panel2)]/60 border border-[var(--border-custom)]"
            >
              <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--text-secondary)]/60 mb-0.5">{t("holdingReason")}</p>
                <p className="text-[12px] text-[var(--text-primary)] font-medium leading-snug">
                  {increaseConds[0] || data.sizingFactors.positive[0] || t("aiTrendDominant")}
                </p>
              </div>
            </motion.div>

            {/* 逻辑 2：风险/回报 */}
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.1 }}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--panel2)]/60 border border-[var(--border-custom)]"
            >
              <AlertTriangle className="w-3.5 h-3.5 text-[var(--amber)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--text-secondary)]/60 mb-0.5">{t("riskReward")}</p>
                <p className="text-[12px] text-[var(--text-primary)] font-medium leading-snug">
                  {reduceConds[0] || data.sizingFactors.negative[0] || t("riskRewardAcceptable")}
                </p>
              </div>
            </motion.div>

            {/* 逻辑 3：对冲/防御 */}
            <motion.div
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ delay: 0.15 }}
              className="flex items-start gap-2 p-2.5 rounded-lg bg-[var(--panel2)]/60 border border-[var(--border-custom)]"
            >
              <Shield className="w-3.5 h-3.5 text-[var(--blue)] mt-0.5 shrink-0" />
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[var(--text-secondary)]/60 mb-0.5">{t("defensiveStrategy")}</p>
                <p className="text-[12px] text-[var(--text-primary)] font-medium leading-snug">
                  {hedgeConds[0] || t("maintainCashReserves")}
                </p>
              </div>
            </motion.div>
          </div>
        </div>

        <Link
          href={`/stock/${ticker}/allocation`}
          className="flex items-center justify-center gap-1.5 py-2.5 border-t border-[var(--border-custom)] text-[11px] text-[var(--blue)]/70 hover:text-[var(--blue)] hover:bg-[var(--blue)]/5 transition-colors font-medium shrink-0"
        >
          <FileText className="w-3 h-3" />
          {t("viewFullTradePlan")}
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.section>
  );
}

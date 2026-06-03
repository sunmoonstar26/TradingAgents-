"use client";

import { motion } from "framer-motion";
import { Signal, ReasonCapsule } from "../../types";
import { Shield, TrendingUp, AlertTriangle, Zap, ChevronDown, ChevronUp } from "lucide-react";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";
import { useState } from "react";
import { useTranslations } from "next-intl";

const signalConfig: Record<string, { bg: string; text: string; icon: typeof TrendingUp; glow: string }> = {
  "强烈买入": { bg: "bg-[var(--green)]/12", text: "text-[var(--green)]", icon: TrendingUp, glow: "0 0 40px rgba(34,197,94,0.3)" },
  "买入": { bg: "bg-[var(--green)]/10", text: "text-[var(--green)]", icon: TrendingUp, glow: "0 0 30px rgba(34,197,94,0.2)" },
  "增持": { bg: "bg-[var(--blue)]/12", text: "text-[var(--blue)]", icon: TrendingUp, glow: "0 0 30px rgba(59,130,246,0.25)" },
  "持有": { bg: "bg-[var(--amber)]/12", text: "text-[var(--amber)]", icon: Shield, glow: "0 0 20px rgba(245,158,11,0.15)" },
  "减持": { bg: "bg-[var(--red)]/10", text: "text-[var(--red)]", icon: AlertTriangle, glow: "0 0 30px rgba(239,68,68,0.2)" },
  "卖出": { bg: "bg-[var(--red)]/12", text: "text-[var(--red)]", icon: AlertTriangle, glow: "0 0 40px rgba(239,68,68,0.3)" },
};

const impactColors: Record<string, string> = {
  "高": "text-[var(--red)]",
  "中": "text-[var(--amber)]",
  "低": "text-[var(--text-secondary)]",
};

interface Props {
  signal: Signal;
  conviction: number;
  consensus: string;
  recommendedExposure: string;
  timeHorizon: string;
  rationale: string;
  reportDate?: string;
  thesis?: {
    investment_thesis?: string;
    decision_summary?: string;
    conviction?: number;
    key_reasons?: ReasonCapsule[];
    time_horizon?: string;
    primary_risk_summary?: string;
  };
}

export function FinalDecision({
  signal,
  conviction,
  consensus,
  recommendedExposure,
  timeHorizon,
  rationale,
  reportDate,
  thesis,
}: Props) {
  const t = useTranslations("stockComponents");
  const cfg = signalConfig[signal] || signalConfig["持有"];
  const Icon = cfg.icon;
  const [expanded, setExpanded] = useState(false);

  // 使用真实萃取数据或回退到原始 rationale
  const thesisText = thesis?.investment_thesis || stripAllMarkdown(rationale).slice(0, 150);
  const reasons = thesis?.key_reasons || [];
  const thesisConviction = thesis?.conviction || conviction;
  const thesisHorizon = thesis?.time_horizon || timeHorizon;
  const riskSummary = thesis?.primary_risk_summary || "";

  // 格式化报告日期
  const formattedDate = reportDate
    ? new Date(reportDate).toLocaleString("zh-CN", {
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
        hour: "2-digit",
        minute: "2-digit",
      })
    : "";

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.1 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest flex items-center justify-between">
        <span>{t("committeeDecision")}</span>
        {formattedDate && (
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/50 tracking-normal normal-case">
            {formattedDate}
          </span>
        )}
      </h2>

      {/* ── Hero: Investment Thesis ── */}
      <div
        className="card-hero p-6 md:p-8 space-y-6 relative overflow-hidden"
        style={{ boxShadow: cfg.glow }}
      >
        {/* 顶部信号行 */}
        <div className="flex items-center gap-4">
          <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center ${cfg.bg} shrink-0`}>
            <Icon className={`w-6 h-6 md:w-7 md:h-7 ${cfg.text}`} />
          </div>
          <div className="min-w-0">
            <div className={`text-xl md:text-2xl font-bold ${cfg.text} tracking-tight`}>
              {signal}
            </div>
            <div className="text-[13px] md:text-sm text-[var(--text-secondary)] leading-relaxed mt-1 line-clamp-2">
              {thesisText}
            </div>
          </div>
          <div className="ml-auto shrink-0 flex items-center gap-3">
            <div className="text-center">
              <div className="text-[10px] text-[var(--text-secondary)]/60 tracking-wider">{t("conviction")}</div>
              <div className="text-lg font-mono font-bold text-[var(--green)]">{thesisConviction}%</div>
            </div>
          </div>
        </div>

        {/* 决策理由 — Insight Capsules */}
        {reasons.length > 0 && (
          <div className="border-t border-[var(--border-custom)] pt-5 space-y-3">
            <div className="text-[11px] font-semibold text-[var(--text-secondary)]/80 uppercase tracking-wider">
              {t("coreReasons")}
            </div>
            {reasons.map((reason, idx) => (
              <motion.div
                key={idx}
                initial={{ opacity: 0, x: -8 }}
                animate={{ opacity: 1, x: 0 }}
                transition={{ delay: 0.1 + idx * 0.05 }}
                className="flex items-start gap-3 p-3 rounded-xl bg-[var(--panel2)]/60 border border-[var(--border-custom)] hover:border-[var(--blue)]/20 transition-colors group"
              >
                {/* Icon */}
                <div className="w-7 h-7 rounded-lg bg-[var(--blue)]/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Zap className="w-3.5 h-3.5 text-[var(--blue)]" />
                </div>

                {/* Content */}
                <div className="flex-1 min-w-0">
                  <div className="text-[13px] text-[var(--text-primary)] leading-relaxed font-medium">
                    {reason.insight}
                  </div>
                  <div className="flex items-center gap-3 mt-1.5">
                    {/* Source agents */}
                    <div className="flex items-center gap-1">
                      {reason.source_agents?.map((agent) => (
                        <span key={agent} className="text-[10px] text-[var(--text-secondary)]/60 bg-[var(--panel2)] px-1.5 py-0.5 rounded">
                          {agent}
                        </span>
                      ))}
                    </div>
                    {/* Confidence bar */}
                    <div className="flex items-center gap-1.5">
                      <div className="w-12 h-1 bg-[var(--panel2)] rounded-full overflow-hidden">
                        <div
                          className="h-full bg-[var(--green)] rounded-full"
                          style={{ width: `${reason.confidence}%` }}
                        />
                      </div>
                      <span className="text-[10px] font-mono text-[var(--green)]">{reason.confidence}%</span>
                    </div>
                    {/* Impact */}
                    <span className={`text-[10px] font-medium ${impactColors[reason.impact] || "text-[var(--text-secondary)]/60"}`}>
                      {reason.impact}{t("impactSuffix")}
                    </span>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        )}

        {/* 无萃取数据时：Hero 已展示投资论点，不重复显示原始 rationale */}

        {/* 底部元数据 */}
        <div className="flex items-center gap-4 text-[11px] text-[var(--text-secondary)]/60 pt-2 border-t border-[var(--border-custom)]">
          <span>{t("consensus")}：{consensus}</span>
          <span>·</span>
          <span>{t("suggestedExposure")}：{recommendedExposure}</span>
          <span>·</span>
          <span>{t("timeframe")}：{thesisHorizon}</span>
          {riskSummary && (
            <>
              <span>·</span>
              <span className="text-[var(--red)]/70">{t("risk")}：{riskSummary}</span>
            </>
          )}
        </div>
      </div>
    </motion.section>
  );
}

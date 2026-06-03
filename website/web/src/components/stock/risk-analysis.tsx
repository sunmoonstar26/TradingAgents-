"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { RiskExposure, RiskInsight } from "../../types";
import { RiskLevel } from "../../types/enums";
import { Shield, AlertTriangle, ChevronRight, FileText } from "lucide-react";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

interface Props {
  data: RiskExposure[];
  ticker: string;
  riskInsight?: RiskInsight;
}

const severityConfig: Record<string, { bg: string; text: string; border: string; dot: string }> = {
  [RiskLevel.HIGH]:   { bg: "rgba(239,68,68,0.08)", text: "var(--red)", border: "rgba(239,68,68,0.2)", dot: "bg-[var(--red)]" },
  [RiskLevel.MEDIUM]: { bg: "rgba(245,158,11,0.08)", text: "var(--amber)", border: "rgba(245,158,11,0.2)", dot: "bg-[var(--amber)]" },
  [RiskLevel.LOW]:    { bg: "rgba(34,197,94,0.06)", text: "var(--green)", border: "rgba(34,197,94,0.15)", dot: "bg-[var(--green)]" },
};

export function RiskAnalysis({ data, ticker, riskInsight }: Props) {
  const riskLevel = riskInsight?.overall_risk_level || RiskLevel.MEDIUM;
  const riskItems = riskInsight?.risk_items?.length ? riskInsight.risk_items.slice(0, 3) : [];
  const riskConfidence = riskInsight?.confidence;

  const levelCfg = severityConfig[riskLevel] || severityConfig[RiskLevel.MEDIUM];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.25 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        Risk Exposure
      </h2>

      <div
        className="card-terminal !p-0 overflow-hidden"
        style={{ borderColor: levelCfg.border }}
      >
        {/* 头部：总体风险等级 */}
        <div className="px-4 py-3 border-b border-[var(--border-custom)] flex items-center gap-2">
          <Shield className="w-4 h-4" style={{ color: levelCfg.text }} />
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">Risk Exposure</span>
          <span
            className="ml-auto px-2.5 py-1 rounded-full text-[11px] font-semibold"
            style={{ background: levelCfg.bg, color: levelCfg.text }}
          >
            {riskLevel} Risk
          </span>
          {riskConfidence && (
            <span className="text-[10px] font-mono text-[var(--text-secondary)]/60">
              {riskConfidence}%
            </span>
          )}
        </div>

        {/* Top 3 Risks */}
        {riskItems.length > 0 ? (
          <div className="p-3 space-y-2">
            {riskItems.map((item, i) => {
              const sev = severityConfig[item.severity] || severityConfig[RiskLevel.MEDIUM];
              return (
                <motion.div
                  key={i}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: i * 0.06 }}
                  className="flex items-start gap-3 p-3 rounded-lg hover:bg-white/[0.01] transition-colors"
                  style={{ background: sev.bg, border: `1px solid ${sev.border}` }}
                >
                  <div className="w-2 h-2 rounded-full mt-1.5 shrink-0" style={{ backgroundColor: sev.text }} />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-[12px] font-semibold text-[var(--text-primary)]">
                        {item.risk_type}
                      </span>
                      <span className="text-[10px] px-1.5 py-0.5 rounded" style={{ background: sev.bg, color: sev.text }}>
                        {item.severity}
                      </span>
                    </div>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                      {item.why_matters}
                    </p>
                  </div>
                </motion.div>
              );
            })}
          </div>
        ) : (
          /* 回退：原始风险暴露 4 列网格 */
          <div className="p-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
              {data.map((exp, i) => (
                <div
                  key={i}
                  className="p-3 rounded-lg"
                  style={{
                    background:
                      exp.level === RiskLevel.DANGER ? "rgba(239,68,68,0.06)" :
                      exp.level === RiskLevel.HIGH ? "rgba(245,158,11,0.06)" :
                      "rgba(59,130,246,0.04)",
                    border: `1px solid ${
                      exp.level === RiskLevel.DANGER ? "rgba(239,68,68,0.15)" :
                      exp.level === RiskLevel.HIGH ? "rgba(245,158,11,0.15)" :
                      "rgba(59,130,246,0.1)"
                    }`,
                  }}
                >
                  <p className="text-[11px] font-semibold text-[var(--text-secondary)]/70 mb-1">{exp.label}</p>
                  <p className="text-[13px] font-bold text-[var(--text-primary)] mb-1">
                    {exp.level === RiskLevel.DANGER ? "⚠ " : ""}{exp.level}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
                    {stripAllMarkdown(exp.detail)}
                  </p>
                </div>
              ))}
            </div>
          </div>
        )}

        <Link
          href={`/stock/${ticker}/risk-detail/neutral`}
          className="flex items-center justify-center gap-1.5 py-2.5 border-t border-[var(--border-custom)] text-[11px] text-[var(--blue)]/70 hover:text-[var(--blue)] hover:bg-[var(--blue)]/5 transition-colors font-medium"
        >
          <FileText className="w-3 h-3" />
          View Full Risk Assessment
          <ChevronRight className="w-3 h-3" />
        </Link>
      </div>
    </motion.section>
  );
}

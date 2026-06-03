"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { RiskAlert } from "../../types";
import { AlertLevel } from "../../types/enums";
import { AlertTriangle, ShieldAlert, AlertCircle } from "lucide-react";

const levelConfig: Record<string, { icon: typeof AlertTriangle; border: string; bg: string; text: string }> = {
  [AlertLevel.DANGER]: { icon: ShieldAlert, border: "border-l-[var(--red)]", bg: "bg-[var(--red)]/5", text: "text-[var(--red)]" },
  [AlertLevel.WARNING]: { icon: AlertTriangle, border: "border-l-[var(--amber)]", bg: "bg-[var(--amber)]/5", text: "text-[var(--amber)]" },
  [AlertLevel.WATCH]: { icon: AlertCircle, border: "border-l-[var(--blue)]", bg: "bg-[var(--blue)]/5", text: "text-[var(--blue)]" },
};

interface Props { data: RiskAlert[] }

export function RiskTerminal({ data }: Props) {
  const t = useTranslations("common");
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <h2 className="section-heading">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--red)] pulse-red" />
        {t("riskTerminal")}
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-3">
        {data.map((alert, i) => {
          const cfg = levelConfig[alert.level] || levelConfig[AlertLevel.WATCH];
          const Icon = cfg.icon;

          return (
            <motion.div
              key={i}
              className={`card-terminal !p-0 overflow-hidden border-l-2 ${cfg.border} ${alert.level === AlertLevel.DANGER ? "glow-red" : ""}`}
              initial={{ opacity: 0, y: 6 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: i * 0.06 }}
            >
              {/* 头部：图标 + 类型 + 等级 */}
              <div className="px-4 pt-4 pb-2 flex items-center gap-2">
                <Icon className={`w-4 h-4 shrink-0 ${cfg.text}`} />
                <span className="text-[12px] font-semibold text-[var(--text-primary)]">{alert.type}</span>
                <span
                  className={`ml-auto text-[10px] font-medium px-1.5 py-0.5 rounded ${cfg.bg} ${cfg.text}`}
                >
                  {alert.level}
                </span>
              </div>

              {/* 风险分数 — 大号居中 */}
              {alert.riskScore !== undefined && (
                <div className="px-4 pb-2">
                  <div className="flex items-center gap-3 p-2.5 rounded-lg bg-[var(--panel2)]/60">
                    <div className={`text-xl font-mono font-bold ${cfg.text}`}>
                      {alert.riskScore}
                    </div>
                    <div className="flex-1">
                      <div className="text-[10px] text-[var(--text-secondary)]/60 mb-1">{t("riskScore")}</div>
                      <div className="h-1.5 rounded-full bg-[var(--panel2)] overflow-hidden">
                        <motion.div
                          className={`h-full rounded-full ${alert.riskScore >= 75 ? "bg-[var(--red)]" : alert.riskScore >= 50 ? "bg-[var(--amber)]" : "bg-[var(--blue)]"}`}
                          initial={{ width: 0 }}
                          animate={{ width: `${alert.riskScore}%` }}
                          transition={{ duration: 0.5, delay: 0.1 }}
                        />
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* 核心风险 — 一句话 */}
              <div className="px-4 pb-3">
                <p className="text-[12px] text-[var(--text-secondary)] leading-snug line-clamp-2">
                  {alert.detail}
                </p>
              </div>

              {/* 底部：触发智能体 + 时间 */}
              <div className="mt-auto px-4 pb-3 pt-2 border-t border-[var(--border-custom)] flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-1.5">
                  <span className="text-[var(--text-secondary)]/50">{t("triggered")}</span>
                  {alert.triggeredBy?.slice(0, 2).map((agent, j) => (
                    <span key={j} className="font-mono px-1 py-0.5 rounded bg-[var(--panel2)] text-[var(--text-secondary)]/60">
                      {agent}
                    </span>
                  ))}
                  {alert.triggeredBy && alert.triggeredBy.length > 2 && (
                    <span className="text-[var(--text-secondary)]/30">+{alert.triggeredBy.length - 2}</span>
                  )}
                </div>
                <span className="font-mono text-[var(--text-secondary)]/40">{alert.timestamp}</span>
              </div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

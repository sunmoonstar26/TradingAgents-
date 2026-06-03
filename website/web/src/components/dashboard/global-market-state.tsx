"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";
import { MarketIndicator } from "../../types";
import { ArrowUp, ArrowDown, Minus } from "lucide-react";

function StatusBadge({ status }: { status: MarketIndicator["status"] }) {
  const t = useTranslations("market");
  const colors: Record<string, string> = {
    up: "bg-[var(--green)]/15 text-[var(--green)]",
    down: "bg-[var(--red)]/15 text-[var(--red)]",
    neutral: "bg-[var(--text-secondary)]/15 text-[var(--text-secondary)]",
    warning: "bg-[var(--amber)]/15 text-[var(--amber)]",
    danger: "bg-[var(--red)]/15 text-[var(--red)]",
  };
  const labels: Record<string, string> = {
    up: "看涨",
    down: "看跌",
    neutral: t("stable"),
    warning: "关注",
    danger: "危险",
  };
  return (
    <span
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${colors[status]}`}
    >
      {status === "up" && <ArrowUp className="w-2.5 h-2.5" />}
      {status === "down" && <ArrowDown className="w-2.5 h-2.5" />}
      {status === "neutral" && <Minus className="w-2.5 h-2.5" />}
      {labels[status]}
    </span>
  );
}

interface Props {
  data: MarketIndicator[];
  fetchDate?: string; // YYYY-MM-DD，来自 market.json
}

export function GlobalMarketState({ data, fetchDate }: Props) {
  const t = useTranslations("market");
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="flex items-center justify-between mb-3">
        <h2 className="section-heading !mb-0">{t("globalMarketStatus")}</h2>
        {fetchDate && (
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/40">
            {t("dataDate")} {fetchDate}
          </span>
        )}
      </div>      {/* 桌面端：6 列紧凑卡片网格 */}
      <div className="hidden md:grid md:grid-cols-6 gap-3">
        {data.map((item) => (
          <div key={item.label} className="card-terminal !p-4">
            <div className="flex items-center justify-between mb-1.5">
              <span className="text-[11px] text-[var(--text-secondary)]">
                {item.label}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">
              {item.value}
            </div>
            {item.change !== null && (
              <div
                className={`mt-1 text-[11px] font-mono ${
                  item.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                }`}
              >
                {item.change >= 0 ? "+" : ""}
                {item.change}%
              </div>
            )}
          </div>
        ))}
      </div>
      {/* 移动端：横向滚动 */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {data.map((item) => (
          <div key={item.label} className="card-terminal !p-3 min-w-[140px] shrink-0">
            <div className="flex items-center justify-between mb-1">
              <span className="text-[10px] text-[var(--text-secondary)]">
                {item.label}
              </span>
              <StatusBadge status={item.status} />
            </div>
            <div className="font-mono text-sm font-semibold text-[var(--text-primary)]">{item.value}</div>
            {item.change !== null && (
              <div
                className={`mt-0.5 text-[10px] font-mono ${
                  item.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                }`}
              >
                {item.change >= 0 ? "+" : ""}
                {item.change}%
              </div>
            )}
          </div>
        ))}
      </div>
    </motion.section>
  );
}

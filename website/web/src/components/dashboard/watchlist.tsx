"use client";

import { motion } from "framer-motion";
import { useTranslations } from "next-intl";

const watchlistItems = [
  { ticker: "NVDA", name: "英伟达", signal: "买入", change: 2.34 },
  { ticker: "TSLA", name: "特斯拉", signal: "增持", change: -1.22 },
  { ticker: "MSFT", name: "微软", signal: "持有", change: 0.45 },
  { ticker: "META", name: "Meta", signal: "买入", change: 1.87 },
  { ticker: "GOOGL", name: "谷歌", signal: "增持", change: 0.12 },
  { ticker: "AMZN", name: "亚马逊", signal: "增持", change: 0.89 },
];

const signalColors: Record<string, string> = {
  买入: "text-[var(--green)]",
  增持: "text-[var(--blue)]",
  持有: "text-[var(--amber)]",
};

export function Watchlist() {
  const t = useTranslations("dashboard");
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        {t("watchlistTitle")}
      </h2>
      <div className="card-terminal overflow-hidden">
        <div className="grid grid-cols-2 md:grid-cols-6 divide-x divide-[var(--border-custom)]">
          {watchlistItems.map((item) => (
            <div
              key={item.ticker}
              className="p-3 hover:bg-[var(--panel2)]/50 transition-colors cursor-pointer"
            >
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs font-semibold text-[var(--text-primary)]">
                  {item.ticker}
                </span>
                <span
                  className={`text-[10px] ${signalColors[item.signal]}`}
                >
                  {item.signal}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[var(--text-secondary)]">
                  {item.name}
                </span>
                <span
                  className={`font-mono text-[11px] ${
                    item.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                  }`}
                >
                  {item.change >= 0 ? "+" : ""}
                  {item.change}%
                </span>
              </div>
            </div>
          ))}
        </div>
      </div>
    </motion.section>
  );
}

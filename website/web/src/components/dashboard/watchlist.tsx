"use client";

import { motion } from "framer-motion";
import { Signal } from "../../types/enums";
import { SIGNAL_LABELS } from "../../content/labels";

const watchlistItems = [
  { ticker: "NVDA", name: "NVIDIA",    signal: Signal.BUY,  change: 2.34 },
  { ticker: "TSLA", name: "Tesla",     signal: Signal.BUY,  change: -1.22 },
  { ticker: "MSFT", name: "Microsoft", signal: Signal.HOLD, change: 0.45 },
  { ticker: "META", name: "Meta",      signal: Signal.BUY,  change: 1.87 },
  { ticker: "GOOGL", name: "Alphabet", signal: Signal.BUY,  change: 0.12 },
  { ticker: "AMZN", name: "Amazon",    signal: Signal.BUY,  change: 0.89 },
];

const signalColors: Record<string, string> = {
  [Signal.STRONG_BUY]:  "text-[var(--green)]",
  [Signal.BUY]:         "text-[var(--green)]",
  [Signal.HOLD]:        "text-[var(--amber)]",
  [Signal.SELL]:        "text-[var(--red)]",
  [Signal.STRONG_SELL]: "text-[var(--red)]",
};

export function Watchlist() {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.4 }}
    >
      <h2 className="mb-3 text-sm font-semibold text-[var(--text-secondary)] uppercase tracking-wider">
        Watchlist
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
                  {SIGNAL_LABELS[item.signal as Signal]}
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

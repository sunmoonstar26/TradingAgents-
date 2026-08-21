"use client";

import { useState, useCallback } from "react";
import { addToRadar, isInRadar } from "../../lib/radar-store";
import { OpportunityEntry } from "../../types";
import { Signal, RiskLevel } from "../../types/enums";

interface Props {
  ticker: string;
  name: string;
  marketCap: string;
  pe: string;
  sector: string;
}

/** 从股票基本信息构造默认的雷达条目 */
function buildRadarEntry(ticker: string, name: string): OpportunityEntry {
  return {
    ticker,
    name,
    signal: Signal.HOLD,
    conviction: 50,
    risk: RiskLevel.MEDIUM,
    consensus: { bullish: 0, neutral: 0, bearish: 0 },
    exposure: "低配",
    agentAlignment: {
      fundamental: false,
      technical: false,
      sentiment: false,
      macro: false,
      risk: false,
    },
    updatedAt: new Date().toISOString(),
  };
}

export function StockHeader({
  ticker,
  name,
  marketCap,
  pe,
  sector,
}: Props) {
  const [added, setAdded] = useState(() => isInRadar(ticker));

  const handleAdd = useCallback(() => {
    if (added) return;
    addToRadar(buildRadarEntry(ticker, name));
    setAdded(true);
  }, [added, ticker, name]);

  return (
    <div className="flex flex-col sm:flex-row sm:items-end sm:justify-between gap-2">
      <div>
        <div className="flex items-center gap-2 mb-1 flex-wrap">
          <span className="font-mono text-xl font-bold text-[var(--text-primary)]">
            {ticker}
          </span>
          <span className="text-sm text-[var(--text-secondary)]">{name}</span>
          <span className="inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium bg-[var(--panel2)] text-[var(--text-secondary)]">
            {sector}
          </span>
          {/* 添加至雷达 */}
          <button
            onClick={handleAdd}
            disabled={added}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[10px] font-mono font-medium transition-all duration-200 ${
              added
                ? "bg-[var(--green)]/10 text-[var(--green)] cursor-default"
                : "bg-[var(--blue)]/10 text-[var(--blue)] border border-[var(--blue)]/30 hover:bg-[var(--blue)]/20 hover:border-[var(--blue)]/50 active:scale-95"
            }`}
          >
            {added ? "✓ 已添加雷达" : "📡 添加至雷达"}
          </button>
        </div>
        <div className="text-[10px] font-mono text-[var(--text-secondary)]/60">
          {marketCap} · PE {pe}
        </div>
      </div>
    </div>
  );
}

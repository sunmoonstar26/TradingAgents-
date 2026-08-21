"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { TrendingUp, Shield, AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { Signal } from "../../types/enums";
import { SIGNAL_LABELS } from "../../content/labels";
import { getCustomRadarEntries } from "../../lib/radar-store";
import { getCustomMemoEntries } from "../../lib/memo-store";
import { useState, useEffect } from "react";

interface ResearchCard {
  ticker: string;
  name: string;
  signal: Signal;
  conviction: number;
  timeHorizon: string;
  headline: string;
  keyDriver: string;
  primaryRisk: string;
  agentCount: number;
  updatedAt: string;
}

const FEATURED: ResearchCard[] = [];


function formatUpdatedAt(iso: string): string {
  try {
    const diff = Date.now() - new Date(iso).getTime();
    const mins = Math.floor(diff / 60000);
    if (mins < 1) return "刚刚";
    if (mins < 60) return `${mins}分钟前`;
    const hrs = Math.floor(mins / 60);
    if (hrs < 24) return `${hrs}小时前`;
    const days = Math.floor(hrs / 24);
    return days === 1 ? "昨天" : `${days}天前`;
  } catch {
    return iso;
  }
}

function buildCards(): ResearchCard[] {
  const radarEntries = getCustomRadarEntries();
  if (!radarEntries || radarEntries.length === 0) return FEATURED;

  const memos = getCustomMemoEntries();
  const memoMap = new Map(memos.map((m) => [m.ticker, m]));

  // 按 updatedAt 倒序，最近分析的在前，最多取 6 张
  const sorted = [...radarEntries].sort((a, b) => {
    const ta = a.updatedAt ? new Date(a.updatedAt).getTime() : 0;
    const tb = b.updatedAt ? new Date(b.updatedAt).getTime() : 0;
    return tb - ta;
  }).slice(0, 6);

  return sorted.map((r) => {
    const memo = memoMap.get(r.ticker);
    return {
      ticker: r.ticker,
      name: r.name,
      signal: r.signal as Signal,
      conviction: r.conviction,
      timeHorizon: memo?.timeHorizon && memo.timeHorizon !== "—" ? memo.timeHorizon : "中期（3–6 个月）",
      headline: memo?.keyDriver && memo.keyDriver !== "—" ? memo.keyDriver : `${r.ticker} AI 分析已完成`,
      keyDriver: memo?.keyDriver && memo.keyDriver !== "—" ? memo.keyDriver : "查看完整分析了解详情",
      primaryRisk: memo?.primaryRisk && memo.primaryRisk !== "—" ? memo.primaryRisk : "查看完整风险分析",
      agentCount: 8,
      updatedAt: r.updatedAt ? formatUpdatedAt(r.updatedAt) : "最近",
    };
  });
}

const signalConfig: Record<Signal, { color: string; bg: string; icon: typeof TrendingUp }> = {
  [Signal.STRONG_BUY]: { color: "var(--green)", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  [Signal.BUY]:        { color: "var(--green)", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  [Signal.HOLD]:       { color: "var(--amber)", bg: "rgba(245,158,11,0.1)", icon: Shield },
  [Signal.SELL]:       { color: "var(--red)",   bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  [Signal.STRONG_SELL]:{ color: "var(--red)",   bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

export function FeaturedResearch() {
  const router = useRouter();
  const [cards, setCards] = useState<ResearchCard[]>(FEATURED);

  // 挂载后从 localStorage 读取（SSR 阶段 window 不可用）
  useEffect(() => {
    setCards(buildCards());

    function refresh() { setCards(buildCards()); }
    window.addEventListener("ta_radar_change", refresh);
    window.addEventListener("ta_memo_change", refresh);
    return () => {
      window.removeEventListener("ta_radar_change", refresh);
      window.removeEventListener("ta_memo_change", refresh);
    };
  }, []);

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{"热门研究"}</h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{"AI 投资委员会精选分析摘要"}</p>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/40">{"公开 · 无需登录"}</span>
      </div>

      {/* 桌面端：3列网格 */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {cards.map((card, idx) => {
          const cfg = signalConfig[card.signal] ?? signalConfig[Signal.HOLD];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={card.ticker}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              onClick={() => router.push(`/stock/${card.ticker}`)}
              className="card-terminal !p-0 overflow-hidden cursor-pointer group"
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              {/* 顶部信号色线 */}
              <div className="h-0.5 w-full" style={{ background: `var(${cfg.color.replace("var(", "").replace(")", "")})` }} />

              <div className="p-4">
                {/* 头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono font-bold text-[13px] text-[var(--text-primary)]">{card.ticker}</span>
                    <span className="ml-1.5 text-[11px] text-[var(--text-secondary)]">{card.name}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
                    style={{ background: cfg.bg, color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {SIGNAL_LABELS[card.signal]}
                  </span>
                </div>

                {/* 核心观点 */}
                <p className="text-[12px] text-[var(--text-primary)] font-medium leading-snug mb-3 line-clamp-2">
                  {card.headline}
                </p>

                {/* 核心驱动 */}
                <div className="p-2.5 rounded-lg bg-[var(--panel2)]/60 border border-[var(--border-custom)] mb-2">
                  <p className="text-[10px] text-[var(--text-secondary)]/50 mb-0.5 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" style={{ color: "#00c8ff" }} />
                    {"核心驱动"}
                  </p>
                  <p className="text-[11px] text-[var(--text-primary)] leading-snug line-clamp-2">{card.keyDriver}</p>
                </div>

                {/* 主要风险 */}
                <div className="p-2.5 rounded-lg bg-[var(--red)]/5 border border-[var(--red)]/10 mb-3">
                  <p className="text-[10px] text-[var(--red)]/50 mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {"主要风险"}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2">{card.primaryRisk}</p>
                </div>

                {/* 底部元数据 */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]/50">
                    <span className="font-semibold" style={{ color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}>
                      {card.conviction}%
                    </span>
                    <span>·</span>
                    <span>{card.timeHorizon}</span>
                    <span>·</span>
                    <span>{`${card.agentCount} 智能体`}</span>
                  </div>
                  <span className="text-[var(--text-secondary)]/30">{card.updatedAt}</span>
                </div>
              </div>

              {/* hover 查看详情 */}
              <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: "#00c8ff" }}>
                  {"查看完整分析"}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 移动端：横向滚动 */}
      <div className="flex md:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {cards.map((card) => {
          const cfg = signalConfig[card.signal] ?? signalConfig[Signal.HOLD];
          const Icon = cfg.icon;
          return (
            <div
              key={card.ticker}
              onClick={() => router.push(`/stock/${card.ticker}`)}
              className="card-terminal !p-0 overflow-hidden min-w-[280px] shrink-0 cursor-pointer"
            >
              <div className="h-0.5 w-full" style={{ background: `var(${cfg.color.replace("var(", "").replace(")", "")})` }} />
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[var(--text-primary)]">{card.ticker}</span>
                    <span className="ml-1 text-[10px] text-[var(--text-secondary)]">{card.name}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: cfg.bg, color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {SIGNAL_LABELS[card.signal]}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-primary)] font-medium leading-snug mb-2 line-clamp-2">{card.headline}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]/50">
                  <span className="font-semibold" style={{ color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}>{card.conviction}%</span>
                  <span>·</span>
                  <span>{card.timeHorizon}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

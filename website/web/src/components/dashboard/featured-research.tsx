"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrendingUp, Shield, AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { Signal } from "../../types/enums";

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

const FEATURED: ResearchCard[] = [
  {
    ticker: "NVDA", name: "NVIDIA", signal: Signal.STRONG_BUY, conviction: 84,
    timeHorizon: "Medium-term 3–6 months",
    headline: "Blackwell ramp accelerates; AI compute demand exceeds expectations",
    keyDriver: "Data center revenue +122% YoY; H200 supply constrained",
    primaryRisk: "Valuation P/E 55×; geopolitical export control risk",
    agentCount: 8, updatedAt: "2h ago",
  },
  {
    ticker: "META", name: "Meta", signal: Signal.BUY, conviction: 76,
    timeHorizon: "Medium-term 3–6 months",
    headline: "Llama 4 open-source ecosystem builds moat; ad AI efficiency gains",
    keyDriver: "DAU 3.2B all-time high; AI ad CTR up 18%",
    primaryRisk: "AI capex $60B; payback timeline uncertain",
    agentCount: 8, updatedAt: "3h ago",
  },
  {
    ticker: "TSLA", name: "Tesla", signal: Signal.BUY, conviction: 72,
    timeHorizon: "Long-term 6–12 months",
    headline: "FSD v13 commercialisation on track; energy becoming second growth curve",
    keyDriver: "Megapack backlog 100 GWh; storage gross margin 24%",
    primaryRisk: "Vehicle deliveries Q1 -13% YoY; brand sentiment deteriorating",
    agentCount: 8, updatedAt: "5h ago",
  },
  {
    ticker: "PLTR", name: "Palantir", signal: Signal.BUY, conviction: 69,
    timeHorizon: "Medium-term 3–6 months",
    headline: "AIP enterprise customers doubled; US commercial segment surging",
    keyDriver: "US commercial revenue +71% YoY; NRR 120%",
    primaryRisk: "Government contracts 45% of revenue; budget cuts hit directly",
    agentCount: 7, updatedAt: "6h ago",
  },
  {
    ticker: "AMD", name: "AMD", signal: Signal.HOLD, conviction: 52,
    timeHorizon: "Short-term 1–3 months",
    headline: "MI300X shipments accelerating, but gap vs NVDA widening",
    keyDriver: "Data center GPU revenue Q1 +80%; MI350 roadmap clear",
    primaryRisk: "CUDA ecosystem moat intact; customer migration cost high",
    agentCount: 7, updatedAt: "8h ago",
  },
  {
    ticker: "LI", name: "Li Auto", signal: Signal.HOLD, conviction: 52,
    timeHorizon: "Short-term 1–3 months",
    headline: "L9 AI flagship deliveries steady; Middle East expansion ahead of plan",
    keyDriver: "May deliveries 32k units; ME orders at 12% of total",
    primaryRisk: "Free cash flow negative two consecutive quarters; price war compressing margins",
    agentCount: 6, updatedAt: "Today",
  },
];

const signalConfig: Record<Signal, { color: string; bg: string; icon: typeof TrendingUp }> = {
  [Signal.STRONG_BUY]: { color: "var(--green)", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  [Signal.BUY]:        { color: "var(--green)", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  [Signal.HOLD]:       { color: "var(--amber)", bg: "rgba(245,158,11,0.1)", icon: Shield },
  [Signal.SELL]:       { color: "var(--red)",   bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  [Signal.STRONG_SELL]:{ color: "var(--red)",   bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

export function FeaturedResearch() {
  const router = useRouter();
  const t = useTranslations("dashboard");

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("featuredTitle")}</h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("featuredSubtitle")}</p>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/40">{t("featuredPublic")}</span>
      </div>

      {/* 桌面端：3列网格 */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {FEATURED.map((card, idx) => {
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
                    {card.signal}
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
                    {t("featuredKeyDriver")}
                  </p>
                  <p className="text-[11px] text-[var(--text-primary)] leading-snug line-clamp-2">{card.keyDriver}</p>
                </div>

                {/* 主要风险 */}
                <div className="p-2.5 rounded-lg bg-[var(--red)]/5 border border-[var(--red)]/10 mb-3">
                  <p className="text-[10px] text-[var(--red)]/50 mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {t("featuredPrimaryRisk")}
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
                    <span>{t("featuredAgentCount", { count: card.agentCount })}</span>
                  </div>
                  <span className="text-[var(--text-secondary)]/30">{card.updatedAt}</span>
                </div>
              </div>

              {/* hover 查看详情 */}
              <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: "#00c8ff" }}>
                  {t("featuredViewFull")}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 移动端：横向滚动 */}
      <div className="flex md:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FEATURED.map((card) => {
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
                    {card.signal}
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

"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Zap, Star, Clock, TrendingUp, Shield, AlertTriangle, BarChart2, Cpu } from "lucide-react";
import { getCustomRadarEntries } from "@/lib/radar-store";
import { OpportunityEntry } from "@/types";
import { Signal } from "@/types/enums";
import { SIGNAL_LABELS } from "@/content/labels";

const signalConfig: Record<Signal, { color: string; bg: string; icon: typeof TrendingUp }> = {
  [Signal.STRONG_BUY]: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  [Signal.BUY]:        { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  [Signal.HOLD]:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  [Signal.SELL]:       { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  [Signal.STRONG_SELL]:{ color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

const RECENT_ANALYSES = [
  { ticker: "NVDA", name: "英伟达",   signal: Signal.STRONG_BUY, conviction: 84, analyzedAt: "今天 09:15" },
  { ticker: "TSLA", name: "特斯拉",   signal: Signal.BUY,        conviction: 72, analyzedAt: "今天 08:42" },
  { ticker: "META", name: "Meta",     signal: Signal.BUY,        conviction: 76, analyzedAt: "昨天 15:30" },
  { ticker: "PLTR", name: "Palantir", signal: Signal.BUY,        conviction: 69, analyzedAt: "昨天 11:05" },
];

export default function WorkspacePage() {
  const router = useRouter();
  const [radarEntries, setRadarEntries] = useState<OpportunityEntry[]>([]);

  useEffect(() => {
    setRadarEntries(getCustomRadarEntries() ?? []);
  }, []);

  const bullishCount = radarEntries.filter(e => [Signal.STRONG_BUY, Signal.BUY].includes(e.signal as Signal)).length;
  const avgConviction = radarEntries.length
    ? Math.round(radarEntries.reduce((s, e) => s + e.conviction, 0) / radarEntries.length)
    : 0;

  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 md:px-6 py-8 max-w-[960px] mx-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          {"返回首页"}
        </button>

        <>
          {/* Welcome bar */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between mb-6">
            <div>
              <h1 className="text-lg font-bold text-[var(--text-primary)]">{"工作台"}</h1>
              <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{"AI 投资委员会工作台"}</p>
            </div>
          </motion.div>

          {/* Stat cards */}
          <div className="grid grid-cols-2 md:grid-cols-3 gap-3 mb-6">
            {[
              { label: "雷达标的", value: radarEntries.length, unit: "", icon: Star, color: "#f59e0b", onClick: () => router.push("/watchlist") },
              { label: "看涨标的", value: bullishCount, unit: "", icon: TrendingUp, color: "#22c55e", onClick: () => router.push("/watchlist") },
              { label: "平均置信度", value: avgConviction, unit: "%", icon: BarChart2, color: "#3b82f6", onClick: () => router.push("/watchlist") },
            ].map((stat, i) => {
              const Icon = stat.icon;
              return (
                <motion.button key={stat.label}
                  initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.06 }}
                  onClick={stat.onClick}
                  className="card-terminal p-4 text-left hover:border-[var(--blue)]/30 transition-all"
                >
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-6 h-6 rounded-lg flex items-center justify-center"
                      style={{ background: `${stat.color}15`, border: `1px solid ${stat.color}25` }}>
                      <Icon className="w-3 h-3" style={{ color: stat.color }} />
                    </div>
                    <span className="text-[10px] text-[var(--text-secondary)] font-mono">{stat.label}</span>
                  </div>
                  <div className="flex items-baseline gap-1">
                    <span className="text-xl font-bold font-mono text-[var(--text-primary)]">{stat.value}</span>
                    {stat.unit && <span className="text-xs text-[var(--text-secondary)] font-mono">{stat.unit}</span>}
                  </div>
                </motion.button>
              );
            })}
          </div>

          <div className="grid md:grid-cols-2 gap-4">
            {/* Recent analyses */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 }}
              className="card-terminal p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Clock className="w-3.5 h-3.5 text-[var(--blue)]" />
                  {"最近分析"}
                </h2>
                <button onClick={() => router.push("/history")}
                  className="text-[10px] font-mono text-[var(--blue)]/60 hover:text-[var(--blue)] transition-colors">
                  {"查看全部 →"}
                </button>
              </div>
              <ul className="space-y-2.5">
                {RECENT_ANALYSES.map((a) => {
                  const cfg = signalConfig[a.signal as Signal] ?? signalConfig[Signal.HOLD];
                  const Icon = cfg.icon;
                  return (
                    <li key={a.ticker}
                      onClick={() => router.push(`/stock/${a.ticker}`)}
                      className="flex items-center gap-2.5 cursor-pointer group">
                      <div className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.15)" }}>
                        <Cpu className="w-3 h-3" style={{ color: "#00c8ff" }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="font-mono font-bold text-[12px] text-[var(--text-primary)] group-hover:text-[var(--blue)] transition-colors">{a.ticker}</span>
                          <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                            style={{ background: cfg.bg, color: cfg.color }}>
                            <Icon className="w-2 h-2" />{SIGNAL_LABELS[a.signal as Signal] ?? a.signal}
                          </span>
                        </div>
                        <p className="text-[10px] text-[var(--text-secondary)]/40 font-mono">{a.analyzedAt}</p>
                      </div>
                      <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: cfg.color }}>{a.conviction}%</span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>

            {/* Radar snapshot */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.15 }}
              className="card-terminal p-5">
              <div className="flex items-center justify-between mb-4">
                <h2 className="text-xs font-semibold text-[var(--text-primary)] flex items-center gap-1.5">
                  <Star className="w-3.5 h-3.5 text-[var(--amber)]" />
                  {"雷达快照"}
                </h2>
                <button onClick={() => router.push("/watchlist")}
                  className="text-[10px] font-mono text-[var(--blue)]/60 hover:text-[var(--blue)] transition-colors">
                  {"管理自选 →"}
                </button>
              </div>
              {radarEntries.length === 0 ? (
                <div className="text-center py-6">
                  <Star className="w-6 h-6 text-[var(--text-secondary)]/20 mx-auto mb-2" />
                  <p className="text-[11px] text-[var(--text-secondary)] font-mono">{"雷达暂无标的"}</p>
                  <button onClick={() => router.push("/")}
                    className="mt-3 text-[10px] font-mono text-[var(--blue)]/60 hover:text-[var(--blue)] transition-colors">
                    {"去首页添加 →"}
                  </button>
                </div>
              ) : (
                <ul className="space-y-2.5">
                  {radarEntries.slice(0, 4).map((e) => {
                    const cfg = signalConfig[e.signal as Signal] ?? signalConfig[Signal.HOLD];
                    const Icon = cfg.icon;
                    return (
                      <li key={e.ticker}
                        onClick={() => router.push(`/stock/${e.ticker}`)}
                        className="flex items-center gap-2.5 cursor-pointer group">
                        <div className="w-1 h-8 rounded-full shrink-0" style={{ background: cfg.color }} />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-bold text-[12px] text-[var(--text-primary)] group-hover:text-[var(--blue)] transition-colors">{e.ticker}</span>
                            <span className="inline-flex items-center gap-0.5 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                              style={{ background: cfg.bg, color: cfg.color }}>
                              <Icon className="w-2 h-2" />{SIGNAL_LABELS[e.signal as Signal] ?? e.signal}
                            </span>
                          </div>
                          <p className="text-[10px] text-[var(--text-secondary)]/40 font-mono">{e.name}</p>
                        </div>
                        <span className="text-[11px] font-mono font-semibold shrink-0" style={{ color: cfg.color }}>{e.conviction}%</span>
                      </li>
                    );
                  })}
                  {radarEntries.length > 4 && (
                    <p className="text-[10px] text-[var(--text-secondary)]/30 font-mono text-center pt-1">
                      {`还有 ${radarEntries.length - 4} 只标的`}
                    </p>
                  )}
                </ul>
              )}
            </motion.div>
          </div>

          {/* Quick actions */}
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
            className="grid grid-cols-2 gap-3 mt-4">
            {[
              { label: "启动 AI 分析", desc: "分析新标的", icon: Cpu, color: "#00c8ff", onClick: () => router.push("/") },
              { label: "历史记录", desc: "查看过往分析", icon: Clock, color: "#3b82f6", onClick: () => router.push("/history") },
            ].map((action, i) => {
              const Icon = action.icon;
              return (
                <button key={i} onClick={action.onClick}
                  className="card-terminal p-4 text-left hover:border-[var(--blue)]/30 transition-all group">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center mb-2.5"
                    style={{ background: `${action.color}12`, border: `1px solid ${action.color}20` }}>
                    <Icon className="w-3.5 h-3.5" style={{ color: action.color }} />
                  </div>
                  <p className="text-[12px] font-semibold text-[var(--text-primary)] group-hover:text-[var(--blue)] transition-colors">{action.label}</p>
                  <p className="text-[10px] text-[var(--text-secondary)]/50 font-mono mt-0.5">{action.desc}</p>
                </button>
              );
            })}
          </motion.div>
        </>
      </main>
    </div>
  );
}

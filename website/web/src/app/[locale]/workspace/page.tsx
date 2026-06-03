"use client";

import { useTranslations } from "next-intl";
import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "../../../components/layout/header";
import { ArrowLeft, Zap, Star, Clock, TrendingUp, Shield, AlertTriangle, Lock, BarChart2, Cpu } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { getCustomRadarEntries } from "../../../lib/radar-store";
import { OpportunityEntry } from "../../../types";

const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  强烈买入: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  买入:     { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  增持:     { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: TrendingUp },
  持有:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  减持:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  卖出:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

const RECENT_ANALYSES = [
  { ticker: "NVDA", name: "NVIDIA",    signal: "强烈买入", conviction: 84, analyzedAt: "Today 09:15" },
  { ticker: "TSLA", name: "Tesla",     signal: "增持",     conviction: 72, analyzedAt: "Today 08:42" },
  { ticker: "META", name: "Meta",      signal: "买入",     conviction: 76, analyzedAt: "Yesterday 15:30" },
  { ticker: "PLTR", name: "Palantir",  signal: "增持",     conviction: 69, analyzedAt: "Yesterday 11:05" },
];

export default function WorkspacePage() {
  const t = useTranslations("workspace");
  const router = useRouter();
  const { user, isLoggedIn, ready } = useAuth();
  const [radarEntries, setRadarEntries] = useState<OpportunityEntry[]>([]);

  useEffect(() => {
    if (ready && isLoggedIn) {
      setRadarEntries(getCustomRadarEntries());
    }
  }, [ready, isLoggedIn]);

  const bullishCount = radarEntries.filter(e => ["强烈买入", "买入", "增持"].includes(e.signal)).length;
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
          {t("back")}
        </button>

        {/* Not logged in */}
        {ready && !isLoggedIn && (
          <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} className="card-terminal p-10 text-center">
            <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.18)" }}>
              <Lock className="w-5 h-5" style={{ color: "#00c8ff" }} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{t("loginPrompt")}</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-5">{t("loginDesc")}</p>
            <div className="flex items-center justify-center gap-3">
              <button onClick={() => router.push("/register")}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))", boxShadow: "0 0 16px rgba(0,200,255,0.2)" }}>
                {t("registerBtn")}
              </button>
              <button onClick={() => router.push("/login")}
                className="px-5 py-2 rounded-xl text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-custom)] transition-all">
                {t("loginBtn")}
              </button>
            </div>
          </motion.div>
        )}

        {/* Logged in */}
        {ready && isLoggedIn && user && (
          <>
            {/* Welcome bar */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }}
              className="flex items-center justify-between mb-6">
              <div>
                <h1 className="text-lg font-bold text-[var(--text-primary)]">
                  {t("greeting", { name: user.name })}
                </h1>
                <p className="text-xs text-[var(--text-secondary)] mt-0.5 font-mono">{t("subtitle")}</p>
              </div>
              <button onClick={() => router.push("/billing")}
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
                style={{ border: "1px solid rgba(0,200,255,0.25)", background: "rgba(0,200,255,0.06)", color: "#00c8ff", boxShadow: "0 0 10px rgba(0,200,255,0.1)" }}>
                <Zap className="w-3 h-3" />
                {user.credits} Credits
              </button>
            </motion.div>

            {/* Stat cards */}
            <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
              {[
                { label: t("creditsBalance"), value: user.credits, unit: "", icon: Zap, color: "#00c8ff", onClick: () => router.push("/billing") },
                { label: t("radarTickers"), value: radarEntries.length, unit: "", icon: Star, color: "#f59e0b", onClick: () => router.push("/watchlist") },
                { label: t("bullish"), value: bullishCount, unit: "", icon: TrendingUp, color: "#22c55e", onClick: () => router.push("/watchlist") },
                { label: t("avgConfidence"), value: avgConviction, unit: "%", icon: BarChart2, color: "#3b82f6", onClick: () => router.push("/watchlist") },
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
                    {t("recentAnalyses")}
                  </h2>
                  <button onClick={() => router.push("/history")}
                    className="text-[10px] font-mono text-[var(--blue)]/60 hover:text-[var(--blue)] transition-colors">
                    {t("viewAll")}
                  </button>
                </div>
                <ul className="space-y-2.5">
                  {RECENT_ANALYSES.map((a) => {
                    const cfg = signalConfig[a.signal] ?? signalConfig["持有"];
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
                              <Icon className="w-2 h-2" />{a.signal}
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
                    {t("radarSnapshot")}
                  </h2>
                  <button onClick={() => router.push("/watchlist")}
                    className="text-[10px] font-mono text-[var(--blue)]/60 hover:text-[var(--blue)] transition-colors">
                    {t("manageWatchlist")}
                  </button>
                </div>
                {radarEntries.length === 0 ? (
                  <div className="text-center py-6">
                    <Star className="w-6 h-6 text-[var(--text-secondary)]/20 mx-auto mb-2" />
                    <p className="text-[11px] text-[var(--text-secondary)] font-mono">{t("radarEmpty")}</p>
                    <button onClick={() => router.push("/")}
                      className="mt-3 text-[10px] font-mono text-[var(--blue)]/60 hover:text-[var(--blue)] transition-colors">
                      {t("goAddTickers")}
                    </button>
                  </div>
                ) : (
                  <ul className="space-y-2.5">
                    {radarEntries.slice(0, 4).map((e) => {
                      const cfg = signalConfig[e.signal] ?? signalConfig["持有"];
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
                                <Icon className="w-2 h-2" />{e.signal}
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
                        {t("moreTickersLabel", { count: radarEntries.length - 4 })}
                      </p>
                    )}
                  </ul>
                )}
              </motion.div>
            </div>

            {/* Quick actions */}
            <motion.div initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.2 }}
              className="grid grid-cols-3 gap-3 mt-4">
              {[
                { label: t("actionAnalysis"), desc: t("actionAnalysisDesc"), icon: Cpu, color: "#00c8ff", onClick: () => router.push("/") },
                { label: t("actionHistory"), desc: t("actionHistoryDesc"), icon: Clock, color: "#3b82f6", onClick: () => router.push("/history") },
                { label: t("actionCredits"), desc: t("actionCreditsDesc"), icon: Zap, color: "#22c55e", onClick: () => router.push("/billing") },
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
        )}

        {!ready && (
          <div className="space-y-4">
            <div className="h-8 w-48 rounded bg-[var(--panel2)] animate-pulse" />
            <div className="grid grid-cols-4 gap-3">
              {Array.from({ length: 4 }).map((_, i) => (
                <div key={i} className="card-terminal h-20 animate-pulse bg-[var(--panel2)]" />
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}

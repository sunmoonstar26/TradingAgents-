"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { ArrowLeft, Star, TrendingUp, Shield, AlertTriangle, Trash2, Plus } from "lucide-react";
import { getCustomRadarEntries, removeFromRadar } from "@/lib/radar-store";
import { OpportunityEntry } from "@/types";
import { RiskLevel, Signal } from "@/types/enums";

const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  [Signal.STRONG_BUY]: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  [Signal.BUY]:        { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  [Signal.HOLD]:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  [Signal.SELL]:       { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  [Signal.STRONG_SELL]:{ color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const diff = (now.getTime() - d.getTime()) / 86400000;
  if (diff < 1) return `今天 ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  if (diff < 2) return `昨天 ${d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" })}`;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function WatchlistPage() {
  const router = useRouter();
  const [entries, setEntries] = useState<OpportunityEntry[]>([]);
  const [removing, setRemoving] = useState<string | null>(null);

  useEffect(() => {
    setEntries(getCustomRadarEntries() ?? []);
  }, []);

  const handleRemove = (ticker: string) => {
    setRemoving(ticker);
    setTimeout(() => {
      removeFromRadar(ticker);
      setEntries(getCustomRadarEntries() ?? []);
      setRemoving(null);
    }, 300);
  };

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

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Star className="w-4 h-4 text-[var(--amber)]" />
              {"自选列表"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              {"来自 AI 机会雷达的关注标的"}
            </p>
          </div>
          {entries.length > 0 && (
            <span className="text-[11px] font-mono text-[var(--text-secondary)]/40">
              {`${entries.length} 只标的`}
            </span>
          )}
        </div>

        {/* Empty list */}
        {entries.length === 0 && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-terminal p-10 text-center"
          >
            <Star className="w-8 h-8 text-[var(--text-secondary)]/20 mx-auto mb-3" />
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">{"自选列表为空"}</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-5">
              {"在 AI 机会雷达或股票详情页添加标的"}
            </p>
            <button
              onClick={() => router.push("/")}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold transition-all"
              style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.18)", color: "#00c8ff" }}
            >
              <Plus className="w-3.5 h-3.5" />
              {"去 AI 机会雷达添加"}
            </button>
          </motion.div>
        )}

        {/* Ticker list */}
        {entries.length > 0 && (
          <>
            <div className="hidden md:block card-hero overflow-visible !p-0">
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="border-b border-[var(--border-custom)]">
                      <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">代码</th>
                      <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">信号</th>
                      <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">置信度</th>
                      <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">风险</th>
                      <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">仓位</th>
                      <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">更新时间</th>
                      <th className="w-12" />
                    </tr>
                  </thead>
                  <tbody>
                    {entries.map((item, idx) => {
                      const cfg = signalConfig[item.signal] ?? signalConfig[Signal.HOLD];
                      const Icon = cfg.icon;
                      return (
                        <motion.tr
                          key={item.ticker}
                          initial={{ opacity: 0, x: -4 }}
                          animate={{ opacity: removing === item.ticker ? 0 : 1, x: 0 }}
                          transition={{ duration: 0.25, delay: idx * 0.04 }}
                          className="border-b border-[var(--border-custom)]/40 cursor-pointer"
                          whileHover={{ x: 4, backgroundColor: "rgba(0,120,255,0.04)", transition: { duration: 0.15 } }}
                          onClick={() => router.push(`/stock/${item.ticker}`)}
                        >
                          <td className="px-5 py-3.5 font-mono font-semibold text-[var(--text-primary)] relative pl-6">
                            <div className="absolute left-0 top-1 bottom-1 w-0.5 rounded-r" style={{ background: cfg.color }} />
                            {item.ticker}
                            <span className="ml-2 text-[var(--text-secondary)] font-normal font-sans">{item.name}</span>
                          </td>
                          <td className="px-5 py-3.5">
                            <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                              <Icon className="w-2.5 h-2.5" />
                              {item.signal}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-semibold text-[var(--text-primary)]">{item.conviction}%</td>
                          <td className="px-5 py-3.5">
                            <span className={`text-[11px] font-medium ${item.risk === RiskLevel.LOW ? "text-[var(--green)]" : item.risk === RiskLevel.HIGH ? "text-[var(--red)]" : "text-[var(--amber)]"}`}>
                              {item.risk}
                            </span>
                          </td>
                          <td className="px-5 py-3.5 font-mono font-semibold text-[var(--blue)]">{item.exposure}</td>
                          <td className="px-5 py-3.5 font-mono text-[var(--text-secondary)]/50">{formatDate(item.updatedAt)}</td>
                          <td className="px-3 py-3.5">
                            <button
                              onClick={(e) => { e.stopPropagation(); handleRemove(item.ticker); }}
                              className="p-1.5 rounded-lg text-[var(--text-secondary)]/30 hover:text-[var(--red)] hover:bg-[var(--red)]/10 transition-all"
                            >
                              <Trash2 className="w-3.5 h-3.5" />
                            </button>
                          </td>
                        </motion.tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>

            {/* Mobile cards */}
            <div className="flex md:hidden flex-col gap-2">
              {entries.map((item, idx) => {
                const cfg = signalConfig[item.signal] ?? signalConfig[Signal.HOLD];
                const Icon = cfg.icon;
                return (
                  <motion.div
                    key={item.ticker}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: removing === item.ticker ? 0 : 1, y: 0 }}
                    transition={{ delay: idx * 0.04 }}
                    className="card-terminal !p-0 overflow-hidden cursor-pointer"
                    onClick={() => router.push(`/stock/${item.ticker}`)}
                  >
                    <div className="h-0.5 w-full" style={{ background: cfg.color }} />
                    <div className="p-4 flex items-center gap-3">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-2 mb-1">
                          <span className="font-mono font-bold text-[13px] text-[var(--text-primary)]">{item.ticker}</span>
                          <span className="text-[11px] text-[var(--text-secondary)]">{item.name}</span>
                        </div>
                        <div className="flex items-center gap-2">
                          <span className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium" style={{ background: cfg.bg, color: cfg.color }}>
                            <Icon className="w-2.5 h-2.5" />{item.signal}
                          </span>
                          <span className="text-[10px] font-mono text-[var(--text-secondary)]/50">{item.conviction}% · {item.exposure}</span>
                        </div>
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleRemove(item.ticker); }}
                        className="p-1.5 rounded-lg text-[var(--text-secondary)]/30 hover:text-[var(--red)] transition-all"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </button>
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <p className="text-center text-[10px] text-[var(--text-secondary)]/30 font-mono mt-6">
              {"数据来自 AI 机会雷达 · 点击标的查看完整分析"}
            </p>
          </>
        )}

      </main>
    </div>
  );
}

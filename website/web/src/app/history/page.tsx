"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "../../components/layout/header";
import { ArrowLeft, TrendingUp, Shield, AlertTriangle, Cpu, Clock, ArrowRight, Lock } from "lucide-react";
import { useAuth } from "../../lib/auth";

interface HistoryEntry {
  id: string;
  ticker: string;
  name: string;
  signal: string;
  conviction: number;
  mode: "standard" | "deep";
  duration: string;
  analyzedAt: string;
  agentCount: number;
  headline: string;
}

const MOCK_HISTORY: HistoryEntry[] = [
  {
    id: "sess_nvda_001", ticker: "NVDA", name: "NVIDIA", signal: "Strong Buy", conviction: 84,
    mode: "deep", duration: "4m 32s", analyzedAt: "Today 09:15",
    agentCount: 8, headline: "Blackwell ramp accelerates, AI compute demand beats",
  },
  {
    id: "sess_tsla_002", ticker: "TSLA", name: "Tesla", signal: "Buy", conviction: 72,
    mode: "standard", duration: "2m 18s", analyzedAt: "Today 08:42",
    agentCount: 8, headline: "FSD v13 commercialization, energy as second growth engine",
  },
  {
    id: "sess_meta_003", ticker: "META", name: "Meta", signal: "Buy", conviction: 76,
    mode: "standard", duration: "2m 05s", analyzedAt: "Yesterday 15:30",
    agentCount: 8, headline: "Llama 4 open-source moat, AI-driven ad efficiency gains",
  },
  {
    id: "sess_pltr_004", ticker: "PLTR", name: "Palantir", signal: "Buy", conviction: 69,
    mode: "deep", duration: "5m 11s", analyzedAt: "Yesterday 11:05",
    agentCount: 7, headline: "AIP enterprise customers doubled, US commercial exploding",
  },
  {
    id: "sess_amd_005", ticker: "AMD", name: "AMD", signal: "Hold", conviction: 52,
    mode: "standard", duration: "2m 44s", analyzedAt: "2d ago 14:20",
    agentCount: 7, headline: "MI300X shipments ramping, but gap with NVDA widening",
  },
  {
    id: "sess_aapl_006", ticker: "AAPL", name: "Apple", signal: "Sell", conviction: 35,
    mode: "standard", duration: "1m 58s", analyzedAt: "3d ago 10:00",
    agentCount: 8, headline: "iPhone 16 sales below expectations, AI feature rollout lagging",
  },
  {
    id: "sess_amzn_007", ticker: "AMZN", name: "Amazon", signal: "Buy", conviction: 71,
    mode: "deep", duration: "4m 50s", analyzedAt: "4d ago 16:45",
    agentCount: 8, headline: "AWS re-accelerating, ad business beats as new growth engine",
  },
  {
    id: "sess_li_008", ticker: "LI", name: "Li Auto", signal: "Hold", conviction: 52,
    mode: "standard", duration: "2m 30s", analyzedAt: "5d ago 09:30",
    agentCount: 6, headline: "L9 AI flagship deliveries steady, Middle East expansion beats",
  },
];

const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  "Strong Buy": { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  "Buy":        { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  "Hold":       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  "Sell":       { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  "Strong Sell":{ color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

export default function HistoryPage() {
  const router = useRouter();
  const { isLoggedIn, ready } = useAuth();

  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 md:px-6 py-8 max-w-[960px] mx-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Back to home
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--blue)]" />
              Analysis History
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              Archives of all AI Investment Committee analyses
            </p>
          </div>
          {ready && isLoggedIn && (
            <span className="text-[11px] font-mono text-[var(--text-secondary)]/40">
              {MOCK_HISTORY.length} records
            </span>
          )}
        </div>

        {/* 未登录状态 */}
        {ready && !isLoggedIn && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-terminal p-10 text-center"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.18)" }}
            >
              <Lock className="w-5 h-5" style={{ color: "#00c8ff" }} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sign in to view history</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-5">
              Each AI analysis is auto-saved for future reference
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/register")}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))", boxShadow: "0 0 16px rgba(0,200,255,0.2)" }}
              >
                Sign up free
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2 rounded-xl text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-custom)] transition-all"
              >
                Sign in
              </button>
            </div>
          </motion.div>
        )}

        {/* 已登录：历史列表 */}
        {ready && isLoggedIn && (
          <div className="space-y-2">
            {MOCK_HISTORY.map((entry, idx) => {
              const cfg = signalConfig[entry.signal] ?? signalConfig["Hold"];
              const Icon = cfg.icon;
              return (
                <motion.div
                  key={entry.id}
                  initial={{ opacity: 0, x: -6 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ duration: 0.25, delay: idx * 0.04 }}
                  onClick={() => router.push(`/stock/${entry.ticker}`)}
                  className="card-terminal !p-0 overflow-hidden cursor-pointer group"
                  whileHover={{ x: 4, backgroundColor: "rgba(0,120,255,0.04)", transition: { duration: 0.15 } }}
                >
                  <div className="flex items-center gap-4 px-5 py-3.5">
                    {/* 信号色竖条 */}
                    <div className="w-0.5 h-10 rounded-full shrink-0" style={{ background: cfg.color }} />

                    {/* 智能体图标 */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.15)" }}
                    >
                      <Cpu className="w-4 h-4" style={{ color: "#00c8ff" }} />
                    </div>

                    {/* 主内容 */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-[13px] text-[var(--text-primary)]">{entry.ticker}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">{entry.name}</span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {entry.signal}
                        </span>
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: entry.mode === "deep" ? "rgba(0,200,255,0.08)" : "rgba(255,255,255,0.04)",
                            color: entry.mode === "deep" ? "#00c8ff" : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {entry.mode === "deep" ? "Deep Research" : "Standard"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{entry.headline}</p>
                    </div>

                    {/* 右侧元数据 */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-[10px] font-mono text-[var(--text-secondary)]/40">
                      <span className="font-semibold text-[11px]" style={{ color: cfg.color }}>{entry.conviction}%</span>
                      <span>{entry.agentCount} agents · {entry.duration}</span>
                      <span>{entry.analyzedAt}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/20 group-hover:text-[var(--blue)] transition-colors shrink-0" />
                  </div>
                </motion.div>
              );
            })}
          </div>
        )}

        {/* 加载中骨架 */}
        {!ready && (
          <div className="space-y-2">
            {Array.from({ length: 5 }).map((_, i) => (
              <div key={i} className="card-terminal h-16 animate-pulse bg-[var(--panel2)]" />
            ))}
          </div>
        )}
      </main>
    </div>
  );
}

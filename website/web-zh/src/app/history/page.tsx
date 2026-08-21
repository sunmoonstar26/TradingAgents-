"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { ArrowLeft, TrendingUp, Shield, AlertTriangle, Cpu, Clock, ArrowRight } from "lucide-react";
import { SIGNAL_LABELS } from "@/content/labels";
import { Signal } from "@/types/enums";

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
    id: "sess_nvda_001", ticker: "NVDA", name: "英伟达", signal: "STRONG_BUY", conviction: 84,
    mode: "deep", duration: "4分32秒", analyzedAt: "今天 09:15",
    agentCount: 8, headline: "Blackwell 量产加速，AI 算力需求超出市场预期",
  },
  {
    id: "sess_tsla_002", ticker: "TSLA", name: "特斯拉", signal: "BUY", conviction: 72,
    mode: "standard", duration: "2分18秒", analyzedAt: "今天 08:42",
    agentCount: 8, headline: "FSD v13 商业化落地，储能业务成为第二增长曲线",
  },
  {
    id: "sess_meta_003", ticker: "META", name: "Meta", signal: "BUY", conviction: 76,
    mode: "standard", duration: "2分05秒", analyzedAt: "昨天 15:30",
    agentCount: 8, headline: "Llama 4 开源生态构建护城河，AI 广告效率持续提升",
  },
  {
    id: "sess_pltr_004", ticker: "PLTR", name: "Palantir", signal: "BUY", conviction: 69,
    mode: "deep", duration: "5分11秒", analyzedAt: "昨天 11:05",
    agentCount: 7, headline: "AIP 企业客户数量翻倍，美国商业业务快速增长",
  },
  {
    id: "sess_amd_005", ticker: "AMD", name: "AMD", signal: "HOLD", conviction: 52,
    mode: "standard", duration: "2分44秒", analyzedAt: "2天前 14:20",
    agentCount: 7, headline: "MI300X 出货加速，但与英伟达差距持续扩大",
  },
  {
    id: "sess_aapl_006", ticker: "AAPL", name: "苹果", signal: "SELL", conviction: 35,
    mode: "standard", duration: "1分58秒", analyzedAt: "3天前 10:00",
    agentCount: 8, headline: "iPhone 16 销量低于预期，AI 功能推进进度落后",
  },
  {
    id: "sess_amzn_007", ticker: "AMZN", name: "亚马逊", signal: "BUY", conviction: 71,
    mode: "deep", duration: "4分50秒", analyzedAt: "4天前 16:45",
    agentCount: 8, headline: "AWS 重新加速，广告业务超出预期成为新增长引擎",
  },
  {
    id: "sess_li_008", ticker: "LI", name: "理想汽车", signal: "HOLD", conviction: 52,
    mode: "standard", duration: "2分30秒", analyzedAt: "5天前 09:30",
    agentCount: 6, headline: "L9 AI 旗舰交付量稳定，中东扩张进度超预期",
  },
];

const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  STRONG_BUY: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  BUY:        { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  HOLD:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  SELL:       { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  STRONG_SELL:{ color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};

export default function HistoryPage() {
  const router = useRouter();

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
              <Clock className="w-4 h-4 text-[var(--blue)]" />
              {"历史分析记录"}
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              {"AI 投资委员会历次分析存档"}
            </p>
          </div>
          <span className="text-[11px] font-mono text-[var(--text-secondary)]/40">
            {`共 ${MOCK_HISTORY.length} 条记录`}
          </span>
        </div>

        <div className="space-y-2">
          {MOCK_HISTORY.map((entry, idx) => {
              const cfg = signalConfig[entry.signal] ?? signalConfig["HOLD"];
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
                    {/* Signal color bar */}
                    <div className="w-0.5 h-10 rounded-full shrink-0" style={{ background: cfg.color }} />

                    {/* Agent icon */}
                    <div
                      className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                      style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.15)" }}
                    >
                      <Cpu className="w-4 h-4" style={{ color: "#00c8ff" }} />
                    </div>

                    {/* Main content */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-0.5">
                        <span className="font-mono font-bold text-[13px] text-[var(--text-primary)]">{entry.ticker}</span>
                        <span className="text-[11px] text-[var(--text-secondary)]">{entry.name}</span>
                        <span
                          className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                          style={{ background: cfg.bg, color: cfg.color }}
                        >
                          <Icon className="w-2.5 h-2.5" />
                          {SIGNAL_LABELS[entry.signal as Signal] ?? entry.signal}
                        </span>
                        <span
                          className="text-[10px] font-mono px-1.5 py-0.5 rounded"
                          style={{
                            background: entry.mode === "deep" ? "rgba(0,200,255,0.08)" : "rgba(255,255,255,0.04)",
                            color: entry.mode === "deep" ? "#00c8ff" : "rgba(255,255,255,0.3)",
                          }}
                        >
                          {entry.mode === "deep" ? "深度研究" : "标准分析"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{entry.headline}</p>
                    </div>

                    {/* Right metadata */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-[10px] font-mono text-[var(--text-secondary)]/40">
                      <span className="font-semibold text-[11px]" style={{ color: cfg.color }}>{entry.conviction}%</span>
                      <span>{entry.agentCount} 个智能体 · {entry.duration}</span>
                      <span>{entry.analyzedAt}</span>
                    </div>

                    <ArrowRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/20 group-hover:text-[var(--blue)] transition-colors shrink-0" />
                  </div>
                </motion.div>
              );
            })}
        </div>
      </main>
    </div>
  );
}

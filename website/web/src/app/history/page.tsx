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
    id: "sess_nvda_001", ticker: "NVDA", name: "英伟达", signal: "强烈买入", conviction: 84,
    mode: "deep", duration: "4分32秒", analyzedAt: "今天 09:15",
    agentCount: 8, headline: "Blackwell 量产加速，AI 算力需求超预期",
  },
  {
    id: "sess_tsla_002", ticker: "TSLA", name: "特斯拉", signal: "增持", conviction: 72,
    mode: "standard", duration: "2分18秒", analyzedAt: "今天 08:42",
    agentCount: 8, headline: "FSD v13 商业化落地，能源业务成第二增长曲线",
  },
  {
    id: "sess_meta_003", ticker: "META", name: "Meta", signal: "买入", conviction: 76,
    mode: "standard", duration: "2分05秒", analyzedAt: "昨天 15:30",
    agentCount: 8, headline: "Llama 4 开源生态构建护城河，广告 AI 化提效",
  },
  {
    id: "sess_pltr_004", ticker: "PLTR", name: "Palantir", signal: "增持", conviction: 69,
    mode: "deep", duration: "5分11秒", analyzedAt: "昨天 11:05",
    agentCount: 7, headline: "AIP 平台企业客户数翻倍，美国商业业务爆发",
  },
  {
    id: "sess_amd_005", ticker: "AMD", name: "AMD", signal: "持有", conviction: 52,
    mode: "standard", duration: "2分44秒", analyzedAt: "2天前 14:20",
    agentCount: 7, headline: "MI300X 出货提速，但与 NVDA 差距仍在扩大",
  },
  {
    id: "sess_aapl_006", ticker: "AAPL", name: "苹果", signal: "减持", conviction: 35,
    mode: "standard", duration: "1分58秒", analyzedAt: "3天前 10:00",
    agentCount: 8, headline: "iPhone 16 销量低于预期，AI 功能落地进度滞后",
  },
  {
    id: "sess_amzn_007", ticker: "AMZN", name: "亚马逊", signal: "增持", conviction: 71,
    mode: "deep", duration: "4分50秒", analyzedAt: "4天前 16:45",
    agentCount: 8, headline: "AWS 重回加速增长，广告业务超预期成新引擎",
  },
  {
    id: "sess_li_008", ticker: "LI", name: "理想汽车", signal: "持有", conviction: 52,
    mode: "standard", duration: "2分30秒", analyzedAt: "5天前 09:30",
    agentCount: 6, headline: "L9 AI 旗舰交付稳健，中东市场拓展超预期",
  },
];

const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  强烈买入: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  买入:     { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  增持:     { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: TrendingUp },
  持有:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  减持:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  卖出:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
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
          返回首页
        </button>

        <div className="flex items-center justify-between mb-6">
          <div>
            <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
              <Clock className="w-4 h-4 text-[var(--blue)]" />
              历史分析记录
            </h1>
            <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
              AI 投资委员会历次分析存档
            </p>
          </div>
          {ready && isLoggedIn && (
            <span className="text-[11px] font-mono text-[var(--text-secondary)]/40">
              共 {MOCK_HISTORY.length} 条记录
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
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">登录后查看历史记录</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-5">
              每次 AI 分析结果自动保存，随时回顾
            </p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/register")}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))", boxShadow: "0 0 16px rgba(0,200,255,0.2)" }}
              >
                免费注册
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2 rounded-xl text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-custom)] transition-all"
              >
                已有账号登录
              </button>
            </div>
          </motion.div>
        )}

        {/* 已登录：历史列表 */}
        {ready && isLoggedIn && (
          <div className="space-y-2">
            {MOCK_HISTORY.map((entry, idx) => {
              const cfg = signalConfig[entry.signal] ?? signalConfig["持有"];
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
                          {entry.mode === "deep" ? "深度研究" : "标准分析"}
                        </span>
                      </div>
                      <p className="text-[11px] text-[var(--text-secondary)] truncate">{entry.headline}</p>
                    </div>

                    {/* 右侧元数据 */}
                    <div className="hidden sm:flex flex-col items-end gap-1 shrink-0 text-[10px] font-mono text-[var(--text-secondary)]/40">
                      <span className="font-semibold text-[11px]" style={{ color: cfg.color }}>{entry.conviction}%</span>
                      <span>{entry.agentCount} 智能体 · {entry.duration}</span>
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

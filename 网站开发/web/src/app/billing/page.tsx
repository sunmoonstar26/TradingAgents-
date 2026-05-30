"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Zap, ArrowLeft, TrendingUp, BarChart2, Shield, Cpu } from "lucide-react";
import { useAuth } from "@/lib/auth";

const PLANS = [
  { name: "基础版", credits: 20, price: "¥29", desc: "适合个人投资者", highlight: false },
  { name: "专业版", credits: 100, price: "¥99", desc: "适合活跃交易者", highlight: true },
  { name: "机构版", credits: 500, price: "¥399", desc: "适合专业机构", highlight: false },
];

const MOCK_HISTORY = [
  { icon: Cpu,        action: "AI 分析 · NVDA",  cost: -1, time: "今天 09:15", color: "#00c8ff" },
  { icon: BarChart2,  action: "深度研究 · TSLA",  cost: -3, time: "今天 08:42", color: "#00c8ff" },
  { icon: TrendingUp, action: "注册赠送",          cost: +5, time: "昨天 22:10", color: "#22c55e" },
  { icon: Cpu,        action: "AI 分析 · META",   cost: -1, time: "昨天 15:30", color: "#00c8ff" },
  { icon: Shield,     action: "风险扫描 · AMD",   cost: -1, time: "昨天 11:05", color: "#00c8ff" },
];

export default function BillingPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useAuth();

  const maxCredits = 20;
  const pct = user ? Math.min((user.credits / maxCredits) * 100, 100) : 0;
  const barColor = pct > 50 ? "#22c55e" : pct > 20 ? "#f59e0b" : "#ef4444";

  return (
    <div className="min-h-screen">
      <Header />
      <main className="px-4 md:px-6 py-8 max-w-[900px] mx-auto">
        <button
          onClick={() => router.push("/")}
          className="flex items-center gap-1.5 text-xs text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors mb-6 font-mono"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          返回首页
        </button>

        <div className="mb-8">
          <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "#00c8ff" }} />
            Credits 充值中心
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
            标准分析 1 Credit · 深度研究 3 Credits · 风险扫描 1 Credit
          </p>
        </div>

        {!isLoggedIn ? (
          /* ── 未登录引导 ── */
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-terminal p-8 mb-6 text-center"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4"
              style={{ background: "rgba(0,200,255,0.08)", border: "1px solid rgba(0,200,255,0.18)" }}
            >
              <Zap className="w-5 h-5" style={{ color: "#00c8ff" }} />
            </div>
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">登录后查看余额</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-5">注册即赠 5 Credits，立即开始 AI 分析</p>
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
        ) : user && (
          /* ── 已登录：余额卡片 + 明细 ── */
          <div className="grid md:grid-cols-2 gap-4 mb-6">
            {/* 余额卡片 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              className="card-terminal p-5"
              style={{ border: "1px solid rgba(0,200,255,0.15)", boxShadow: "0 0 20px rgba(0,200,255,0.06)" }}
            >
              <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-3">当前余额</p>
              <div className="flex items-end gap-2 mb-4">
                <span className="text-3xl font-bold font-mono" style={{ color: "#00c8ff" }}>
                  {user.credits}
                </span>
                <span className="text-sm text-[var(--text-secondary)] font-mono pb-0.5">Credits</span>
              </div>
              {/* 余额进度条 */}
              <div className="w-full h-1.5 rounded-full bg-[var(--panel2)] overflow-hidden mb-2">
                <motion.div
                  className="h-full rounded-full"
                  style={{ background: barColor }}
                  initial={{ width: 0 }}
                  animate={{ width: `${pct}%` }}
                  transition={{ duration: 0.6, ease: "easeOut" }}
                />
              </div>
              <p className="text-[10px] text-[var(--text-secondary)]/50 font-mono">
                剩余 {user.credits} / {maxCredits} Credits
              </p>
            </motion.div>

            {/* 使用明细 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="card-terminal p-5"
            >
              <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-3">使用明细</p>
              <ul className="space-y-2.5">
                {MOCK_HISTORY.map((h, i) => {
                  const Icon = h.icon;
                  return (
                    <li key={i} className="flex items-center gap-2.5">
                      <div
                        className="w-6 h-6 rounded-lg flex items-center justify-center shrink-0"
                        style={{ background: `${h.color}12`, border: `1px solid ${h.color}25` }}
                      >
                        <Icon className="w-3 h-3" style={{ color: h.color }} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-[11px] text-[var(--text-primary)] font-mono truncate">{h.action}</p>
                        <p className="text-[10px] text-[var(--text-secondary)]/40 font-mono">{h.time}</p>
                      </div>
                      <span
                        className="text-[11px] font-mono font-semibold shrink-0"
                        style={{ color: h.cost > 0 ? "#22c55e" : "rgba(255,255,255,0.4)" }}
                      >
                        {h.cost > 0 ? `+${h.cost}` : h.cost}
                      </span>
                    </li>
                  );
                })}
              </ul>
            </motion.div>
          </div>
        )}

        {/* 套餐卡片 */}
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] font-mono mb-4 tracking-wider">选择套餐</h2>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.name}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card-terminal p-5 flex flex-col relative"
              style={plan.highlight ? {
                border: "1px solid rgba(0,200,255,0.25)",
                boxShadow: "0 0 24px rgba(0,200,255,0.08)",
              } : {}}
            >
              {plan.highlight && (
                <>
                  <div
                    className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px"
                    style={{ background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.5), transparent)" }}
                  />
                  <span
                    className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                    style={{ background: "rgba(0,200,255,0.15)", color: "#00c8ff", border: "1px solid rgba(0,200,255,0.25)" }}
                  >
                    推荐
                  </span>
                </>
              )}
              <h3 className="text-sm font-semibold text-[var(--text-primary)] mb-0.5">{plan.name}</h3>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-4">{plan.desc}</p>
              <div className="flex items-baseline gap-1.5 mb-4">
                <span className="text-2xl font-bold font-mono text-[var(--text-primary)]">{plan.price}</span>
                <div className="flex items-center gap-1 text-[11px] font-mono" style={{ color: "#00c8ff" }}>
                  <Zap className="w-3 h-3" />
                  {plan.credits} Credits
                </div>
              </div>
              <button
                className="mt-auto w-full py-2 rounded-lg text-xs font-semibold transition-all"
                style={plan.highlight ? {
                  background: "linear-gradient(135deg, rgba(0,140,255,0.85), rgba(0,200,255,0.75))",
                  color: "#fff",
                  boxShadow: "0 0 16px rgba(0,200,255,0.18)",
                } : {
                  border: "1px solid rgba(255,255,255,0.08)",
                  color: "rgba(255,255,255,0.5)",
                  background: "rgba(255,255,255,0.03)",
                }}
              >
                购买
              </button>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[10px] text-[var(--text-secondary)]/40 font-mono mt-8">
          当前为演示版本 · 支付功能即将上线
        </p>
      </main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "../../components/layout/header";
import { Zap, ArrowLeft, TrendingUp, BarChart2, Shield, Cpu } from "lucide-react";
import { useAuth } from "../../lib/auth";

const PLANS = [
  {
    label: "Starter",
    price: "$5",
    credits: 5,
    perCredit: "$1.00",
    discount: null,
    desc: "Try it out, pay as you go",
    highlight: false,
    buyUrl: "https://creem.io/product/prod_3XIVWJ0ALhzo0ntLavqJge",
  },
  {
    label: "Popular",
    price: "$15",
    credits: 20,
    perCredit: "$0.75",
    discount: "25% OFF",
    desc: "Most popular, best value",
    highlight: true,
    buyUrl: "https://creem.io/product/prod_jceFmgfVqXLkcUYmJA4yF",
  },
  {
    label: "Power",
    price: "$30",
    credits: 50,
    perCredit: "$0.60",
    discount: "40% OFF",
    desc: "Best for heavy users, biggest discount",
    highlight: false,
    buyUrl: "https://creem.io/product/prod_1FSp9WD6So2OJBf4wgfE9v",
  },
];

const MOCK_HISTORY = [
  { icon: Cpu,        action: "AI Analysis · NVDA",  cost: -1, time: "Today 09:15",      color: "#00c8ff" },
  { icon: BarChart2,  action: "Deep Research · TSLA", cost: -3, time: "Today 08:42",      color: "#00c8ff" },
  { icon: TrendingUp, action: "Sign-up Bonus",         cost: +5, time: "Yesterday 22:10", color: "#22c55e" },
  { icon: Cpu,        action: "AI Analysis · META",   cost: -1, time: "Yesterday 15:30", color: "#00c8ff" },
  { icon: Shield,     action: "Risk Scan · AMD",      cost: -1, time: "Yesterday 11:05", color: "#00c8ff" },
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
          Back to Home
        </button>

        <div className="mb-8">
          <h1 className="text-lg font-bold text-[var(--text-primary)] flex items-center gap-2">
            <Zap className="w-4 h-4" style={{ color: "#00c8ff" }} />
            Credits Recharge Center
          </h1>
          <p className="text-xs text-[var(--text-secondary)] mt-1 font-mono">
            Standard analysis 1 Credit · Deep research 3 Credits · Risk scan 1 Credit
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
            <p className="text-sm font-semibold text-[var(--text-primary)] mb-1">Sign in to view your balance</p>
            <p className="text-xs text-[var(--text-secondary)] font-mono mb-5">Get 5 Credits on signup · Start AI analysis today</p>
            <div className="flex items-center justify-center gap-3">
              <button
                onClick={() => router.push("/register")}
                className="px-5 py-2 rounded-xl text-xs font-semibold text-white transition-all"
                style={{ background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))", boxShadow: "0 0 16px rgba(0,200,255,0.2)" }}
              >
                Sign Up Free
              </button>
              <button
                onClick={() => router.push("/login")}
                className="px-5 py-2 rounded-xl text-xs font-mono text-[var(--text-secondary)] hover:text-[var(--text-primary)] border border-[var(--border-custom)] transition-all"
              >
                Already have an account? Sign in
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
              <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-3">Current Balance</p>
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
                Remaining {user.credits} / {maxCredits} Credits
              </p>
            </motion.div>

            {/* 使用明细 */}
            <motion.div
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.06 }}
              className="card-terminal p-5"
            >
              <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-3">Usage History</p>
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

        {/* 在线充值 */}
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-xs font-semibold text-[var(--text-secondary)] font-mono tracking-wider uppercase">Top Up</h2>
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/40">1 Credit = 1 AI analysis</span>
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {PLANS.map((plan, i) => (
            <motion.div
              key={plan.label}
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.08 }}
              className="card-terminal p-5 flex flex-col relative overflow-hidden"
              style={plan.highlight ? {
                border: "1px solid rgba(0,200,255,0.3)",
                boxShadow: "0 0 28px rgba(0,200,255,0.1)",
              } : {}}
            >
              {/* 推荐光线 */}
              {plan.highlight && (
                <div
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-3/4 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.6), transparent)" }}
                />
              )}

              {/* 标签行 */}
              <div className="flex items-center justify-between mb-3">
                <span className="text-[11px] font-mono font-semibold text-[var(--text-secondary)]/60 uppercase tracking-widest">
                  {plan.label}
                </span>
                {plan.discount ? (
                  <span
                    className="text-[10px] font-mono font-bold px-2 py-0.5 rounded-full"
                    style={{ background: "rgba(0,200,255,0.12)", color: "#00c8ff", border: "1px solid rgba(0,200,255,0.25)" }}
                  >
                    {plan.discount}
                  </span>
                ) : (
                  <span className="text-[10px] font-mono text-[var(--text-secondary)]/30">Standard price</span>
                )}
              </div>

              {/* 价格 + Credits */}
              <div className="mb-1">
                <div className="flex items-baseline gap-2">
                  <span className="text-3xl font-bold font-mono text-[var(--text-primary)]">{plan.price}</span>
                  <div className="flex items-center gap-1" style={{ color: "#00c8ff" }}>
                    <Zap className="w-3.5 h-3.5" />
                    <span className="text-lg font-bold font-mono">{plan.credits}</span>
                    <span className="text-xs font-mono">Credits</span>
                  </div>
                </div>
                <p className="text-[10px] font-mono text-[var(--text-secondary)]/40 mt-0.5">
                  {plan.perCredit} / Credit
                </p>
              </div>

              {/* 描述 */}
              <p className="text-[11px] text-[var(--text-secondary)]/60 font-mono mb-4 mt-2 leading-relaxed">
                {plan.desc}
              </p>

              {/* 购买按钮 */}
              <a
                href={plan.buyUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="mt-auto w-full py-2.5 rounded-xl text-xs font-semibold transition-all text-center block"
                style={plan.highlight ? {
                  background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))",
                  color: "#fff",
                  boxShadow: "0 0 20px rgba(0,200,255,0.2)",
                } : {
                  border: "1px solid rgba(255,255,255,0.1)",
                  color: "rgba(255,255,255,0.6)",
                  background: "rgba(255,255,255,0.04)",
                }}
              >
                Buy Now
              </a>
            </motion.div>
          ))}
        </div>

        <p className="text-center text-[10px] text-[var(--text-secondary)]/40 font-mono mt-8">
          Payments processed by Creem · Credits credited instantly · Never expire
        </p>
      </main>
    </div>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { motion } from "framer-motion";
import { Header } from "@/components/layout/header";
import { Zap, Plus, ArrowLeft } from "lucide-react";
import { useMockAuth } from "@/lib/mock-auth";

const PLANS = [
  { name: "基础版", credits: 20, price: "¥29", desc: "适合个人投资者", highlight: false },
  { name: "专业版", credits: 100, price: "¥99", desc: "适合活跃交易者", highlight: true },
  { name: "机构版", credits: 500, price: "¥399", desc: "适合专业机构", highlight: false },
];

export default function BillingPage() {
  const router = useRouter();
  const { user, isLoggedIn } = useMockAuth();

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
            每次 AI 分析消耗 1 Credit · 每次深度研究消耗 3 Credits
          </p>
        </div>

        {/* 当前余额 */}
        {isLoggedIn && user && (
          <motion.div
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            className="card-terminal p-5 mb-6 flex items-center justify-between"
          >
            <div>
              <p className="text-[11px] text-[var(--text-secondary)] font-mono mb-1">当前余额</p>
              <div className="flex items-center gap-2">
                <Zap className="w-4 h-4" style={{ color: "#00c8ff" }} />
                <span className="text-2xl font-bold font-mono" style={{ color: "#00c8ff" }}>
                  {user.credits}
                </span>
                <span className="text-sm text-[var(--text-secondary)] font-mono">Credits</span>
              </div>
            </div>
            <button
              className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-mono transition-all"
              style={{
                border: "1px solid rgba(0,200,255,0.2)",
                color: "#00c8ff",
                background: "rgba(0,200,255,0.06)",
              }}
            >
              <Plus className="w-3 h-3" />
              充值记录
            </button>
          </motion.div>
        )}

        {/* 套餐卡片 */}
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
                <div
                  className="absolute -top-px left-1/2 -translate-x-1/2 w-2/3 h-px"
                  style={{ background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.5), transparent)" }}
                />
              )}
              {plan.highlight && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 px-2.5 py-0.5 rounded-full text-[10px] font-mono font-semibold"
                  style={{ background: "rgba(0,200,255,0.15)", color: "#00c8ff", border: "1px solid rgba(0,200,255,0.25)" }}
                >
                  推荐
                </span>
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

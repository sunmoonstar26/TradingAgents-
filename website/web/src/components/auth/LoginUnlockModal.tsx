"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { X, Zap, CheckCircle2 } from "lucide-react";

const FEATURES = [
  "Multi-agent real-time debate",
  "AI deep research reports",
  "Dynamic risk modeling",
  "AI opportunity radar",
  "Analysis history",
  "Custom portfolio",
];

interface Props {
  open: boolean;
  onClose: () => void;
}

export function LoginUnlockModal({ open, onClose }: Props) {
  const router = useRouter();

  const goRegister = () => { onClose(); router.push("/register"); };
  const goLogin = () => { onClose(); router.push("/login"); };

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[200] flex items-center justify-center px-4"
          style={{ background: "rgba(0,0,0,0.75)", backdropFilter: "blur(12px)" }}
          onClick={(e) => e.target === e.currentTarget && onClose()}
        >
          <motion.div
            initial={{ scale: 0.94, opacity: 0, y: 12 }}
            animate={{ scale: 1, opacity: 1, y: 0 }}
            exit={{ scale: 0.94, opacity: 0, y: 12 }}
            transition={{ duration: 0.22 }}
            className="relative w-full max-w-md rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(10,18,40,0.98), rgba(5,10,25,0.99))",
              border: "1px solid rgba(0,140,255,0.18)",
              boxShadow: "0 0 80px rgba(0,140,255,0.12), 0 4px 40px rgba(0,0,0,0.5)",
            }}
          >
            {/* 顶部能量光晕 */}
            <div
              className="absolute top-0 left-1/2 -translate-x-1/2 w-3/4 h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.4), transparent)" }}
            />

            {/* 关闭按钮 */}
            <button
              onClick={onClose}
              className="absolute top-4 right-4 w-7 h-7 flex items-center justify-center rounded-lg text-white/30 hover:text-white/60 hover:bg-white/[0.05] transition-all"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="px-8 pt-8 pb-7">
              {/* 标题 */}
              <div className="flex items-center gap-2.5 mb-1">
                <div
                  className="w-8 h-8 rounded-lg flex items-center justify-center shrink-0"
                  style={{ background: "rgba(0,200,255,0.1)", border: "1px solid rgba(0,200,255,0.2)" }}
                >
                  <Zap className="w-4 h-4" style={{ color: "#00c8ff" }} />
                </div>
                <h2 className="text-base font-bold text-white tracking-wide">
                  Unlock AI Investment Committee
                </h2>
              </div>
              <p className="text-xs text-white/40 mb-6 ml-[42px]">
                Deep investment research powered by TradingAgents multi-agent system
              </p>

              {/* 功能列表 */}
              <ul className="space-y-2.5 mb-6">
                {FEATURES.map((f) => (
                  <li key={f} className="flex items-center gap-2.5 text-xs text-white/60">
                    <CheckCircle2 className="w-3.5 h-3.5 shrink-0" style={{ color: "#00c8ff" }} />
                    {f}
                  </li>
                ))}
              </ul>

              {/* Credits 提示 */}
              <div
                className="flex items-center gap-2 px-3.5 py-2.5 rounded-lg mb-6 text-xs font-mono"
                style={{
                  background: "rgba(0,200,255,0.06)",
                  border: "1px solid rgba(0,200,255,0.15)",
                }}
              >
                <Zap className="w-3.5 h-3.5 shrink-0" style={{ color: "#00c8ff" }} />
                <span style={{ color: "#00c8ff" }}>Get 5 free Credits on signup — start AI analysis now</span>
              </div>

              {/* 按钮组 */}
              <div className="space-y-2.5">
                <button
                  onClick={goRegister}
                  className="w-full py-3 rounded-xl text-sm font-semibold tracking-wide transition-all"
                  style={{
                    background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))",
                    boxShadow: "0 0 24px rgba(0,200,255,0.25)",
                    color: "#fff",
                  }}
                >
                  Sign up free · Get 5 Credits
                </button>
                <button
                  onClick={goLogin}
                  className="w-full py-2.5 rounded-xl text-xs font-mono text-white/40 hover:text-white/60 hover:bg-white/[0.03] transition-all border border-white/[0.06]"
                >
                  Already have an account? Sign in
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}

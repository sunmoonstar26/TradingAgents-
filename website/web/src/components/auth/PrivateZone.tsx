"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { Lock, Zap } from "lucide-react";
import { useTranslations } from "next-intl";
import { useAuth } from "../../lib/auth";
import { LoginUnlockModal } from "../../components/auth/LoginUnlockModal";

interface Props {
  children: React.ReactNode;
  /** 锁定状态下显示的标题，默认 t("defaultLabel") */
  label?: string;
}

/**
 * 公/私版内容分区包装器。
 * 已登录 → 直接渲染 children。
 * 未登录 → 渲染模糊遮罩 + 解锁入口，点击弹出 LoginUnlockModal。
 * ready 前不渲染任何内容（避免 SSR 不匹配）。
 */
export function PrivateZone({ children, label }: Props) {
  const { isLoggedIn, ready } = useAuth();
  const [showModal, setShowModal] = useState(false);
  const t = useTranslations("privateZone");

  if (!ready) return null;
  if (isLoggedIn) return <>{children}</>;

  return (
    <>
      <div className="relative rounded-2xl overflow-hidden">
        {/* 内容层（模糊） */}
        <div className="pointer-events-none select-none" style={{ filter: "blur(6px)", opacity: 0.35 }}>
          {children}
        </div>

        {/* 遮罩层 */}
        <div
          className="absolute inset-0 flex flex-col items-center justify-center gap-4"
          style={{
            background: "linear-gradient(180deg, rgba(5,10,25,0.55) 0%, rgba(5,10,25,0.85) 100%)",
            backdropFilter: "blur(2px)",
          }}
        >
          {/* 锁图标 */}
          <motion.div
            initial={{ scale: 0.85, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ duration: 0.3 }}
            className="flex flex-col items-center gap-3"
          >
            <div
              className="w-12 h-12 rounded-2xl flex items-center justify-center"
              style={{
                background: "rgba(0,200,255,0.08)",
                border: "1px solid rgba(0,200,255,0.2)",
                boxShadow: "0 0 24px rgba(0,200,255,0.12)",
              }}
            >
              <Lock className="w-5 h-5" style={{ color: "#00c8ff" }} />
            </div>

            <div className="text-center">
              <p className="text-sm font-semibold text-white/90">{label ?? t("defaultLabel")}</p>
              <p className="text-xs text-white/40 mt-0.5 font-mono">{t("unlockPrompt")}</p>
            </div>

            <button
              onClick={() => setShowModal(true)}
              className="flex items-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold transition-all mt-1"
              style={{
                background: "linear-gradient(135deg, rgba(0,140,255,0.85), rgba(0,200,255,0.75))",
                boxShadow: "0 0 20px rgba(0,200,255,0.2)",
                color: "#fff",
              }}
            >
              <Zap className="w-3.5 h-3.5" />
              {t("unlockCta")}
            </button>
          </motion.div>
        </div>
      </div>

      <LoginUnlockModal open={showModal} onClose={() => setShowModal(false)} />
    </>
  );
}

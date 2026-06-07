"use client";

import { useState, useEffect } from "react";
import { useRouter } from "@/navigation";
import { motion } from "framer-motion";
import { Header } from "../../../components/layout/header";
import { Zap, ArrowRight } from "lucide-react";
import { createClient } from "../../../lib/supabase";
import { useTranslations } from "next-intl";

export default function ResetPasswordPage() {
  const router = useRouter();
  const t = useTranslations("auth");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [done, setDone] = useState(false);
  const [ready, setReady] = useState(false);

  useEffect(() => {
    const supabase = createClient();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY" || event === "SIGNED_IN") {
        setReady(true);
      }
    });

    // getSession 兜底：hash token 已被 createBrowserClient 自动兑换时直接拿到 session
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });

    // 超时兜底：URL hash 里有 token 但事件未触发时，1.5s 后强制显示表单
    const hash = window.location.hash;
    let timer: ReturnType<typeof setTimeout> | undefined;
    if (hash.includes("type=recovery") || hash.includes("access_token")) {
      timer = setTimeout(() => setReady(true), 1500);
    }

    return () => {
      subscription.unsubscribe();
      if (timer) clearTimeout(timer);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    if (password !== confirm) {
      setError(t("passwordMismatch"));
      return;
    }
    if (password.length < 6) {
      setError(t("passwordTooShort"));
      return;
    }
    setLoading(true);
    try {
      const supabase = createClient();
      const { error: err } = await supabase.auth.updateUser({ password });
      if (err) throw err;
      setDone(true);
      setTimeout(() => router.push("/login"), 2000);
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("resetFailed"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen">
      <Header />
      <main className="flex items-center justify-center min-h-[85vh] px-4">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.35 }}
          className="w-full max-w-sm"
        >
          <div
            className="rounded-2xl overflow-hidden"
            style={{
              background: "linear-gradient(180deg, rgba(10,18,40,0.98), rgba(5,10,25,0.99))",
              border: "1px solid rgba(0,140,255,0.15)",
              boxShadow: "0 0 60px rgba(0,140,255,0.08), 0 4px 32px rgba(0,0,0,0.4)",
            }}
          >
            <div
              className="w-full h-px"
              style={{ background: "linear-gradient(90deg, transparent, rgba(0,200,255,0.35), transparent)" }}
            />
            <div className="px-8 py-8">
              <div className="flex items-center gap-2 mb-1">
                <Zap className="w-4 h-4" style={{ color: "#00c8ff" }} />
                <h1 className="text-base font-bold text-white">{t("resetTitle")}</h1>
              </div>
              <p className="text-xs text-white/40 font-mono mb-7">{t("resetSubtitle")}</p>

              {done ? (
                <p className="text-sm font-mono text-center" style={{ color: "#00c8ff" }}>
                  ✓ {t("resetSuccess")}
                </p>
              ) : !ready ? (
                <p className="text-xs text-white/40 font-mono text-center">
                  {t("verifyingLink")}
                </p>
              ) : (
                <form onSubmit={handleSubmit} className="space-y-3">
                  <div>
                    <label className="block text-[11px] text-white/40 font-mono mb-1.5">{t("newPassword")}</label>
                    <input
                      type="password"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder={t("newPasswordPlaceholder")}
                      className="w-full h-11 px-4 rounded-xl text-sm font-mono text-white placeholder:text-white/15 focus:outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                      required
                    />
                  </div>
                  <div>
                    <label className="block text-[11px] text-white/40 font-mono mb-1.5">{t("confirmPassword")}</label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder={t("confirmPasswordPlaceholder")}
                      className="w-full h-11 px-4 rounded-xl text-sm font-mono text-white placeholder:text-white/15 focus:outline-none transition-all"
                      style={{ background: "rgba(255,255,255,0.03)", border: "1px solid rgba(255,255,255,0.07)" }}
                      required
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="w-full h-11 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all mt-2 disabled:opacity-60"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,140,255,0.9), rgba(0,200,255,0.8))",
                      boxShadow: "0 0 20px rgba(0,200,255,0.2)",
                    }}
                  >
                    {loading ? t("updating") : t("updatePassword")}
                    {!loading && <ArrowRight className="w-4 h-4" />}
                  </button>
                  {error && (
                    <p className="text-[11px] text-red-400 font-mono text-center pt-1">{error}</p>
                  )}
                </form>
              )}
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

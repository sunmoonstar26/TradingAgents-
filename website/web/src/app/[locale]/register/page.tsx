"use client";

import { useState } from "react";
import { useRouter } from "@/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Header } from "../../../components/layout/header";
import { Zap, CheckCircle2, ArrowRight, Mail, MoveRight } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { useTranslations } from "next-intl";

export default function RegisterPage() {
  const router = useRouter();
  const { register, login, isLoggedIn } = useAuth();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const [registeredEmail, setRegisteredEmail] = useState("");
  const [done, setDone] = useState(false);

  const FEATURES = [
    t("feature1"),
    t("feature2"),
    t("feature3"),
    t("feature4"),
  ];

  if (isLoggedIn) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await register(email, password);
      // 注册成功后直接登录
      await login(email, password);
      router.replace("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("registerError"));
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

            <AnimatePresence mode="wait">
              {done ? (
                <motion.div
                  key="success"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -10 }}
                  transition={{ duration: 0.3 }}
                  className="px-8 py-10 flex flex-col items-center text-center"
                >
                  <div
                    className="w-14 h-14 rounded-2xl flex items-center justify-center mb-5"
                    style={{
                      background: "rgba(0,200,255,0.08)",
                      border: "1px solid rgba(0,200,255,0.2)",
                      boxShadow: "0 0 24px rgba(0,200,255,0.12)",
                    }}
                  >
                    <Mail className="w-6 h-6" style={{ color: "#00c8ff" }} />
                  </div>

                  <h2 className="text-base font-bold text-white mb-1">{t("verifyEmailTitle")}</h2>
                  <p className="text-[11px] text-white/40 font-mono mb-5">{t("verifyEmailSubtitle")}</p>

                  <div
                    className="w-full rounded-xl px-4 py-3 mb-5"
                    style={{
                      background: "rgba(0,200,255,0.05)",
                      border: "1px solid rgba(0,200,255,0.15)",
                    }}
                  >
                    <p className="text-xs font-mono text-white/70 break-all">{registeredEmail}</p>
                  </div>

                  <p className="text-[11px] text-white/35 font-mono leading-relaxed mb-6">
                    {t("verifyEmailBody")}
                  </p>

                  <button
                    onClick={() => router.push("/login")}
                    className="w-full h-10 rounded-xl text-sm font-semibold text-white flex items-center justify-center gap-2 transition-all"
                    style={{
                      background: "linear-gradient(135deg, rgba(0,140,255,0.7), rgba(0,200,255,0.6))",
                      boxShadow: "0 0 16px rgba(0,200,255,0.15)",
                    }}
                  >
                    {t("goToSignIn")}
                    <MoveRight className="w-3.5 h-3.5" />
                  </button>

                  <p className="text-[10px] text-white/20 font-mono mt-4">{t("verifyEmailHint")}</p>
                </motion.div>
              ) : (
                <motion.div
                  key="form"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.2 }}
                  className="px-8 py-8"
                >
                  <div className="flex items-center gap-2 mb-1">
                    <Zap className="w-4 h-4" style={{ color: "#00c8ff" }} />
                    <h1 className="text-base font-bold text-white">{t("registerTitle")}</h1>
                  </div>
                  <p className="text-xs text-white/40 font-mono mb-5">{t("registerSubtitle")}</p>

                  <ul className="space-y-1.5 mb-6">
                    {FEATURES.map((f) => (
                      <li key={f} className="flex items-center gap-2 text-[11px] text-white/50 font-mono">
                        <CheckCircle2 className="w-3 h-3 shrink-0" style={{ color: "#00c8ff" }} />
                        {f}
                      </li>
                    ))}
                  </ul>

                  <form onSubmit={handleSubmit} className="space-y-3">
                    <div>
                      <label className="block text-[11px] text-white/40 font-mono mb-1.5">{t("email")}</label>
                      <input
                        type="email"
                        value={email}
                        onChange={(e) => setEmail(e.target.value)}
                        placeholder="your@email.com"
                        className="w-full h-11 px-4 rounded-xl text-sm font-mono text-white placeholder:text-white/15 focus:outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-[11px] text-white/40 font-mono mb-1.5">{t("password")}</label>
                      <input
                        type="password"
                        value={password}
                        onChange={(e) => setPassword(e.target.value)}
                        placeholder="••••••••"
                        className="w-full h-11 px-4 rounded-xl text-sm font-mono text-white placeholder:text-white/15 focus:outline-none transition-all"
                        style={{
                          background: "rgba(255,255,255,0.03)",
                          border: "1px solid rgba(255,255,255,0.07)",
                        }}
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
                      {loading ? t("registering") : t("registerBtn")}
                      {!loading && <ArrowRight className="w-4 h-4" />}
                    </button>
                    {error && (
                      <p className="text-[11px] text-[var(--red)] font-mono text-center pt-1">{error}</p>
                    )}
                  </form>

                  <div className="mt-5 pt-5 border-t border-white/[0.06] text-center">
                    <span className="text-[11px] text-white/30 font-mono">{t("hasAccount")}</span>
                    <button
                      onClick={() => router.push("/login")}
                      className="ml-1.5 text-[11px] font-mono transition-colors"
                      style={{ color: "#00c8ff" }}
                    >
                      {t("directLogin")}
                    </button>
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

"use client";

import { useState } from "react";
import { useRouter } from "@/navigation";
import { motion } from "framer-motion";
import { Header } from "../../../components/layout/header";
import { Zap, ArrowRight } from "lucide-react";
import { useAuth } from "../../../lib/auth";
import { useTranslations } from "next-intl";

export default function LoginPage() {
  const router = useRouter();
  const { login, isLoggedIn } = useAuth();
  const t = useTranslations("auth");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  if (isLoggedIn) {
    router.replace("/");
    return null;
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      router.push("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : t("signingIn"));
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
                <h1 className="text-base font-bold text-white">{t("loginTitle")}</h1>
              </div>
              <p className="text-xs text-white/40 font-mono mb-7">{t("loginSubtitle")}</p>

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
                  {loading ? t("signingIn") : t("signIn")}
                  {!loading && <ArrowRight className="w-4 h-4" />}
                </button>
                {error && (
                  <p className="text-[11px] text-[var(--red)] font-mono text-center pt-1">{error}</p>
                )}
              </form>

              <div className="mt-5 pt-5 border-t border-white/[0.06] text-center">
                <span className="text-[11px] text-white/30 font-mono">{t("hasAccount")}</span>
                <button
                  onClick={() => router.push("/register")}
                  className="ml-1.5 text-[11px] font-mono transition-colors"
                  style={{ color: "#00c8ff" }}
                >
                  {t("registerLink")}
                </button>
              </div>
            </div>
          </div>
        </motion.div>
      </main>
    </div>
  );
}

"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { useMockAuth } from "@/lib/mock-auth";
import { Zap } from "lucide-react";

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

/** 顶部导航栏 — AI 对冲基金操作系统风格 */
export function Header() {
  const [time, setTime] = useState("");
  const { user, ready, logout } = useMockAuth();

  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("zh-CN", TIME_FMT));
    const elapsed = 1000 - (Date.now() % 1000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, elapsed);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-custom)] bg-[var(--bg)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-6">
        {/* 左侧：品牌 */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            TradingAgents
          </span>
          <span className="hidden sm:inline text-xs text-[var(--text-secondary)] font-mono">
            AI 交易终端
          </span>
        </Link>

        {/* 中间：AI 系统状态 */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono">
          <span className="text-[var(--text-secondary)]">智能体在线</span>
          <span className="text-[var(--green)] font-semibold">12</span>
          <span className="w-px h-3 bg-[var(--border-custom)]" />
          <span className="text-[var(--text-secondary)]">运行中</span>
          <span className="text-[var(--blue)] font-semibold pulse-blue">4</span>
          <span className="w-px h-3 bg-[var(--border-custom)]" />
          <span className="text-[var(--text-secondary)]">辩论中</span>
          <span className="text-[var(--amber)] font-semibold">2</span>
          <span className="w-px h-3 bg-[var(--border-custom)]" />
          <span className="text-[var(--text-secondary)]">共识更新</span>
          <span className="text-[var(--text-primary)]">14s 前</span>
        </div>

        {/* 右侧：登录态 / 未登录态 */}
        <div className="flex items-center gap-3 text-xs">
          {!ready ? (
            <span className="w-20 h-4 rounded bg-[var(--panel2)] animate-pulse" />
          ) : user ? (
            /* ── 已登录 ── */
            <>
              <Link
                href="/workspace"
                className="hidden sm:inline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                我的工作台
              </Link>
              <Link
                href="/history"
                className="hidden md:inline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                历史记录
              </Link>
              {/* Credits */}
              <Link
                href="/billing"
                className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg border transition-all"
                style={{
                  border: "1px solid rgba(0,200,255,0.25)",
                  background: "rgba(0,200,255,0.06)",
                  boxShadow: "0 0 10px rgba(0,200,255,0.12)",
                }}
              >
                <Zap className="w-3 h-3" style={{ color: "#00c8ff" }} />
                <span className="font-mono font-semibold text-[11px]" style={{ color: "#00c8ff" }}>
                  {user.credits} Credits
                </span>
              </Link>
              {/* 用户名 + 登出 */}
              <span className="hidden sm:inline font-mono text-[11px] text-[var(--text-secondary)]/60">
                {user.name}
              </span>
              <button
                onClick={logout}
                className="text-[var(--text-secondary)]/40 hover:text-[var(--red)] transition-colors text-[11px] font-mono"
              >
                登出
              </button>
            </>
          ) : (
            /* ── 未登录 ── */
            <>
              <Link
                href="/login"
                className="text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono text-[11px]"
              >
                登录
              </Link>
              <Link
                href="/register"
                className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-[11px] font-semibold transition-all"
                style={{
                  border: "1px solid rgba(0,200,255,0.3)",
                  background: "rgba(0,200,255,0.08)",
                  color: "#00c8ff",
                  boxShadow: "0 0 12px rgba(0,200,255,0.15)",
                }}
              >
                <Zap className="w-3 h-3" />
                获取 Credits
              </Link>
            </>
          )}

          {/* 系统状态 */}
          <span className="hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse-green" />
            <span className="text-[var(--text-primary)] font-mono text-[11px]">模型在线</span>
          </span>
          <span className="hidden sm:inline font-mono text-[11px] text-[var(--text-secondary)]/80">{time}</span>
        </div>
      </div>
    </header>
  );
}

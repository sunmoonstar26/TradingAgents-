"use client";

import Link from "next/link";
import { useEffect, useState } from "react";

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

/** 顶部导航栏 — AI 对冲基金操作系统风格 */
export function Header() {
  const [time, setTime] = useState("");

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

        {/* 右侧：快捷操作 + 系统状态 */}
        <div className="flex items-center gap-4 text-xs text-[var(--text-secondary)]">
          <Link href="/watchlist" className="hover:text-[var(--text-primary)] transition-colors">自选</Link>
          <Link href="/history" className="hover:text-[var(--text-primary)] transition-colors">历史</Link>
          <Link href="/settings" className="hover:text-[var(--text-primary)] transition-colors">设置</Link>
          {/* 市场微型状态 */}
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

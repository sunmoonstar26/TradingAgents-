"use client";

import { useEffect, useState } from "react";
import Link from "next/link";

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

/** 顶部导航栏 — 本地单用户模式 */
export function Header() {
  const [time, setTime] = useState("");
  const [running, setRunning] = useState(0);

  // 时钟
  useEffect(() => {
    const tick = () => setTime(new Date().toLocaleTimeString("zh-CN", TIME_FMT));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, []);

  // 轮询真实分析任务数
  useEffect(() => {
    let id: ReturnType<typeof setInterval>;
    const poll = () =>
      fetch("/api/status")
        .then((r) => r.json())
        .then((d) => setRunning(d.running ?? 0))
        .catch(() => {});
    poll();
    id = setInterval(poll, 5000);
    return () => clearInterval(id);
  }, []);

  return (
    <header className="sticky top-0 z-50 border-b border-[var(--border-custom)] bg-[var(--bg)]/95 backdrop-blur-md">
      <div className="mx-auto flex h-14 max-w-[1600px] items-center justify-between px-4 md:px-6">
        {/* 左侧：品牌 */}
        <Link href="/" className="flex items-center gap-2 shrink-0">
          <span className="text-lg font-bold tracking-tight text-[var(--text-primary)]">
            日月星投资360
          </span>
        </Link>

        {/* 中间：真实分析状态 */}
        <div className="hidden lg:flex items-center gap-3 text-[11px] font-mono">
          {running > 0 ? (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)] pulse-blue" />
              <span className="text-[var(--blue)] font-semibold">{`${running} 个分析进行中`}</span>
            </>
          ) : (
            <>
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)]" />
              <span className="text-[var(--text-secondary)]">{"待机中"}</span>
            </>
          )}
        </div>

        {/* 右侧：导航 + 时钟 */}
        <div className="flex items-center gap-4 text-xs">
          <Link
            href="/workspace"
            className="hidden sm:inline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono text-[11px]"
          >
            {"工作台"}
          </Link>
          <Link
            href="/history"
            className="hidden md:inline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono text-[11px]"
          >
            {"历史记录"}
          </Link>
          <Link
            href="/watchlist"
            className="hidden md:inline text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors font-mono text-[11px]"
          >
            {"自选股"}
          </Link>
          <span className="hidden md:flex items-center gap-1.5">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse-green" />
            <span className="text-[var(--text-primary)] font-mono text-[11px]">{"本地运行"}</span>
          </span>
          <span className="hidden sm:inline font-mono text-[11px] text-[var(--text-secondary)]/80">{time}</span>
        </div>
      </div>
    </header>
  );
}

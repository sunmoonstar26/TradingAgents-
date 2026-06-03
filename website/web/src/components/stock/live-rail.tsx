"use client";

import { motion } from "framer-motion";
import { useRef, useEffect } from "react";
import { Terminal, Radio } from "lucide-react";
import { LiveFeedEntry } from "../../types";
import { useTranslations } from "next-intl";

interface Props {
  data: LiveFeedEntry[];
}

export function LiveRail({ data }: Props) {
  const t = useTranslations("stockComponents");
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [data]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.45 }}
    >
      {/* 标题 */}
      <div className="flex items-center gap-2 mb-3">
        <Terminal className="w-4 h-4 text-[var(--green)]" />
        <h2 className="text-xs font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
          {t("liveReasoning")}
        </h2>
        <span className="w-2 h-2 rounded-full bg-[var(--green)] pulse-green" />
        <span className="text-[9px] font-mono text-[var(--green)]/60 ml-auto">
          {t("online")}
        </span>
      </div>

      {/* Terminal 风格容器 */}
      <div
        ref={scrollRef}
        className="card-terminal p-4 h-[320px] md:h-[400px] overflow-y-auto font-mono text-[11px]"
      >
        {/* 终端头部装饰 */}
        <div className="flex items-center gap-2 mb-3 pb-3 border-b border-[var(--border-custom)]">
          <div className="flex items-center gap-1.5">
            <span className="w-2 h-2 rounded-full bg-[var(--red)]/60" />
            <span className="w-2 h-2 rounded-full bg-[var(--amber)]/60" />
            <span className="w-2 h-2 rounded-full bg-[var(--green)]/60" />
          </div>
          <span className="text-[var(--text-secondary)]/40 text-[10px]">
            {t("reasoningEngineTitle")}
          </span>
        </div>

        {/* Feed 条目 */}
        <div className="space-y-2">
          {data.map((entry, i) => (
            <motion.div
              key={i}
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.2, delay: i * 0.02 }}
              className="feed-entry"
            >
              <span className="text-[var(--text-secondary)]/50 shrink-0">{entry.time}</span>
              <span className="text-[var(--blue)] shrink-0 font-semibold">{entry.agent}</span>
              <span className="text-[var(--text-secondary)]/80 break-all">
                {entry.message}
              </span>
            </motion.div>
          ))}
        </div>

        {/* 底部渐变遮罩 */}
        <div className="sticky bottom-0 left-0 right-0 h-8 bg-gradient-to-t from-[var(--panel)] to-transparent pointer-events-none -mx-4 -mb-4" />
      </div>

      {/* Mobile 底部提示 */}
      <div className="md:hidden flex items-center gap-2 mt-2 px-2">
        <Radio className="w-3 h-3 text-[var(--green)] animate-pulse" />
        <span className="text-[9px] font-mono text-[var(--green)]/70">
          {t("reasoningEngineRunning", { count: data.length })}
        </span>
      </div>
    </motion.section>
  );
}

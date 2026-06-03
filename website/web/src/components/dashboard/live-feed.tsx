"use client";

import { useEffect, useRef, useState, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useTranslations } from "next-intl";
import { LiveFeedEntry } from "../../types";
import { getLiveFeed, seedFeedFromMock, FeedItem } from "../../lib/livefeed-store";

interface Props {
  data: LiveFeedEntry[];
  feedKey?: number; // 外部递增触发重读
}

const SIGNAL_STYLE: Record<string, { bg: string; text: string; dot: string }> = {
  看涨:   { bg: "bg-[var(--green)]/10",  text: "text-[var(--green)]",  dot: "bg-[var(--green)]" },
  多方:   { bg: "bg-[var(--green)]/10",  text: "text-[var(--green)]",  dot: "bg-[var(--green)]" },
  买入:   { bg: "bg-[var(--green)]/15",  text: "text-[var(--green)]",  dot: "bg-[var(--green)]" },
  低风险: { bg: "bg-[var(--green)]/10",  text: "text-[var(--green)]",  dot: "bg-[var(--green)]" },
  看跌:   { bg: "bg-[var(--red)]/10",    text: "text-[var(--red)]",    dot: "bg-[var(--red)]" },
  空方:   { bg: "bg-[var(--red)]/10",    text: "text-[var(--red)]",    dot: "bg-[var(--red)]" },
  卖出:   { bg: "bg-[var(--red)]/10",    text: "text-[var(--red)]",    dot: "bg-[var(--red)]" },
  高风险: { bg: "bg-[var(--red)]/10",    text: "text-[var(--red)]",    dot: "bg-[var(--red)]" },
  中性:   { bg: "bg-[var(--amber)]/10",  text: "text-[var(--amber)]",  dot: "bg-[var(--amber)]" },
  平局:   { bg: "bg-[var(--amber)]/10",  text: "text-[var(--amber)]",  dot: "bg-[var(--amber)]" },
  持有:   { bg: "bg-[var(--amber)]/10",  text: "text-[var(--amber)]",  dot: "bg-[var(--amber)]" },
  中风险: { bg: "bg-[var(--amber)]/10",  text: "text-[var(--amber)]",  dot: "bg-[var(--amber)]" },
};

const DEFAULT_SIGNAL = { bg: "bg-[var(--border-custom)]", text: "text-[var(--text-secondary)]", dot: "bg-[var(--text-secondary)]/40" };

function formatTime(iso: string, justNow: string, minutesAgo: (n: number) => string, hoursAgo: (n: number) => string): string {
  try {
    const d = new Date(iso);
    const now = new Date();
    const diffMs = now.getTime() - d.getTime();
    const diffMin = Math.floor(diffMs / 60000);
    if (diffMin < 1)  return justNow;
    if (diffMin < 60) return minutesAgo(diffMin);
    const diffH = Math.floor(diffMin / 60);
    if (diffH < 24)   return hoursAgo(diffH);
    return d.toLocaleDateString("zh-CN", { month: "2-digit", day: "2-digit" });
  } catch {
    return iso;
  }
}

function FeedRow({ item, isNew, formatTimeFn }: { item: FeedItem; isNew: boolean; formatTimeFn: (iso: string) => string }) {
  const sig = SIGNAL_STYLE[item.signal] ?? DEFAULT_SIGNAL;
  return (
    <motion.div
      layout
      initial={isNew ? { opacity: 0, y: -16, scale: 0.98 } : { opacity: 1 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, height: 0, marginBottom: 0 }}
      transition={{ duration: 0.3, ease: "easeOut" }}
      className="flex items-start gap-3 px-4 py-3 border-b border-[var(--border-custom)]/40 last:border-0 hover:bg-[var(--blue)]/4 transition-colors group"
    >
      {/* 信号标签 */}
      <div className="shrink-0 pt-0.5">
        {item.signal ? (
          <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${sig.bg} ${sig.text}`}>
            <span className={`w-1 h-1 rounded-full ${sig.dot}`} />
            {item.signal}
          </span>
        ) : (
          <span className="inline-block w-2 h-2 rounded-full bg-[var(--text-secondary)]/20 mt-1" />
        )}
      </div>

      {/* 正文 */}
      <div className="flex-1 min-w-0">
        <p className="text-[13px] text-[var(--text-primary)] leading-snug line-clamp-2">
          {item.message}
        </p>
        <div className="flex items-center gap-2 mt-1">
          {item.ticker && item.ticker !== "—" && (
            <span className="font-mono text-[10px] font-semibold text-[var(--blue)]">{item.ticker}</span>
          )}
          <span className="text-[10px] text-[var(--text-secondary)]/50">{item.agent}</span>
        </div>
      </div>

      {/* 时间戳 */}
      <span className="shrink-0 text-[10px] font-mono text-[var(--text-secondary)]/35 pt-0.5">
        {formatTimeFn(item.timestamp)}
      </span>
    </motion.div>
  );
}

export function LiveFeed({ data, feedKey = 0 }: Props) {
  const t = useTranslations("dashboard");
  const formatTimeFn = (iso: string) => formatTime(
    iso,
    t("feedJustNow"),
    (n) => t("feedMinutesAgo", { n }),
    (n) => t("feedHoursAgo", { n }),
  );
  const [items, setItems] = useState<FeedItem[]>([]);
  const [newIds, setNewIds] = useState<Set<string>>(new Set());
  const [paused, setPaused] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);
  const prevIdsRef = useRef<Set<string>>(new Set());
  const autoScrollRef = useRef(true);

  // 读取 localStorage，检测新条目
  const reload = useCallback(() => {
    seedFeedFromMock(data);
    const loaded = getLiveFeed();
    const currentIds = new Set(loaded.map((f) => f.id));
    const added = new Set([...currentIds].filter((id) => !prevIdsRef.current.has(id)));
    prevIdsRef.current = currentIds;
    setNewIds(added);
    setItems(loaded);
    // 有新条目且未暂停 → 滚回顶部
    if (added.size > 0 && autoScrollRef.current) {
      requestAnimationFrame(() => {
        scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      });
    }
  }, [data]);

  // 初始加载 + feedKey 变化时重读
  useEffect(() => {
    reload();
  }, [reload, feedKey]);

  // 每 30 秒自动刷新时间戳显示
  useEffect(() => {
    const id = setInterval(() => setItems((prev) => [...prev]), 30000);
    return () => clearInterval(id);
  }, []);

  // 用户滚动时检测是否暂停自动滚动
  const handleScroll = useCallback(() => {
    const el = scrollRef.current;
    if (!el) return;
    const atTop = el.scrollTop < 40;
    autoScrollRef.current = atTop;
    setPaused(!atTop);
  }, []);

  // 点击"回到最新"
  const scrollToTop = useCallback(() => {
    scrollRef.current?.scrollTo({ top: 0, behavior: "smooth" });
    autoScrollRef.current = true;
    setPaused(false);
  }, []);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      {/* 头部 */}
      <div className="flex items-center justify-between mb-3">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] pulse-blue" />
            {t("feedTitle")}
          </h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("feedSubtitle")}</p>
        </div>
        <div className="flex items-center gap-3">
          {paused && (
            <button
              onClick={scrollToTop}
              className="text-[10px] font-mono text-[var(--blue)] hover:text-[var(--blue)]/80 flex items-center gap-1 transition-colors"
            >
              {t("feedBackToLatest")}
            </button>
          )}
          <span className="text-[10px] font-mono text-[var(--text-secondary)]/40">
            {t("feedSignalCount", { count: items.length })}
          </span>
        </div>
      </div>

      {/* Feed 容器 */}
      <div className="card-hero !p-0 overflow-hidden">
        <div
          ref={scrollRef}
          onScroll={handleScroll}
          className="overflow-y-auto"
          style={{ maxHeight: 400 }}
        >
          {items.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-16 gap-2">
              <span className="text-[var(--text-secondary)]/30 text-sm">{t("feedEmpty")}</span>
              <span className="text-[var(--text-secondary)]/20 text-[11px]">{t("feedEmptyDesc")}</span>
            </div>
          ) : (
            <AnimatePresence initial={false}>
              {items.map((item) => (
                <FeedRow key={item.id} item={item} isNew={newIds.has(item.id)} formatTimeFn={formatTimeFn} />
              ))}
            </AnimatePresence>
          )}
        </div>
      </div>
    </motion.section>
  );
}

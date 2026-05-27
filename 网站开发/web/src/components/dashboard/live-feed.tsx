"use client";

import { useMemo } from "react";
import { motion } from "framer-motion";
import { LiveFeedEntry } from "@/types";
import { Zap } from "lucide-react";

interface Props { data: LiveFeedEntry[] }

const AGENT_ICONS: Record<string, string> = {
  宏观分析智能体: "🌐", 基本面分析智能体: "📊", 技术面分析智能体: "📈",
  情绪分析智能体: "💬", 新闻分析智能体: "📰", 风险分析智能体: "⚠️",
};

const AGENT_ORDER = [
  "宏观分析智能体", "基本面分析智能体", "技术面分析智能体",
  "情绪分析智能体", "新闻分析智能体", "风险分析智能体",
];

export function LiveFeed({ data }: Props) {
  const agentCards = useMemo(() => {
    const map = new Map<string, LiveFeedEntry>();
    for (const entry of data) {
      if (!map.has(entry.agent) || entry.time > (map.get(entry.agent)?.time ?? "")) {
        map.set(entry.agent, entry);
      }
    }
    return AGENT_ORDER.filter((a) => map.has(a)).map((agent) => ({
      agent, entry: map.get(agent)!,
    }));
  }, [data]);

  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.3 }}
    >
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)] flex items-center gap-2">
            <span className="w-1.5 h-1.5 rounded-full bg-[var(--cyan)] pulse-blue" />
            AI 实时信息流
          </h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">六个智能体最新监测信号</p>
        </div>
        <span className="text-[10px] font-mono text-[var(--green)] flex items-center gap-1.5">
          <span className="w-1.5 h-1.5 rounded-full bg-[var(--green)] pulse-green" />
          实时监听中
        </span>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-3">
        {agentCards.map(({ agent, entry }, i) => (
          <motion.div
            key={agent}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: i * 0.06 }}
            className="card-terminal !p-0 overflow-hidden flex flex-col hover:border-[var(--border-custom)]/60 transition-colors"
          >
            {/* 核心消息 — Primary Insight */}
            <div className="px-3 pt-3 pb-2 flex-1">
              <div className="flex items-start gap-2">
                <Zap className="w-3 h-3 text-[var(--cyan)]/70 mt-0.5 shrink-0" />
                <p className="text-[12px] text-[var(--text-primary)] leading-snug font-medium line-clamp-3">
                  {entry.message}
                </p>
              </div>
            </div>

            {/* 底部来源标签 */}
            <div className="mt-auto px-3 pb-3 pt-2 border-t border-[var(--border-custom)] flex items-center justify-between text-[10px]">
              <span className="text-[var(--text-secondary)]/50 flex items-center gap-1">
                <span className="text-xs">{AGENT_ICONS[agent] || "🤖"}</span>
                <span className="text-[var(--text-secondary)]/40">{agent}</span>
              </span>
              <span className="font-mono text-[var(--text-secondary)]/40">{entry.time}</span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

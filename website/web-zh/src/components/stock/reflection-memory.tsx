"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Brain, Sparkles, ChevronDown, ChevronUp, ChevronRight, Clock } from "lucide-react";
import { LearningMemoryEntry } from "../../types";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

interface Props {
  ticker: string;
}

const RATING_LABELS: Record<string, string> = {
  Buy: "买入",
  Overweight: "增持",
  Hold: "持有",
  Underweight: "减持",
  Sell: "卖出",
};

function ratingLabel(rating: string): string {
  return RATING_LABELS[rating] ?? rating;
}

function ratingColor(rating: string): string {
  if (rating === "Buy" || rating === "Overweight") return "text-[var(--green)]";
  if (rating === "Sell" || rating === "Underweight") return "text-[var(--red)]";
  return "text-[var(--amber)]";
}

function formatReturn(value: string | null): string {
  if (value == null) return "—";
  return value.startsWith("+") || value.startsWith("-") ? value : `+${value}`;
}

function returnColor(value: string | null): string {
  if (value == null) return "text-[var(--text-secondary)]/50";
  return value.trim().startsWith("-") ? "text-[var(--red)]" : "text-[var(--green)]";
}

function MemoryEntryCard({ entry }: { entry: LearningMemoryEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left gap-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className={`text-[11px] font-semibold ${ratingColor(entry.rating)}`}>
            {ratingLabel(entry.rating)}
          </span>
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]/50 font-mono">
            <Clock className="w-3 h-3" />
            {entry.date}
          </span>
          {entry.pending ? (
            <span className="text-[9px] font-medium text-[var(--amber)] px-1.5 py-0.5 rounded-full bg-[var(--amber)]/10">
              {"等待结果验证"}
            </span>
          ) : (
            <span className="flex items-center gap-1.5 text-[10px] font-mono">
              <span className={returnColor(entry.rawReturn)}>
                {"收益 "}{formatReturn(entry.rawReturn)}
              </span>
              <span className={returnColor(entry.alphaReturn)}>
                {"alpha "}{formatReturn(entry.alphaReturn)}
              </span>
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50 shrink-0" />
        )}
      </button>

      {expanded && (
        <div className="mt-3 space-y-3">
          <div>
            <div className="text-[10px] text-[var(--text-secondary)]/60 mb-1">{"当时的决策"}</div>
            <p className="text-[12px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {stripAllMarkdown(entry.decision)}
            </p>
          </div>
          {entry.reflection && (
            <div className="pt-2 border-t border-[var(--border-custom)]/50">
              <div className="text-[10px] text-[var(--blue)]/70 mb-1">{"事后反思"}</div>
              <p className="text-[12px] text-[var(--blue)]/90 leading-relaxed whitespace-pre-wrap">
                {entry.reflection}
              </p>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ReflectionMemory({ ticker }: Props) {
  const [showAll, setShowAll] = useState(false);

  const { data, isLoading } = useQuery<{ success: boolean; data: LearningMemoryEntry[] }>({
    queryKey: ["stock-memory", ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}/memory`).then((r) => r.json()),
    retry: false,
  });

  const entries = data?.data ?? [];
  const VISIBLE_COUNT = 3;
  const visibleEntries = showAll ? entries : entries.slice(0, VISIBLE_COUNT);
  const hiddenCount = entries.length - VISIBLE_COUNT;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"系统学习记忆"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Brain className="w-4 h-4 text-[var(--purple)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {"AI 系统学习记忆"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : entries.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无学习记忆"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"再次分析同一标的时，系统会复盘上次决策并生成反思"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {visibleEntries.map((entry, i) => (
              <MemoryEntryCard key={`${entry.date}-${i}`} entry={entry} />
            ))}
            {hiddenCount > 0 && (
              <button
                onClick={() => setShowAll((v) => !v)}
                className="w-full flex items-center justify-center gap-1.5 py-2 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {showAll ? (
                  <>
                    <ChevronUp className="w-3.5 h-3.5" />
                    {"收起"}
                  </>
                ) : (
                  <>
                    <ChevronDown className="w-3.5 h-3.5" />
                    {`展开剩余 ${hiddenCount} 条`}
                  </>
                )}
              </button>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}

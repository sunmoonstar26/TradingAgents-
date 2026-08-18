"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Archive, Sparkles, ChevronDown, ChevronRight, Clock, Cpu } from "lucide-react";
import { ResearchHistoryEntry } from "../../types";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

interface Props {
  ticker: string;
}

function formatCreatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

function formatRuntime(ms: number | null): string {
  if (ms == null) return "耗时未知";
  if (ms < 1000) return `${ms}ms`;
  return `${(ms / 1000).toFixed(1)}s`;
}

function formatTokens(tokens: number | null): string {
  if (tokens == null) return "token 未知";
  if (tokens >= 1000) return `${(tokens / 1000).toFixed(1)}k tokens`;
  return `${tokens} tokens`;
}

function ResearchEntryCard({ entry }: { entry: ResearchHistoryEntry }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left gap-2"
      >
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
            {entry.recommendation ?? "未知信号"}
          </span>
          {entry.confidence != null && (
            <span className="text-[10px] text-[var(--text-secondary)]/60 font-mono">
              {`置信度 ${entry.confidence}%`}
            </span>
          )}
          <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]/50 font-mono">
            <Clock className="w-3 h-3" />
            {formatCreatedAt(entry.created_at)}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50 shrink-0" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50 shrink-0" />
        )}
      </button>

      <div className="flex items-center gap-3 mt-2 text-[10px] text-[var(--text-secondary)]/50 font-mono">
        <span className="flex items-center gap-1">
          <Cpu className="w-3 h-3" />
          {entry.model ?? "模型未知"}
        </span>
        <span>{formatRuntime(entry.runtime_ms)}</span>
        <span>{formatTokens(entry.token_usage)}</span>
      </div>

      {expanded && entry.summary && (
        <p className="text-[12px] text-[var(--text-secondary)] mt-2 leading-relaxed">
          {stripAllMarkdown(entry.summary)}
        </p>
      )}
    </div>
  );
}

export function ResearchArchive({ ticker }: Props) {
  const { data, isLoading } = useQuery<{ success: boolean; data: ResearchHistoryEntry[] }>({
    queryKey: ["stock-research-history", ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}/research-history`).then((r) => r.json()),
    retry: false,
  });

  const entries = data?.data ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"研究档案"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Archive className="w-4 h-4 text-[var(--purple)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {"历史研究记录"}
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
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无历史研究记录"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"每次 AI 分析完成后，会自动存档到研究档案"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {entries.map((entry) => (
              <ResearchEntryCard key={entry.id} entry={entry} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

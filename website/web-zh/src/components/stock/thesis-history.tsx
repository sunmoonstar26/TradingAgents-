"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { BookOpen, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { Thesis } from "../../types";
import { MarkdownContent } from "../../components/ui/MarkdownContent";

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

function ThesisCard({ thesis, isLatest }: { thesis: Thesis; isLatest: boolean }) {
  const [expanded, setExpanded] = useState(isLatest);

  return (
    <div
      className="rounded-xl border p-3 transition-colors"
      style={{
        borderColor: isLatest ? "var(--blue)" : "var(--border-custom)",
        background: isLatest ? "rgba(59,130,246,0.06)" : "transparent",
      }}
    >
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2">
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
            {`V${thesis.version}`}
          </span>
          {isLatest && (
            <span className="text-[10px] font-medium text-[var(--blue)] px-1.5 py-0.5 rounded-full bg-[var(--blue)]/10">
              {"当前"}
            </span>
          )}
          <span className="text-[10px] text-[var(--text-secondary)]/50 font-mono">
            {formatCreatedAt(thesis.created_at)}
          </span>
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        )}
      </button>

      {expanded && (
        <div className="mt-2">
          <MarkdownContent content={thesis.content} />
        </div>
      )}
    </div>
  );
}

export function ThesisHistory({ ticker }: Props) {
  const { data, isLoading } = useQuery<{ success: boolean; data: Thesis[] }>({
    queryKey: ["stock-theses", ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}/theses`).then((r) => r.json()),
    retry: false,
  });

  const theses = data?.data ?? [];

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"财报解读"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <BookOpen className="w-4 h-4 text-[var(--purple)]" />
          <span className="text-[11px] font-semibold text-[var(--text-primary)]">
            {"财报解读版本历史"}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 2 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : theses.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {"暂无财报解读记录"}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"每次 AI 分析完成后，会自动生成一个新的财报解读版本"}
            </p>
          </div>
        ) : (
          <div className="space-y-2">
            {theses.map((thesis, i) => (
              <ThesisCard key={thesis.id} thesis={thesis} isLatest={i === 0} />
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { NotebookPen, Pencil } from "lucide-react";
import { InvestmentRationale as InvestmentRationaleType } from "../../types";

interface Props {
  ticker: string;
}

function formatUpdatedAt(iso: string): string {
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

export function InvestmentRationale({ ticker }: Props) {
  const qc = useQueryClient();
  const queryKey = ["rationale", ticker];

  const { data, isLoading } = useQuery<{ success: boolean; data: InvestmentRationaleType | null }>({
    queryKey,
    queryFn: () => fetch(`/api/stocks/${ticker}/rationale`).then((r) => r.json()),
    retry: false,
  });

  const rationale = data?.data ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(rationale?.content ?? "");
    setError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError(null);
  };

  const save = async () => {
    if (draft.trim().length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/rationale`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? "保存失败");
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setIsEditing(false);
    } catch {
      setError("保存失败，请检查网络后重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"投资理由"}
      </h2>

      <div className="card-terminal p-4">
        {isLoading ? (
          <div className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : isEditing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="写下你的投资判断依据……"
              className="w-full min-h-[120px] rounded-xl border border-[var(--border-custom)] bg-[var(--panel2)]/60 p-3 text-[13px] text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--blue)]/40 resize-y"
            />
            {error && (
              <p className="text-[11px] text-[var(--red)]">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={isSaving || draft.trim().length === 0}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  isSaving || draft.trim().length === 0
                    ? "bg-[var(--blue)]/10 text-[var(--blue)] cursor-not-allowed"
                    : "bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20"
                }`}
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {"取消"}
              </button>
            </div>
          </div>
        ) : rationale ? (
          <div className="space-y-2">
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {rationale.content}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-[var(--text-secondary)]/50">
                {formatUpdatedAt(rationale.created_at)}
              </span>
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                {"编辑"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <NotebookPen className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无投资理由"}</p>
            <button
              onClick={startEditing}
              className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20 transition-colors"
            >
              {"添加"}
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
}

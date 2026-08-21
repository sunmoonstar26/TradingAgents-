"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Sparkle, Pencil, AlertTriangle } from "lucide-react";
import { ProphetIndicator as ProphetIndicatorType } from "../../types";

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

export function ProphetIndicator({ ticker }: Props) {
  const qc = useQueryClient();
  const queryKey = ["prophet-indicator", ticker];

  const { data, isLoading, isError, refetch, isRefetching } = useQuery<{
    success: boolean;
    data: ProphetIndicatorType | null;
  }>({
    queryKey,
    queryFn: () => fetch(`/api/stocks/${ticker}/prophet-indicator`).then((r) => r.json()),
    retry: false,
  });

  const indicator = data?.data ?? null;

  const isIndicatorError =
    (isError && !indicator) || (!!data && data.success === false);

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(indicator?.content ?? "");
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
      const res = await fetch(`/api/stocks/${ticker}/prophet-indicator`, {
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
        {"超前指标"}
      </h2>

      <div className="card-terminal p-4">
        {isLoading ? (
          <div className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : isEditing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="写下你的超前指标……"
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
        ) : isIndicatorError ? (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <AlertTriangle className="w-6 h-6 text-[var(--red)]/60 mb-3" />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {"加载失败，暂时无法确认是否已有超前指标"}
            </p>
            <button
              onClick={() => refetch()}
              disabled={isRefetching}
              className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors disabled:opacity-50"
            >
              {isRefetching ? "重试中..." : "重试"}
            </button>
          </div>
        ) : indicator ? (
          <div className="space-y-2">
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {indicator.content}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-[var(--text-secondary)]/50">
                {formatUpdatedAt(indicator.created_at)}
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
            <Sparkle className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[11px] text-[var(--text-secondary)]">{"暂无超前指标"}</p>
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

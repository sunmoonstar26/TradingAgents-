"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Clock, Sparkles, History, Plus, Trash2, ChevronDown, ChevronUp } from "lucide-react";
import { TimelineEvent } from "../../types";
import { TIMELINE_EVENT_LABELS } from "../../content/labels";

interface Props {
  ticker: string;
}

function formatOccurredAt(iso: string): string {
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

function toDatetimeLocalValue(date: Date): string {
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${date.getFullYear()}-${pad(date.getMonth() + 1)}-${pad(date.getDate())}T${pad(
    date.getHours()
  )}:${pad(date.getMinutes())}`;
}

const VISIBLE_COUNT = 4;

export function CompanyTimeline({ ticker }: Props) {
  const qc = useQueryClient();
  const queryKey = ["stock-timeline", ticker];

  const { data, isLoading } = useQuery<{ success: boolean; data: TimelineEvent[] }>({
    queryKey,
    queryFn: () => fetch(`/api/stocks/${ticker}/timeline`).then((r) => r.json()),
    retry: false,
  });

  const events = data?.data ?? [];

  const [isExpanded, setIsExpanded] = useState(false);
  const visibleEvents = isExpanded ? events : events.slice(0, VISIBLE_COUNT);
  const hiddenCount = events.length - visibleEvents.length;

  const [isAdding, setIsAdding] = useState(false);
  const [title, setTitle] = useState("");
  const [occurredAt, setOccurredAt] = useState("");
  const [description, setDescription] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  const startAdding = () => {
    setTitle("");
    setOccurredAt(toDatetimeLocalValue(new Date()));
    setDescription("");
    setSourceUrl("");
    setError(null);
    setIsAdding(true);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setError(null);
  };

  const submitAdd = async () => {
    if (title.trim() === "" || occurredAt === "") return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/timeline`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          title,
          description: description.trim() === "" ? null : description,
          source_url: sourceUrl.trim() === "" ? null : sourceUrl,
          occurred_at: new Date(occurredAt).toISOString(),
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? "添加失败");
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setIsAdding(false);
    } catch {
      setError("添加失败，请检查网络后重试");
    } finally {
      setIsSaving(false);
    }
  };

  const handleDelete = async (event: TimelineEvent) => {
    if (!window.confirm(`确定删除这条时间轴事件吗？\n\n${event.title}`)) return;
    setDeletingId(event.id);
    try {
      const res = await fetch(`/api/stocks/${ticker}/timeline/${event.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!body.success) {
        window.alert(body.error ?? "删除失败");
        return;
      }
      await qc.invalidateQueries({ queryKey });
    } catch {
      window.alert("删除失败，请检查网络后重试");
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"公司时间轴"}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="w-4 h-4 text-[var(--blue)]" />
            <span className="text-[11px] font-semibold text-[var(--text-primary)]">
              {"持续事件"}
            </span>
          </div>
          {!isAdding && (
            <button
              onClick={startAdding}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
            >
              <Plus className="w-3 h-3" />
              {"添加事件"}
            </button>
          )}
        </div>

        {isAdding && (
          <div className="mb-4 space-y-2 rounded-xl border border-[var(--border-custom)] bg-[var(--panel2)]/60 p-3">
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="标题（必填）"
              className="w-full rounded-lg border border-[var(--border-custom)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/40"
            />
            <input
              type="datetime-local"
              value={occurredAt}
              onChange={(e) => setOccurredAt(e.target.value)}
              className="w-full rounded-lg border border-[var(--border-custom)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/40"
            />
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="描述（选填）"
              className="w-full min-h-[60px] rounded-lg border border-[var(--border-custom)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/40 resize-y"
            />
            <input
              value={sourceUrl}
              onChange={(e) => setSourceUrl(e.target.value)}
              placeholder="来源链接（选填）"
              className="w-full rounded-lg border border-[var(--border-custom)] bg-transparent px-3 py-1.5 text-[13px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/40"
            />
            {error && <p className="text-[11px] text-[var(--red)]">{error}</p>}
            <div className="flex items-center gap-2">
              <button
                onClick={submitAdd}
                disabled={isSaving || title.trim() === "" || occurredAt === ""}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  isSaving || title.trim() === "" || occurredAt === ""
                    ? "bg-[var(--blue)]/10 text-[var(--blue)] cursor-not-allowed"
                    : "bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20"
                }`}
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={cancelAdding}
                disabled={isSaving}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {"取消"}
              </button>
            </div>
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-14 rounded-lg bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[11px] text-[var(--text-secondary)]">
              {"暂无历史事件"}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"运行更多分析后，公司时间轴会自动积累"}
            </p>
          </div>
        ) : (
          <>
          <ol className="relative space-y-4 pl-5 border-l border-[var(--border-custom)]">
            {visibleEvents.map((event) => (
              <li key={event.id} className="group relative">
                <span className="absolute -left-[25px] top-1 w-2.5 h-2.5 rounded-full bg-[var(--blue)]" />
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-[11px] font-semibold text-[var(--text-primary)]">
                    {TIMELINE_EVENT_LABELS[event.event_type] ?? event.event_type}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-[var(--text-secondary)]/50 font-mono">
                    <Clock className="w-3 h-3" />
                    {formatOccurredAt(event.occurred_at)}
                  </span>
                  <button
                    onClick={() => handleDelete(event)}
                    disabled={deletingId === event.id}
                    aria-label="删除事件"
                    className="ml-auto opacity-0 group-hover:opacity-100 text-[var(--text-secondary)]/50 hover:text-[var(--red)] transition-opacity disabled:opacity-50"
                  >
                    <Trash2 className="w-3 h-3" />
                  </button>
                </div>
                <p className="text-[11px] text-[var(--text-secondary)]">{event.title}</p>
                {event.description && (
                  <p className="text-[11px] text-[var(--text-secondary)]/70 mt-1 line-clamp-2">
                    {event.description}
                  </p>
                )}
                {event.source && (
                  event.source_url ? (
                    <a
                      href={event.source_url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-block mt-1 text-[10px] text-[var(--blue)] font-mono hover:underline"
                    >
                      {event.source}
                    </a>
                  ) : (
                    <span className="inline-block mt-1 text-[10px] text-[var(--text-secondary)]/40 font-mono">
                      {event.source}
                    </span>
                  )
                )}
              </li>
            ))}
          </ol>
          {(hiddenCount > 0 || isExpanded) && (
            <button
              onClick={() => setIsExpanded((v) => !v)}
              className="mt-3 flex w-full items-center justify-center gap-1 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isExpanded ? (
                <>
                  <ChevronUp className="w-3 h-3" />
                  {"收起"}
                </>
              ) : (
                <>
                  <ChevronDown className="w-3 h-3" />
                  {`展开剩余 ${hiddenCount} 条`}
                </>
              )}
            </button>
          )}
          </>
        )}
      </div>
    </motion.section>
  );
}

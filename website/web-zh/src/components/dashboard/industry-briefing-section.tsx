"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Newspaper, Pencil, Check, Plus, X } from "lucide-react";
import { INDUSTRY_NEWS_TEXT } from "@/content/industry-news";

interface BriefingEntry {
  briefingDate: string;
  content: string;
}

interface IndustryNewsResponse {
  success: boolean;
  data?: {
    latest: BriefingEntry | null;
    history: BriefingEntry[];
  };
}

const isEditable = process.env.NODE_ENV !== "production";

export function IndustryBriefingSection() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newContent, setNewContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<IndustryNewsResponse>({
    queryKey: ["industry-news"],
    queryFn: () => fetch("/api/industry-news").then((r) => r.json()),
    refetchInterval: 5 * 60_000,
  });

  const history = data?.data?.history ?? [];
  const latest = data?.data?.latest ?? null;
  const active =
    history.find((h) => h.briefingDate === selectedDate) ?? latest;

  useEffect(() => {
    setEditedContent(active?.content ?? "");
  }, [active?.briefingDate, active?.content]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["industry-news"] });

  const handleSave = async () => {
    if (!active) return;
    setActionError(null);
    const res = await fetch("/api/industry-news", {
      method: "POST",
      body: JSON.stringify({ briefingDate: active.briefingDate, content: editedContent }),
    });
    if (!res.ok) {
      setActionError(INDUSTRY_NEWS_TEXT.saveFailedMessage);
      return;
    }
    refresh();
  };

  const handleDelete = async (briefingDate: string) => {
    if (!window.confirm(INDUSTRY_NEWS_TEXT.deleteConfirm)) return;
    setActionError(null);
    const res = await fetch("/api/industry-news", {
      method: "DELETE",
      body: JSON.stringify({ briefingDate }),
    });
    if (!res.ok) {
      setActionError(INDUSTRY_NEWS_TEXT.deleteFailedMessage);
      return;
    }
    if (selectedDate === briefingDate) setSelectedDate(null);
    refresh();
  };

  const handleAddNew = async () => {
    setActionError(null);
    const res = await fetch("/api/industry-news", {
      method: "POST",
      body: JSON.stringify({ briefingDate: newDate, content: newContent }),
    });
    if (!res.ok) {
      setActionError(INDUSTRY_NEWS_TEXT.saveFailedMessage);
      return;
    }
    setNewDate("");
    setNewContent("");
    setIsAddingNew(false);
    refresh();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[var(--blue)]" />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {INDUSTRY_NEWS_TEXT.title}
            </span>
          </div>
          {isEditable && !isLoading && (
            <button
              onClick={() => {
                setIsEditing((v) => !v);
                setIsAddingNew(false);
                setActionError(null);
              }}
              className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isEditing ? (
                <>
                  <Check className="w-3 h-3" />
                  {INDUSTRY_NEWS_TEXT.done}
                </>
              ) : (
                <>
                  <Pencil className="w-3 h-3" />
                  {INDUSTRY_NEWS_TEXT.edit}
                </>
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="h-40 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : error || !data?.success ? (
          <p className="text-[12px] text-[var(--text-secondary)]">
            {INDUSTRY_NEWS_TEXT.loadErrorMessage}
          </p>
        ) : !active && !isEditing ? (
          <p className="text-[12px] text-[var(--text-secondary)] py-6 text-center">
            {INDUSTRY_NEWS_TEXT.emptyState}
          </p>
        ) : (
          <div>
            {(history.length > 1 || isEditing) && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {history.map((h) => (
                  <span key={h.briefingDate} className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDate(h.briefingDate)}
                      className={`text-[10px] font-mono px-2 py-1 rounded ${
                        h.briefingDate === active?.briefingDate
                          ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                          : "text-[var(--text-secondary)]/60 hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      {h.briefingDate}
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleDelete(h.briefingDate)}
                        className="text-[var(--text-secondary)]/40 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <button
                    onClick={() => setIsAddingNew((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded text-[var(--text-secondary)]/60 hover:text-[var(--text-secondary)]"
                  >
                    <Plus className="w-3 h-3" />
                    {INDUSTRY_NEWS_TEXT.addNew}
                  </button>
                )}
              </div>
            )}

            {isAddingNew && (
              <div className="mb-3 p-3 rounded-xl border border-[var(--border-custom)] space-y-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder={INDUSTRY_NEWS_TEXT.datePlaceholder}
                  className="text-[12px] bg-transparent border border-[var(--border-custom)] rounded px-2 py-1"
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={INDUSTRY_NEWS_TEXT.contentPlaceholder}
                  className="w-full h-32 text-[12px] bg-transparent border border-[var(--border-custom)] rounded p-2"
                />
                <button
                  onClick={handleAddNew}
                  className="text-[11px] px-3 py-1 rounded bg-[var(--blue)]/20 text-[var(--blue)]"
                >
                  {INDUSTRY_NEWS_TEXT.save}
                </button>
              </div>
            )}

            {actionError && (
              <p className="text-[11px] text-red-500 mb-2">{actionError}</p>
            )}

            {active && isEditing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-48 text-[12px] text-[var(--text-primary)] bg-transparent border border-[var(--border-custom)] rounded p-2 leading-relaxed"
                />
                <button
                  onClick={handleSave}
                  className="mt-2 text-[11px] px-3 py-1 rounded bg-[var(--blue)]/20 text-[var(--blue)]"
                >
                  {INDUSTRY_NEWS_TEXT.save}
                </button>
              </div>
            ) : active ? (
              <pre className="text-[12px] text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed">
                {active.content}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </motion.section>
  );
}

"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
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

export function IndustryBriefingSection() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<IndustryNewsResponse>({
    queryKey: ["industry-news"],
    queryFn: () => fetch("/api/industry-news").then((r) => r.json()),
    refetchInterval: 5 * 60_000,
  });

  const history = data?.data?.history ?? [];
  const latest = data?.data?.latest ?? null;
  const active =
    history.find((h) => h.briefingDate === selectedDate) ?? latest;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {INDUSTRY_NEWS_TEXT.title}
          </span>
        </div>

        {isLoading ? (
          <div className="h-40 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : error || !data?.success ? (
          <p className="text-[12px] text-[var(--text-secondary)]">
            {INDUSTRY_NEWS_TEXT.loadErrorMessage}
          </p>
        ) : !active ? (
          <p className="text-[12px] text-[var(--text-secondary)] py-6 text-center">
            {INDUSTRY_NEWS_TEXT.emptyState}
          </p>
        ) : (
          <div>
            {history.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {history.map((h) => (
                  <button
                    key={h.briefingDate}
                    onClick={() => setSelectedDate(h.briefingDate)}
                    className={`text-[10px] font-mono px-2 py-1 rounded ${
                      h.briefingDate === active.briefingDate
                        ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                        : "text-[var(--text-secondary)]/60 hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {h.briefingDate}
                  </button>
                ))}
              </div>
            )}
            <pre className="text-[12px] text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed">
              {active.content}
            </pre>
          </div>
        )}
      </div>
    </motion.section>
  );
}

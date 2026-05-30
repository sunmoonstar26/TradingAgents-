"use client";

import { motion } from "framer-motion";
import { LearningMemory, MemoryInsight } from "../../types";
import { Brain, Lightbulb, AlertTriangle, RefreshCw, TrendingUp } from "lucide-react";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

interface Props {
  data: LearningMemory[];
  memoryInsight?: MemoryInsight;
}

export function ReflectionMemory({ data, memoryInsight }: Props) {
  const learnings = memoryInsight?.learnings?.length ? memoryInsight.learnings : [];
  const hasInsight = learnings.length > 0;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        系统学习记忆
      </h2>

      <div className="card-terminal overflow-hidden space-y-3 p-4">
        <div className="flex items-center gap-2 mb-1">
          <Brain className="w-4 h-4 text-[var(--purple)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">AI 系统学习记忆</span>
        </div>

        {hasInsight ? (
          <div className="space-y-3">
            {learnings.map((item, i) => (
              <div
                key={i}
                className="p-3 rounded-xl border border-[var(--border-custom)] hover:border-[var(--purple)]/15 transition-colors"
              >
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 mb-2">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <AlertTriangle className="w-3 h-3 text-[var(--amber)]" />
                      <span className="text-[10px] text-[var(--text-secondary)]/60">发生了什么</span>
                    </div>
                    <p className="text-[12px] text-[var(--text-primary)] font-medium">{item.what_happened}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <Lightbulb className="w-3 h-3 text-[var(--amber)]" />
                      <span className="text-[10px] text-[var(--text-secondary)]/60">智能体忽略了</span>
                    </div>
                    <p className="text-[12px] text-[var(--text-secondary)]">{item.what_missed}</p>
                  </div>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-2 border-t border-[var(--border-custom)]/50">
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <RefreshCw className="w-3 h-3 text-[var(--blue)]" />
                      <span className="text-[10px] text-[var(--text-secondary)]/60">系统调整</span>
                    </div>
                    <p className="text-[12px] text-[var(--blue)]/80">{item.system_adjustment}</p>
                  </div>
                  <div>
                    <div className="flex items-center gap-1.5 mb-1">
                      <TrendingUp className="w-3 h-3 text-[var(--green)]" />
                      <span className="text-[10px] text-[var(--text-secondary)]/60">未来影响</span>
                    </div>
                    <p className="text-[12px] text-[var(--green)]/80">{item.future_impact}</p>
                  </div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          /* 回退：原始反思数据 */
          <div className="space-y-3">
            {data.map((memory, i) => (
              <div
                key={i}
                className="p-3 rounded-lg bg-[var(--panel2)]/40 border border-[var(--border-custom)]"
              >
                <div className="text-[10px] text-[var(--text-secondary)]/50 mb-1 font-mono">
                  学习记录 #{i + 1}
                </div>
                <div className="space-y-2">
                  <p className="text-[12px] text-[var(--text-primary)]">
                    <span className="text-[var(--amber)]/80 font-medium">事件：</span>
                    {stripAllMarkdown(memory.whatHappened)}
                  </p>
                  <p className="text-[12px] text-[var(--text-secondary)]">
                    <span className="text-[var(--red)]/80">忽略：</span>
                    {stripAllMarkdown(memory.whatAgentsMissed)}
                  </p>
                  <p className="text-[12px] text-[var(--blue)]/80">
                    <span className="font-medium">调整：</span>
                    {stripAllMarkdown(memory.systemAdjustment)}
                  </p>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

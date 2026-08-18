"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown, ChevronRight } from "lucide-react";
import { BusinessEngine } from "../../types";
import { RevenueRole, EngineTrend } from "../../types/enums";
import {
  REVENUE_ROLE_LABELS,
  LIFECYCLE_STAGE_LABELS,
  CUSTOMER_SEGMENT_LABELS,
  MONETIZATION_MODEL_LABELS,
  ENGINE_CONFIDENCE_LABELS,
  BUSINESS_ENGINE_TEXT,
} from "../../content/business-engine";

interface Props {
  ticker: string;
}

const ROLE_ORDER = [
  RevenueRole.CORE,
  RevenueRole.MAJOR,
  RevenueRole.EMERGING,
  RevenueRole.EXPERIMENTAL,
  RevenueRole.DECLINING,
  RevenueRole.UNKNOWN,
];

function TrendIcon({ trend }: { trend: EngineTrend }) {
  if (trend === EngineTrend.UP) return <TrendingUp className="w-3.5 h-3.5 text-[var(--green)]" />;
  if (trend === EngineTrend.DOWN) return <TrendingDown className="w-3.5 h-3.5 text-[var(--red)]" />;
  return <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]/40" />;
}

function EngineCard({ engine }: { engine: BusinessEngine }) {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3">
      <button
        onClick={() => setExpanded((v) => !v)}
        className="flex items-center justify-between w-full text-left"
      >
        <div className="flex items-center gap-2 flex-wrap">
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {engine.name}
          </span>
          <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--panel2)]/60 text-[var(--text-secondary)]">
            {REVENUE_ROLE_LABELS[engine.revenue_role]}
          </span>
          <span className="text-[10px] text-[var(--text-secondary)]/60">
            {LIFECYCLE_STAGE_LABELS[engine.lifecycle_stage]}
          </span>
          <TrendIcon trend={engine.trend} />
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        )}
      </button>

      <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
        {engine.description}
      </p>

      {expanded && (
        <div className="mt-3 space-y-2 text-[11px]">
          <div>
            <span className="text-[var(--text-secondary)]/60 mr-2">
              {BUSINESS_ENGINE_TEXT.customerSegmentLabel}
            </span>
            {engine.customer_segment.map((s) => (
              <span key={s} className="mr-1.5 text-[var(--text-primary)]">
                {CUSTOMER_SEGMENT_LABELS[s]}
              </span>
            ))}
          </div>
          {engine.product_or_service && (
            <div>
              <span className="text-[var(--text-secondary)]/60 mr-2">
                {BUSINESS_ENGINE_TEXT.productOrServiceLabel}
              </span>
              <span className="text-[var(--text-primary)]">{engine.product_or_service}</span>
            </div>
          )}
          <div>
            <span className="text-[var(--text-secondary)]/60 mr-2">
              {BUSINESS_ENGINE_TEXT.monetizationModelLabel}
            </span>
            {engine.monetization_model.map((m) => (
              <span key={m} className="mr-1.5 text-[var(--text-primary)]">
                {MONETIZATION_MODEL_LABELS[m]}
              </span>
            ))}
          </div>
          <div>
            <span className="text-[var(--text-secondary)]/60 mr-2">
              {BUSINESS_ENGINE_TEXT.confidenceLabel}
            </span>
            <span className="text-[var(--text-primary)]">
              {ENGINE_CONFIDENCE_LABELS[engine.confidence]}
            </span>
          </div>
          {engine.evidence.length > 0 && (
            <div>
              <div className="text-[var(--text-secondary)]/60 mb-1">
                {BUSINESS_ENGINE_TEXT.evidenceLabel}
              </div>
              <ul className="space-y-1">
                {engine.evidence.map((ev, i) => (
                  <li key={i} className="text-[var(--text-secondary)]">
                    {`${BUSINESS_ENGINE_TEXT.evidenceSourceTypeLabels[ev.source_type]} · ${ev.date} · ${ev.claim} (${BUSINESS_ENGINE_TEXT.evidenceDirectionLabels[ev.direction]})`}
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function BusinessEnginesSection({ ticker }: Props) {
  const { data, isLoading } = useQuery<{ success: boolean; data: BusinessEngine[] }>({
    queryKey: ["stock-business-engines", ticker],
    queryFn: () => fetch(`/api/stocks/${ticker}/business-engines`).then((r) => r.json()),
    retry: false,
  });

  const engines = data?.data ?? [];
  const grouped = ROLE_ORDER
    .map((role) => ({ role, items: engines.filter((e) => e.revenue_role === role) }))
    .filter((g) => g.items.length > 0);

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {BUSINESS_ENGINE_TEXT.sectionTitle}
      </h2>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {BUSINESS_ENGINE_TEXT.cardTitle}
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : engines.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">
              {BUSINESS_ENGINE_TEXT.emptyTitle}
            </p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {BUSINESS_ENGINE_TEXT.emptySubtitle}
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {grouped.map(({ role, items }) => (
              <div key={role}>
                <h3 className="text-[10px] font-semibold text-[var(--text-secondary)]/70 uppercase tracking-wide mb-2">
                  {REVENUE_ROLE_LABELS[role]}
                </h3>
                <div className="space-y-2">
                  {items.map((engine) => (
                    <EngineCard key={engine.id} engine={engine} />
                  ))}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </motion.section>
  );
}

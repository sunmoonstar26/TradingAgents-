"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  TrendingUp, TrendingDown, Minus, Sparkles, ChevronDown, ChevronRight, Pencil, Trash2, Plus,
} from "lucide-react";
import { BusinessEngine } from "../../types";
import {
  RevenueRole, LifecycleStage, EngineTrend, EngineConfidence, CustomerSegment, MonetizationModel,
} from "../../types/enums";
import {
  REVENUE_ROLE_LABELS,
  LIFECYCLE_STAGE_LABELS,
  CUSTOMER_SEGMENT_LABELS,
  MONETIZATION_MODEL_LABELS,
  ENGINE_CONFIDENCE_LABELS,
  ENGINE_TREND_LABELS,
  BUSINESS_ENGINE_TEXT,
} from "../../content/business-engine";

interface Props {
  ticker: string;
}

interface EngineDraft {
  name: string;
  description: string;
  customer_segment: CustomerSegment[];
  product_or_service: string;
  monetization_model: MonetizationModel[];
  revenue_role: RevenueRole;
  lifecycle_stage: LifecycleStage;
  trend: EngineTrend;
  confidence: EngineConfidence;
  evidenceText: string;
}

const ROLE_ORDER = [
  RevenueRole.CORE,
  RevenueRole.MAJOR,
  RevenueRole.EMERGING,
  RevenueRole.EXPERIMENTAL,
  RevenueRole.DECLINING,
  RevenueRole.UNKNOWN,
];

const EMPTY_DRAFT: EngineDraft = {
  name: "",
  description: "",
  customer_segment: [],
  product_or_service: "",
  monetization_model: [],
  revenue_role: RevenueRole.UNKNOWN,
  lifecycle_stage: LifecycleStage.UNKNOWN,
  trend: EngineTrend.UNKNOWN,
  confidence: EngineConfidence.LOW,
  evidenceText: "[]",
};

function draftFromEngine(engine: BusinessEngine): EngineDraft {
  return {
    name: engine.name,
    description: engine.description,
    customer_segment: engine.customer_segment,
    product_or_service: engine.product_or_service ?? "",
    monetization_model: engine.monetization_model,
    revenue_role: engine.revenue_role,
    lifecycle_stage: engine.lifecycle_stage,
    trend: engine.trend,
    confidence: engine.confidence,
    evidenceText: JSON.stringify(engine.evidence, null, 2),
  };
}

function toggleInArray<T>(arr: T[], value: T): T[] {
  return arr.includes(value) ? arr.filter((v) => v !== value) : [...arr, value];
}

function TrendIcon({ trend }: { trend: EngineTrend }) {
  if (trend === EngineTrend.UP) return <TrendingUp className="w-3.5 h-3.5 text-[var(--green)]" />;
  if (trend === EngineTrend.DOWN) return <TrendingDown className="w-3.5 h-3.5 text-[var(--red)]" />;
  return <Minus className="w-3.5 h-3.5 text-[var(--text-secondary)]/40" />;
}

const inputClass =
  "w-full rounded-lg border border-[var(--border-custom)] bg-[var(--panel2)]/60 px-2.5 py-1.5 text-[12px] text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/40";

function EngineForm({
  draft,
  onChange,
  onSave,
  onCancel,
  onDelete,
  isSaving,
  error,
}: {
  draft: EngineDraft;
  onChange: (draft: EngineDraft) => void;
  onSave: () => void;
  onCancel: () => void;
  onDelete?: () => void;
  isSaving: boolean;
  error: string | null;
}) {
  return (
    <div className="space-y-3">
      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.name}
        </label>
        <input
          className={inputClass}
          value={draft.name}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.name}
          onChange={(e) => onChange({ ...draft, name: e.target.value })}
        />
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.description}
        </label>
        <textarea
          className={`${inputClass} min-h-[72px] resize-y`}
          value={draft.description}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.description}
          onChange={(e) => onChange({ ...draft, description: e.target.value })}
        />
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.productOrService}
        </label>
        <input
          className={inputClass}
          value={draft.product_or_service}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.productOrService}
          onChange={(e) => onChange({ ...draft, product_or_service: e.target.value })}
        />
      </div>

      <div className="grid grid-cols-2 gap-2">
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.revenueRole}
          </label>
          <select
            className={inputClass}
            value={draft.revenue_role}
            onChange={(e) => onChange({ ...draft, revenue_role: e.target.value as RevenueRole })}
          >
            {Object.values(RevenueRole).map((v) => (
              <option key={v} value={v}>{REVENUE_ROLE_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.lifecycleStage}
          </label>
          <select
            className={inputClass}
            value={draft.lifecycle_stage}
            onChange={(e) => onChange({ ...draft, lifecycle_stage: e.target.value as LifecycleStage })}
          >
            {Object.values(LifecycleStage).map((v) => (
              <option key={v} value={v}>{LIFECYCLE_STAGE_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.trend}
          </label>
          <select
            className={inputClass}
            value={draft.trend}
            onChange={(e) => onChange({ ...draft, trend: e.target.value as EngineTrend })}
          >
            {Object.values(EngineTrend).map((v) => (
              <option key={v} value={v}>{ENGINE_TREND_LABELS[v]}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
            {BUSINESS_ENGINE_TEXT.fieldLabels.confidence}
          </label>
          <select
            className={inputClass}
            value={draft.confidence}
            onChange={(e) => onChange({ ...draft, confidence: e.target.value as EngineConfidence })}
          >
            {Object.values(EngineConfidence).map((v) => (
              <option key={v} value={v}>{ENGINE_CONFIDENCE_LABELS[v]}</option>
            ))}
          </select>
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.customerSegment}
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.values(CustomerSegment).map((v) => (
            <label key={v} className="flex items-center gap-1 text-[11px] text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={draft.customer_segment.includes(v)}
                onChange={() =>
                  onChange({ ...draft, customer_segment: toggleInArray(draft.customer_segment, v) })
                }
              />
              {CUSTOMER_SEGMENT_LABELS[v]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.monetizationModel}
        </label>
        <div className="flex flex-wrap gap-2">
          {Object.values(MonetizationModel).map((v) => (
            <label key={v} className="flex items-center gap-1 text-[11px] text-[var(--text-primary)]">
              <input
                type="checkbox"
                checked={draft.monetization_model.includes(v)}
                onChange={() =>
                  onChange({ ...draft, monetization_model: toggleInArray(draft.monetization_model, v) })
                }
              />
              {MONETIZATION_MODEL_LABELS[v]}
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="text-[10px] text-[var(--text-secondary)]/70 mb-1 block">
          {BUSINESS_ENGINE_TEXT.fieldLabels.evidence}
        </label>
        <textarea
          className={`${inputClass} min-h-[88px] resize-y font-mono`}
          value={draft.evidenceText}
          placeholder={BUSINESS_ENGINE_TEXT.placeholders.evidence}
          onChange={(e) => onChange({ ...draft, evidenceText: e.target.value })}
        />
      </div>

      {error && <p className="text-[11px] text-[var(--red)]">{error}</p>}

      <div className="flex items-center gap-2">
        <button
          onClick={onSave}
          disabled={isSaving}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20 transition-colors disabled:opacity-50"
        >
          {isSaving ? BUSINESS_ENGINE_TEXT.savingButton : BUSINESS_ENGINE_TEXT.saveButton}
        </button>
        <button
          onClick={onCancel}
          disabled={isSaving}
          className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
        >
          {BUSINESS_ENGINE_TEXT.cancelButton}
        </button>
        {onDelete && (
          <button
            onClick={onDelete}
            disabled={isSaving}
            className="ml-auto inline-flex items-center gap-1 rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--red)] hover:bg-[var(--red)]/10 transition-colors"
          >
            <Trash2 className="w-3 h-3" />
            {BUSINESS_ENGINE_TEXT.deleteButton}
          </button>
        )}
      </div>
    </div>
  );
}

function EngineCard({
  engine,
  ticker,
  editingId,
  setEditingId,
  queryKey,
}: {
  engine: BusinessEngine;
  ticker: string;
  editingId: string | null;
  setEditingId: (id: string | null) => void;
  queryKey: unknown[];
}) {
  const qc = useQueryClient();
  const [expanded, setExpanded] = useState(false);
  const [draft, setDraft] = useState<EngineDraft>(() => draftFromEngine(engine));
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const isEditing = editingId === engine.id;

  const startEditing = () => {
    setDraft(draftFromEngine(engine));
    setError(null);
    setEditingId(engine.id);
    setExpanded(true);
  };

  const cancelEditing = () => {
    setEditingId(null);
    setError(null);
  };

  const save = async () => {
    if (draft.name.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.nameRequired);
      return;
    }
    if (draft.description.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.descriptionRequired);
      return;
    }
    let evidence;
    try {
      evidence = JSON.parse(draft.evidenceText);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.evidenceInvalidJson);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/business-engines/${engine.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          customer_segment: draft.customer_segment,
          product_or_service: draft.product_or_service.trim() || null,
          monetization_model: draft.monetization_model,
          revenue_role: draft.revenue_role,
          lifecycle_stage: draft.lifecycle_stage,
          trend: draft.trend,
          confidence: draft.confidence,
          evidence,
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setEditingId(null);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  const remove = async () => {
    if (!window.confirm(BUSINESS_ENGINE_TEXT.deleteConfirm(engine.name))) return;
    setIsSaving(true);
    try {
      const res = await fetch(`/api/stocks/${ticker}/business-engines/${engine.id}`, {
        method: "DELETE",
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? BUSINESS_ENGINE_TEXT.validationErrors.deleteFailed);
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setEditingId(null);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.deleteFailed);
    } finally {
      setIsSaving(false);
    }
  };

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
          {engine.is_manually_edited && (
            <span className="text-[10px] font-medium px-1.5 py-0.5 rounded-full bg-[var(--blue)]/10 text-[var(--blue)]">
              {BUSINESS_ENGINE_TEXT.manuallyEditedBadge}
            </span>
          )}
        </div>
        {expanded ? (
          <ChevronDown className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        ) : (
          <ChevronRight className="w-3.5 h-3.5 text-[var(--text-secondary)]/50" />
        )}
      </button>

      {!isEditing && (
        <p className="mt-2 text-[11px] text-[var(--text-secondary)] leading-relaxed">
          {engine.description}
        </p>
      )}

      {expanded && isEditing && (
        <div className="mt-3">
          <EngineForm
            draft={draft}
            onChange={setDraft}
            onSave={save}
            onCancel={cancelEditing}
            onDelete={remove}
            isSaving={isSaving}
            error={error}
          />
        </div>
      )}

      {expanded && !isEditing && (
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
          <button
            onClick={startEditing}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
          >
            <Pencil className="w-3 h-3" />
            {BUSINESS_ENGINE_TEXT.editButton}
          </button>
        </div>
      )}
    </div>
  );
}

function NewEngineCard({
  ticker,
  queryKey,
  onClose,
}: {
  ticker: string;
  queryKey: unknown[];
  onClose: () => void;
}) {
  const qc = useQueryClient();
  const [draft, setDraft] = useState<EngineDraft>(EMPTY_DRAFT);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const save = async () => {
    if (draft.name.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.nameRequired);
      return;
    }
    if (draft.description.trim() === "") {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.descriptionRequired);
      return;
    }
    let evidence;
    try {
      evidence = JSON.parse(draft.evidenceText);
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.evidenceInvalidJson);
      return;
    }

    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/business-engines`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          name: draft.name.trim(),
          description: draft.description.trim(),
          customer_segment: draft.customer_segment,
          product_or_service: draft.product_or_service.trim() || null,
          monetization_model: draft.monetization_model,
          revenue_role: draft.revenue_role,
          lifecycle_stage: draft.lifecycle_stage,
          trend: draft.trend,
          confidence: draft.confidence,
          evidence,
        }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
        return;
      }
      await qc.invalidateQueries({ queryKey });
      onClose();
    } catch {
      setError(BUSINESS_ENGINE_TEXT.validationErrors.saveFailed);
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <div className="rounded-xl border border-[var(--blue)]/30 p-3">
      <div className="mb-2 text-[12px] font-semibold text-[var(--text-primary)]">
        {BUSINESS_ENGINE_TEXT.addEngineTitle}
      </div>
      <EngineForm
        draft={draft}
        onChange={setDraft}
        onSave={save}
        onCancel={onClose}
        isSaving={isSaving}
        error={error}
      />
    </div>
  );
}

export function BusinessEnginesSection({ ticker }: Props) {
  const queryKey = ["stock-business-engines", ticker];
  const { data, isLoading } = useQuery<{ success: boolean; data: BusinessEngine[] }>({
    queryKey,
    queryFn: () => fetch(`/api/stocks/${ticker}/business-engines`).then((r) => r.json()),
    retry: false,
  });

  const [editingId, setEditingId] = useState<string | null>(null);
  const [isAdding, setIsAdding] = useState(false);

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
      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
          {BUSINESS_ENGINE_TEXT.sectionTitle}
        </h2>
        {!isAdding && (
          <button
            onClick={() => setIsAdding(true)}
            className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
          >
            <Plus className="w-3 h-3" />
            {BUSINESS_ENGINE_TEXT.addEngineButton}
          </button>
        )}
      </div>

      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <TrendingUp className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {BUSINESS_ENGINE_TEXT.cardTitle}
          </span>
        </div>

        {isAdding && (
          <div className="mb-4">
            <NewEngineCard ticker={ticker} queryKey={queryKey} onClose={() => setIsAdding(false)} />
          </div>
        )}

        {isLoading ? (
          <div className="space-y-2">
            {Array.from({ length: 3 }).map((_, i) => (
              <div key={i} className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : engines.length === 0 && !isAdding ? (
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
                    <EngineCard
                      key={engine.id}
                      engine={engine}
                      ticker={ticker}
                      editingId={editingId}
                      setEditingId={setEditingId}
                      queryKey={queryKey}
                    />
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

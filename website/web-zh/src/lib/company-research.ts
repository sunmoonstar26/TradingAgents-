// 持续研究层只读查询 —— 从本地 Postgres 读取已落库的公司 Timeline / Thesis / 研究档案 / 概览。
// 服务端专用（直连数据库，不经过 PostgREST）。查不到 company 记录时返回空数组/null，
// 而不是抛错：意味着这只标的还没跑过分析，UI 应展示"暂无历史"而非报错。
import type {
  TimelineEvent,
  Thesis,
  InvestmentRationale,
  ProphetIndicator,
  ResearchHistoryEntry,
  CompanyDashboardSnapshot,
  BusinessEngine,
  BusinessEngineInput,
  BusinessEngineEvidence,
} from "@/types";
import {
  RevenueRole,
  LifecycleStage,
  EngineTrend,
  EngineConfidence,
  CustomerSegment,
  MonetizationModel,
} from "@/types/enums";
import { getDb } from "./db";
import type { JSONValue } from "postgres";

async function findCompanyId(ticker: string): Promise<string | null> {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    select id from companies where ticker = ${ticker.toUpperCase()}
  `;
  return company?.id ?? null;
}

export async function getTimelineEvents(
  ticker: string,
  limit = 50
): Promise<TimelineEvent[]> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return [];

  const sql = getDb();
  const rows = await sql<TimelineEvent[]>`
    select id, event_type, title, description, source, source_url, occurred_at
    from timeline_events
    where company_id = ${companyId} and deleted_at is null
    order by occurred_at desc
    limit ${limit}
  `;
  return rows;
}

export async function createTimelineEvent(
  ticker: string,
  input: {
    title: string;
    description?: string | null;
    source_url?: string | null;
    occurred_at: string;
  }
): Promise<TimelineEvent> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) throw new Error(`Company not found: ${ticker}`);

  const sql = getDb();
  const [row] = await sql<TimelineEvent[]>`
    insert into timeline_events
      (company_id, event_type, title, description, source, source_url, occurred_at)
    values (
      ${companyId},
      'manual_event',
      ${input.title},
      ${input.description ?? null},
      '手动记录',
      ${input.source_url ?? null},
      ${input.occurred_at}
    )
    returning id, event_type, title, description, source, source_url, occurred_at
  `;
  return row;
}

export async function deleteTimelineEvent(
  ticker: string,
  eventId: string
): Promise<boolean> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return false;

  const sql = getDb();
  const rows = await sql`
    update timeline_events
    set deleted_at = now()
    where id = ${eventId} and company_id = ${companyId} and deleted_at is null
    returning id
  `;
  return rows.length > 0;
}

export async function getThesisHistory(
  ticker: string,
  limit = 20
): Promise<Thesis[]> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return [];

  const sql = getDb();
  const rows = await sql<Thesis[]>`
    select id, version, status, content, change_reason, previous_version, created_at
    from theses
    where company_id = ${companyId}
    order by version desc
    limit ${limit}
  `;
  return rows;
}

export async function getResearchHistory(
  ticker: string,
  limit = 20
): Promise<ResearchHistoryEntry[]> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return [];

  const sql = getDb();
  const rows = await sql<ResearchHistoryEntry[]>`
    select
      rh.id,
      rh.created_at,
      rh.runtime_ms,
      rh.token_usage,
      rh.model,
      ar.recommendation,
      ar.confidence,
      ar.summary
    from research_history rh
    join analysis_results ar on ar.id = rh.analysis_result_id
    where rh.company_id = ${companyId}
    order by rh.created_at desc
    limit ${limit}
  `;
  return rows;
}

export async function getCompanyDashboard(
  ticker: string
): Promise<CompanyDashboardSnapshot | null> {
  const sql = getDb();
  const [row] = await sql<CompanyDashboardSnapshot[]>`
    select
      c.ticker,
      c.name,
      c.market,
      c.industry,
      c.sector,
      cd.score,
      cd.rating,
      cd.risk_level,
      cd.opportunity,
      cd.summary,
      cd.updated_at
    from companies c
    join company_dashboard cd on cd.company_id = c.id
    where c.ticker = ${ticker.toUpperCase()}
  `;
  return row ?? null;
}

export async function getAllCompanies(): Promise<CompanyDashboardSnapshot[]> {
  const sql = getDb();
  const rows = await sql<CompanyDashboardSnapshot[]>`
    select
      c.ticker,
      c.name,
      c.market,
      c.industry,
      c.sector,
      cd.score,
      cd.rating,
      cd.risk_level,
      cd.opportunity,
      cd.summary,
      cd.updated_at
    from companies c
    left join company_dashboard cd on cd.company_id = c.id
    order by coalesce(cd.updated_at, c.created_at) desc
  `;
  return rows;
}

export async function getInvestmentRationale(
  ticker: string
): Promise<InvestmentRationale | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [row] = await sql<InvestmentRationale[]>`
    select id, content, created_at
    from knowledge_entries
    where company_id = ${companyId} and category = 'investment_rationale'
    limit 1
  `;
  return row ?? null;
}

export async function saveInvestmentRationale(
  ticker: string,
  content: string
): Promise<InvestmentRationale> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) throw new Error(`Company not found: ${ticker}`);

  const sql = getDb();
  const [existing] = await sql<{ id: string }[]>`
    select id from knowledge_entries
    where company_id = ${companyId} and category = 'investment_rationale'
    limit 1
  `;

  const [row] = existing
    ? await sql<InvestmentRationale[]>`
        update knowledge_entries
        set content = ${content}, created_at = now()
        where id = ${existing.id}
        returning id, content, created_at
      `
    : await sql<InvestmentRationale[]>`
        insert into knowledge_entries (company_id, category, title, content)
        values (${companyId}, 'investment_rationale', 'Investment Rationale', ${content})
        returning id, content, created_at
      `;
  return row;
}

export async function getProphetIndicator(
  ticker: string
): Promise<ProphetIndicator | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [row] = await sql<ProphetIndicator[]>`
    select id, content, created_at
    from knowledge_entries
    where company_id = ${companyId} and category = 'prophet_indicator'
    limit 1
  `;
  return row ?? null;
}

export async function saveProphetIndicator(
  ticker: string,
  content: string
): Promise<ProphetIndicator> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) throw new Error(`Company not found: ${ticker}`);

  const sql = getDb();
  const [existing] = await sql<{ id: string }[]>`
    select id from knowledge_entries
    where company_id = ${companyId} and category = 'prophet_indicator'
    limit 1
  `;

  const [row] = existing
    ? await sql<ProphetIndicator[]>`
        update knowledge_entries
        set content = ${content}, created_at = now()
        where id = ${existing.id}
        returning id, content, created_at
      `
    : await sql<ProphetIndicator[]>`
        insert into knowledge_entries (company_id, category, title, content)
        values (${companyId}, 'prophet_indicator', 'Prophet Indicator', ${content})
        returning id, content, created_at
      `;
  return row;
}

export async function getBusinessEngines(ticker: string): Promise<BusinessEngine[]> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return [];

  const sql = getDb();
  const rows = await sql<BusinessEngine[]>`
    select
      id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at, is_manually_edited
    from business_engines
    where company_id = ${companyId}
    order by
      case revenue_role
        when 'CORE' then 1
        when 'MAJOR' then 2
        when 'EMERGING' then 3
        when 'EXPERIMENTAL' then 4
        when 'DECLINING' then 5
        else 6
      end,
      name
  `;
  return rows;
}

type ValidationResult =
  | { ok: true; value: BusinessEngineInput }
  | { ok: false; error: string };

function isEnumValue<T extends string>(enumObj: Record<string, T>, value: unknown): value is T {
  return typeof value === "string" && (Object.values(enumObj) as string[]).includes(value);
}

function isValidEvidence(value: unknown): value is BusinessEngineEvidence {
  if (typeof value !== "object" || value === null) return false;
  const ev = value as Record<string, unknown>;
  return (
    typeof ev.source === "string" &&
    (ev.source_type === "news" || ev.source_type === "financial_statement") &&
    typeof ev.date === "string" &&
    typeof ev.claim === "string" &&
    (ev.direction === "POSITIVE" || ev.direction === "NEGATIVE" || ev.direction === "NEUTRAL") &&
    isEnumValue(EngineConfidence, ev.confidence)
  );
}

export function validateBusinessEngineInput(body: unknown): ValidationResult {
  if (typeof body !== "object" || body === null) {
    return { ok: false, error: "Request body must be an object" };
  }
  const b = body as Record<string, unknown>;

  if (typeof b.name !== "string" || b.name.trim() === "") {
    return { ok: false, error: "name must be a non-empty string" };
  }
  if (typeof b.description !== "string" || b.description.trim() === "") {
    return { ok: false, error: "description must be a non-empty string" };
  }
  if (b.product_or_service !== null && typeof b.product_or_service !== "string") {
    return { ok: false, error: "product_or_service must be a string or null" };
  }
  if (!isEnumValue(RevenueRole, b.revenue_role)) {
    return { ok: false, error: "revenue_role is not a valid RevenueRole" };
  }
  if (!isEnumValue(LifecycleStage, b.lifecycle_stage)) {
    return { ok: false, error: "lifecycle_stage is not a valid LifecycleStage" };
  }
  if (!isEnumValue(EngineTrend, b.trend)) {
    return { ok: false, error: "trend is not a valid EngineTrend" };
  }
  if (!isEnumValue(EngineConfidence, b.confidence)) {
    return { ok: false, error: "confidence is not a valid EngineConfidence" };
  }
  if (!Array.isArray(b.customer_segment) || !b.customer_segment.every((s) => isEnumValue(CustomerSegment, s))) {
    return { ok: false, error: "customer_segment must be an array of valid CustomerSegment values" };
  }
  if (!Array.isArray(b.monetization_model) || !b.monetization_model.every((m) => isEnumValue(MonetizationModel, m))) {
    return { ok: false, error: "monetization_model must be an array of valid MonetizationModel values" };
  }
  if (!Array.isArray(b.evidence) || !b.evidence.every(isValidEvidence)) {
    return { ok: false, error: "evidence must be an array of valid evidence entries" };
  }

  return {
    ok: true,
    value: {
      name: b.name.trim(),
      description: b.description.trim(),
      customer_segment: b.customer_segment as CustomerSegment[],
      product_or_service: (b.product_or_service as string | null) ?? null,
      monetization_model: b.monetization_model as MonetizationModel[],
      revenue_role: b.revenue_role as RevenueRole,
      lifecycle_stage: b.lifecycle_stage as LifecycleStage,
      trend: b.trend as EngineTrend,
      confidence: b.confidence as EngineConfidence,
      evidence: b.evidence as BusinessEngineEvidence[],
    },
  };
}

// 抛出用于标识"重命名撞上同公司下另一条引擎的现有 name"的唯一约束冲突（23505），
// 供路由层捕获并转换为 409 + 结构化错误，而不是让原始 Postgres 错误顶到 500。
export class BusinessEngineNameConflictError extends Error {
  constructor(name: string) {
    super(`business engine name already in use: ${name}`);
    this.name = "BusinessEngineNameConflictError";
  }
}

export async function updateBusinessEngine(
  ticker: string,
  engineId: string,
  input: BusinessEngineInput
): Promise<BusinessEngine | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  let engine: BusinessEngine | undefined;
  try {
    [engine] = await sql<BusinessEngine[]>`
      update business_engines set
        name = ${input.name},
        description = ${input.description},
        customer_segment = ${input.customer_segment},
        product_or_service = ${input.product_or_service},
        monetization_model = ${input.monetization_model},
        revenue_role = ${input.revenue_role},
        lifecycle_stage = ${input.lifecycle_stage},
        trend = ${input.trend},
        confidence = ${input.confidence},
        evidence = ${sql.json(input.evidence as unknown as JSONValue)},
        is_manually_edited = true,
        last_verified_at = now(),
        updated_at = now()
      where id = ${engineId} and company_id = ${companyId}
      returning id, name, description, customer_segment, product_or_service,
        monetization_model, revenue_role, lifecycle_stage, trend, confidence,
        evidence, last_verified_at, updated_at, is_manually_edited
    `;
  } catch (error) {
    if (error && typeof error === "object" && "code" in error && error.code === "23505") {
      throw new BusinessEngineNameConflictError(input.name);
    }
    throw error;
  }
  if (!engine) return null;

  await sql`
    insert into business_engine_snapshots (
      business_engine_id, company_id, analysis_result_id, revenue_role,
      lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
    ) values (
      ${engine.id}, ${companyId}, null, ${input.revenue_role},
      ${input.lifecycle_stage}, ${input.trend}, ${input.confidence},
      'MANUAL_EDIT', '人工编辑', ${sql.json(input.evidence as unknown as JSONValue)}
    )
  `;
  return engine;
}

export async function createBusinessEngine(
  ticker: string,
  input: BusinessEngineInput
): Promise<BusinessEngine | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [engine] = await sql<BusinessEngine[]>`
    insert into business_engines (
      company_id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, is_manually_edited, last_verified_at, updated_at
    ) values (
      ${companyId}, ${input.name}, ${input.description}, ${input.customer_segment},
      ${input.product_or_service}, ${input.monetization_model}, ${input.revenue_role},
      ${input.lifecycle_stage}, ${input.trend}, ${input.confidence},
      ${sql.json(input.evidence as unknown as JSONValue)}, true, now(), now()
    )
    on conflict (company_id, name) do update set
      description = excluded.description,
      customer_segment = excluded.customer_segment,
      product_or_service = excluded.product_or_service,
      monetization_model = excluded.monetization_model,
      revenue_role = excluded.revenue_role,
      lifecycle_stage = excluded.lifecycle_stage,
      trend = excluded.trend,
      confidence = excluded.confidence,
      evidence = excluded.evidence,
      is_manually_edited = true,
      last_verified_at = now(),
      updated_at = now()
    returning id, name, description, customer_segment, product_or_service,
      monetization_model, revenue_role, lifecycle_stage, trend, confidence,
      evidence, last_verified_at, updated_at, is_manually_edited
  `;
  if (!engine) return null;

  await sql`
    insert into business_engine_snapshots (
      business_engine_id, company_id, analysis_result_id, revenue_role,
      lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
    ) values (
      ${engine.id}, ${companyId}, null, ${input.revenue_role},
      ${input.lifecycle_stage}, ${input.trend}, ${input.confidence},
      'MANUAL_EDIT', '人工新增', ${sql.json(input.evidence as unknown as JSONValue)}
    )
  `;
  return engine;
}

export async function deleteBusinessEngine(
  ticker: string,
  engineId: string
): Promise<boolean> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return false;

  const sql = getDb();
  const rows = await sql`
    delete from business_engines
    where id = ${engineId} and company_id = ${companyId}
    returning id
  `;
  return rows.length > 0;
}


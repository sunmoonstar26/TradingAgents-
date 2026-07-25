// 持续研究层只读查询 —— 从本地 Postgres 读取已落库的公司 Timeline / Thesis / 研究档案 / 概览。
// 服务端专用（直连数据库，不经过 PostgREST）。查不到 company 记录时返回空数组/null，
// 而不是抛错：意味着这只标的还没跑过分析，UI 应展示"暂无历史"而非报错。
import type {
  TimelineEvent,
  Thesis,
  InvestmentRationale,
  ResearchHistoryEntry,
  CompanyDashboardSnapshot,
} from "@/types";
import { getDb } from "./db";

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
    select id, event_type, title, description, source, occurred_at
    from timeline_events
    where company_id = ${companyId}
    order by occurred_at desc
    limit ${limit}
  `;
  return rows;
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


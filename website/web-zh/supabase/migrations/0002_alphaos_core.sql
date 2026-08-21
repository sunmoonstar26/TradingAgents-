-- AlphaOS Core：Company 中心化四层模型（V1.0 最小集）
-- 本阶段不挂 user_id，Company 及其下属研究资产全局共享；
-- 接入 Supabase Auth 时再补用户维度。

-- ── 废弃旧表 ──
-- analysis_history：已建但从未被任何代码 INSERT 过（0 行数据），
-- 由本迁移的 analysis_results / timeline_events 取代。
drop table if exists public.analysis_history;

-- ── Company：AlphaOS 唯一核心实体 ──
create table public.companies (
  id uuid primary key default gen_random_uuid(),
  ticker text not null unique,
  name text not null,
  market text not null default 'US',
  industry text,
  sector text,
  country text,
  currency text,
  listing_date date,
  website text,
  description text,
  status text not null default 'active',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- ── AnalysisResult：TradingAgents 唯一输出，永不修改/覆盖 ──
create table public.analysis_results (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  session_id text not null unique,
  run_id text,
  summary text,
  markdown text,
  raw_json jsonb not null,
  score integer,
  recommendation text,
  confidence integer,
  risk text,
  opportunity text,
  prompt_version text,
  agent_version text,
  model text,
  created_at timestamptz not null default now()
);
create index analysis_results_company_created_idx
  on public.analysis_results (company_id, created_at desc);

-- ── Timeline：公司重大事件，追加写入，禁止删除/更新 ──
create table public.timeline_events (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  event_type text not null,
  title text not null,
  description text,
  source text,
  source_url text,
  occurred_at timestamptz not null,
  created_at timestamptz not null default now()
);
create index timeline_events_company_occurred_idx
  on public.timeline_events (company_id, occurred_at desc);

-- ── Thesis：投资逻辑，版本化，支持 diff ──
create table public.theses (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  version integer not null,
  status text not null default 'active',
  content text not null,
  change_reason text,
  previous_version integer,
  created_at timestamptz not null default now(),
  unique (company_id, version)
);

-- ── ResearchHistory：每一次研究的完整存档，永久保存 ──
create table public.research_history (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  analysis_result_id uuid not null references public.analysis_results(id) on delete cascade,
  markdown text,
  raw_json jsonb,
  prompt text,
  model text,
  runtime_ms integer,
  token_usage integer,
  created_at timestamptz not null default now()
);
create index research_history_company_created_idx
  on public.research_history (company_id, created_at desc);

-- ── Knowledge：公司知识库条目，支持持续完善 ──
create table public.knowledge_entries (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  category text not null,
  title text not null,
  content text not null,
  source text,
  confidence integer,
  version integer not null default 1,
  created_at timestamptz not null default now()
);
create index knowledge_entries_company_category_idx
  on public.knowledge_entries (company_id, category);

-- ── Dashboard：公司当前状态快照，唯一允许覆盖的资产表 ──
create table public.company_dashboard (
  company_id uuid primary key references public.companies(id) on delete cascade,
  score integer,
  rating text,
  growth_stage text,
  risk_level text,
  opportunity text,
  summary text,
  updated_at timestamptz not null default now()
);

-- ── RLS：本阶段不区分用户，公开只读；写入仅走服务端 service role key ──
alter table public.companies enable row level security;
alter table public.analysis_results enable row level security;
alter table public.timeline_events enable row level security;
alter table public.theses enable row level security;
alter table public.research_history enable row level security;
alter table public.knowledge_entries enable row level security;
alter table public.company_dashboard enable row level security;

create policy "anyone can read companies"
  on public.companies for select using (true);
create policy "anyone can read analysis_results"
  on public.analysis_results for select using (true);
create policy "anyone can read timeline_events"
  on public.timeline_events for select using (true);
create policy "anyone can read theses"
  on public.theses for select using (true);
create policy "anyone can read research_history"
  on public.research_history for select using (true);
create policy "anyone can read knowledge_entries"
  on public.knowledge_entries for select using (true);
create policy "anyone can read company_dashboard"
  on public.company_dashboard for select using (true);

-- 不建 insert/update/delete policy：匿名 anon key 无法写入任何新表，
-- 只有服务端 service role key（绕过 RLS）能写入 —— 符合 Append Only 原则，
-- company_dashboard 是唯一允许 upsert 覆盖的表，同样只能通过服务端写入。

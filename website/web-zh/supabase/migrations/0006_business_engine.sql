-- Business Engine：公司当前赚钱路数的结构化状态（唯一允许 upsert 覆盖的资产表之一，
-- 覆盖前的状态通过 business_engine_snapshots 追加保存，不丢失历史）。
create table public.business_engines (
  id uuid primary key default gen_random_uuid(),
  company_id uuid not null references public.companies(id) on delete cascade,
  name text not null,
  description text not null,
  customer_segment text[] not null default '{}',
  product_or_service text,
  monetization_model text[] not null default '{}',
  revenue_role text not null default 'UNKNOWN',
  lifecycle_stage text not null default 'UNKNOWN',
  trend text not null default 'UNKNOWN',
  confidence text not null default 'LOW',
  evidence jsonb not null default '[]',
  last_verified_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (company_id, name)
);

-- Business Engine Snapshot：每次分析后追加一行，不覆盖，用于回看历史变化。
create table public.business_engine_snapshots (
  id uuid primary key default gen_random_uuid(),
  business_engine_id uuid not null references public.business_engines(id) on delete cascade,
  company_id uuid not null references public.companies(id) on delete cascade,
  analysis_result_id uuid not null references public.analysis_results(id) on delete cascade,
  revenue_role text not null,
  lifecycle_stage text not null,
  trend text not null,
  confidence text not null,
  change_type text not null,
  change_reason text,
  evidence_summary jsonb not null default '[]',
  created_at timestamptz not null default now()
);
create index business_engine_snapshots_company_created_idx
  on public.business_engine_snapshots (company_id, created_at desc);
create index business_engine_snapshots_engine_created_idx
  on public.business_engine_snapshots (business_engine_id, created_at desc);

alter table public.business_engines enable row level security;
alter table public.business_engine_snapshots enable row level security;

create policy "anyone can read business_engines"
  on public.business_engines for select using (true);
create policy "anyone can read business_engine_snapshots"
  on public.business_engine_snapshots for select using (true);

-- 不建 insert/update/delete policy：写入只走服务端 DATABASE_URL 直连，
-- 与 companies/timeline_events 等表的写入路径一致。

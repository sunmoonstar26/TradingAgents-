-- 用户 Credits 表（与 auth.users 关联）
-- V2: AlphaCouncil Beta 阶段，注册送 3 Credits
create table if not exists public.user_credits (
  id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 3,
  updated_at timestamptz not null default now()
);

-- 开启 Row Level Security
alter table public.user_credits enable row level security;

-- 用户只能读写自己的记录
create policy "users can read own credits"
  on public.user_credits for select
  using (auth.uid() = id);

create policy "users can update own credits"
  on public.user_credits for update
  using (auth.uid() = id);

-- 新用户注册时自动创建 credits 记录（Beta 阶段赠送 3 Credits）
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_credits (id, credits)
  values (new.id, 3)
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute procedure public.handle_new_user();

-- 分析历史表
create table if not exists public.analysis_history (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users(id) on delete cascade,
  ticker text not null,
  name text,
  signal text,
  conviction integer,
  mode text default 'standard',
  headline text,
  analyzed_at timestamptz not null default now()
);

alter table public.analysis_history enable row level security;

create policy "users can read own history"
  on public.analysis_history for select
  using (auth.uid() = user_id);

create policy "users can insert own history"
  on public.analysis_history for insert
  with check (auth.uid() = user_id);

-- ====== AlphaCouncil Beta 新增表 ======

-- AI 研究摘要表（每日自动生成）
create table if not exists public.research_summaries (
  id uuid primary key default gen_random_uuid(),
  ticker text not null,
  company text not null,
  verdict text not null,           -- "Bullish" | "Neutral" | "Bearish"
  confidence integer not null,     -- 0-100
  bull_points jsonb default '[]',  -- string[]
  bear_points jsonb default '[]',  -- string[]
  committee_summary text,          -- ≤300 chars
  created_at timestamptz not null default now()
);

-- 公开读取（任何人均可查看研究摘要）
alter table public.research_summaries enable row level security;
create policy "anyone can read research summaries"
  on public.research_summaries for select
  using (true);

-- 内容发布表（Twitter/Reddit 生成内容）
create table if not exists public.content_posts (
  id uuid primary key default gen_random_uuid(),
  ticker text,
  platform text not null,          -- "twitter" | "reddit"
  content text not null,
  created_at timestamptz not null default now()
);

alter table public.content_posts enable row level security;
create policy "anyone can read content posts"
  on public.content_posts for select
  using (true);

-- Beta 候补名单表
create table if not exists public.beta_waitlist (
  id uuid primary key default gen_random_uuid(),
  email text unique not null,
  source text default 'homepage',
  created_at timestamptz not null default now()
);

alter table public.beta_waitlist enable row level security;
create policy "anyone can insert beta signups"
  on public.beta_waitlist for insert
  with check (true);

-- 用户反馈表
create table if not exists public.feedbacks (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references auth.users(id) on delete set null,
  rating integer not null check (rating >= 1 and rating <= 5),
  comment text,
  created_at timestamptz not null default now()
);

alter table public.feedbacks enable row level security;
create policy "anyone can insert feedback"
  on public.feedbacks for insert
  with check (true);
create policy "anyone can read feedback"
  on public.feedbacks for select
  using (true);

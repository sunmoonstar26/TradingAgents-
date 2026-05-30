-- 用户 Credits 表（与 auth.users 关联）
create table if not exists public.user_credits (
  id uuid primary key references auth.users(id) on delete cascade,
  credits integer not null default 5,
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

-- 新用户注册时自动创建 credits 记录（赠送 5 Credits）
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.user_credits (id, credits)
  values (new.id, 5)
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

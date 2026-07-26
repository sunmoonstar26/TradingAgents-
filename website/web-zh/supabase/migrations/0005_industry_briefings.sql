-- 行业资讯简报表：整篇原文存储，来源是本机定时脚本读取 Hermes 产出的简报文件后写入。
-- industry 列默认 'nev'（New Energy Vehicle），为将来可能新增的其他行业简报预留同一张表，
-- 当前只有一个来源。
create table public.industry_briefings (
  id uuid primary key default gen_random_uuid(),
  industry text not null default 'nev',
  briefing_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (industry, briefing_date)
);

alter table public.industry_briefings enable row level security;

create policy "anyone can read industry_briefings"
  on public.industry_briefings for select
  using (true);

-- 不建 insert/update/delete policy：写入只走服务端 DATABASE_URL 直连，
-- 与 companies/timeline_events 等表的写入路径一致。

alter table public.timeline_events
  add column deleted_at timestamptz;

comment on column public.timeline_events.deleted_at is
  '软删除标记；非空表示已删除，保留记录以维持 (company_id, source_url) 去重约束占位，避免同一条新闻在下次分析时被重新插入';

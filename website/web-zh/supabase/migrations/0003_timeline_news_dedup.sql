-- 新闻事件按 (company_id, source_url) 去重；历史 analysis_completed 记录 source_url 为 null，
-- Postgres 唯一约束不把多个 null 视为冲突，不受影响。
alter table public.timeline_events
  add constraint timeline_events_company_source_url_key unique (company_id, source_url);

-- 整行锁定标记：人工编辑/新增后置为 true，AI 下次 upsert 时跳过该行的主表更新，
-- 但仍追加 snapshot 历史（用于回看 AI 本来想做的变化）。
alter table public.business_engines
  add column is_manually_edited boolean not null default false;

-- 人工新增/编辑/删除操作不属于任何一次 AI 分析，无 analysis_result_id 可填。
alter table public.business_engine_snapshots
  alter column analysis_result_id drop not null;

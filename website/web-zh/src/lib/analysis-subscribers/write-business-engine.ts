import { on } from "../event-bus";
import { getDb } from "../db";
import { detectChange } from "../business-engine-diff";
import type { AnalysisCompletedEvent } from "@/types/events";
import type { BusinessEngine, ExtractedBusinessEngine } from "@/types";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const scan = event.raw.business_engine_scan;
  if (!scan || scan.length === 0) return;

  const sql = getDb();
  const existing = await sql<BusinessEngine[]>`
    select * from business_engines where company_id = ${event.companyId}
  `;
  const existingByName = new Map(existing.map((e) => [e.name, e]));
  const companyHasBaseline = existing.length > 0;

  for (const item of scan) {
    const previous = existingByName.get(item.name) ?? null;
    const { changeType, reason } = detectChange(previous, item as ExtractedBusinessEngine, companyHasBaseline);

    if (previous?.is_manually_edited) {
      // 整行锁定：不覆盖人工修改的主表数据，但仍追加快照，
      // 保留"AI 本次分析认为该引擎发生了什么变化"这条历史记录。
      await sql`
        insert into business_engine_snapshots (
          business_engine_id, company_id, analysis_result_id, revenue_role,
          lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
        ) values (
          ${previous.id}, ${event.companyId}, ${event.analysisResultId}, ${item.revenue_role},
          ${item.lifecycle_stage}, ${item.trend}, ${item.confidence}, ${changeType},
          ${`${reason}（已人工锁定，主表未更新）`}, ${sql.json(item.evidence)}
        )
      `;
      continue;
    }

    const [engine] = await sql`
      insert into business_engines (
        company_id, name, description, customer_segment, product_or_service,
        monetization_model, revenue_role, lifecycle_stage, trend, confidence,
        evidence, last_verified_at, updated_at
      ) values (
        ${event.companyId}, ${item.name}, ${item.description}, ${item.customer_segment},
        ${item.product_or_service ?? null}, ${item.monetization_model}, ${item.revenue_role},
        ${item.lifecycle_stage}, ${item.trend}, ${item.confidence}, ${sql.json(item.evidence)},
        now(), now()
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
        last_verified_at = now(),
        updated_at = now()
      returning id
    `;

    await sql`
      insert into business_engine_snapshots (
        business_engine_id, company_id, analysis_result_id, revenue_role,
        lifecycle_stage, trend, confidence, change_type, change_reason, evidence_summary
      ) values (
        ${engine.id}, ${event.companyId}, ${event.analysisResultId}, ${item.revenue_role},
        ${item.lifecycle_stage}, ${item.trend}, ${item.confidence}, ${changeType}, ${reason},
        ${sql.json(item.evidence)}
      )
    `;
  }
});

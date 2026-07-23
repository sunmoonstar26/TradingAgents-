import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  await sql`
    insert into research_history (company_id, analysis_result_id, raw_json, model, runtime_ms, token_usage)
    values (
      ${event.companyId},
      ${event.analysisResultId},
      ${sql.json(event.raw)},
      ${event.raw.model ?? null},
      ${event.raw.runtime_ms ?? null},
      ${event.raw.token_usage ?? null}
    )
  `;
});

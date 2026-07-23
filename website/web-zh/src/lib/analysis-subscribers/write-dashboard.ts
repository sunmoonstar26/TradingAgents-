import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  await sql`
    insert into company_dashboard (company_id, score, rating, risk_level, opportunity, summary, updated_at)
    values (
      ${event.companyId},
      ${event.detail.committeeDecision.conviction},
      ${event.raw.signal},
      ${event.detail.riskExposures[0]?.level ?? null},
      ${event.detail.committeeDecision.recommendedExposure},
      ${event.detail.committeeDecision.rationale},
      now()
    )
    on conflict (company_id) do update set
      score = excluded.score,
      rating = excluded.rating,
      risk_level = excluded.risk_level,
      opportunity = excluded.opportunity,
      summary = excluded.summary,
      updated_at = excluded.updated_at
  `;
});

import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  await sql`
    insert into timeline_events (company_id, event_type, title, description, source, occurred_at)
    values (
      ${event.companyId},
      'analysis_completed',
      ${`AI 分析完成：${event.raw.signal}`},
      ${event.detail.committeeDecision.rationale},
      'TradingAgents',
      now()
    )
  `;
});

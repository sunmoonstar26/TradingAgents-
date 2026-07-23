import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();

  const [lastThesis] = await sql<{ version: number }[]>`
    select version from theses
    where company_id = ${event.companyId}
    order by version desc
    limit 1
  `;

  const previousVersion = lastThesis?.version ?? null;
  await sql`
    insert into theses (company_id, version, content, previous_version)
    values (
      ${event.companyId},
      ${(previousVersion ?? 0) + 1},
      ${event.detail.committeeDecision.rationale},
      ${previousVersion}
    )
  `;
});

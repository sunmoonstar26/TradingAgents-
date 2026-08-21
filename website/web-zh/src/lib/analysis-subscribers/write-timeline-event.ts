import { on } from "../event-bus";
import { getDb } from "../db";
import type { AnalysisCompletedEvent } from "@/types/events";

const CATEGORY_TO_EVENT_TYPE: Record<string, string> = {
  "公司新闻": "news_company",
  "高管新闻": "news_executive",
  "财报新闻": "news_earnings",
  "行业新闻": "news_industry",
  "宏观新闻": "news_macro",
  "其他": "news_other",
};

on<AnalysisCompletedEvent>("analysis.completed", async (event) => {
  const sql = getDb();
  for (const item of event.raw.news_items ?? []) {
    const eventType = CATEGORY_TO_EVENT_TYPE[item.category ?? "其他"] ?? "news_other";
    await sql`
      insert into timeline_events
        (company_id, event_type, title, description, source, source_url, occurred_at)
      values (
        ${event.companyId},
        ${eventType},
        ${item.title},
        ${item.summary ?? null},
        ${item.source ?? null},
        ${item.url ?? null},
        ${item.published_at}
      )
      on conflict (company_id, source_url) do nothing
    `;
  }
});

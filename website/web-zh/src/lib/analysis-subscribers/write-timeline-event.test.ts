import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { on, emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-timeline-event";

const TEST_TICKER = "TESTWTE";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteTimelineEvent"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("write-timeline-event 订阅者在 analysis.completed 时插入一条 timeline_events 记录", async () => {
  const sql = getDb();

  const event: AnalysisCompletedEvent = {
    companyId: testCompanyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-timeline",
    raw: { ticker: TEST_TICKER, signal: "BUY" } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: { rationale: "测试用理由" },
    } as AnalysisCompletedEvent["detail"],
  };

  await emit("analysis.completed", event);

  const rows = await sql`
    select title, description, source
    from timeline_events
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].title, "AI 分析完成：BUY");
  assert.equal(rows[0].description, "测试用理由");
  assert.equal(rows[0].source, "TradingAgents");
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-dashboard";

const TEST_TICKER = "TESTWDB";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteDashboard"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function buildEvent(signal: string, conviction: number): AnalysisCompletedEvent {
  return {
    companyId: testCompanyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-dashboard",
    raw: { ticker: TEST_TICKER, signal } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: {
        rationale: "仪表盘测试理由",
        recommendedExposure: "20%",
        conviction,
      },
      riskExposures: [{ level: "MEDIUM" }],
    } as AnalysisCompletedEvent["detail"],
  };
}

test("write-dashboard 订阅者首次触发时插入一条 company_dashboard 记录", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("BUY", 70));

  const rows = await sql`
    select rating, score, risk_level, opportunity
    from company_dashboard
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].rating, "BUY");
  assert.equal(rows[0].score, 70);
  assert.equal(rows[0].risk_level, "MEDIUM");
  assert.equal(rows[0].opportunity, "20%");
});

test("write-dashboard 订阅者第二次触发时覆盖同一条记录（upsert）", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("SELL", 30));

  const rows = await sql`
    select rating, score
    from company_dashboard
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].rating, "SELL");
  assert.equal(rows[0].score, 30);
});

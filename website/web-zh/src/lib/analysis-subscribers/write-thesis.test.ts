import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-thesis";

const TEST_TICKER = "TESTWTH";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteThesis"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function buildEvent(rationale: string): AnalysisCompletedEvent {
  return {
    companyId: testCompanyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-thesis",
    raw: { ticker: TEST_TICKER, signal: "BUY" } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: { rationale },
    } as AnalysisCompletedEvent["detail"],
  };
}

test("write-thesis 订阅者第一次触发时插入 version=1，previous_version=null", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("第一版理由"));

  const rows = await sql`
    select version, content, previous_version
    from theses
    where company_id = ${testCompanyId}
    order by version asc
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].version, 1);
  assert.equal(rows[0].content, "第一版理由");
  assert.equal(rows[0].previous_version, null);
});

test("write-thesis 订阅者第二次触发时插入 version=2，previous_version=1", async () => {
  const sql = getDb();
  await emit("analysis.completed", buildEvent("第二版理由"));

  const rows = await sql`
    select version, content, previous_version
    from theses
    where company_id = ${testCompanyId}
    order by version asc
  `;

  assert.equal(rows.length, 2);
  assert.equal(rows[1].version, 2);
  assert.equal(rows[1].content, "第二版理由");
  assert.equal(rows[1].previous_version, 1);
});

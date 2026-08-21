import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-research-history";

const TEST_TICKER = "TESTWRH";
let testCompanyId: string;
let testAnalysisResultId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-WriteResearchHistory"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;

  const [analysisResult] = await sql<{ id: string }[]>`
    insert into analysis_results (company_id, session_id, raw_json)
    values (${testCompanyId}, ${"test-session-write-research-history"}, ${sql.json({ ticker: TEST_TICKER })})
    returning id
  `;
  testAnalysisResultId = analysisResult.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("write-research-history 订阅者插入一条包含 model/runtime/token 的存档记录", async () => {
  const sql = getDb();

  const event: AnalysisCompletedEvent = {
    companyId: testCompanyId,
    analysisResultId: testAnalysisResultId,
    sessionId: "test-session-write-research-history",
    raw: {
      ticker: TEST_TICKER,
      signal: "BUY",
      model: "test-model",
      runtime_ms: 1234,
      token_usage: 5678,
    } as AnalysisCompletedEvent["raw"],
    detail: {} as AnalysisCompletedEvent["detail"],
  };

  await emit("analysis.completed", event);

  const rows = await sql`
    select model, runtime_ms, token_usage
    from research_history
    where company_id = ${testCompanyId}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].model, "test-model");
  assert.equal(rows[0].runtime_ms, 1234);
  assert.equal(rows[0].token_usage, 5678);
});

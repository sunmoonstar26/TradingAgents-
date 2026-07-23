import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "./db";
import { persistAnalysisResult } from "./persist-analysis-result";
import type { TARawResult } from "@/schemas/analysis-result";
import type { StockDetail } from "@/types";

const TEST_TICKER = "TESTPAR";

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("persistAnalysisResult 端到端写入 company/analysis_result/timeline/thesis/dashboard/research_history 六张表", async () => {
  const sql = getDb();

  const raw = {
    ticker: TEST_TICKER,
    signal: "BUY",
    model: "test-model",
    runtime_ms: 1000,
    token_usage: 2000,
  } as TARawResult;

  const detail = {
    name: "测试公司-PersistAnalysisResult",
    committeeDecision: {
      rationale: "端到端测试理由",
      recommendedExposure: "15%",
      conviction: 80,
    },
    riskExposures: [{ level: "LOW" }],
  } as StockDetail;

  const sessionId = "test-session-persist-e2e";

  await persistAnalysisResult(raw, detail, sessionId);

  const [company] = await sql<{ id: string }[]>`
    select id from companies where ticker = ${TEST_TICKER}
  `;
  assert.ok(company, "companies 表应有对应记录");

  const [analysisResult] = await sql<{ id: string }[]>`
    select id from analysis_results where session_id = ${sessionId}
  `;
  assert.ok(analysisResult, "analysis_results 表应有对应记录");

  const timelineRows = await sql`
    select id from timeline_events where company_id = ${company.id}
  `;
  assert.equal(timelineRows.length, 1, "timeline_events 应有一条记录");

  const thesisRows = await sql`
    select id from theses where company_id = ${company.id}
  `;
  assert.equal(thesisRows.length, 1, "theses 应有一条记录");

  const dashboardRows = await sql`
    select company_id from company_dashboard where company_id = ${company.id}
  `;
  assert.equal(dashboardRows.length, 1, "company_dashboard 应有一条记录");

  const researchHistoryRows = await sql`
    select id from research_history where company_id = ${company.id}
  `;
  assert.equal(researchHistoryRows.length, 1, "research_history 应有一条记录");
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "./db";
import { persistAnalysisResult } from "./persist-analysis-result";
import { on } from "./event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
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
    financial_statement_analysis: "端到端测试财报解读",
    news_items: [
      {
        title: "端到端测试新闻",
        summary: "测试摘要",
        source: "Reuters",
        url: "https://example.com/persist-e2e-news",
        published_at: "2026-07-20T10:00:00.000Z",
      },
    ],
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

const TEST_TICKER_SUBSCRIBER_FAIL = "TESTPARFAIL";

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER_SUBSCRIBER_FAIL}`;
});

test("某个订阅者失败时，persistAnalysisResult 应 reject，但其他订阅者仍完成写入（事件隔离性不变）", async () => {
  const sql = getDb();

  // 注册一个故意失败的订阅者，验证 emit 收集到的错误会让 persistAnalysisResult reject，
  // 而其余订阅者（timeline/thesis/research_history 三张表）依然各自独立写入成功。
  on<AnalysisCompletedEvent>("analysis.completed", async () => {
    throw new Error("模拟订阅者故意失败");
  });

  const raw = {
    ticker: TEST_TICKER_SUBSCRIBER_FAIL,
    signal: "BUY",
    model: "test-model",
    runtime_ms: 1000,
    token_usage: 2000,
    financial_statement_analysis: "订阅者失败测试财报解读",
    news_items: [
      {
        title: "订阅者失败测试新闻",
        summary: "测试摘要",
        source: "Reuters",
        url: "https://example.com/persist-subscriber-fail-news",
        published_at: "2026-07-20T10:00:00.000Z",
      },
    ],
  } as TARawResult;

  const detail = {
    name: "测试公司-订阅者失败",
    committeeDecision: {
      rationale: "订阅者失败测试理由",
      recommendedExposure: "15%",
      conviction: 80,
    },
    riskExposures: [{ level: "LOW" }],
  } as StockDetail;

  const sessionId = "test-session-persist-subscriber-fail";

  await assert.rejects(() => persistAnalysisResult(raw, detail, sessionId));

  const [company] = await sql<{ id: string }[]>`
    select id from companies where ticker = ${TEST_TICKER_SUBSCRIBER_FAIL}
  `;
  assert.ok(company, "companies 表应有对应记录（这两步是直接写入，不受订阅者失败影响）");

  const timelineRows = await sql`
    select id from timeline_events where company_id = ${company.id}
  `;
  assert.equal(
    timelineRows.length,
    1,
    "timeline_events 订阅者应不受同批次其他订阅者失败影响，仍完成写入"
  );

  const thesisRows = await sql`
    select id from theses where company_id = ${company.id}
  `;
  assert.equal(thesisRows.length, 1, "theses 订阅者应仍完成写入");

  const researchHistoryRows = await sql`
    select id from research_history where company_id = ${company.id}
  `;
  assert.equal(researchHistoryRows.length, 1, "research_history 订阅者应仍完成写入");
});

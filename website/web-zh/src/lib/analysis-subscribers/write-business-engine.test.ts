import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import { EngineChangeType } from "@/types/enums";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-business-engine";

const TEST_TICKER_PREFIX = "TWBE";

async function createTestCompany(suffix: string): Promise<string> {
  const sql = getDb();
  const ticker = `${TEST_TICKER_PREFIX}${suffix}`;
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${ticker}, ${"测试公司-WriteBusinessEngine"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  return company.id;
}

async function createTestAnalysisResult(companyId: string, sessionId: string): Promise<string> {
  const sql = getDb();
  const [row] = await sql<{ id: string }[]>`
    insert into analysis_results (company_id, session_id, raw_json)
    values (${companyId}, ${sessionId}, ${sql.json({})})
    returning id
  `;
  return row.id;
}

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker like ${TEST_TICKER_PREFIX + "%"}`;
});

function makeEvent(
  companyId: string,
  analysisResultId: string,
  sessionId: string,
  scan: AnalysisCompletedEvent["raw"]["business_engine_scan"]
): AnalysisCompletedEvent {
  return {
    companyId,
    analysisResultId,
    sessionId,
    raw: {
      ticker: TEST_TICKER_PREFIX,
      signal: "BUY",
      business_engine_scan: scan,
    } as AnalysisCompletedEvent["raw"],
    detail: {} as AnalysisCompletedEvent["detail"],
  };
}

test("write-business-engine 订阅者在 business_engine_scan 为空时不写入", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("A");
  const analysisResultId = await createTestAnalysisResult(companyId, "test-session-wbe-empty");

  await emit("analysis.completed", makeEvent(companyId, analysisResultId, "test-session-wbe-empty", []));

  const rows = await sql`select id from business_engines where company_id = ${companyId}`;
  assert.equal(rows.length, 0, "空 scan 不应新增记录");
});

test("write-business-engine 订阅者首次写入时判定为 BASELINE", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("B");
  const analysisResultId = await createTestAnalysisResult(companyId, "test-session-wbe-baseline");

  await emit(
    "analysis.completed",
    makeEvent(companyId, analysisResultId, "test-session-wbe-baseline", [
      {
        name: "Azure",
        description: "云服务收入",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "CORE",
        lifecycle_stage: "SCALING",
        trend: "UP",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const engines = await sql`select * from business_engines where company_id = ${companyId}`;
  assert.equal(engines.length, 1);
  assert.equal(engines[0].name, "Azure");
  assert.equal(engines[0].revenue_role, "CORE");

  const snapshots = await sql`
    select change_type from business_engine_snapshots where company_id = ${companyId}
  `;
  assert.equal(snapshots.length, 1);
  assert.equal(snapshots[0].change_type, EngineChangeType.BASELINE);
});

test("write-business-engine 订阅者第二次分析时按历史状态比较并 upsert", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("C");
  const firstAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-first");

  await emit(
    "analysis.completed",
    makeEvent(companyId, firstAnalysisId, "test-session-wbe-first", [
      {
        name: "Azure",
        description: "云服务收入",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "EMERGING",
        lifecycle_stage: "SCALING",
        trend: "STABLE",
        confidence: "MEDIUM",
        evidence: [],
      },
    ])
  );

  const secondAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-second");
  await emit(
    "analysis.completed",
    makeEvent(companyId, secondAnalysisId, "test-session-wbe-second", [
      {
        name: "Azure",
        description: "云服务收入持续扩张",
        customer_segment: ["ENTERPRISE", "DEVELOPER"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED", "SUBSCRIPTION"],
        revenue_role: "CORE",
        lifecycle_stage: "CORE",
        trend: "UP",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const engines = await sql`select * from business_engines where company_id = ${companyId}`;
  assert.equal(engines.length, 1, "同名业务应 upsert 而非新增一行");
  assert.equal(engines[0].revenue_role, "CORE", "应更新为最新状态");

  const snapshots = await sql`
    select change_type from business_engine_snapshots
    where company_id = ${companyId} order by created_at asc
  `;
  assert.equal(snapshots.length, 2, "两次分析应各产生一条 snapshot，历史不覆盖");
  assert.equal(snapshots[0].change_type, EngineChangeType.BASELINE);
  assert.equal(snapshots[1].change_type, EngineChangeType.PROMOTED);
});

test("write-business-engine 订阅者在已有基线的公司出现新业务时判定为 NEW，原有业务判定为 STABLE", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("D");
  const firstAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-new-1");

  await emit(
    "analysis.completed",
    makeEvent(companyId, firstAnalysisId, "test-session-wbe-new-1", [
      {
        name: "Azure",
        description: "云服务收入",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "CORE",
        lifecycle_stage: "SCALING",
        trend: "STABLE",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const secondAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-new-2");
  await emit(
    "analysis.completed",
    makeEvent(companyId, secondAnalysisId, "test-session-wbe-new-2", [
      {
        name: "Azure",
        description: "云服务收入",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "CORE",
        lifecycle_stage: "SCALING",
        trend: "STABLE",
        confidence: "HIGH",
        evidence: [],
      },
      {
        name: "Copilot",
        description: "AI 助理订阅收入",
        customer_segment: ["ENTERPRISE", "DEVELOPER"],
        product_or_service: "AI Copilot",
        monetization_model: ["SUBSCRIPTION"],
        revenue_role: "EMERGING",
        lifecycle_stage: "SCALING",
        trend: "UP",
        confidence: "MEDIUM",
        evidence: [],
      },
    ])
  );

  const snapshots = await sql<{ name: string; change_type: string }[]>`
    select be.name, s.change_type from business_engine_snapshots s
    join business_engines be on be.id = s.business_engine_id
    where s.company_id = ${companyId} and s.analysis_result_id = ${secondAnalysisId}
  `;
  const azureSnapshot = snapshots.find((s) => s.name === "Azure");
  const copilotSnapshot = snapshots.find((s) => s.name === "Copilot");

  assert.equal(azureSnapshot?.change_type, EngineChangeType.STABLE, "已有业务无变化应判定为 STABLE");
  assert.equal(copilotSnapshot?.change_type, EngineChangeType.NEW, "已有基线公司的新业务应判定为 NEW");
});

test("write-business-engine 订阅者跳过已人工锁定的引擎主表更新，但仍追加 snapshot", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("LOCKED");
  const firstAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-locked-1");

  await emit(
    "analysis.completed",
    makeEvent(companyId, firstAnalysisId, "test-session-wbe-locked-1", [
      {
        name: "Azure",
        description: "AI 写入的描述",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "CORE",
        lifecycle_stage: "SCALING",
        trend: "STABLE",
        confidence: "HIGH",
        evidence: [],
      },
    ])
  );

  const [engine] = await sql<{ id: string }[]>`
    select id from business_engines where company_id = ${companyId} and name = 'Azure'
  `;
  await sql`
    update business_engines set description = ${"人工修改后的描述"}, is_manually_edited = true
    where id = ${engine.id}
  `;

  const secondAnalysisId = await createTestAnalysisResult(companyId, "test-session-wbe-locked-2");
  await emit(
    "analysis.completed",
    makeEvent(companyId, secondAnalysisId, "test-session-wbe-locked-2", [
      {
        name: "Azure",
        description: "AI 第二次写入的描述",
        customer_segment: ["ENTERPRISE"],
        product_or_service: "Cloud Infrastructure",
        monetization_model: ["USAGE_BASED"],
        revenue_role: "MAJOR",
        lifecycle_stage: "SCALING",
        trend: "DOWN",
        confidence: "LOW",
        evidence: [],
      },
    ])
  );

  const [afterSecondRun] = await sql<{ description: string; revenue_role: string; is_manually_edited: boolean }[]>`
    select description, revenue_role, is_manually_edited from business_engines where id = ${engine.id}
  `;
  assert.equal(afterSecondRun.description, "人工修改后的描述", "主表不应被 AI 第二次分析覆盖");
  assert.equal(afterSecondRun.revenue_role, "CORE", "主表 revenue_role 不应被覆盖");
  assert.equal(afterSecondRun.is_manually_edited, true);

  const snapshots = await sql<{ change_type: string; analysis_result_id: string | null }[]>`
    select change_type, analysis_result_id from business_engine_snapshots
    where business_engine_id = ${engine.id} and analysis_result_id = ${secondAnalysisId}
  `;
  assert.equal(snapshots.length, 1, "锁定状态下仍应追加一条 snapshot");
  assert.equal(snapshots[0].analysis_result_id, secondAnalysisId);
});

import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "./db";
import {
  getInvestmentRationale,
  saveInvestmentRationale,
  getTimelineEvents,
  createTimelineEvent,
  deleteTimelineEvent,
  validateBusinessEngineInput,
} from "./company-research";

const TEST_TICKER = "TESTIR";
let testCompanyId: string;

before(async () => {
  const sql = getDb();
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-InvestmentRationale"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  testCompanyId = company.id;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

test("getInvestmentRationale 在没有记录时返回 null", async () => {
  const result = await getInvestmentRationale(TEST_TICKER);
  assert.equal(result, null);
});

test("getInvestmentRationale 在 company 不存在时返回 null", async () => {
  const result = await getInvestmentRationale("NOSUCHTICKER");
  assert.equal(result, null);
});

test("saveInvestmentRationale 第一次调用时 insert 一条新记录", async () => {
  const saved = await saveInvestmentRationale(TEST_TICKER, "第一版理由");
  assert.equal(saved.content, "第一版理由");
  assert.ok(saved.id);

  const fetched = await getInvestmentRationale(TEST_TICKER);
  assert.ok(fetched);
  assert.equal(fetched?.content, "第一版理由");
  assert.equal(fetched?.id, saved.id);
});

test("saveInvestmentRationale 第二次调用时 update 覆盖同一条记录，不新增行", async () => {
  const first = await saveInvestmentRationale(TEST_TICKER, "第一版理由");
  const second = await saveInvestmentRationale(TEST_TICKER, "第二版理由");

  assert.equal(second.id, first.id, "应更新同一条记录，而不是插入新行");
  assert.equal(second.content, "第二版理由");

  const sql = getDb();
  const rows = await sql`
    select id from knowledge_entries
    where company_id = ${testCompanyId} and category = 'investment_rationale'
  `;
  assert.equal(rows.length, 1, "该 company 该 category 下应始终只有一条记录");

  const fetched = await getInvestmentRationale(TEST_TICKER);
  assert.equal(fetched?.content, "第二版理由");
});

test("saveInvestmentRationale 在 company 不存在时抛错", async () => {
  await assert.rejects(() => saveInvestmentRationale("NOSUCHTICKER", "任意内容"));
});

test("createTimelineEvent 创建的手动事件能被 getTimelineEvents 查到", async () => {
  const created = await createTimelineEvent(TEST_TICKER, {
    title: "手动测试事件",
    description: "手动测试描述",
    source_url: "https://example.com/manual-event",
    occurred_at: "2026-07-20T10:00:00.000Z",
  });

  assert.ok(created.id);
  assert.equal(created.event_type, "manual_event");
  assert.equal(created.title, "手动测试事件");

  const events = await getTimelineEvents(TEST_TICKER);
  const found = events.find((e) => e.id === created.id);
  assert.ok(found, "创建的手动事件应能被查询到");
  assert.equal(found?.description, "手动测试描述");
  assert.equal(found?.source_url, "https://example.com/manual-event");
});

test("createTimelineEvent 在 company 不存在时抛错", async () => {
  await assert.rejects(() =>
    createTimelineEvent("NOSUCHTICKER", {
      title: "任意标题",
      occurred_at: "2026-07-20T10:00:00.000Z",
    })
  );
});

test("deleteTimelineEvent 软删除后，getTimelineEvents 不再返回该记录", async () => {
  const created = await createTimelineEvent(TEST_TICKER, {
    title: "待删除的手动事件",
    occurred_at: "2026-07-21T10:00:00.000Z",
  });

  const deleted = await deleteTimelineEvent(TEST_TICKER, created.id);
  assert.equal(deleted, true);

  const events = await getTimelineEvents(TEST_TICKER);
  assert.ok(
    !events.find((e) => e.id === created.id),
    "软删除后的事件不应出现在查询结果中"
  );

  const sql = getDb();
  const rows = await sql`
    select deleted_at from timeline_events where id = ${created.id}
  `;
  assert.equal(rows.length, 1, "记录本身应仍保留在数据库中（软删除）");
  assert.ok(rows[0].deleted_at, "deleted_at 应被设置");
});

test("deleteTimelineEvent 对不存在的 id 返回 false", async () => {
  const deleted = await deleteTimelineEvent(
    TEST_TICKER,
    "00000000-0000-0000-0000-000000000000"
  );
  assert.equal(deleted, false);
});

test("deleteTimelineEvent 在 company 不存在时返回 false", async () => {
  const deleted = await deleteTimelineEvent(
    "NOSUCHTICKER",
    "00000000-0000-0000-0000-000000000000"
  );
  assert.equal(deleted, false);
});

test("validateBusinessEngineInput 对合法输入返回 ok:true", () => {
  const result = validateBusinessEngineInput({
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
  });
  assert.equal(result.ok, true);
});

test("validateBusinessEngineInput 对空 name 返回 ok:false", () => {
  const result = validateBusinessEngineInput({
    name: "  ",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [],
  });
  assert.equal(result.ok, false);
});

test("validateBusinessEngineInput 对非法 revenue_role 枚举值返回 ok:false", () => {
  const result = validateBusinessEngineInput({
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "NOT_A_REAL_ROLE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [],
  });
  assert.equal(result.ok, false);
});

test("validateBusinessEngineInput 对非法 evidence 项返回 ok:false", () => {
  const result = validateBusinessEngineInput({
    name: "Azure",
    description: "云服务收入",
    customer_segment: [],
    product_or_service: null,
    monetization_model: [],
    revenue_role: "CORE",
    lifecycle_stage: "SCALING",
    trend: "STABLE",
    confidence: "HIGH",
    evidence: [{ source: "news.com", source_type: "news", date: "2026-01-01" }],
  });
  assert.equal(result.ok, false);
});

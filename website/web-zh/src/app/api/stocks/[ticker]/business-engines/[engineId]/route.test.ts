import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { createBusinessEngine } from "@/lib/company-research";
import { PUT, DELETE } from "./route";

const TEST_TICKER = "TESTBEIDAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-BusinessEngineIdAPI"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function fakeParams(ticker: string, engineId: string) {
  return { params: Promise.resolve({ ticker, engineId }) };
}

function fakeRequest(body: unknown) {
  return { json: async () => body } as never;
}

const VALID_INPUT = {
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
};

test("PUT 对存在的引擎返回 200 并更新内容", async () => {
  const created = await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);

  const res = await PUT(
    fakeRequest({ ...VALID_INPUT, description: "更新后的描述" }),
    fakeParams(TEST_TICKER, created!.id)
  );
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.description, "更新后的描述");
});

test("PUT 对不存在的 engineId 返回 404", async () => {
  const res = await PUT(
    fakeRequest(VALID_INPUT),
    fakeParams(TEST_TICKER, "00000000-0000-0000-0000-000000000000")
  );
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("PUT 校验失败时返回 400", async () => {
  const created = await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);

  const res = await PUT(
    fakeRequest({ ...VALID_INPUT, name: "" }),
    fakeParams(TEST_TICKER, created!.id)
  );
  assert.equal(res.status, 400);
});

test("PUT 重命名撞上同公司另一条引擎的现有 name 时返回 409 结构化错误", async () => {
  await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);
  const other = await createBusinessEngine(TEST_TICKER, {
    ...VALID_INPUT,
    name: "AWS",
  } as never);

  const res = await PUT(
    fakeRequest({ ...VALID_INPUT, name: "Azure" }),
    fakeParams(TEST_TICKER, other!.id)
  );
  assert.equal(res.status, 409);
  const body = await res.json();
  assert.equal(body.success, false);
  assert.equal(typeof body.error, "string");
  assert.ok(body.error.length > 0);
});

test("DELETE 对存在的引擎返回 200", async () => {
  const created = await createBusinessEngine(TEST_TICKER, VALID_INPUT as never);

  const res = await DELETE({} as never, fakeParams(TEST_TICKER, created!.id));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

test("DELETE 对不存在的 engineId 返回 404", async () => {
  const res = await DELETE(
    {} as never,
    fakeParams(TEST_TICKER, "00000000-0000-0000-0000-000000000000")
  );
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});

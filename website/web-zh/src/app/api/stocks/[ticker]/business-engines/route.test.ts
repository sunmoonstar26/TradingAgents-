import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET, POST } from "./route";

const TEST_TICKER = "TESTBEAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-BusinessEnginesAPI"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function fakeParams(ticker: string) {
  return { params: Promise.resolve({ ticker }) };
}

function fakeRequest(body: unknown) {
  return { json: async () => body } as never;
}

test("GET 在没有记录时返回 success:true, data:[]", async () => {
  const res = await GET({} as never, fakeParams(TEST_TICKER));
  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data, []);
});

test("POST 缺少 name 时返回 400", async () => {
  const res = await POST(
    fakeRequest({
      description: "描述",
      customer_segment: [],
      product_or_service: null,
      monetization_model: [],
      revenue_role: "CORE",
      lifecycle_stage: "SCALING",
      trend: "STABLE",
      confidence: "HIGH",
      evidence: [],
    }),
    fakeParams(TEST_TICKER)
  );
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("POST 非法 revenue_role 时返回 400", async () => {
  const res = await POST(
    fakeRequest({
      name: "Azure",
      description: "描述",
      customer_segment: [],
      product_or_service: null,
      monetization_model: [],
      revenue_role: "NOT_REAL",
      lifecycle_stage: "SCALING",
      trend: "STABLE",
      confidence: "HIGH",
      evidence: [],
    }),
    fakeParams(TEST_TICKER)
  );
  assert.equal(res.status, 400);
});

test("POST 成功创建后返回 201，且 GET 能读到该引擎", async () => {
  const res = await POST(
    fakeRequest({
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
    }),
    fakeParams(TEST_TICKER)
  );
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.name, "Azure");

  const getRes = await GET({} as never, fakeParams(TEST_TICKER));
  const getBody = await getRes.json();
  assert.equal(getBody.data.length, 1);
});

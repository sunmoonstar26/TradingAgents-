import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET, PUT } from "./route";

const TEST_TICKER = "TESTIRAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-RationaleAPI"}, 'US')
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

test("GET 在没有记录时返回 success:true, data:null", async () => {
  const res = await GET({} as never, fakeParams(TEST_TICKER));
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data, null);
});

test("PUT 使用空字符串 content 返回 400", async () => {
  const req = { json: async () => ({ content: "" }) } as never;
  const res = await PUT(req, fakeParams(TEST_TICKER));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("PUT 使用非字符串 content 返回 400", async () => {
  const req = { json: async () => ({ content: 123 }) } as never;
  const res = await PUT(req, fakeParams(TEST_TICKER));
  assert.equal(res.status, 400);
});

test("PUT 保存后 GET 能读到相同内容", async () => {
  const putReq = { json: async () => ({ content: "  测试理由文本  " }) } as never;
  const putRes = await PUT(putReq, fakeParams(TEST_TICKER));
  const putBody = await putRes.json();
  assert.equal(putBody.success, true);
  assert.equal(putBody.data.content, "测试理由文本", "应去除首尾空白");

  const getRes = await GET({} as never, fakeParams(TEST_TICKER));
  const getBody = await getRes.json();
  assert.equal(getBody.data.content, "测试理由文本");
});

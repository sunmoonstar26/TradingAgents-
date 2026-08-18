import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET, POST } from "./route";

const TEST_TICKER = "TESTTLAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-TimelineAPI"}, 'US')
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

test("GET 在没有记录时返回 success:true, data:[]", async () => {
  const res = await GET({} as never, fakeParams(TEST_TICKER));
  const body = await res.json();
  assert.equal(body.success, true);
  assert.deepEqual(body.data, []);
});

test("POST 缺少 title 时返回 400", async () => {
  const req = {
    json: async () => ({ occurred_at: "2026-07-20T10:00:00.000Z" }),
  } as never;
  const res = await POST(req, fakeParams(TEST_TICKER));
  assert.equal(res.status, 400);
  const body = await res.json();
  assert.equal(body.success, false);
});

test("POST 缺少有效 occurred_at 时返回 400", async () => {
  const req = {
    json: async () => ({ title: "标题", occurred_at: "not-a-date" }),
  } as never;
  const res = await POST(req, fakeParams(TEST_TICKER));
  assert.equal(res.status, 400);
});

test("POST 成功创建后返回 201，且 GET 能读到该事件", async () => {
  const req = {
    json: async () => ({
      title: "手动添加的事件",
      description: "补充说明",
      source_url: "https://example.com/news",
      occurred_at: "2026-07-20T10:00:00.000Z",
    }),
  } as never;
  const res = await POST(req, fakeParams(TEST_TICKER));
  assert.equal(res.status, 201);
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.title, "手动添加的事件");
  assert.equal(body.data.event_type, "manual_event");

  const getRes = await GET({} as never, fakeParams(TEST_TICKER));
  const getBody = await getRes.json();
  assert.ok(getBody.data.find((e: { id: string }) => e.id === body.data.id));
});

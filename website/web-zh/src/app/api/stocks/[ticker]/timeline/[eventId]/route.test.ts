import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { createTimelineEvent } from "@/lib/company-research";
import { DELETE } from "./route";

const TEST_TICKER = "TESTTLEVAPI";

before(async () => {
  const sql = getDb();
  await sql`
    insert into companies (ticker, name, market)
    values (${TEST_TICKER}, ${"测试公司-TimelineEventAPI"}, 'US')
    on conflict (ticker) do update set name = excluded.name
  `;
});

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker = ${TEST_TICKER}`;
});

function fakeParams(ticker: string, eventId: string) {
  return { params: Promise.resolve({ ticker, eventId }) };
}

test("DELETE 对存在的事件返回 success:true", async () => {
  const created = await createTimelineEvent(TEST_TICKER, {
    title: "待删除事件",
    occurred_at: "2026-07-20T10:00:00.000Z",
  });

  const res = await DELETE({} as never, fakeParams(TEST_TICKER, created.id));
  assert.equal(res.status, 200);
  const body = await res.json();
  assert.equal(body.success, true);
});

test("DELETE 对不存在的事件返回 404", async () => {
  const res = await DELETE(
    {} as never,
    fakeParams(TEST_TICKER, "00000000-0000-0000-0000-000000000000")
  );
  assert.equal(res.status, 404);
  const body = await res.json();
  assert.equal(body.success, false);
});

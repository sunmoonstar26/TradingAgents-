import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET } from "./route";

const TEST_INDUSTRY = "nev";
const TEST_DATES = ["2026-07-20", "2026-07-21"];

before(async () => {
  const sql = getDb();
  for (const date of TEST_DATES) {
    await sql`
      insert into industry_briefings (industry, briefing_date, content)
      values (${TEST_INDUSTRY}, ${date}, ${`测试简报内容 ${date}`})
      on conflict (industry, briefing_date) do update set content = excluded.content
    `;
  }
});

after(async () => {
  const sql = getDb();
  await sql`delete from industry_briefings where briefing_date in ${sql(TEST_DATES)}`;
});

test("GET 返回最新一条作为 latest，且 history 按日期倒序包含所有记录", async () => {
  const res = await GET();
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.latest.briefingDate, "2026-07-21");
  assert.ok(body.data.history.length >= 2);
  assert.equal(body.data.history[0].briefingDate, "2026-07-21");
});

test("GET 在表为空时返回 latest:null, history:[]", async () => {
  const sql = getDb();
  await sql`delete from industry_briefings where briefing_date in ${sql(TEST_DATES)}`;

  const res = await GET();
  const body = await res.json();
  assert.equal(body.success, true);
  assert.equal(body.data.latest, null);
  assert.deepEqual(body.data.history, []);

  // 恢复数据供后续测试/afterHook 一致性（afterHook 会再次删除，这里重新插入避免影响其他并行测试）
  for (const date of TEST_DATES) {
    await sql`
      insert into industry_briefings (industry, briefing_date, content)
      values (${TEST_INDUSTRY}, ${date}, ${`测试简报内容 ${date}`})
      on conflict (industry, briefing_date) do update set content = excluded.content
    `;
  }
});

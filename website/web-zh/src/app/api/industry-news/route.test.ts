import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET, POST, DELETE } from "./route";

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

test("POST 新增一条简报后 GET 能读到", async () => {
  const req = new Request("http://localhost/api/industry-news", {
    method: "POST",
    body: JSON.stringify({ briefingDate: "2026-07-22", content: "新增测试内容" }),
  });
  const res = await POST(req);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
  assert.equal(body.data.briefingDate, "2026-07-22");

  const getRes = await GET();
  const getBody = await getRes.json();
  const found = getBody.data.history.find(
    (h: { briefingDate: string }) => h.briefingDate === "2026-07-22"
  );
  assert.ok(found);
  assert.equal(found.content, "新增测试内容");

  const sql = getDb();
  await sql`delete from industry_briefings where briefing_date = '2026-07-22'`;
});

test("POST 已存在日期会覆盖 content", async () => {
  const req = new Request("http://localhost/api/industry-news", {
    method: "POST",
    body: JSON.stringify({ briefingDate: "2026-07-21", content: "覆盖后的内容" }),
  });
  const res = await POST(req);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.data.content, "覆盖后的内容");

  const sql = getDb();
  const rows = await sql`select content from industry_briefings where briefing_date = '2026-07-21'`;
  assert.equal(rows[0].content, "覆盖后的内容");

  await sql`update industry_briefings set content = ${"测试简报内容 2026-07-21"} where briefing_date = '2026-07-21'`;
});

test("POST 非法日期格式返回 400", async () => {
  const req = new Request("http://localhost/api/industry-news", {
    method: "POST",
    body: JSON.stringify({ briefingDate: "2026/07/22", content: "内容" }),
  });
  const res = await POST(req);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("POST 空 content 返回 400", async () => {
  const req = new Request("http://localhost/api/industry-news", {
    method: "POST",
    body: JSON.stringify({ briefingDate: "2026-07-22", content: "   " }),
  });
  const res = await POST(req);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("POST 在生产环境返回 403", async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const req = new Request("http://localhost/api/industry-news", {
      method: "POST",
      body: JSON.stringify({ briefingDate: "2026-07-22", content: "内容" }),
    });
    const res = await POST(req);
    assert.equal(res.status, 403);
  } finally {
    process.env.NODE_ENV = original;
  }
});

test("DELETE 已存在日期后 GET 读不到", async () => {
  const sql = getDb();
  await sql`
    insert into industry_briefings (industry, briefing_date, content)
    values ('nev', '2026-07-19', '待删除内容')
    on conflict (industry, briefing_date) do update set content = excluded.content
  `;

  const req = new Request("http://localhost/api/industry-news", {
    method: "DELETE",
    body: JSON.stringify({ briefingDate: "2026-07-19" }),
  });
  const res = await DELETE(req);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);

  const rows = await sql`select 1 from industry_briefings where briefing_date = '2026-07-19'`;
  assert.equal(rows.length, 0);
});

test("DELETE 不存在的日期仍返回 200", async () => {
  const req = new Request("http://localhost/api/industry-news", {
    method: "DELETE",
    body: JSON.stringify({ briefingDate: "2026-01-01" }),
  });
  const res = await DELETE(req);
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.equal(body.success, true);
});

test("DELETE 非法日期格式返回 400", async () => {
  const req = new Request("http://localhost/api/industry-news", {
    method: "DELETE",
    body: JSON.stringify({ briefingDate: "not-a-date" }),
  });
  const res = await DELETE(req);
  const body = await res.json();
  assert.equal(res.status, 400);
  assert.equal(body.success, false);
});

test("DELETE 在生产环境返回 403", async () => {
  const original = process.env.NODE_ENV;
  process.env.NODE_ENV = "production";
  try {
    const req = new Request("http://localhost/api/industry-news", {
      method: "DELETE",
      body: JSON.stringify({ briefingDate: "2026-07-19" }),
    });
    const res = await DELETE(req);
    assert.equal(res.status, 403);
  } finally {
    process.env.NODE_ENV = original;
  }
});


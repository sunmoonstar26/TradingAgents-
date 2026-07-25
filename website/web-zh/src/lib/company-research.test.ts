import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "./db";
import { getInvestmentRationale, saveInvestmentRationale } from "./company-research";

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

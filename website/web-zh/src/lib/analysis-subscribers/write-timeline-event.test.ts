import { test, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "../db";
import { emit } from "../event-bus";
import type { AnalysisCompletedEvent } from "@/types/events";
import "./write-timeline-event";

const TEST_TICKER_PREFIX = "TWTE";

async function createTestCompany(suffix: string): Promise<string> {
  const sql = getDb();
  const ticker = `${TEST_TICKER_PREFIX}${suffix}`;
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${ticker}, ${"测试公司-WriteTimelineEvent"}, 'US')
    on conflict (ticker) do update set name = excluded.name
    returning id
  `;
  return company.id;
}

after(async () => {
  const sql = getDb();
  await sql`delete from companies where ticker like ${TEST_TICKER_PREFIX + "%"}`;
});

function makeEvent(
  companyId: string,
  newsItems: AnalysisCompletedEvent["raw"]["news_items"]
): AnalysisCompletedEvent {
  return {
    companyId,
    analysisResultId: "00000000-0000-0000-0000-000000000000",
    sessionId: "test-session-write-timeline",
    raw: {
      ticker: TEST_TICKER_PREFIX,
      signal: "BUY",
      news_items: newsItems,
    } as AnalysisCompletedEvent["raw"],
    detail: {
      committeeDecision: { rationale: "测试用理由" },
    } as AnalysisCompletedEvent["detail"],
  };
}

test("write-timeline-event 订阅者按 news_items 逐条插入 timeline_events 记录，event_type 取自 category 映射", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("A");

  const event = makeEvent(companyId, [
    {
      title: "新闻标题一",
      summary: "摘要一",
      source: "Reuters",
      url: "https://example.com/news-1",
      published_at: "2026-07-20T10:00:00.000Z",
      category: "财报新闻",
    },
    {
      title: "新闻标题二",
      summary: "摘要二",
      source: "Bloomberg",
      url: "https://example.com/news-2",
      published_at: "2026-07-21T10:00:00.000Z",
      category: "高管新闻",
    },
  ]);

  await emit("analysis.completed", event);

  const rows = await sql`
    select event_type, title, description, source, source_url, occurred_at
    from timeline_events
    where company_id = ${companyId}
    order by occurred_at asc
  `;

  assert.equal(rows.length, 2);
  assert.equal(rows[0].event_type, "news_earnings");
  assert.equal(rows[0].title, "新闻标题一");
  assert.equal(rows[0].description, "摘要一");
  assert.equal(rows[0].source, "Reuters");
  assert.equal(rows[0].source_url, "https://example.com/news-1");
  assert.equal(rows[1].event_type, "news_executive");
  assert.equal(rows[1].title, "新闻标题二");
});

test("write-timeline-event 订阅者在 category 缺失时兜底为 news_other", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("D");

  await emit(
    "analysis.completed",
    makeEvent(companyId, [
      {
        title: "无分类新闻",
        summary: null,
        source: "Reuters",
        url: "https://example.com/news-no-category",
        published_at: "2026-07-22T10:00:00.000Z",
      },
    ])
  );

  const rows = await sql`
    select event_type from timeline_events
    where company_id = ${companyId} and source_url = ${"https://example.com/news-no-category"}
  `;

  assert.equal(rows.length, 1);
  assert.equal(rows[0].event_type, "news_other");
});

test("write-timeline-event 订阅者对相同 source_url 的新闻不会重复插入", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("B");

  const duplicateItem = {
    title: "重复新闻",
    summary: "摘要",
    source: "Reuters",
    url: "https://example.com/news-dup",
    published_at: "2026-07-22T10:00:00.000Z",
  };

  await emit("analysis.completed", makeEvent(companyId, [duplicateItem]));
  await emit("analysis.completed", makeEvent(companyId, [duplicateItem]));

  const rows = await sql`
    select id from timeline_events
    where company_id = ${companyId} and source_url = ${duplicateItem.url}
  `;

  assert.equal(rows.length, 1);
});

test("write-timeline-event 订阅者在 news_items 为空数组时不插入任何记录", async () => {
  const sql = getDb();
  const companyId = await createTestCompany("C");

  await emit("analysis.completed", makeEvent(companyId, []));

  const rows = await sql`
    select id from timeline_events where company_id = ${companyId}
  `;

  assert.equal(rows.length, 0);
});

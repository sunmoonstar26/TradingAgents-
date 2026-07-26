# 新能源车产业资讯板块编辑功能 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 给首页"新能源车产业资讯"板块加编辑能力：手写修改某天简报正文、手动新增一条简报、删除某一天的简报，且仅在非生产环境（`NODE_ENV !== "production"`）可用。

**Architecture:** 在现有 `GET /api/industry-news` 基础上新增 `POST`（新增/编辑，按 `(industry, briefing_date)` upsert）与 `DELETE`（按 `briefing_date` 删除）两个方法，服务端在处理函数入口做生产环境拦截（403）。`IndustryBriefingSection` 组件加 `isEditing` 状态，编辑模式下把只读 `<pre>` 换成 `<textarea>` + 保存按钮,日期标签行加删除 ✕ 和"新增"表单,全部通过 `@tanstack/react-query` 的 `invalidateQueries` 刷新数据。不新增数据库迁移,不改 `GET`。

**Tech Stack:** Next.js 16 App Router / TypeScript / `postgres` npm 包 / `@tanstack/react-query` / `node:test` / lucide-react 图标

## Global Constraints

- 用户界面文案统一放置于 `src/content/` 目录，不允许在组件中直接硬编码字符串（`AGENTS.md`）；新增文案用英文（`AGENTS.md` 强制规则，且遵循设计文档中"新增字段全部英文,不修正旧字段"的决定）
- 组件名、函数名、变量名使用英文（`AGENTS.md`）
- 数据库写入只走服务端 `DATABASE_URL` 直连（`src/lib/db.ts` 的 `getDb()`），不引入新的连接方式或凭证
- 不新增数据库迁移、不改表结构（设计文档明确的非目标）
- `POST`/`DELETE` 必须在处理函数入口检查 `process.env.NODE_ENV === "production"`，是则返回 403，这是唯一的真实权限边界（设计文档"权限模型"）
- 测试用 `node:test` + `node:assert/strict`，通过 `npm test` 运行，与 `route.test.ts` 现有风格一致
- 前端不新增组件测试基建（项目当前无 jsdom/testing-library 配置），交互靠手动浏览器验证覆盖

---

## Task 1: API — `POST`/`DELETE /api/industry-news` + 单测

**Files:**
- Modify: `src/app/api/industry-news/route.ts`
- Modify: `src/app/api/industry-news/route.test.ts`

**Interfaces:**
- Consumes: `getDb()` from `src/lib/db.ts`（已有，签名 `getDb(): postgres.Sql`）
- Produces:
  - `POST(req: Request): Promise<NextResponse>` — 请求体 `{ briefingDate: string; content: string }`，成功返回 `{ success: true, data: { briefingDate: string; content: string } }`（200），失败返回 `{ success: false, error: string }`（400/403/500）
  - `DELETE(req: Request): Promise<NextResponse>` — 请求体 `{ briefingDate: string }`，成功返回 `{ success: true }`（200），失败返回 `{ success: false, error: string }`（400/403/500）

- [ ] **Step 1: 写失败测试 — POST 新增/编辑/校验**

在 `src/app/api/industry-news/route.test.ts` 顶部把 import 改为：

```ts
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { getDb } from "@/lib/db";
import { GET, POST, DELETE } from "./route";
```

在文件末尾（现有两个 `test(...)` 之后）追加：

```ts
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
```

- [ ] **Step 2: 写失败测试 — DELETE**

继续在 `src/app/api/industry-news/route.test.ts` 末尾追加：

```ts
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
```

- [ ] **Step 3: 运行测试确认全部失败（POST/DELETE 未导出）**

Run: `npm test -- src/app/api/industry-news/route.test.ts`
Expected: FAIL，报错信息包含 `POST is not a function` 或 `DELETE is not a function`（因为 `route.ts` 还没导出这两个方法）

- [ ] **Step 4: 实现 `POST`/`DELETE`**

把 `src/app/api/industry-news/route.ts` 改为：

```ts
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const INDUSTRY = "nev";
const HISTORY_LIMIT = 14;
const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

interface BriefingEntry {
  briefingDate: string;
  content: string;
}

function isProduction(): boolean {
  return process.env.NODE_ENV === "production";
}

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql<{ briefing_date: string | Date; content: string }[]>`
      select briefing_date, content
      from industry_briefings
      where industry = ${INDUSTRY}
      order by briefing_date desc
      limit ${HISTORY_LIMIT}
    `;

    const history: BriefingEntry[] = rows.map((r) => ({
      briefingDate:
        r.briefing_date instanceof Date
          ? r.briefing_date.toISOString().slice(0, 10)
          : r.briefing_date,
      content: r.content,
    }));

    return NextResponse.json({
      success: true,
      data: {
        latest: history[0] ?? null,
        history,
      },
    });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  if (isProduction()) {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 });
  }

  try {
    const { briefingDate, content } = (await req.json()) as {
      briefingDate?: string;
      content?: string;
    };

    if (!briefingDate || !DATE_PATTERN.test(briefingDate)) {
      return NextResponse.json({ success: false, error: "Invalid briefingDate format" }, { status: 400 });
    }
    if (!content || content.trim().length === 0) {
      return NextResponse.json({ success: false, error: "content is required" }, { status: 400 });
    }

    const sql = getDb();
    await sql`
      insert into industry_briefings (industry, briefing_date, content)
      values (${INDUSTRY}, ${briefingDate}, ${content})
      on conflict (industry, briefing_date) do update set content = excluded.content
    `;

    return NextResponse.json({ success: true, data: { briefingDate, content } });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}

export async function DELETE(req: Request) {
  if (isProduction()) {
    return NextResponse.json({ success: false, error: "Not available in production" }, { status: 403 });
  }

  try {
    const { briefingDate } = (await req.json()) as { briefingDate?: string };

    if (!briefingDate || !DATE_PATTERN.test(briefingDate)) {
      return NextResponse.json({ success: false, error: "Invalid briefingDate format" }, { status: 400 });
    }

    const sql = getDb();
    await sql`delete from industry_briefings where industry = ${INDUSTRY} and briefing_date = ${briefingDate}`;

    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json(
      { success: false, error: err instanceof Error ? err.message : "Unknown error" },
      { status: 500 }
    );
  }
}
```

- [ ] **Step 5: 运行测试确认全部通过**

Run: `npm test -- src/app/api/industry-news/route.test.ts`
Expected: 所有测试 PASS（包括原有 2 个 GET 测试 + 新增 9 个）

- [ ] **Step 6: Commit**

```bash
git add src/app/api/industry-news/route.ts src/app/api/industry-news/route.test.ts
git commit -m "feat(web-zh): add POST/DELETE to industry-news API for editing briefings"
```

---

## Task 2: 文案 — 扩展 `INDUSTRY_NEWS_TEXT`

**Files:**
- Modify: `src/content/industry-news.ts`

**Interfaces:**
- Produces: `INDUSTRY_NEWS_TEXT` 新增字段 `edit`、`done`、`save`、`addNew`、`deleteConfirm`、`datePlaceholder`、`contentPlaceholder`、`saveFailedMessage`、`deleteFailedMessage`（均为 `string`），供 Task 3 组件消费

- [ ] **Step 1: 追加新文案字段**

把 `src/content/industry-news.ts` 改为：

```ts
// website/web-zh/src/content/industry-news.ts

export const INDUSTRY_NEWS_TEXT = {
  title: "新能源车产业资讯",
  emptyState: "暂无简报数据",
  historyLabel: "历史简报",
  loadErrorMessage: "简报加载失败，请稍后重试",
  edit: "Edit",
  done: "Done",
  save: "Save",
  addNew: "Add Briefing",
  deleteConfirm: "Delete this briefing? This cannot be undone.",
  datePlaceholder: "Date",
  contentPlaceholder: "Briefing content...",
  saveFailedMessage: "Save failed, please try again",
  deleteFailedMessage: "Delete failed, please try again",
};
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出（无类型错误）

- [ ] **Step 3: Commit**

```bash
git add src/content/industry-news.ts
git commit -m "feat(web-zh): add edit-mode copy to industry news content"
```

---

## Task 3: 组件 — `IndustryBriefingSection` 编辑模式

**Files:**
- Modify: `src/components/dashboard/industry-briefing-section.tsx`

**Interfaces:**
- Consumes: `INDUSTRY_NEWS_TEXT`（Task 2 产出的全部字段）；`POST`/`DELETE /api/industry-news`（Task 1 产出，请求体 `{ briefingDate, content }` / `{ briefingDate }`）
- Produces: 无新增导出，仅修改现有 `IndustryBriefingSection` 组件的内部实现

- [ ] **Step 1: 替换组件实现**

把 `src/components/dashboard/industry-briefing-section.tsx` 改为：

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Newspaper, Pencil, Check, Plus, X } from "lucide-react";
import { INDUSTRY_NEWS_TEXT } from "@/content/industry-news";

interface BriefingEntry {
  briefingDate: string;
  content: string;
}

interface IndustryNewsResponse {
  success: boolean;
  data?: {
    latest: BriefingEntry | null;
    history: BriefingEntry[];
  };
}

const isEditable = process.env.NODE_ENV !== "production";

export function IndustryBriefingSection() {
  const queryClient = useQueryClient();
  const [selectedDate, setSelectedDate] = useState<string | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [editedContent, setEditedContent] = useState("");
  const [isAddingNew, setIsAddingNew] = useState(false);
  const [newDate, setNewDate] = useState("");
  const [newContent, setNewContent] = useState("");
  const [actionError, setActionError] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<IndustryNewsResponse>({
    queryKey: ["industry-news"],
    queryFn: () => fetch("/api/industry-news").then((r) => r.json()),
    refetchInterval: 5 * 60_000,
  });

  const history = data?.data?.history ?? [];
  const latest = data?.data?.latest ?? null;
  const active =
    history.find((h) => h.briefingDate === selectedDate) ?? latest;

  useEffect(() => {
    setEditedContent(active?.content ?? "");
  }, [active?.briefingDate, active?.content]);

  const refresh = () => queryClient.invalidateQueries({ queryKey: ["industry-news"] });

  const handleSave = async () => {
    if (!active) return;
    setActionError(null);
    const res = await fetch("/api/industry-news", {
      method: "POST",
      body: JSON.stringify({ briefingDate: active.briefingDate, content: editedContent }),
    });
    if (!res.ok) {
      setActionError(INDUSTRY_NEWS_TEXT.saveFailedMessage);
      return;
    }
    refresh();
  };

  const handleDelete = async (briefingDate: string) => {
    if (!window.confirm(INDUSTRY_NEWS_TEXT.deleteConfirm)) return;
    setActionError(null);
    const res = await fetch("/api/industry-news", {
      method: "DELETE",
      body: JSON.stringify({ briefingDate }),
    });
    if (!res.ok) {
      setActionError(INDUSTRY_NEWS_TEXT.deleteFailedMessage);
      return;
    }
    if (selectedDate === briefingDate) setSelectedDate(null);
    refresh();
  };

  const handleAddNew = async () => {
    setActionError(null);
    const res = await fetch("/api/industry-news", {
      method: "POST",
      body: JSON.stringify({ briefingDate: newDate, content: newContent }),
    });
    if (!res.ok) {
      setActionError(INDUSTRY_NEWS_TEXT.saveFailedMessage);
      return;
    }
    setNewDate("");
    setNewContent("");
    setIsAddingNew(false);
    refresh();
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Newspaper className="w-4 h-4 text-[var(--blue)]" />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {INDUSTRY_NEWS_TEXT.title}
            </span>
          </div>
          {isEditable && !isLoading && (
            <button
              onClick={() => {
                setIsEditing((v) => !v);
                setIsAddingNew(false);
                setActionError(null);
              }}
              className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isEditing ? (
                <>
                  <Check className="w-3 h-3" />
                  {INDUSTRY_NEWS_TEXT.done}
                </>
              ) : (
                <>
                  <Pencil className="w-3 h-3" />
                  {INDUSTRY_NEWS_TEXT.edit}
                </>
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="h-40 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : error || !data?.success ? (
          <p className="text-[12px] text-[var(--text-secondary)]">
            {INDUSTRY_NEWS_TEXT.loadErrorMessage}
          </p>
        ) : !active && !isEditing ? (
          <p className="text-[12px] text-[var(--text-secondary)] py-6 text-center">
            {INDUSTRY_NEWS_TEXT.emptyState}
          </p>
        ) : (
          <div>
            {(history.length > 1 || isEditing) && (
              <div className="flex flex-wrap items-center gap-2 mb-3">
                {history.map((h) => (
                  <span key={h.briefingDate} className="inline-flex items-center gap-1">
                    <button
                      onClick={() => setSelectedDate(h.briefingDate)}
                      className={`text-[10px] font-mono px-2 py-1 rounded ${
                        h.briefingDate === active?.briefingDate
                          ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                          : "text-[var(--text-secondary)]/60 hover:text-[var(--text-secondary)]"
                      }`}
                    >
                      {h.briefingDate}
                    </button>
                    {isEditing && (
                      <button
                        onClick={() => handleDelete(h.briefingDate)}
                        className="text-[var(--text-secondary)]/40 hover:text-red-500"
                      >
                        <X className="w-3 h-3" />
                      </button>
                    )}
                  </span>
                ))}
                {isEditing && (
                  <button
                    onClick={() => setIsAddingNew((v) => !v)}
                    className="flex items-center gap-1 text-[10px] font-mono px-2 py-1 rounded text-[var(--text-secondary)]/60 hover:text-[var(--text-secondary)]"
                  >
                    <Plus className="w-3 h-3" />
                    {INDUSTRY_NEWS_TEXT.addNew}
                  </button>
                )}
              </div>
            )}

            {isAddingNew && (
              <div className="mb-3 p-3 rounded-xl border border-[var(--border-custom)] space-y-2">
                <input
                  type="date"
                  value={newDate}
                  onChange={(e) => setNewDate(e.target.value)}
                  placeholder={INDUSTRY_NEWS_TEXT.datePlaceholder}
                  className="text-[12px] bg-transparent border border-[var(--border-custom)] rounded px-2 py-1"
                />
                <textarea
                  value={newContent}
                  onChange={(e) => setNewContent(e.target.value)}
                  placeholder={INDUSTRY_NEWS_TEXT.contentPlaceholder}
                  className="w-full h-32 text-[12px] bg-transparent border border-[var(--border-custom)] rounded p-2"
                />
                <button
                  onClick={handleAddNew}
                  className="text-[11px] px-3 py-1 rounded bg-[var(--blue)]/20 text-[var(--blue)]"
                >
                  {INDUSTRY_NEWS_TEXT.save}
                </button>
              </div>
            )}

            {actionError && (
              <p className="text-[11px] text-red-500 mb-2">{actionError}</p>
            )}

            {active && isEditing ? (
              <div>
                <textarea
                  value={editedContent}
                  onChange={(e) => setEditedContent(e.target.value)}
                  className="w-full h-48 text-[12px] text-[var(--text-primary)] bg-transparent border border-[var(--border-custom)] rounded p-2 leading-relaxed"
                />
                <button
                  onClick={handleSave}
                  className="mt-2 text-[11px] px-3 py-1 rounded bg-[var(--blue)]/20 text-[var(--blue)]"
                >
                  {INDUSTRY_NEWS_TEXT.save}
                </button>
              </div>
            ) : active ? (
              <pre className="text-[12px] text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed">
                {active.content}
              </pre>
            ) : null}
          </div>
        )}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: 类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出（无类型错误）

- [ ] **Step 3: 运行完整测试套件确认无回归**

Run: `npm test`
Expected: 全部 PASS

- [ ] **Step 4: 手动浏览器验证**

Run: `npm run dev`（默认 `NODE_ENV=development`，编辑入口应可见），打开 `http://localhost:3001`。逐项验证：

1. 未点击"Edit"时，标题栏无编辑按钮相关的 ✕/新增/保存元素，正文仍是只读 `<pre>`。
2. 点击"Edit" → 按钮变为"Done"，日期标签行每个标签旁出现 ✕，标签行末尾出现"Add Briefing"按钮，正文区域变为可编辑 `<textarea>` + "Save"按钮。
3. 修改 textarea 内容 → 点击"Save" → 请求成功后刷新，重新打开该日期正文应显示修改后的内容。
4. 点击某个历史日期旁的 ✕ → 弹出浏览器确认框 → 确认 → 该日期从标签行消失；若删的是当前选中日期，正文回退显示最新一条。
5. 点击"Add Briefing" → 展开表单，选一个不存在的日期 + 填写正文 → 点击"Save" → 表单收起，标签行新增该日期标签。
6. 点击"Done" → 恢复只读展示，编辑相关按钮和表单全部隐藏。
7. 临时把 `.env.local` 的 `NODE_ENV` 设为 `production`（或改用 `npm run build && npm start` 跑生产构建）验证标题栏无"Edit"按钮，且直接 `curl -X POST http://localhost:3001/api/industry-news -d '{"briefingDate":"2026-07-22","content":"x"}'` 返回 403。

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/industry-briefing-section.tsx
git commit -m "feat(web-zh): add edit mode to industry briefing section"
```

---

## Self-Review Notes

- **Spec coverage**：编辑正文（Task 3 textarea+Save）、新增简报（Task 3 Add Briefing 表单）、删除简报（Task 3 ✕ 按钮）、权限模型（Task 1 的 `isProduction()` 拦截 + Task 3 的 `isEditable` UI 隐藏）均有对应任务覆盖。
- **占位符扫描**：无 TBD/TODO，所有步骤含完整代码。
- **类型一致性**：`BriefingEntry` 字段名（`briefingDate`/`content`）在 Task 1（API 响应）与 Task 3（组件 state/props）之间一致；`POST`/`DELETE` 请求体字段名（`briefingDate`、`content`）在 Task 1 实现与 Task 3 调用处一致；`INDUSTRY_NEWS_TEXT` 新增字段名在 Task 2 定义与 Task 3 使用处逐一对应（`edit`/`done`/`save`/`addNew`/`deleteConfirm`/`datePlaceholder`/`contentPlaceholder`/`saveFailedMessage`/`deleteFailedMessage`）。
- **范围检查**：三个任务均可独立测试验收（Task 1 有单测、Task 2 有类型检查、Task 3 有手动浏览器验证清单），不需要进一步拆分。

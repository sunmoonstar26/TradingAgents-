# 投资理由（Investment Rationale）Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a user-editable, server-persisted "Investment Rationale" card above the "投资委员会决策" (`FinalDecision`) section on the stock workspace page.

**Architecture:** Reuse the existing `knowledge_entries` table (no new migration) with `category = 'investment_rationale'`, one row per company, overwritten in place on every save. Data layer functions live in `src/lib/company-research.ts` alongside existing read/write helpers for this table family. A thin GET/PUT API route exposes them. A new client component polls via React Query and toggles between read-only and edit states.

**Tech Stack:** Next.js App Router, TypeScript, `postgres` client (`getDb()`), `@tanstack/react-query`, `node:test` + `node:assert/strict` (run via `tsx`) for backend tests.

## Global Constraints

- Database fields, API fields, types, enums, component/function/variable names: English only (per `AGENTS.md`).
- User-facing UI copy: written as Chinese string literals inline in the component (per existing convention in `final-decision.tsx`/`thesis-history.tsx` — this codebase does not route all static component strings through `src/content/`, only enum-driven labels).
- No new DB migration — reuse `knowledge_entries` (per design spec).
- Single row per company, overwritten on save — no version history (per design spec).
- Local single-user mode — no `user_id`, no auth checks.
- Tests: use the existing `node:test` pattern (see `src/lib/analysis-subscribers/write-thesis.test.ts`) — `before`/`after` hooks that insert/delete a throwaway test company row directly via `getDb()`, never touch real data.
- Run tests with: `npm test` (equivalent to `tsx --env-file=.env.local --test --test-force-exit "src/**/*.test.ts"`). Requires `DATABASE_URL` in `.env.local` pointing at a real local Postgres with the `knowledge_entries` table already migrated.

---

### Task 1: Data layer — `getInvestmentRationale` / `saveInvestmentRationale`

**Files:**
- Modify: `src/lib/company-research.ts` (append two new exported functions)
- Modify: `src/types/index.ts` (add `InvestmentRationale` interface, right after the `Thesis` interface)
- Test: `src/lib/company-research.test.ts` (new file)

**Interfaces:**
- Produces: `InvestmentRationale { id: string; content: string; created_at: string }` (exported from `@/types`)
- Produces: `getInvestmentRationale(ticker: string): Promise<InvestmentRationale | null>` (exported from `@/lib/company-research`)
- Produces: `saveInvestmentRationale(ticker: string, content: string): Promise<InvestmentRationale>` (exported from `@/lib/company-research`)
- Consumes: `getDb()` from `./db` (already imported in `company-research.ts`); private `findCompanyId(ticker)` helper already defined at the top of `company-research.ts`.

- [ ] **Step 1: Add the `InvestmentRationale` type**

In `src/types/index.ts`, find the `Thesis` interface (it ends with a closing brace followed by `previous_version: number | null;` and `created_at: string;` fields). Insert immediately after it:

```ts
export interface InvestmentRationale {
  id: string;
  content: string;
  created_at: string;
}
```

- [ ] **Step 2: Write the failing tests**

Create `src/lib/company-research.test.ts`:

```ts
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
```

- [ ] **Step 2b: Run tests to verify they fail**

Run: `npm test -- --test-name-pattern="InvestmentRationale|getInvestmentRationale|saveInvestmentRationale"`

If that pattern flag isn't supported by the installed `tsx`/Node version, run the full suite instead: `npm test`

Expected: FAIL — `getInvestmentRationale`/`saveInvestmentRationale` are not exported from `./company-research` (TypeScript/runtime error, module has no such export).

- [ ] **Step 3: Implement the functions**

Append to `src/lib/company-research.ts` (add `InvestmentRationale` to the existing `import type { ... } from "@/types"` block at the top of the file, then add the functions at the end of the file):

```ts
export async function getInvestmentRationale(
  ticker: string
): Promise<InvestmentRationale | null> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) return null;

  const sql = getDb();
  const [row] = await sql<InvestmentRationale[]>`
    select id, content, created_at
    from knowledge_entries
    where company_id = ${companyId} and category = 'investment_rationale'
    limit 1
  `;
  return row ?? null;
}

export async function saveInvestmentRationale(
  ticker: string,
  content: string
): Promise<InvestmentRationale> {
  const companyId = await findCompanyId(ticker);
  if (!companyId) throw new Error(`Company not found: ${ticker}`);

  const sql = getDb();
  const [existing] = await sql<{ id: string }[]>`
    select id from knowledge_entries
    where company_id = ${companyId} and category = 'investment_rationale'
    limit 1
  `;

  const [row] = existing
    ? await sql<InvestmentRationale[]>`
        update knowledge_entries
        set content = ${content}, created_at = now()
        where id = ${existing.id}
        returning id, content, created_at
      `
    : await sql<InvestmentRationale[]>`
        insert into knowledge_entries (company_id, category, title, content)
        values (${companyId}, 'investment_rationale', 'Investment Rationale', ${content})
        returning id, content, created_at
      `;
  return row;
}
```

- [ ] **Step 4: Run tests to verify they pass**

Run: `npm test`
Expected: All 5 new tests in `src/lib/company-research.test.ts` PASS, and existing tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/lib/company-research.ts src/lib/company-research.test.ts src/types/index.ts
git commit -m "feat(web-zh): add investment rationale data layer"
```

---

### Task 2: API route — GET/PUT `/api/stocks/[ticker]/rationale`

**Files:**
- Create: `src/app/api/stocks/[ticker]/rationale/route.ts`
- Test: `src/app/api/stocks/[ticker]/rationale/route.test.ts` (new file)

**Interfaces:**
- Consumes: `getInvestmentRationale`, `saveInvestmentRationale` from `@/lib/company-research` (Task 1)
- Produces: `GET` handler returning `{ success: true, data: InvestmentRationale | null }`
- Produces: `PUT` handler accepting `{ content: string }` body, returning `{ success: true, data: InvestmentRationale }` on success or `{ success: false, error: string }` with status 400 on invalid input

- [ ] **Step 1: Write the failing test**

Create `src/app/api/stocks/[ticker]/rationale/route.test.ts`:

```ts
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
```

- [ ] **Step 2: Run test to verify it fails**

Run: `npm test`
Expected: FAIL — `src/app/api/stocks/[ticker]/rationale/route.ts` does not exist (module not found).

- [ ] **Step 3: Implement the route**

Create `src/app/api/stocks/[ticker]/rationale/route.ts`:

```ts
import { NextRequest, NextResponse } from "next/server";
import { getInvestmentRationale, saveInvestmentRationale } from "@/lib/company-research";

export async function GET(
  _req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const data = await getInvestmentRationale(ticker.toUpperCase());
  return NextResponse.json({ success: true, data });
}

export async function PUT(
  req: NextRequest,
  { params }: { params: Promise<{ ticker: string }> }
) {
  const { ticker } = await params;
  const { content } = await req.json();

  if (typeof content !== "string" || content.trim().length === 0) {
    return NextResponse.json(
      { success: false, error: "content must be a non-empty string" },
      { status: 400 }
    );
  }

  const data = await saveInvestmentRationale(ticker.toUpperCase(), content.trim());
  return NextResponse.json({ success: true, data });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `npm test`
Expected: All 4 new tests in `route.test.ts` PASS, and all previous tests still PASS.

- [ ] **Step 5: Commit**

```bash
git add src/app/api/stocks/\[ticker\]/rationale/route.ts src/app/api/stocks/\[ticker\]/rationale/route.test.ts
git commit -m "feat(web-zh): add investment rationale GET/PUT API route"
```

---

### Task 3: UI component — `InvestmentRationale`

**Files:**
- Create: `src/components/stock/investment-rationale.tsx`
- Modify: `src/app/stock/[ticker]/page.tsx` (mount the component)

**Interfaces:**
- Consumes: `GET`/`PUT /api/stocks/${ticker}/rationale` (Task 2), returning `{ success: boolean; data: InvestmentRationale | null }`
- Consumes: `InvestmentRationale` type from `@/types` (Task 1)
- Produces: `InvestmentRationale` React component, props `{ ticker: string }`, default export not used — named export `InvestmentRationale` (matches the pattern of `FinalDecision`, `ThesisHistory`, etc., all named exports)

This task has no automated test — there is no component-testing framework installed in this project (no jsdom/testing-library; the only test runner is `node:test` used for data/API layers). Verification is manual, via the dev server, per Step 5 below.

- [ ] **Step 1: Create the component**

Create `src/components/stock/investment-rationale.tsx`:

```tsx
"use client";

import { useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { NotebookPen, Pencil } from "lucide-react";
import { InvestmentRationale as InvestmentRationaleType } from "../../types";

interface Props {
  ticker: string;
}

function formatUpdatedAt(iso: string): string {
  try {
    return new Date(iso).toLocaleString("zh-CN", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export function InvestmentRationale({ ticker }: Props) {
  const qc = useQueryClient();
  const queryKey = ["rationale", ticker];

  const { data, isLoading } = useQuery<{ success: boolean; data: InvestmentRationaleType | null }>({
    queryKey,
    queryFn: () => fetch(`/api/stocks/${ticker}/rationale`).then((r) => r.json()),
    retry: false,
  });

  const rationale = data?.data ?? null;

  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const startEditing = () => {
    setDraft(rationale?.content ?? "");
    setError(null);
    setIsEditing(true);
  };

  const cancelEditing = () => {
    setIsEditing(false);
    setError(null);
  };

  const save = async () => {
    if (draft.trim().length === 0) return;
    setIsSaving(true);
    setError(null);
    try {
      const res = await fetch(`/api/stocks/${ticker}/rationale`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ content: draft }),
      });
      const body = await res.json();
      if (!body.success) {
        setError(body.error ?? "保存失败");
        return;
      }
      await qc.invalidateQueries({ queryKey });
      setIsEditing(false);
    } catch {
      setError("保存失败，请检查网络后重试");
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        {"投资理由"}
      </h2>

      <div className="card-terminal p-4">
        {isLoading ? (
          <div className="h-16 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : isEditing ? (
          <div className="space-y-3">
            <textarea
              value={draft}
              onChange={(e) => setDraft(e.target.value)}
              placeholder="写下你的投资判断依据……"
              className="w-full min-h-[120px] rounded-xl border border-[var(--border-custom)] bg-[var(--panel2)]/60 p-3 text-[13px] text-[var(--text-primary)] leading-relaxed focus:outline-none focus:border-[var(--blue)]/40 resize-y"
            />
            {error && (
              <p className="text-[11px] text-[var(--red)]">{error}</p>
            )}
            <div className="flex items-center gap-2">
              <button
                onClick={save}
                disabled={isSaving || draft.trim().length === 0}
                className={`rounded-lg px-3 py-1.5 text-[11px] font-semibold transition-colors ${
                  isSaving || draft.trim().length === 0
                    ? "bg-[var(--blue)]/10 text-[var(--blue)] cursor-not-allowed"
                    : "bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20"
                }`}
              >
                {isSaving ? "保存中..." : "保存"}
              </button>
              <button
                onClick={cancelEditing}
                disabled={isSaving}
                className="rounded-lg px-3 py-1.5 text-[11px] font-semibold text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
              >
                {"取消"}
              </button>
            </div>
          </div>
        ) : rationale ? (
          <div className="space-y-2">
            <p className="text-[13px] text-[var(--text-primary)] leading-relaxed whitespace-pre-wrap">
              {rationale.content}
            </p>
            <div className="flex items-center justify-between pt-1">
              <span className="text-[10px] font-mono text-[var(--text-secondary)]/50">
                {formatUpdatedAt(rationale.created_at)}
              </span>
              <button
                onClick={startEditing}
                className="inline-flex items-center gap-1 text-[11px] font-semibold text-[var(--blue)] hover:text-[var(--blue)]/80 transition-colors"
              >
                <Pencil className="w-3 h-3" />
                {"编辑"}
              </button>
            </div>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <NotebookPen className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无投资理由"}</p>
            <button
              onClick={startEditing}
              className="mt-3 rounded-lg px-3 py-1.5 text-[11px] font-semibold bg-[var(--blue)]/10 text-[var(--blue)] hover:bg-[var(--blue)]/20 transition-colors"
            >
              {"添加"}
            </button>
          </div>
        )}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 2: Mount the component on the stock page**

In `src/app/stock/[ticker]/page.tsx`:

Add the import next to the other `@/components/stock/*` imports (after the `FinalDecision` import):

```ts
import { InvestmentRationale } from "@/components/stock/investment-rationale";
```

Then find this block (inside the `<section className="space-y-5">` that contains `STOCK_WORKSPACE_TABS.analysis`):

```tsx
        <section className="space-y-5">
          <h2 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            {STOCK_WORKSPACE_TABS.analysis}
          </h2>

          <FinalDecision
```

Replace with:

```tsx
        <section className="space-y-5">
          <h2 className="text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
            {STOCK_WORKSPACE_TABS.analysis}
          </h2>

          <InvestmentRationale ticker={ticker} />

          <FinalDecision
```

- [ ] **Step 3: Run the TypeScript build to catch type errors**

Run: `npm run build`
Expected: Build succeeds with no TypeScript errors. (This does not run the app — it only compiles. Manual verification happens in Step 5.)

- [ ] **Step 4: Run the full test suite to confirm nothing broke**

Run: `npm test`
Expected: All tests (Task 1, Task 2, and pre-existing) PASS.

- [ ] **Step 5: Manual verification in the browser**

Run: `npm run dev` (or `npm run dev:zh`)

Navigate to `http://localhost:3001/stock/<a ticker that has already been analyzed>`. Verify, in order:

1. The "投资理由" card renders above "投资委员会决策", initially showing "暂无投资理由" + "添加" button (assuming this ticker has never had a rationale saved).
2. Click "添加" → textarea appears, empty, with "保存"/"取消" buttons. "保存" is disabled while the textarea is empty.
3. Type some text, click "保存" → card switches to read-only view showing the text plus a timestamp.
4. Reload the page (full browser refresh) → the same text and timestamp are still there (confirms server-side persistence, not localStorage).
5. Click "编辑" → textarea is pre-filled with the existing text. Change the text, click "取消" → read-only view shows the *original* unchanged text (edit was discarded).
6. Click "编辑" again, change the text, click "保存" → read-only view shows the *new* text and an updated timestamp (confirms overwrite, not append).
7. Open browser dev tools, go offline (Network tab → "Offline"), click "编辑", type something, click "保存" → an inline error message appears, and the textarea still contains what was typed (not cleared). Go back online.

Stop the dev server after verification.

- [ ] **Step 6: Commit**

```bash
git add src/components/stock/investment-rationale.tsx src/app/stock/\[ticker\]/page.tsx
git commit -m "feat(web-zh): add investment rationale card to stock workspace page"
```

---

## Plan Self-Review Notes

- Spec coverage: data layer (Task 1), API layer (Task 2), UI layer + mount point (Task 3) — all three spec sections covered. Acceptance criteria 1-6 from the spec map to Task 3 Step 5's manual checklist (items 1-3 → criteria 1-2, item 4 → criterion 3, item 6 → criterion 4, item 5 → criterion 5, item 7 → criterion 6). Acceptance criterion 7 (`npm run build` passes) is Task 3 Step 3.
- No placeholders: every step has runnable code, no "TBD"/"similar to above".
- Type consistency checked: `InvestmentRationale` fields (`id`, `content`, `created_at`) are identical across Task 1 (type + SQL `returning`/`select` clauses), Task 2 (route test assertions), and Task 3 (component reads `rationale.content`, `rationale.created_at`).

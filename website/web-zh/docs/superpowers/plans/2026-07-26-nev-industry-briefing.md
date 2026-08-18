# 新能源车产业资讯板块 Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 首页新增一个公开可见的"新能源车产业资讯"板块，展示 Hermes 每日生成的简报全文及最近 14 天历史，数据来自本机文件 `/tmp/nev_briefing_latest.txt`，由一个独立定时脚本导入本地 Postgres。

**Architecture:** 新表 `industry_briefings`（本地 Postgres）存储整篇简报原文，唯一约束 `(industry, briefing_date)` 支持同日覆盖导入。新增 TypeScript 导入脚本 `scripts/import-industry-briefing.ts`（复用 `src/lib/db.ts` 的 `getDb()`）读取本机文件、解析日期、upsert 入库，由新的 launchd 任务每天 9:10 触发。新增 `GET /api/industry-news` 读取最近 14 天记录，首页新增 `IndustryBriefingSection` 组件在最顶部展示。

**Tech Stack:** Next.js 16 App Router / TypeScript / `postgres` npm 包 / `tsx` / node:test / launchd (macOS)

## Global Constraints

- 用户界面文案统一放置于 `src/content/` 目录，不允许在组件中直接硬编码字符串（`AGENTS.md`）
- 组件名、函数名、变量名使用英文（`AGENTS.md`）
- 数据库写入只走服务端 `DATABASE_URL` 直连（`src/lib/db.ts` 的 `getDb()`），不引入新的连接方式或凭证
- 新表遵循项目现有 RLS 模式：公开只读（`anyone can read`），不开放 anon 写入策略
- 测试用 `node:test` + `node:assert/strict`，通过 `npm test`（`tsx --env-file=.env.local --test`）运行，与 `write-timeline-event.test.ts` 等现有文件同风格
- 日期解析失败或文件缺失时导入脚本必须非零退出且不写库，不静默兜底（沿用 `news_curator.py` 的失败可见原则）

---

## Task 1: 数据库迁移 — `industry_briefings` 表

**Files:**
- Create: `supabase/migrations/0005_industry_briefings.sql`

**Interfaces:**
- Produces: 表 `public.industry_briefings`，列 `id uuid`、`industry text`、`briefing_date date`、`content text`、`created_at timestamptz`；唯一约束 `industry_briefings_industry_briefing_date_key` on `(industry, briefing_date)`

- [ ] **Step 1: 编写迁移 SQL**

写入 `supabase/migrations/0005_industry_briefings.sql`：

```sql
-- 行业资讯简报表：整篇原文存储，来源是本机定时脚本读取 Hermes 产出的简报文件后写入。
-- industry 列默认 'nev'（New Energy Vehicle），为将来可能新增的其他行业简报预留同一张表，
-- 当前只有一个来源。
create table public.industry_briefings (
  id uuid primary key default gen_random_uuid(),
  industry text not null default 'nev',
  briefing_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (industry, briefing_date)
);

alter table public.industry_briefings enable row level security;

create policy "anyone can read industry_briefings"
  on public.industry_briefings for select
  using (true);

-- 不建 insert/update/delete policy：写入只走服务端 DATABASE_URL 直连，
-- 与 companies/timeline_events 等表的写入路径一致。
```

- [ ] **Step 2: 应用迁移到本地数据库**

Run: `psql "$DATABASE_URL" -f supabase/migrations/0005_industry_briefings.sql`

（`$DATABASE_URL` 取自 `.env.local` 里的 `DATABASE_URL` 值；也可以用 `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -f supabase/migrations/0005_industry_briefings.sql`）

Expected: 输出 `CREATE TABLE` / `ALTER TABLE` / `CREATE POLICY`，无报错

- [ ] **Step 3: 验证表结构**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "\d public.industry_briefings"`

Expected: 显示 5 列（id/industry/briefing_date/content/created_at）+ 唯一约束 + `anyone can read industry_briefings` 策略

- [ ] **Step 4: Commit**

```bash
git add supabase/migrations/0005_industry_briefings.sql
git commit -m "feat(web-zh): add industry_briefings table migration"
```

---

## Task 2: 日期解析函数 + 单测

**Files:**
- Create: `scripts/lib/parse-briefing-date.ts`
- Test: `scripts/lib/parse-briefing-date.test.ts`

**Interfaces:**
- Produces: `parseBriefingDate(content: string): string`（返回 `YYYY-MM-DD` 格式字符串），解析失败抛出 `Error`

- [ ] **Step 1: 写失败的测试**

创建 `scripts/lib/parse-briefing-date.test.ts`：

```typescript
import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBriefingDate } from "./parse-briefing-date";

test("parseBriefingDate 从标准格式正文中提取日期", () => {
  const content = "2026 年 07 月 24 日 新能源汽车产业每日资讯\n\n🛠️ 技术动态\n...";
  assert.equal(parseBriefingDate(content), "2026-07-24");
});

test("parseBriefingDate 支持月/日为单数字", () => {
  const content = "2026 年 7 月 4 日 新能源汽车产业每日资讯\n内容...";
  assert.equal(parseBriefingDate(content), "2026-07-04");
});

test("parseBriefingDate 只取正文中第一个匹配的日期", () => {
  const content = "2026 年 07 月 24 日 简报\n\n提及 2025 年 01 月 01 日 的旧新闻";
  assert.equal(parseBriefingDate(content), "2026-07-24");
});

test("parseBriefingDate 在找不到日期时抛出异常", () => {
  const content = "本文没有任何日期信息，只有正文内容。";
  assert.throws(() => parseBriefingDate(content), /未找到日期/);
});

test("parseBriefingDate 在正文为空字符串时抛出异常", () => {
  assert.throws(() => parseBriefingDate(""), /未找到日期/);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --test scripts/lib/parse-briefing-date.test.ts`
Expected: FAIL，报 `Cannot find module './parse-briefing-date'` 或类似模块缺失错误

- [ ] **Step 3: 实现 `parseBriefingDate`**

创建 `scripts/lib/parse-briefing-date.ts`：

```typescript
const DATE_PATTERN = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/;

/**
 * 从简报正文中解析出日期，返回 YYYY-MM-DD 格式。
 * 只取正文中第一个匹配（简报开头的标题行），避免正文引用旧新闻日期时误匹配。
 */
export function parseBriefingDate(content: string): string {
  const match = content.match(DATE_PATTERN);
  if (!match) {
    throw new Error("未找到日期：简报正文中没有 'YYYY 年 MM 月 DD 日' 格式的日期");
  }
  const [, year, month, day] = match;
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx tsx --test scripts/lib/parse-briefing-date.test.ts`
Expected: PASS，5 个测试全部通过

- [ ] **Step 5: Commit**

```bash
git add scripts/lib/parse-briefing-date.ts scripts/lib/parse-briefing-date.test.ts
git commit -m "feat(web-zh): add briefing date parser for industry news import"
```

---

## Task 3: 导入脚本 `import-industry-briefing.ts`

**Files:**
- Create: `scripts/import-industry-briefing.ts`

**Interfaces:**
- Consumes: `parseBriefingDate(content: string): string`（Task 2），`getDb()` from `@/lib/db`（现有）
- Produces: 可执行脚本，读取 `/tmp/nev_briefing_latest.txt`，写入 `industry_briefings` 表；`main()` 函数导出供测试驱动，进程失败时 `process.exitCode = 1`

- [ ] **Step 1: 实现导入脚本**

创建 `scripts/import-industry-briefing.ts`：

```typescript
import { readFileSync, existsSync } from "fs";
import { getDb } from "../src/lib/db";
import { parseBriefingDate } from "./lib/parse-briefing-date";

const BRIEFING_FILE = "/tmp/nev_briefing_latest.txt";
const INDUSTRY = "nev";

export async function importBriefing(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`简报文件不存在: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  if (!content.trim()) {
    throw new Error(`简报文件为空: ${filePath}`);
  }

  const briefingDate = parseBriefingDate(content);

  const sql = getDb();
  await sql`
    insert into industry_briefings (industry, briefing_date, content)
    values (${INDUSTRY}, ${briefingDate}, ${content})
    on conflict (industry, briefing_date) do update set content = excluded.content
  `;

  console.log(`[import-industry-briefing] 已导入 ${INDUSTRY} ${briefingDate}`);
}

async function main() {
  try {
    await importBriefing(BRIEFING_FILE);
  } catch (err) {
    console.error(`[import-industry-briefing] 失败: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}
```

- [ ] **Step 2: 手动验证——先造一个测试文件跑一次**

Run:
```bash
cat > /tmp/nev_briefing_latest.txt <<'EOF'
2026 年 07 月 24 日 新能源汽车产业每日资讯

🛠️ 技术动态
⭐⭐⭐ [07-24] 满配华为乾崑六件套 东风奕派 M8 上市
EOF
cd "/Users/donny2026/Downloads/TradingAgents 项目/website/web-zh"
npx tsx --env-file=.env.local scripts/import-industry-briefing.ts
```
Expected: 打印 `[import-industry-briefing] 已导入 nev 2026-07-24`，退出码 0

- [ ] **Step 3: 验证数据库中确实写入**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "select industry, briefing_date, length(content) from industry_briefings"`

Expected: 一行记录，`industry='nev'`, `briefing_date='2026-07-24'`

- [ ] **Step 4: 验证失败路径——文件不存在时的行为**

Run:
```bash
rm /tmp/nev_briefing_latest.txt
npx tsx --env-file=.env.local scripts/import-industry-briefing.ts; echo "exit code: $?"
```
Expected: 打印 `[import-industry-briefing] 失败: 简报文件不存在: /tmp/nev_briefing_latest.txt`，`exit code: 1`

- [ ] **Step 5: 清理测试数据并 Commit**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "delete from industry_briefings where briefing_date = '2026-07-24'"`

```bash
git add scripts/import-industry-briefing.ts
git commit -m "feat(web-zh): add script to import NEV briefing from local file"
```

---

## Task 4: launchd 定时任务配置

**Files:**
- Create: `scripts/com.tradingagents.import-nev-briefing.plist`

**Interfaces:**
- Consumes: `scripts/import-industry-briefing.ts`（Task 3）
- Produces: launchd plist，每天 9:10 通过 `node_modules/.bin/tsx` 运行导入脚本

- [ ] **Step 1: 编写 plist 文件**

创建 `scripts/com.tradingagents.import-nev-briefing.plist`（仿照现有 `scripts/com.tradingagents.fetch-market.plist` 的结构）：

```xml
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN"
  "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key>
  <string>com.tradingagents.import-nev-briefing</string>

  <key>ProgramArguments</key>
  <array>
    <string>/Users/donny2026/Downloads/TradingAgents 项目/website/web-zh/node_modules/.bin/tsx</string>
    <string>--env-file=.env.local</string>
    <string>/Users/donny2026/Downloads/TradingAgents 项目/website/web-zh/scripts/import-industry-briefing.ts</string>
  </array>

  <!-- 每天 09:10 运行，晚于 Hermes 9:00 简报生成，避开 9:05 的公众号发布中转 -->
  <key>StartCalendarInterval</key>
  <dict>
    <key>Hour</key>
    <integer>9</integer>
    <key>Minute</key>
    <integer>10</integer>
  </dict>

  <key>RunAtLoad</key>
  <false/>

  <key>StandardOutPath</key>
  <string>/Users/donny2026/Downloads/TradingAgents 项目/logs/import_nev_briefing.log</string>

  <key>StandardErrorPath</key>
  <string>/Users/donny2026/Downloads/TradingAgents 项目/logs/import_nev_briefing_err.log</string>

  <key>WorkingDirectory</key>
  <string>/Users/donny2026/Downloads/TradingAgents 项目/website/web-zh</string>
</dict>
</plist>
```

- [ ] **Step 2: Commit（不自动加载 launchd，留给用户手动确认后加载）**

```bash
git add "scripts/com.tradingagents.import-nev-briefing.plist"
git commit -m "feat(web-zh): add launchd config for NEV briefing import"
```

> 注：本任务只提交 plist 文件，不执行 `launchctl load`。加载 launchd 任务会在用户系统上启用一个持续运行的定时任务，属于需要用户明确确认的操作——完成全部任务后，向用户说明手动加载的命令（见 Task 7 末尾）。

---

## Task 5: `GET /api/industry-news` 路由

**Files:**
- Create: `src/app/api/industry-news/route.ts`
- Test: `src/app/api/industry-news/route.test.ts`

**Interfaces:**
- Consumes: `getDb()` from `@/lib/db`（现有）
- Produces: `GET` handler，响应体 `{ success: true, data: { latest: BriefingEntry | null, history: BriefingEntry[] } }`，其中 `BriefingEntry = { briefingDate: string; content: string }`；异常时 `{ success: false, error: string }`，status 500

- [ ] **Step 1: 写失败的测试**

创建 `src/app/api/industry-news/route.test.ts`：

```typescript
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
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --env-file=.env.local --test src/app/api/industry-news/route.test.ts`
Expected: FAIL，报 `Cannot find module './route'` 或类似模块缺失错误

- [ ] **Step 3: 实现路由**

创建 `src/app/api/industry-news/route.ts`：

```typescript
import { NextResponse } from "next/server";
import { getDb } from "@/lib/db";

const INDUSTRY = "nev";
const HISTORY_LIMIT = 14;

interface BriefingEntry {
  briefingDate: string;
  content: string;
}

export async function GET() {
  try {
    const sql = getDb();
    const rows = await sql<{ briefing_date: string; content: string }[]>`
      select briefing_date, content
      from industry_briefings
      where industry = ${INDUSTRY}
      order by briefing_date desc
      limit ${HISTORY_LIMIT}
    `;

    const history: BriefingEntry[] = rows.map((r) => ({
      briefingDate: r.briefing_date,
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
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx tsx --env-file=.env.local --test src/app/api/industry-news/route.test.ts`
Expected: PASS，2 个测试全部通过

- [ ] **Step 5: Commit**

```bash
git add src/app/api/industry-news/route.ts src/app/api/industry-news/route.test.ts
git commit -m "feat(web-zh): add GET /api/industry-news route"
```

---

## Task 6: 文案内容 + 首页组件 `IndustryBriefingSection`

**Files:**
- Create: `src/content/industry-news.ts`
- Create: `src/components/dashboard/industry-briefing-section.tsx`
- Modify: `src/app/page.tsx`

**Interfaces:**
- Consumes: `GET /api/industry-news`（Task 5）返回的 `{ success, data: { latest, history } }` 结构
- Produces: React 组件 `IndustryBriefingSection`（默认导出用具名导出 `export function IndustryBriefingSection()`），挂载于首页 `<Header />` 之后、`<CompanyCenter />` 之前

- [ ] **Step 1: 编写文案文件**

创建 `src/content/industry-news.ts`：

```typescript
// website/web-zh/src/content/industry-news.ts

export const INDUSTRY_NEWS_TEXT = {
  title: "新能源车产业资讯",
  emptyState: "暂无简报数据",
  historyLabel: "历史简报",
  loadErrorMessage: "简报加载失败，请稍后重试",
};
```

- [ ] **Step 2: 编写组件**

创建 `src/components/dashboard/industry-briefing-section.tsx`：

```typescript
"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import { Newspaper } from "lucide-react";
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

export function IndustryBriefingSection() {
  const [selectedDate, setSelectedDate] = useState<string | null>(null);

  const { data, isLoading, error } = useQuery<IndustryNewsResponse>({
    queryKey: ["industry-news"],
    queryFn: () => fetch("/api/industry-news").then((r) => r.json()),
    refetchInterval: 5 * 60_000,
  });

  const history = data?.data?.history ?? [];
  const latest = data?.data?.latest ?? null;
  const active =
    history.find((h) => h.briefingDate === selectedDate) ?? latest;

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center gap-2 mb-4">
          <Newspaper className="w-4 h-4 text-[var(--blue)]" />
          <span className="text-[12px] font-semibold text-[var(--text-primary)]">
            {INDUSTRY_NEWS_TEXT.title}
          </span>
        </div>

        {isLoading ? (
          <div className="h-40 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
        ) : error || !data?.success ? (
          <p className="text-[12px] text-[var(--text-secondary)]">
            {INDUSTRY_NEWS_TEXT.loadErrorMessage}
          </p>
        ) : !active ? (
          <p className="text-[12px] text-[var(--text-secondary)] py-6 text-center">
            {INDUSTRY_NEWS_TEXT.emptyState}
          </p>
        ) : (
          <div>
            {history.length > 1 && (
              <div className="flex flex-wrap gap-2 mb-3">
                {history.map((h) => (
                  <button
                    key={h.briefingDate}
                    onClick={() => setSelectedDate(h.briefingDate)}
                    className={`text-[10px] font-mono px-2 py-1 rounded ${
                      h.briefingDate === active.briefingDate
                        ? "bg-[var(--blue)]/20 text-[var(--blue)]"
                        : "text-[var(--text-secondary)]/60 hover:text-[var(--text-secondary)]"
                    }`}
                  >
                    {h.briefingDate}
                  </button>
                ))}
              </div>
            )}
            <pre className="text-[12px] text-[var(--text-primary)] whitespace-pre-wrap font-sans leading-relaxed">
              {active.content}
            </pre>
          </div>
        )}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 3: 挂载到首页**

修改 `src/app/page.tsx`：在 import 区加入组件引用，在 JSX 中插入到 `<Header />` 之后、`<CompanyCenter />` 之前。

在文件顶部 import 区（`import { CompanyCenter } from "@/components/dashboard/company-center";` 这一行之后）加入：

```typescript
import { IndustryBriefingSection } from "@/components/dashboard/industry-briefing-section";
```

在 `<main>` 区块中，把：

```tsx
        {/* 0. 已研究公司 */}
        <CompanyCenter />
```

改为：

```tsx
        {/* 0. 新能源车产业资讯 */}
        <IndustryBriefingSection />

        {/* 1. 已研究公司 */}
        <CompanyCenter />
```

（下方原有的 `{/* 1. AI 研究控制台 */}` 注释序号无需强制重排，保持原样即可，避免无关改动）

- [ ] **Step 4: 启动开发服务器并手动验证**

Run: `npm run dev`

打开浏览器访问 `http://localhost:3001`，验证：
1. 页面顶部（Header 下方）出现"新能源车产业资讯"板块
2. 若数据库中 `industry_briefings` 为空，显示"暂无简报数据"
3. 用 Task 3 的手动测试文件重新导入一条记录后刷新页面，板块显示该条简报全文
4. 若插入多条不同日期的记录，历史日期按钮出现，点击可切换查看

Expected: 板块正确渲染，三种状态（loading/empty/有数据）均符合预期，浏览器控制台无报错

- [ ] **Step 5: Commit**

```bash
git add src/content/industry-news.ts src/components/dashboard/industry-briefing-section.tsx src/app/page.tsx
git commit -m "feat(web-zh): add industry briefing section to homepage"
```

---

## Task 7: 端到端手动验证 + 完成说明

**Files:**
- 无代码改动（纯验证任务）

**Interfaces:**
- Consumes: Task 1-6 的全部产出

- [ ] **Step 1: 完整链路手动跑一次**

```bash
cd "/Users/donny2026/Downloads/TradingAgents 项目/website/web-zh"

# 模拟 Hermes 写入简报文件
cat > /tmp/nev_briefing_latest.txt <<'EOF'
2026 年 07 月 26 日 新能源汽车产业每日资讯

🛠️ 技术动态
⭐⭐⭐ [07-26] 测试简报内容用于端到端验证
EOF

# 运行导入脚本
npx tsx --env-file=.env.local scripts/import-industry-briefing.ts
```

Expected: 打印 `[import-industry-briefing] 已导入 nev 2026-07-26`

- [ ] **Step 2: 验证 API 返回该数据**

Run: `curl -s http://localhost:3001/api/industry-news | head -c 500`

（需要先确保 `npm run dev` 在运行）

Expected: JSON 中 `data.latest.briefingDate` 为 `"2026-07-26"`

- [ ] **Step 3: 浏览器验证首页展示**

打开 `http://localhost:3001`，确认"新能源车产业资讯"板块展示刚导入的内容。

- [ ] **Step 4: 清理端到端验证产生的测试数据**

Run: `psql "$(grep DATABASE_URL .env.local | cut -d= -f2-)" -c "delete from industry_briefings where briefing_date = '2026-07-26'"`

- [ ] **Step 5: 运行完整测试套件确认无回归**

Run: `npm test`

Expected: 所有测试通过，包括 Task 2/5 新增的测试

- [ ] **Step 6: 向用户说明手动加载 launchd 任务的步骤**

本步骤不是代码任务，是给执行者的收尾说明——完成以上验证后，告知用户以下手动操作（不代替用户执行，仅告知命令）：

```bash
launchctl load ~/Library/LaunchAgents/com.tradingagents.import-nev-briefing.plist
```

（需要用户先把 `scripts/com.tradingagents.import-nev-briefing.plist` 复制到 `~/Library/LaunchAgents/` 目录，路径中含中文和空格，建议用户手动执行 `cp` 命令确认路径无误）

---

## Self-Review Notes

- **Spec coverage**：数据模型（Task 1）、导入脚本+launchd（Task 3-4）、API（Task 5）、前端组件+挂载位置（Task 6）、测试（Task 2/5 单测 + Task 7 端到端）均有对应任务覆盖。
- **日期解析独立可测试**：单独抽成 `scripts/lib/parse-briefing-date.ts`，覆盖了 spec 要求的四种场景（正常/月日单数字/多重日期取第一个/缺失）。
- **失败可见原则**：Task 3 的导入脚本文件不存在、内容为空、日期解析失败均会 throw，`main()` 捕获后打印到 stderr 并置 `exitCode = 1`，不写库。
- **类型一致性**：`BriefingEntry = { briefingDate: string; content: string }` 在 Task 5（API）与 Task 6（前端组件）中保持一致命名；`industry_briefings` 表列名（`briefing_date`/`content`）在 Task 1/3/5 中一致。
- **launchd 加载不自动执行**：Task 4/7 明确不由实现者调用 `launchctl load`，只提交 plist 文件并在最后告知用户手动命令——加载常驻定时任务属于需要用户确认的系统级变更。

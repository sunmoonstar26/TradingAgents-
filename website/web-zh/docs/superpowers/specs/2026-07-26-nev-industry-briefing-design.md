# 新能源车产业资讯板块 — 设计文档

日期：2026-07-26

## 背景

用户在本机通过 Hermes（一个独立的定时任务系统）运行了一个每日 cron job（job_id `2c0620997b5f`），每天上午 9:00 生成一份"新能源汽车产业每日资讯"简报（按技术动态/其他分类、带星级评分的中文文本），覆盖写入固定路径 `/tmp/nev_briefing_latest.txt`。另有一个 9:05 的 cron（`075cc869f8b2`）读取该文件用于公众号发布，与本次需求无关，两者互不干扰。

Hermes 与本网站（web-zh，`localhost:3001`）运行在同一台机器上。`/tmp` 是临时文件系统，重启即清空，且文件每天被覆盖、不保留历史。

用户希望首页新增一个板块，展示这份简报，并且网站自己保存每日历史（而不是只显示当天）。

## 目标

- 首页最顶部（Header 之后，`CompanyCenter` 之前）新增"新能源车产业资讯"板块，对所有访客公开
- 展示当天简报全文，并可查看最近历史（最近 14 天）
- 与 Hermes 完全解耦：不修改 Hermes 的 cron 配置或输出格式，网站侧新增一个独立的本机定时导入任务
- 数据来源单一入口清晰：一张新表存储，一个导入脚本负责读文件写库

## 非目标

- 不解析简报正文内部结构（不拆分类、不拆星级、不做 markdown 渲染），整篇原文存储与展示
- 不做鉴权/远程摄入接口——两边同机运行，无需 HTTP 摄入层，网站侧直接读本机文件即可
- 不改动 Hermes 现有 cron（`2c0620997b5f`、`075cc869f8b2`）或 `nev_to_wechat.py`

## 架构

```
Hermes cron (9:00, 已存在)
   → 覆盖写 /tmp/nev_briefing_latest.txt
                │
                ▼ (9:10，新增 launchd 任务)
scripts/import-industry-briefing.ts
   - 读取 /tmp/nev_briefing_latest.txt
   - 从正文中解析简报日期（不使用文件 mtime）
   - upsert 进 Postgres industry_briefings 表
                │
                ▼
industry_briefings 表（本地 Postgres，DATABASE_URL）
                │
                ▼
GET /api/industry-news （新增 Next.js API Route）
                │
                ▼
首页新组件 IndustryBriefingSection（今日简报 + 历史日期切换）
```

**为何不用文件 mtime 判断日期**：`/tmp` 系统重启会清空，且用户已确认存在"发布 cron 早于简报 cron 触发时读到隔日残留"的已知问题。改为从正文首行（形如"2026 年 07 月 24 日 新能源汽车产业每日资讯"）解析日期，若解析失败则整次导入失败退出、不写库，避免脏数据污染历史记录——与项目现有 `news_curator.py` "失败要可见，不静默兜底"的风格一致。

**为何走本地 Postgres 而非 Supabase JS client 或新起一套连接**：项目所有持久化写入（`companies`/`analysis_results`/`timeline_events` 等）都通过 `src/lib/db.ts` 的 `getDb()` 直连本地 Postgres（`DATABASE_URL`），复用同一条路径，不引入新的凭证或连接方式。

**为何用独立 TypeScript 脚本 + 独立 launchd 任务，而非改 Hermes 或加 HTTP 接口**：两边同机、Hermes 侧不需改动，网站侧的导入逻辑完全独立于 Hermes 的运行时，出故障互不影响。脚本选用 TypeScript（`tsx`）而非 Python：项目 Python 侧（`pyproject.toml`）目前没有任何 Postgres 客户端依赖，而 TypeScript 侧已有 `postgres` 包并被 `src/lib/db.ts` 使用，复用现成依赖和连接方式，不用为一个小脚本给 Python 项目新增数据库依赖。用 `npm run` 脚本 + `tsx --env-file=.env.local` 直接运行，launchd 里调用 `node_modules/.bin/tsx` 即可，不依赖 Next.js 服务器本身运行。

后续若网站迁移到云端部署，Hermes 与网站不再同机，到时候可以把这个导入脚本改造成一个受 shared-secret 保护的 HTTP 摄入接口，替换掉"直接读本机文件"这一步，其余部分（表结构、API route、前端组件）不用变。这是当前设计里唯一预留的扩展点，其余地方不做面向未来的抽象。

## 数据模型

新增迁移 `supabase/migrations/0005_industry_briefings.sql`：

```sql
create table public.industry_briefings (
  id uuid primary key default gen_random_uuid(),
  industry text not null default 'nev',
  briefing_date date not null,
  content text not null,
  created_at timestamptz not null default now(),
  unique (industry, briefing_date)
);
```

- `content`：简报全文原样存储，不拆字段
- `industry`：默认 `'nev'`（New Energy Vehicle）。当前只有一个 Hermes 任务产出，但多这一列几乎零成本，为将来 Hermes 可能新增的其他行业简报预留了同一张表的复用空间，不需要因此新建表或改 API 形状
- `unique (industry, briefing_date)`：配合导入脚本的 `on conflict (industry, briefing_date) do update`，同一天重复导入直接覆盖当天记录，不会产生重复行

沿用项目现有约定：这张表是公开只读数据（不涉及用户隔私），比照 `research_summaries`/`companies` 的 RLS 策略——写入 RLS，允许匿名 `select`，不开放 `insert`/`update`/`delete`（写入只走服务端 `DATABASE_URL` 直连，不经过 anon key）。

## 导入脚本

`scripts/import-industry-briefing.ts`（TypeScript，用 `tsx` 运行，复用 `src/lib/db.ts` 的 `getDb()`）：

- 输入：固定路径 `/tmp/nev_briefing_latest.txt`
- 从正文中用正则提取日期（形如 `(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日`），取正文中第一个匹配
- 文件不存在 / 读取失败 / 日期解析失败：打印错误到 stderr，非零退出，不触碰数据库
- 成功：`insert ... on conflict (industry, briefing_date) do update set content = excluded.content` 写入本地 Postgres（`getDb()`，复用现有 `DATABASE_URL`）
- `package.json` 新增一条 `"import:nev-briefing": "tsx --env-file=.env.local scripts/import-industry-briefing.ts"`，供 launchd 调用
- 新增 `scripts/com.tradingagents.import-nev-briefing.plist`，仿照现有 `com.tradingagents.fetch-market.plist`，`ProgramArguments` 指向 `node_modules/.bin/tsx` + 该脚本路径，`WorkingDirectory` 设为 `web-zh` 目录（保证 `--env-file=.env.local` 能找到文件），设置在每天 9:10 运行（晚于 Hermes 9:00 简报生成，且避开 9:05 的发布中转），日志写入 `logs/import_nev_briefing.log` / `_err.log`

日期解析函数单独可测试（抽成独立函数，便于对着几种输入格式写单测）。

## API

新增 `GET /api/industry-news`：

- 查询 `industry_briefings`，`industry = 'nev'`，按 `briefing_date desc` 取最近 14 条
- 返回：
  ```ts
  {
    success: true,
    data: {
      latest: { briefingDate: string; content: string } | null,
      history: { briefingDate: string; content: string }[], // 含 latest，共最多 14 天
    }
  }
  ```
- 表为空（尚未导入过任何一天）时返回 `latest: null, history: []`，前端据此显示空状态文案，不报错
- 数据库连接失败：捕获异常，返回 `success: false`，前端显示加载失败提示（与首页 `DashboardPage` 现有的 `error` 分支处理方式一致）

## 前端

新增组件 `src/components/dashboard/industry-briefing-section.tsx`：

- `"use client"`，用 `useQuery` 请求 `/api/industry-news`，`refetchInterval` 参考首页现有 dashboard 轮询节奏（30s 太频繁，简报一天只更新一次，改为例如 5 分钟）
- 展示当天 `latest.content` 全文，`whitespace-pre-wrap` 直接渲染，不引入 markdown 解析
- 历史：展示最近 14 天的日期列表（不含内容），点击某天切换展示该天 `content`（数据已随 `history` 一次性带回，纯前端切换，不用额外请求）
- 空状态（`latest === null`）：显示"暂无简报数据"类文案
- 文案集中放入新文件 `src/content/industry-news.ts`（标题、空状态提示、历史区域标签等），不在组件内硬编码字符串，符合 `AGENTS.md` 的文案规则
- 挂载位置：`src/app/page.tsx` 中 `<Header />` 之后、`<CompanyCenter />` 之前，公开展示，不包在 `PrivateZone` 内

## 测试

- `scripts/import-industry-briefing.ts` 的日期解析函数：单测覆盖正常格式、日期缺失、月/日单位数、文件为空四种情况，用 `tsx --test` 与项目现有 `.test.ts` 文件同风格
- `GET /api/industry-news`：空表返回、正常返回结构、数据库异常时的降级路径，仿照 `write-timeline-event.test.ts` 风格用 `tsx --test`
- 前端组件不做自动化测试（项目现有组件也没有），改动完成后本地跑 `npm run dev`，手动验证：空数据状态、有数据时的当天展示、历史日期切换

## 风险与边界情况

- 若 Hermes 简报格式变化导致日期正则匹配不到：脚本失败退出、发日志，旧数据不受影响，网站继续展示上一次成功导入的内容，不会因为格式变化而整体挂掉
- 若同一天 Hermes 因某种原因跑了两次（内容不同）：`on conflict do update` 会用最新一次覆盖当天记录——即最后一次执行为准，符合"latest 覆盖"的既有语义
- 若网站部署迁移到不与 Hermes 同机的环境：导入脚本这一步失效，需要改造为 HTTP 摄入接口（架构一节已注明这是唯一预留的扩展点），其余部分不受影响

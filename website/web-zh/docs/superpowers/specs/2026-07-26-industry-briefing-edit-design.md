# 新能源车产业资讯板块 — 编辑功能 设计文档

## 背景

首页"新能源车产业资讯"板块（`IndustryBriefingSection`）目前只读：展示 `industry_briefings` 表中最近 14 天的简报，数据来自本机 launchd 定时脚本导入。现在需要给这个板块加编辑能力，支持：

1. 手写修改已有某天简报的正文内容
2. 手动新增一条简报（指定日期 + 正文）
3. 删除某一天的简报记录

## 范围与非目标

- **范围**：`GET /api/industry-news` 之外新增 `POST`（新增/编辑，upsert）、`DELETE`（删除单条）；`IndustryBriefingSection` 组件加编辑模式 UI。
- **非目标**：不改表结构、不新增数据库迁移、不引入登录/密钥体系、不影响 `scripts/import-industry-briefing.ts` 定时导入脚本的行为（编辑功能与定时导入各自独立写同一张表，后写覆盖前写，冲突时以人工编辑/定时导入中较晚发生的一次为准，这是可接受的行为，不做加锁）。

## 权限模型

编辑功能仅在非生产环境可用：

- 服务端：`POST`/`DELETE` 处理函数开头检查 `process.env.NODE_ENV === "production"`，是则返回 `403 { success: false, error: "Not available in production" }`。这是唯一的真实拦截点。
- 前端：用 `process.env.NODE_ENV !== "production"` 派生一个 `isEditable` 布尔值，控制是否渲染"编辑"入口按钮。前端判断只是 UI 层面的隐藏，不是安全边界——真正的拦截在服务端。
- 不新增密钥、Token 或登录校验。线上部署（生产 `NODE_ENV=production`）时编辑入口和接口均不可用；本机 `npm run dev`（`NODE_ENV=development`）时可用。

## API 设计

文件：`src/app/api/industry-news/route.ts`（在现有 `GET` 基础上新增）

### `POST /api/industry-news`

请求体：
```json
{ "briefingDate": "2026-07-26", "content": "简报正文..." }
```

行为：
1. 生产环境校验（见上）→ 不通过返回 403。
2. 校验 `briefingDate` 匹配 `^\d{4}-\d{2}-\d{2}$`，不匹配返回 `400 { success: false, error: "Invalid briefingDate format" }`。
3. 校验 `content` 为非空字符串（`trim()` 后长度 > 0），否则返回 `400 { success: false, error: "content is required" }`。
4. 按 `(industry='nev', briefing_date)` upsert：
   ```sql
   insert into industry_briefings (industry, briefing_date, content)
   values ('nev', ${briefingDate}, ${content})
   on conflict (industry, briefing_date) do update set content = excluded.content
   ```
5. 成功返回 `200 { success: true, data: { briefingDate, content } }`。

这一个接口同时承担"编辑已有简报"（日期已存在则覆盖 content）和"新增简报"（日期不存在则插入新行），语义上都是 upsert，不需要区分两个接口。

### `DELETE /api/industry-news`

请求体：
```json
{ "briefingDate": "2026-07-26" }
```

行为：
1. 生产环境校验（同上）。
2. 校验 `briefingDate` 格式（同上）。
3. 执行 `delete from industry_briefings where industry = 'nev' and briefing_date = ${briefingDate}`。
4. 无论该日期是否存在记录，都返回 `200 { success: true }`（删除本就是幂等操作，不因"不存在"报错）。

### 现有 `GET` 不变。

## 前端设计

文件：`src/components/dashboard/industry-briefing-section.tsx`

### 新增状态

- `isEditing: boolean` — 编辑模式开关（初始 `false`）。
- `editedContent: string` — textarea 当前值，切换 `active` 简报或退出编辑时同步为 `active.content`。
- `isAddingNew: boolean` — 是否展示"新增简报"表单。
- `newDate: string` / `newContent: string` — 新增表单的受控输入。

### 交互

- **标题栏**：`isEditable && !isLoading` 时，标题右侧显示"编辑"/"完成"切换按钮（复用 `CompanyCenter` 板块同类按钮的样式）。点击"编辑"进入 `isEditing = true`；点击"完成"退出，同时重置 `isAddingNew = false`。
- **正文区域**：
  - 非编辑模式：保持现状，`<pre>` 只读展示 `active.content`。
  - 编辑模式：替换为 `<textarea value={editedContent} onChange=...>`，下方一个"保存"按钮。点击保存调用 `POST`（`briefingDate: active.briefingDate`, `content: editedContent`），成功后 `queryClient.invalidateQueries({ queryKey: ["industry-news"] })`。
- **日期标签行**（`history.map`）：编辑模式下每个日期标签旁附加一个小 `✕`。点击后 `window.confirm` 二次确认，确认后调用 `DELETE`，成功后 `invalidateQueries`；若删除的正是当前 `selectedDate`，重置 `selectedDate = null`（回退到自动选中最新一条）。
- **新增简报**：日期标签行末尾（编辑模式下）追加一个"新增"按钮。点击后展开一个小表单：日期 `<input type="date">` + `<textarea>`，提交调用 `POST`，成功后清空表单、`invalidateQueries`、`isAddingNew = false`。
  - 前端不重复做"日期是否已存在"校验——新增一个已存在的日期等价于编辑该日期（upsert 语义在设计里已声明一致），不视为错误。

### 文案

新增到 `src/content/industry-news.ts`（`INDUSTRY_NEWS_TEXT` 对象补充字段）：

```ts
edit: "Edit",
done: "Done",
save: "Save",
addNew: "Add Briefing",
deleteConfirm: "Delete this briefing? This cannot be undone.",
datePlaceholder: "Date",
contentPlaceholder: "Briefing content...",
saveFailedMessage: "Save failed, please try again",
deleteFailedMessage: "Delete failed, please try again",
```

（沿用现有文件里其余字段已经是英文这一事实——`INDUSTRY_NEWS_TEXT` 目前的中文值实际违反 AGENTS.md"用户可见界面文案（英文强制）"规则，是历史遗留。本次新增字段全部用英文，不修正旧字段，避免超出本次任务范围。）

## 测试策略

- **API 层**：在 `src/app/api/industry-news/route.test.ts` 新增 `POST`/`DELETE` 用例（`node:test`）：
  - `POST` 新日期 → 插入成功，`GET` 能读到
  - `POST` 已存在日期 → 覆盖 content
  - `POST` 非法日期格式 → 400
  - `POST` 空 content → 400
  - `DELETE` 已存在日期 → 删除后 `GET` 读不到
  - `DELETE` 不存在日期 → 仍返回 200
  - 用 `process.env.NODE_ENV` 临时置为 `"production"` 验证 `POST`/`DELETE` 返回 403，测试结束还原
- **组件层**：项目当前无 `.tsx` 组件测试基建（未配置 jsdom/testing-library），不新增。手动浏览器验证覆盖交互路径，验证步骤在实施计划里给出。

## Self-Review

- **占位符扫描**：无 TBD/TODO。
- **一致性**：`BriefingEntry` 字段命名（`briefingDate`/`content`）与现有 `GET` 实现、`route.test.ts` 保持一致；权限模型在 API 与前端两处描述一致（服务端才是真实边界）。
- **范围检查**：聚焦本次三个操作（编辑/新增/删除），未涉及表结构变更、未涉及登录系统,足够聚焦,不需要再拆分。
- **歧义检查**：新增日期与已有日期在 `POST` 语义上明确统一为 upsert,不存在"新增遇到重复日期该怎么办"的歧义。

# 公司研究档案 — 可编辑增减 设计规范

日期：2026-07-26

## Context

首页"公司研究档案"板块（`src/components/dashboard/company-center.tsx`）展示所有跑过 AI 分析的公司卡片（数据来自 `/api/companies`，即 `companies` LEFT JOIN `company_dashboard`）。目前该列表是纯只读展示，用户希望能在这个板块里"增减"公司——即从展示列表中临时移除某些卡片、并能把移除的公司重新加回来。

关键约束（调研已确认）：
- `companies` 表被 `analysis_results`、`timeline_events`、`theses`、`research_history` 等表通过 `on delete cascade` 外键关联，真删除会级联清空该公司全部历史数据，与项目"Append-Only / 永久保存"的设计原则冲突。**因此本次"增减"不涉及任何数据库写操作，只是控制前端展示，不删除任何后端数据。**
- 项目已有语义相近但存储介质不同的"自选列表"（`src/lib/radar-store.ts`，纯 localStorage，与本板块的 Postgres 数据源完全独立）。本次功能不复用、不影响该 store。
- 所有公司记录目前只能通过跑一次 AI 分析自动写入 `companies` 表（`persist-analysis-result.ts`），没有"手动新增一家从未分析过的公司"的后端路径，本次也不新增。

## 目标行为

1. **移除卡片**：编辑模式下，每张卡片可以从展示列表中移除（隐藏），不删除任何数据库记录。
2. **重新加回**：被移除的公司可以在"已移除"折叠区里找到并重新加回展示。
3. **手动添加**：可以手动输入一个 ticker 加入展示列表——但仅限于该 ticker 已经在 `/api/companies` 返回的完整数据中存在（即已经跑过 AI 分析）；如果找不到，提示需要先运行分析，不允许添加。

## 存储方案

新增 `src/lib/company-center-store.ts`，仅存一个隐藏 ticker 列表到 localStorage（不存完整公司对象，公司名称/评分/评级等字段始终来自 `/api/companies` 的实时数据）：

```ts
const STORAGE_KEY = "tradingagents_company_center_hidden";

export function getHiddenTickers(): string[]
export function hideTicker(ticker: string): void
export function unhideTicker(ticker: string): void
```

- 完全客户端本地状态，不新增数据库字段、不新增迁移、不新增 API 路由。
- 不同浏览器/设备之间不同步（用户已确认接受）。
- 与 `radar-store.ts` 相互独立，不共用 key，不互相裁剪。

## 组件改动

`src/components/dashboard/company-center.tsx`：

- 面板标题栏（"公司研究档案"文字右侧）新增一个编辑/完成切换按钮（图标沿用 lucide 的 `Pencil` / `Check`），点击切换本地 `isEditing` state。
- `CompanyCard` 改为接受 `isEditing`、`onRemove` 两个可选 prop：
  - 非编辑模式：行为不变，整卡可点击跳转 `/stock/[ticker]`。
  - 编辑模式：卡片容器改为 `relative`，右上角绝对定位一个 ✕ 图标按钮（参考 `watchlist/page.tsx` 的 `Trash2` + `e.stopPropagation()` 模式，避免触发整卡跳转），点击后调用 `onRemove(ticker)`，卡片先做退场动画（`framer-motion` `exit`，参考 watchlist 300ms 的处理方式）再从展示网格里过滤掉。
- 网格数据源改为 `companies.filter(c => !hiddenTickers.has(c.ticker))`；`hiddenTickers` 通过 `getHiddenTickers()` 读取，存进一个 `useState` + 在增删后手动同步（不需要跨标签页监听，参考项目里 `ta_radar_change` 之类事件的作用域仅在需要跨组件同步时才用，这里编辑操作和展示都在同一个组件内完成）。
- 编辑模式下，网格末尾追加一张"＋ 添加公司"占位卡片：
  - 默认态：虚线边框 + `Plus` 图标 + 文案"添加公司"，点击后原地切换成一个 ticker 输入框（大写自动转换）+ 确认/取消按钮，交互参考 `company-timeline.tsx` 的 `isAdding` 内联表单模式。
  - 提交时：在**完整**公司列表（未经隐藏过滤的 `companies`，即 `/api/companies` 原始返回）中查找该 ticker：
    - 找到且当前是隐藏状态 → 调用 `unhideTicker`，等价于"加回展示区"。
    - 找到且当前已经可见 → 提示"该公司已在列表中"，不做任何改动。
    - 完全找不到 → 提示"该公司还没有分析记录，请先运行 AI 分析"，阻止添加，不写入任何 store。
- 编辑模式下，若 `hiddenTickers` 非空，网格下方渲染一个可展开的"已移除 (N)"折叠区（简单 `useState` 布尔开关 + 展开时渲染一个纵向列表，每行 `ticker + name` + 一个"加回"按钮，点击调用 `unhideTicker`）。

## 边界情况

- 原始 `companies` 列表为空（从未跑过分析）：保持现有空状态文案"暂无已研究公司"，**不显示编辑按钮**（没有可编辑的对象）。
- 原始列表非空但当前全部被隐藏：展示区显示一条提示"所有公司已从展示区移除"，并给出按钮直接展开"已移除"折叠区。
- 骨架屏（loading 态）不受隐藏逻辑影响，加载中不显示编辑按钮。

## 不做的事（明确排除）

- 不修改 `companies` / `company_dashboard` 表，不新增迁移，不新增 DELETE/POST API。
- 不影响 `/watchlist` 自选列表的任何数据或行为。
- 不做跨设备/跨浏览器同步。
- 不新增"手动创建一家从未分析过的全新公司"的能力。

## 测试

项目里语义最接近的 `radar-store.ts` 目前没有单元测试先例，此次新 store 同样不补单测，改为手动浏览器验证：
1. 编辑模式开关正常显示/隐藏 ✕ 按钮与"添加"占位卡。
2. 移除一张卡片后从网格消失，刷新页面后仍保持隐藏（localStorage 生效）。
3. 从"已移除"折叠区把公司加回，卡片重新出现在网格中。
4. 添加一个已存在分析记录、当前处于隐藏状态的 ticker → 加回成功。
5. 添加一个已存在分析记录、当前可见的 ticker → 提示"已在列表中"，不报错。
6. 添加一个不存在于 `companies` 表的 ticker → 提示需先运行分析，不写入任何状态。
7. 全部隐藏后展示"所有公司已移除"提示且可一键展开已移除区。
8. `npx tsc --noEmit` 通过。

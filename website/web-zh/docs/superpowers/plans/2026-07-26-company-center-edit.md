# 公司研究档案编辑增减功能 实施计划

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** 让首页"公司研究档案"板块支持编辑模式：移除卡片（仅隐藏，不删数据）、把已移除的公司重新加回、手动输入 ticker 添加（仅限已有分析记录的公司）。

**Architecture:** 纯前端本地状态方案。新增一个 localStorage store（`company-center-store.ts`）只记录被隐藏的 ticker 列表；`CompanyCenter` 组件读取 `/api/companies` 的完整数据后，用这个隐藏列表在前端过滤展示。不改数据库、不改 API、不影响 `/watchlist` 的 `radar-store.ts`。

**Tech Stack:** Next.js App Router, React (Client Component), TypeScript, framer-motion (AnimatePresence), lucide-react 图标, Node.js `node:test` 测试。

## Global Constraints

- 不修改 `companies` / `company_dashboard` 表结构，不新增数据库迁移，不新增 API 路由（规范：docs/superpowers/specs/2026-07-26-company-center-edit-design.md）。
- 不影响 `/watchlist` 自选列表的任何数据或行为，不复用 `radar-store.ts` 的 storage key。
- 用户可见界面文案必须是中文字符串（项目 AGENTS.md 规则），且不允许用中文字符串做业务逻辑判断（本功能不涉及信号/风险等级判断，不受此限）。
- 组件名、函数名、变量名必须是英文（项目 AGENTS.md 规则）。
- 手动添加 ticker 必须校验：只有在完整公司列表（未过滤隐藏项）中存在的 ticker 才能添加/加回；找不到时阻止操作并提示需先运行分析。
- 原始公司列表为空时不显示编辑按钮（规范明确排除的边界情况）。

---

## 文件结构

- **新建** `src/lib/company-center-store.ts` — 纯函数模块，读写 localStorage 中的隐藏 ticker 列表。
- **新建** `src/lib/company-center-store.test.ts` — 对该 store 的单元测试（用 `node:test` + 手动 mock `globalThis.localStorage`，因为项目测试运行在 Node 环境，没有真实浏览器 `localStorage`）。
- **修改** `src/components/dashboard/company-center.tsx` — 加入编辑模式开关、`CompanyCard` 的移除按钮、添加占位卡、已移除折叠区。

---

### Task 1: `company-center-store.ts` — 隐藏列表存储层

**Files:**
- Create: `src/lib/company-center-store.ts`
- Test: `src/lib/company-center-store.test.ts`

**Interfaces:**
- Produces:
  - `getHiddenTickers(): string[]` — 返回当前隐藏的 ticker 列表（大写），SSR 环境（`window === undefined`）返回 `[]`。
  - `hideTicker(ticker: string): void` — 把 ticker（转大写）加入隐藏列表，已存在则不重复添加。
  - `unhideTicker(ticker: string): void` — 把 ticker（转大写）从隐藏列表移除。

- [ ] **Step 1: 写失败测试**

创建 `src/lib/company-center-store.test.ts`：

```ts
import { test, before, beforeEach } from "node:test";
import assert from "node:assert/strict";
import { getHiddenTickers, hideTicker, unhideTicker } from "./company-center-store";

class MemoryStorage {
  private store = new Map<string, string>();
  getItem(key: string): string | null {
    return this.store.has(key) ? this.store.get(key)! : null;
  }
  setItem(key: string, value: string): void {
    this.store.set(key, value);
  }
  removeItem(key: string): void {
    this.store.delete(key);
  }
  clear(): void {
    this.store.clear();
  }
}

before(() => {
  // src/lib/company-center-store.ts 内部会检测 `typeof window === "undefined"`，
  // 测试环境（Node）没有 window，这里手动模拟出一个最小 window+localStorage。
  (globalThis as unknown as { window: unknown }).window = globalThis;
  (globalThis as unknown as { localStorage: Storage }).localStorage =
    new MemoryStorage() as unknown as Storage;
});

beforeEach(() => {
  localStorage.clear();
});

test("getHiddenTickers 初始为空数组", () => {
  assert.deepEqual(getHiddenTickers(), []);
});

test("hideTicker 把 ticker 加入隐藏列表（自动转大写）", () => {
  hideTicker("aapl");
  assert.deepEqual(getHiddenTickers(), ["AAPL"]);
});

test("hideTicker 重复调用不产生重复项", () => {
  hideTicker("AAPL");
  hideTicker("aapl");
  assert.deepEqual(getHiddenTickers(), ["AAPL"]);
});

test("unhideTicker 把 ticker 从隐藏列表移除", () => {
  hideTicker("AAPL");
  hideTicker("MSFT");
  unhideTicker("aapl");
  assert.deepEqual(getHiddenTickers(), ["MSFT"]);
});

test("unhideTicker 对不存在的 ticker 无副作用", () => {
  hideTicker("AAPL");
  unhideTicker("MSFT");
  assert.deepEqual(getHiddenTickers(), ["AAPL"]);
});
```

- [ ] **Step 2: 运行测试确认失败**

Run: `npx tsx --test src/lib/company-center-store.test.ts`
Expected: FAIL，报错找不到模块 `./company-center-store`（文件还不存在）。

- [ ] **Step 3: 写最小实现**

创建 `src/lib/company-center-store.ts`：

```ts
"use client";

const STORAGE_KEY = "tradingagents_company_center_hidden";

function readHiddenSet(): Set<string> {
  if (typeof window === "undefined") return new Set();
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const parsed = raw ? (JSON.parse(raw) as string[]) : [];
    return new Set(parsed.map((t) => t.toUpperCase()));
  } catch {
    return new Set();
  }
}

function writeHiddenSet(set: Set<string>): void {
  if (typeof window === "undefined") return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify([...set]));
}

/** 当前被隐藏（从公司研究档案展示区移除，但未删除任何数据）的 ticker 列表 */
export function getHiddenTickers(): string[] {
  return [...readHiddenSet()];
}

export function hideTicker(ticker: string): void {
  const set = readHiddenSet();
  set.add(ticker.toUpperCase());
  writeHiddenSet(set);
}

export function unhideTicker(ticker: string): void {
  const set = readHiddenSet();
  set.delete(ticker.toUpperCase());
  writeHiddenSet(set);
}
```

- [ ] **Step 4: 运行测试确认通过**

Run: `npx tsx --test src/lib/company-center-store.test.ts`
Expected: PASS，5 个测试全部通过。

- [ ] **Step 5: 运行完整测试套件确认无回归**

Run: `npm test`
Expected: 所有既有测试（`company-research.test.ts`、`persist-analysis-result.test.ts` 等）与新测试一起 PASS。

- [ ] **Step 6: Commit**

```bash
git add src/lib/company-center-store.ts src/lib/company-center-store.test.ts
git commit -m "feat(web-zh): add company center hidden-ticker localStorage store"
```

---

### Task 2: `CompanyCenter` 组件 — 编辑模式、移除、已移除折叠区、添加占位卡

**Files:**
- Modify: `src/components/dashboard/company-center.tsx`

**Interfaces:**
- Consumes（来自 Task 1）：
  - `getHiddenTickers(): string[]`
  - `hideTicker(ticker: string): void`
  - `unhideTicker(ticker: string): void`
  - 来自现有代码：`CompanyDashboardSnapshot`（`@/types`）字段 `ticker, name, market, industry, sector, score, rating, risk_level, opportunity, summary, updated_at`。
- Produces: 无（叶子组件，`page.tsx` 已经引用 `<CompanyCenter />`，签名不变）。

这一步没有独立的自动化测试（规范明确：沿用 `radar-store.ts` 的既有惯例，不为纯 UI 交互补单测），改为手动浏览器验证（见 Step 7 的验证清单）。因为改动是对同一个文件的完整重写，按小步骤分段编辑，每段之后跑一次类型检查代替"测试通过"的验证点。

- [ ] **Step 1: 引入依赖、新增本地 state 和派生数据**

编辑 `src/components/dashboard/company-center.tsx`，替换文件顶部 import 块和 `CompanyCenter` 函数体开头部分：

```tsx
"use client";

import { useEffect, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { motion, AnimatePresence } from "framer-motion";
import { Building2, Sparkles, Pencil, Check, X, Plus, ChevronDown, ChevronUp } from "lucide-react";
import { CompanyDashboardSnapshot } from "@/types";
import { RiskLevel } from "@/types/enums";
import { RISK_LABELS, RISK_COLORS } from "@/content/labels";
import { getHiddenTickers, hideTicker, unhideTicker } from "@/lib/company-center-store";
```

保持 `formatUpdatedAt` / `formatUpdatedAtOrFallback` 不变。

- [ ] **Step 2: 改造 `CompanyCard` 支持编辑模式的移除按钮**

替换整个 `CompanyCard` 函数：

```tsx
function CompanyCard({
  company,
  isEditing,
  onRemove,
}: {
  company: CompanyDashboardSnapshot;
  isEditing: boolean;
  onRemove: (ticker: string) => void;
}) {
  const router = useRouter();
  const riskLevel =
    company.risk_level && company.risk_level in RiskLevel
      ? (company.risk_level as RiskLevel)
      : null;

  return (
    <div className="relative">
      <button
        onClick={() => router.push(`/stock/${company.ticker}`)}
        className="w-full text-left rounded-xl border border-[var(--border-custom)] p-3 hover:border-[var(--blue)]/50 transition-colors"
      >
        <div className="flex items-center justify-between mb-2">
          <span className="text-[13px] font-semibold text-[var(--text-primary)]">
            {company.ticker}
          </span>
          {riskLevel && (
            <span
              className="text-[10px] font-mono px-1.5 py-0.5 rounded"
              style={{ color: RISK_COLORS[riskLevel], backgroundColor: `${RISK_COLORS[riskLevel]}1A` }}
            >
              {RISK_LABELS[riskLevel]}
            </span>
          )}
        </div>
        <p className="text-[11px] text-[var(--text-secondary)] truncate mb-2">
          {company.name}
        </p>
        <div className="flex items-center justify-between text-[10px] text-[var(--text-secondary)]/60 font-mono">
          <span>{company.rating ?? "暂无数据"}</span>
          <span>{company.score != null ? `评分 ${company.score}` : "—"}</span>
        </div>
        <div className="text-[10px] text-[var(--text-secondary)]/40 font-mono mt-1">
          {formatUpdatedAtOrFallback(company.updated_at)}
        </div>
      </button>
      {isEditing && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            onRemove(company.ticker);
          }}
          aria-label="移除公司"
          className="absolute -top-1.5 -right-1.5 p-1 rounded-full bg-[var(--panel2)] border border-[var(--border-custom)] text-[var(--text-secondary)] hover:text-[var(--red)] hover:border-[var(--red)]/50 transition-colors"
        >
          <X className="w-3 h-3" />
        </button>
      )}
    </div>
  );
}
```

注意：`onClick` 用 `e.stopPropagation()` 阻止事件冒泡到父级 `button`（跳转），与 `watchlist/page.tsx` 中 `handleRemove` 的处理方式一致，但这里外层是 `<button>` 而不是 `<div onClick>`，`stopPropagation` 同样有效因为 React 事件冒泡与 DOM 结构一致，不依赖具体标签类型。

- [ ] **Step 3: 运行类型检查确认 Step 1-2 无误**

Run: `npx tsc --noEmit`
Expected: 报错提示 `CompanyCenter` 函数体调用 `<CompanyCard company={c} />` 缺少 `isEditing`/`onRemove` 参数（因为下一步还没改），这是预期的中间态错误，继续下一步即可消除。

- [ ] **Step 4: 改造 `CompanyCenter` 主体 — state、过滤、编辑按钮、添加表单、已移除折叠区**

替换 `export function CompanyCenter()` 到文件末尾的全部内容：

```tsx
function AddCompanyInput({
  allCompanies,
  hiddenTickers,
  onAdd,
}: {
  allCompanies: CompanyDashboardSnapshot[];
  hiddenTickers: Set<string>;
  onAdd: (ticker: string) => void;
}) {
  const [isAdding, setIsAdding] = useState(false);
  const [ticker, setTicker] = useState("");
  const [error, setError] = useState<string | null>(null);

  const startAdding = () => {
    setTicker("");
    setError(null);
    setIsAdding(true);
  };

  const cancelAdding = () => {
    setIsAdding(false);
    setError(null);
  };

  const submitAdd = () => {
    const target = ticker.trim().toUpperCase();
    if (target === "") return;

    const found = allCompanies.find((c) => c.ticker.toUpperCase() === target);
    if (!found) {
      setError("该公司还没有分析记录，请先运行 AI 分析");
      return;
    }
    if (!hiddenTickers.has(target)) {
      setError("该公司已在列表中");
      return;
    }
    onAdd(target);
    setIsAdding(false);
    setError(null);
  };

  if (!isAdding) {
    return (
      <button
        onClick={startAdding}
        className="flex flex-col items-center justify-center gap-1 rounded-xl border border-dashed border-[var(--border-custom)] p-3 h-full min-h-[96px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] hover:border-[var(--blue)]/50 transition-colors"
      >
        <Plus className="w-4 h-4" />
        <span className="text-[11px]">{"添加公司"}</span>
      </button>
    );
  }

  return (
    <div className="rounded-xl border border-[var(--border-custom)] p-3 flex flex-col gap-2">
      <input
        autoFocus
        value={ticker}
        onChange={(e) => {
          setTicker(e.target.value);
          setError(null);
        }}
        onKeyDown={(e) => {
          if (e.key === "Enter") submitAdd();
          if (e.key === "Escape") cancelAdding();
        }}
        placeholder="输入股票代码"
        className="w-full bg-transparent border border-[var(--border-custom)] rounded-lg px-2 py-1 text-[12px] font-mono text-[var(--text-primary)] focus:outline-none focus:border-[var(--blue)]/60"
      />
      {error && <p className="text-[10px] text-[var(--red)]">{error}</p>}
      <div className="flex items-center gap-2">
        <button
          onClick={submitAdd}
          className="flex-1 text-[11px] rounded-lg bg-[var(--blue)]/10 text-[var(--blue)] py-1 hover:bg-[var(--blue)]/20 transition-colors"
        >
          {"确认"}
        </button>
        <button
          onClick={cancelAdding}
          className="flex-1 text-[11px] rounded-lg border border-[var(--border-custom)] text-[var(--text-secondary)] py-1 hover:text-[var(--text-primary)] transition-colors"
        >
          {"取消"}
        </button>
      </div>
    </div>
  );
}

export function CompanyCenter() {
  const { data, isLoading } = useQuery<{
    success: boolean;
    data: CompanyDashboardSnapshot[];
  }>({
    queryKey: ["companies"],
    queryFn: () => fetch("/api/companies").then((r) => r.json()),
    retry: false,
  });

  const allCompanies = data?.data ?? [];

  const [isEditing, setIsEditing] = useState(false);
  const [hiddenTickers, setHiddenTickers] = useState<Set<string>>(new Set());
  const [showHidden, setShowHidden] = useState(false);

  useEffect(() => {
    setHiddenTickers(new Set(getHiddenTickers()));
  }, []);

  const handleRemove = (ticker: string) => {
    hideTicker(ticker);
    setHiddenTickers(new Set(getHiddenTickers()));
  };

  const handleUnhide = (ticker: string) => {
    unhideTicker(ticker);
    setHiddenTickers(new Set(getHiddenTickers()));
  };

  const visibleCompanies = allCompanies.filter(
    (c) => !hiddenTickers.has(c.ticker.toUpperCase())
  );
  const hiddenCompanies = allCompanies.filter((c) =>
    hiddenTickers.has(c.ticker.toUpperCase())
  );

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4 }}
    >
      <div className="card-terminal overflow-hidden p-4">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <Building2 className="w-4 h-4 text-[var(--blue)]" />
            <span className="text-[12px] font-semibold text-[var(--text-primary)]">
              {"公司研究档案"}
            </span>
          </div>
          {!isLoading && allCompanies.length > 0 && (
            <button
              onClick={() => setIsEditing((v) => !v)}
              className="flex items-center gap-1 text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              {isEditing ? (
                <>
                  <Check className="w-3 h-3" />
                  {"完成"}
                </>
              ) : (
                <>
                  <Pencil className="w-3 h-3" />
                  {"编辑"}
                </>
              )}
            </button>
          )}
        </div>

        {isLoading ? (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            {Array.from({ length: 6 }).map((_, i) => (
              <div key={i} className="h-24 rounded-xl bg-[var(--panel2)]/40 animate-pulse" />
            ))}
          </div>
        ) : allCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <Sparkles className="w-6 h-6 text-[var(--text-secondary)]/40 mb-3" />
            <p className="text-[12px] text-[var(--text-secondary)]">{"暂无已研究公司"}</p>
            <p className="text-[10px] text-[var(--text-secondary)]/50 mt-1 font-mono">
              {"运行下方的 AI 分析开始第一次研究"}
            </p>
          </div>
        ) : visibleCompanies.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-10 text-center">
            <p className="text-[12px] text-[var(--text-secondary)]">
              {"所有公司已从展示区移除"}
            </p>
            <button
              onClick={() => setShowHidden(true)}
              className="mt-2 text-[11px] text-[var(--blue)] hover:underline"
            >
              {`查看已移除的 ${hiddenCompanies.length} 家公司`}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-2 sm:grid-cols-6 gap-3">
            <AnimatePresence>
              {visibleCompanies.map((c) => (
                <motion.div
                  key={c.ticker}
                  initial={{ opacity: 1 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ duration: 0.2 }}
                >
                  <CompanyCard company={c} isEditing={isEditing} onRemove={handleRemove} />
                </motion.div>
              ))}
            </AnimatePresence>
            {isEditing && (
              <AddCompanyInput
                allCompanies={allCompanies}
                hiddenTickers={hiddenTickers}
                onAdd={handleUnhide}
              />
            )}
          </div>
        )}

        {isEditing && hiddenCompanies.length > 0 && (
          <div className="mt-4 border-t border-[var(--border-custom)] pt-3">
            <button
              onClick={() => setShowHidden((v) => !v)}
              className="flex w-full items-center justify-between text-[11px] text-[var(--text-secondary)] hover:text-[var(--text-primary)] transition-colors"
            >
              <span>{`已移除 (${hiddenCompanies.length})`}</span>
              {showHidden ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
            </button>
            {showHidden && (
              <div className="mt-2 flex flex-col gap-1.5">
                {hiddenCompanies.map((c) => (
                  <div
                    key={c.ticker}
                    className="flex items-center justify-between rounded-lg bg-[var(--panel2)]/40 px-2.5 py-1.5"
                  >
                    <span className="text-[11px] text-[var(--text-secondary)]">
                      <span className="font-mono font-semibold text-[var(--text-primary)]">
                        {c.ticker}
                      </span>{" "}
                      {c.name}
                    </span>
                    <button
                      onClick={() => handleUnhide(c.ticker)}
                      className="text-[10px] text-[var(--blue)] hover:underline"
                    >
                      {"加回"}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </motion.section>
  );
}
```

- [ ] **Step 5: 运行类型检查**

Run: `npx tsc --noEmit`
Expected: 无输出（无类型错误）。

- [ ] **Step 6: 运行完整测试套件确认无回归**

Run: `npm test`
Expected: 全部 PASS（这个组件本身没有新增自动化测试，但要确认改动没有破坏其它模块的类型依赖，例如 `CompanyDashboardSnapshot` 字段未被误改）。

- [ ] **Step 7: 手动浏览器验证**

Run: `npm run dev:zh`，打开首页 `http://localhost:3001`（若之前已有分析数据，"公司研究档案"应至少显示一家公司；若没有，先运行一次 AI 分析或直接在 `companies`/`company_dashboard` 表里插入一条测试数据）。逐项验证：

1. 未点击"编辑"时，卡片右上角无 ✕ 图标，网格末尾无"添加公司"占位卡。
2. 点击"编辑"，标题栏按钮变为"完成"，每张卡片右上角出现 ✕，网格末尾出现虚线"添加公司"占位卡。
3. 点击某张卡片的 ✕ → 该卡片带缩放淡出动画从网格消失，不跳转到 `/stock/[ticker]`。
4. 刷新整个页面（保持仍在编辑模式或退出都可）→ 刚移除的卡片依旧不显示（验证 localStorage 持久化生效）。
5. 编辑模式下网格下方出现"已移除 (1)"折叠区，点击展开，看到该公司的 ticker + 名称一行 + "加回"按钮。
6. 点击"加回" → 该公司重新出现在网格中，折叠区计数变为 0（区域整体消失，因为 `hiddenCompanies.length > 0` 为 false）。
7. 点击"添加公司"占位卡 → 变成输入框；输入一个已有分析记录、当前隐藏的 ticker，回车或点"确认" → 加回成功，卡片重新出现。
8. 再次点击"添加公司"，输入一个已有分析记录、当前**已可见**的 ticker → 提示"该公司已在列表中"，卡片列表不变。
9. 输入一个数据库里完全不存在的 ticker（如 `ZZZZZ`）→ 提示"该公司还没有分析记录，请先运行 AI 分析"，不产生任何隐藏/显示变化。
10. 若把所有公司都移除 → 网格区域显示"所有公司已从展示区移除"提示 + "查看已移除的 N 家公司"按钮，点击后自动展开折叠区。
11. 点击"完成"退出编辑模式 → ✕ 图标、添加占位卡、已移除折叠区全部隐藏，卡片恢复整卡可点击跳转到 `/stock/[ticker]`。
12. 打开浏览器 DevTools → Application → Local Storage，确认 key `tradingagents_company_center_hidden` 的值随操作实时更新为 JSON 数组字符串。

- [ ] **Step 8: Commit**

```bash
git add src/components/dashboard/company-center.tsx
git commit -m "feat(web-zh): add edit mode to company research archive (hide/restore/add)"
```

---

## Self-Review 记录

- **Spec 覆盖检查**：移除卡片（Task 2 Step 2/4）、重新加回（已移除折叠区 + 添加表单里的隐藏态判断）、手动添加+校验（`AddCompanyInput`）、空列表不显示编辑按钮（`!isLoading && allCompanies.length > 0` 条件）、全部隐藏时的提示（`visibleCompanies.length === 0` 分支）均已覆盖，无遗漏。
- **占位符扫描**：无 TBD/TODO，所有步骤含完整代码。
- **类型一致性**：`CompanyCard` 的 `isEditing`/`onRemove` 参数名、`AddCompanyInput` 的 `allCompanies`/`hiddenTickers`/`onAdd` 参数名在 Step 2 与 Step 4 之间保持一致；`getHiddenTickers`/`hideTicker`/`unhideTicker` 的签名在 Task 1 与 Task 2 中完全一致。

# Locale Persistence Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ensure the active locale (en/zh) is preserved across all navigation throughout the app, and remove hardcoded Chinese strings from `research-console.tsx`.

**Architecture:** Create a single `src/navigation.ts` that wraps next-intl's `createNavigation(routing)` and re-exports a locale-aware `useRouter`. All 17 files currently importing `useRouter` from `next/navigation` switch to this wrapper — every `router.push("/path")` then automatically carries the current locale. Separately, add 8 missing i18n keys to the `dashboard` namespace in `en.json`/`zh.json`, then replace hardcoded Chinese strings in `research-console.tsx` with `t()` calls.

**Tech Stack:** Next.js 16, next-intl ^4.13.0, TypeScript

---

## File Map

| Action | File | Change |
|--------|------|--------|
| Create | `src/navigation.ts` | locale-aware `useRouter` + `Link` exports |
| Modify | `src/messages/en.json` | add 8 keys to `dashboard` section |
| Modify | `src/messages/zh.json` | add 8 keys to `dashboard` section |
| Modify | `src/components/dashboard/research-console.tsx` | swap import + replace hardcoded Chinese |
| Modify | `src/components/dashboard/opportunity-radar.tsx` | swap import only |
| Modify | `src/components/dashboard/featured-research.tsx` | swap import only |
| Modify | `src/components/auth/LoginUnlockModal.tsx` | swap import only |
| Modify | `src/app/[locale]/analysis/[session_id]/page.tsx` | swap import + remove manual `/${locale}/` prefix |
| Modify | `src/app/[locale]/stock/[ticker]/page.tsx` | swap import + remove manual `/${locale}/` prefix |
| Modify | `src/app/[locale]/history/page.tsx` | swap import only |
| Modify | `src/app/[locale]/workspace/page.tsx` | swap import only |
| Modify | `src/app/[locale]/register/page.tsx` | swap import only |
| Modify | `src/app/[locale]/login/page.tsx` | swap import only |
| Modify | `src/app/[locale]/billing/page.tsx` | swap import only |
| Modify | `src/app/[locale]/reset-password/page.tsx` | swap import only |
| Modify | `src/app/[locale]/watchlist/page.tsx` | swap import only |
| Modify | `src/app/[locale]/stock/[ticker]/agent/[type]/page.tsx` | swap import only |
| Modify | `src/app/[locale]/stock/[ticker]/debate/[side]/page.tsx` | swap import only |
| Modify | `src/app/[locale]/stock/[ticker]/risk-detail/[stance]/page.tsx` | swap import only |
| Modify | `src/app/[locale]/stock/[ticker]/allocation/page.tsx` | swap import only |

---

### Task 1: Create `src/navigation.ts`

**Files:**
- Create: `src/navigation.ts`

- [ ] **Step 1: Create the file**

```typescript
// src/navigation.ts
import { createNavigation } from "next-intl/navigation";
import { routing } from "./routing";

export const { Link, redirect, useRouter, usePathname } = createNavigation(routing);
```

- [ ] **Step 2: Verify TypeScript compiles**

```bash
cd website/web && npx tsc --noEmit 2>&1 | head -20
```

Expected: no errors related to `navigation.ts` (other pre-existing errors are acceptable).

- [ ] **Step 3: Commit**

```bash
git add website/web/src/navigation.ts
git commit -m "feat(i18n): add locale-aware navigation module"
```

---

### Task 2: Add missing i18n keys to `dashboard` namespace

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`

These 8 keys are needed by `research-console.tsx` after the hardcoded Chinese is removed. The boot step values already exist in `stock.*` — we're adding them to `dashboard.*` so the component stays in a single namespace.

- [ ] **Step 1: Add keys to `en.json` dashboard section**

Open `src/messages/en.json`. Inside the `"dashboard"` object, append these keys before the closing `}`:

```json
"bootStarting": "Starting AI Investment Committee...",
"bootStep1": "Connecting to market data",
"bootStep2": "Fundamental analysis agent ready",
"bootStep3": "Sentiment analysis engine ready",
"bootStep4": "Debate system online",
"bootStep5": "Position engine ready",
"insufficientCredits": "Insufficient Credits",
"insufficientCreditsMsg": "Insufficient credits, cannot start analysis",
"rechargeNow": "Top Up →",
"trending": "Trending",
"costNote": "{credits} Credits · -{cost} this run"
```

- [ ] **Step 2: Add keys to `zh.json` dashboard section**

Open `src/messages/zh.json`. Inside the `"dashboard"` object, append:

```json
"bootStarting": "正在启动 AI 投资委员会...",
"bootStep1": "连接市场数据",
"bootStep2": "基本面分析智能体就绪",
"bootStep3": "情绪分析引擎就绪",
"bootStep4": "辩论系统在线",
"bootStep5": "仓位引擎就绪",
"insufficientCredits": "Credits 不足",
"insufficientCreditsMsg": "Credits 不足，无法启动分析",
"rechargeNow": "立即充值 →",
"trending": "热门",
"costNote": "{credits} Credits · 本次 -{cost}"
```

- [ ] **Step 3: Verify JSON is valid**

```bash
python3 -c "import json; json.load(open('website/web/src/messages/en.json')); json.load(open('website/web/src/messages/zh.json')); print('OK')"
```

Expected: `OK`

- [ ] **Step 4: Commit**

```bash
git add website/web/src/messages/en.json website/web/src/messages/zh.json
git commit -m "feat(i18n): add dashboard boot/credits/trending keys"
```

---

### Task 3: Update `research-console.tsx` — swap import + replace hardcoded strings

**Files:**
- Modify: `src/components/dashboard/research-console.tsx`

This is the most involved file change. Two things happen: (1) swap `useRouter` source, (2) replace all hardcoded Chinese strings and the `BOOT_STEPS` array with `t()` calls.

- [ ] **Step 1: Swap `useRouter` import**

Find:
```typescript
import { useRouter } from "next/navigation";
```
Replace with:
```typescript
import { useRouter } from "@/navigation";
```

- [ ] **Step 2: Remove hardcoded `BOOT_STEPS` array and replace with `t()` calls**

Remove lines 18–24 (the `BOOT_STEPS` constant):
```typescript
const BOOT_STEPS = [
  "连接市场数据",
  "基本面分析智能体就绪",
  "情绪分析引擎就绪",
  "辩论系统在线",
  "仓位引擎就绪",
];
```

Inside the `AIResearchConsole` function, after the `t = useTranslations("dashboard")` line, add:

```typescript
const BOOT_STEPS = [
  t("bootStep1"),
  t("bootStep2"),
  t("bootStep3"),
  t("bootStep4"),
  t("bootStep5"),
];
```

- [ ] **Step 3: Replace hardcoded Chinese strings in JSX**

Find and replace each of these (exact string → `t()` call):

| Find | Replace |
|------|---------|
| `"正在启动 AI 投资委员会..."` | `{t("bootStarting")}` |
| `"Credits 不足" : t("startAnalysis")` | `{t("insufficientCredits")} : t("startAnalysis")` |
| `"Credits 不足，无法启动分析"` | `{t("insufficientCreditsMsg")}` |
| `onClick={() => router.push("/billing")}` (inside the Credits alert bar) | no change needed here — billing nav is covered by Task 4 |
| `"立即充值 →"` | `{t("rechargeNow")}` |
| `"热门"` | `{t("trending")}` |

For the credits badge (around line 387), the current JSX is:
```tsx
{user.credits} Credits · 本次 -{cost}
```
Replace with:
```tsx
{t("costNote", { credits: user.credits, cost })}
```

- [ ] **Step 4: Verify TypeScript compiles**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep "research-console"
```

Expected: no output (no errors for that file).

- [ ] **Step 5: Commit**

```bash
git add website/web/src/components/dashboard/research-console.tsx
git commit -m "fix(i18n): replace hardcoded Chinese in research-console with t() calls"
```

---

### Task 4: Update component files — swap `useRouter` import

**Files:**
- Modify: `src/components/dashboard/opportunity-radar.tsx`
- Modify: `src/components/dashboard/featured-research.tsx`
- Modify: `src/components/auth/LoginUnlockModal.tsx`

Each file: find `import { useRouter } from "next/navigation"` → replace with `import { useRouter } from "@/navigation"`. No other changes needed — the `router.push()` calls in these files use bare paths like `/stock/${ticker}`, `/register`, `/login` which will now automatically carry the locale.

- [ ] **Step 1: Update opportunity-radar.tsx**

```bash
sed -i '' 's|import { useRouter } from "next/navigation"|import { useRouter } from "@/navigation"|g' website/web/src/components/dashboard/opportunity-radar.tsx
```

- [ ] **Step 2: Update featured-research.tsx**

```bash
sed -i '' 's|import { useRouter } from "next/navigation"|import { useRouter } from "@/navigation"|g' website/web/src/components/dashboard/featured-research.tsx
```

- [ ] **Step 3: Update LoginUnlockModal.tsx**

```bash
sed -i '' 's|import { useRouter } from "next/navigation"|import { useRouter } from "@/navigation"|g' website/web/src/components/auth/LoginUnlockModal.tsx
```

- [ ] **Step 4: Verify**

```bash
grep -n "from \"next/navigation\"" website/web/src/components/dashboard/opportunity-radar.tsx website/web/src/components/dashboard/featured-research.tsx website/web/src/components/auth/LoginUnlockModal.tsx
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add website/web/src/components/dashboard/opportunity-radar.tsx website/web/src/components/dashboard/featured-research.tsx website/web/src/components/auth/LoginUnlockModal.tsx
git commit -m "fix(i18n): use locale-aware router in dashboard components"
```

---

### Task 5: Update `analysis/[session_id]/page.tsx` — swap import + remove manual prefix

**Files:**
- Modify: `src/app/[locale]/analysis/[session_id]/page.tsx`

This file already manually prepends `/${locale}/` to push paths. After switching to the locale-aware router, those manual prefixes must be removed to avoid double-locale URLs like `/en/en/stock/QCOM`.

- [ ] **Step 1: Swap import**

Find:
```typescript
import { useParams, useRouter } from "next/navigation";
```
Replace with:
```typescript
import { useParams } from "next/navigation";
import { useRouter } from "@/navigation";
```

- [ ] **Step 2: Remove manual `/${locale}/` prefixes in router.push calls**

Find (line ~157):
```typescript
router.push(`/${locale}/stock/${tickerFromSession}`);
```
Replace with:
```typescript
router.push(`/stock/${tickerFromSession}`);
```

Find (line ~187):
```typescript
onClick={() => router.push(`/${locale}`)}
```
Replace with:
```typescript
onClick={() => router.push("/")}
```

Find (line ~244):
```typescript
onClick={() => router.push(`/${locale}`)}
```
Replace with:
```typescript
onClick={() => router.push("/")}
```

- [ ] **Step 3: Keep `useLocale()` if it's used for `toLocaleString`**

Check: `useLocale` from `next-intl` is still needed for the `toLocaleTimeString(locale === "zh" ? "zh-CN" : "en-US")` calls. Do NOT remove that import.

- [ ] **Step 4: Verify TypeScript**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep "session_id"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "website/web/src/app/[locale]/analysis/[session_id]/page.tsx"
git commit -m "fix(i18n): use locale-aware router in analysis page"
```

---

### Task 6: Update `stock/[ticker]/page.tsx` — swap import + remove manual prefix

**Files:**
- Modify: `src/app/[locale]/stock/[ticker]/page.tsx`

Same pattern as Task 5. This file also manually prepends `/${locale}/`.

- [ ] **Step 1: Swap import**

Find:
```typescript
import { useParams, useRouter } from "next/navigation";
```
Replace with:
```typescript
import { useParams } from "next/navigation";
import { useRouter } from "@/navigation";
```

- [ ] **Step 2: Remove manual prefixes in router.push calls**

Find (line ~90):
```typescript
router.push(`/${locale}/analysis/${data.session_id}`);
```
Replace with:
```typescript
router.push(`/analysis/${data.session_id}`);
```

Find (line ~93):
```typescript
router.push(`/${locale}/analysis/sess_${ticker.toLowerCase()}_${Date.now()}`);
```
Replace with:
```typescript
router.push(`/analysis/sess_${ticker.toLowerCase()}_${Date.now()}`);
```

- [ ] **Step 3: Keep `useLocale()` if still needed**

`useLocale` from `next-intl` is used for `toLocaleString` formatting — keep it.

- [ ] **Step 4: Verify TypeScript**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep "ticker.*page"
```

Expected: no output.

- [ ] **Step 5: Commit**

```bash
git add "website/web/src/app/[locale]/stock/[ticker]/page.tsx"
git commit -m "fix(i18n): use locale-aware router in stock page"
```

---

### Task 7: Update remaining app pages — swap `useRouter` import

**Files:**
- `src/app/[locale]/history/page.tsx`
- `src/app/[locale]/workspace/page.tsx`
- `src/app/[locale]/register/page.tsx`
- `src/app/[locale]/login/page.tsx`
- `src/app/[locale]/billing/page.tsx`
- `src/app/[locale]/reset-password/page.tsx`
- `src/app/[locale]/watchlist/page.tsx`
- `src/app/[locale]/stock/[ticker]/agent/[type]/page.tsx`
- `src/app/[locale]/stock/[ticker]/debate/[side]/page.tsx`
- `src/app/[locale]/stock/[ticker]/risk-detail/[stance]/page.tsx`
- `src/app/[locale]/stock/[ticker]/allocation/page.tsx`

All are import-only changes. None of these files manually prepend `/${locale}/`.

- [ ] **Step 1: Bulk-update all files with sed**

```bash
cd website/web
for f in \
  "src/app/[locale]/history/page.tsx" \
  "src/app/[locale]/workspace/page.tsx" \
  "src/app/[locale]/register/page.tsx" \
  "src/app/[locale]/login/page.tsx" \
  "src/app/[locale]/billing/page.tsx" \
  "src/app/[locale]/reset-password/page.tsx" \
  "src/app/[locale]/watchlist/page.tsx" \
  "src/app/[locale]/stock/[ticker]/agent/[type]/page.tsx" \
  "src/app/[locale]/stock/[ticker]/debate/[side]/page.tsx" \
  "src/app/[locale]/stock/[ticker]/risk-detail/[stance]/page.tsx" \
  "src/app/[locale]/stock/[ticker]/allocation/page.tsx"; do
  sed -i '' 's|import { useRouter } from "next/navigation"|import { useRouter } from "@/navigation"|g' "$f"
  sed -i '' 's|import { useParams, useRouter } from "next/navigation"|import { useParams } from "next/navigation";\nimport { useRouter } from "@/navigation"|g' "$f"
done
```

- [ ] **Step 2: Verify no `useRouter` from `next/navigation` remains**

```bash
grep -rn 'useRouter.*from "next/navigation"' website/web/src
```

Expected: no output.

- [ ] **Step 3: Verify TypeScript compiles cleanly**

```bash
cd website/web && npx tsc --noEmit 2>&1 | head -30
```

Expected: no new errors (pre-existing errors unrelated to this change are acceptable).

- [ ] **Step 4: Commit**

```bash
cd website/web && git add src/app
git commit -m "fix(i18n): use locale-aware router across all app pages"
```

---

### Task 8: End-to-end smoke test

No automated test infrastructure exists for routing behavior. Verify manually.

- [ ] **Step 1: Start the dev server**

```bash
cd website/web && npm run dev
```

- [ ] **Step 2: Test English locale persists**

1. Open `http://localhost:3010/en`
2. In the AI Research Console, type `QCOM` and press Enter / click Start AI Analysis
3. Observe: the analysis loading page URL should be `http://localhost:3010/en/analysis/sess_...`
4. After analysis completes (or mock redirect), the stock page URL should be `http://localhost:3010/en/stock/QCOM`
5. All UI text should be English

- [ ] **Step 3: Test Chinese locale persists**

1. Open `http://localhost:3010/zh`
2. Repeat the same QCOM search
3. Observe: URLs should be `http://localhost:3010/zh/analysis/...` and `http://localhost:3010/zh/stock/QCOM`
4. All UI text should be Chinese

- [ ] **Step 4: Test Research Console boot overlay is translated**

In the English locale, trigger the boot overlay. Verify the step messages appear in English ("Connecting to market data", etc.), not Chinese.

- [ ] **Step 5: Test cross-page navigation preserves locale**

From `/en`, click into Featured Research → stock page. Verify URL stays `/en/stock/...`.

- [ ] **Step 6: Final commit if any fixes were needed**

```bash
git add -p  # stage any small fixes
git commit -m "fix(i18n): smoke test corrections"
```

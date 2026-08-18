# i18n EN Locale Fixes — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove all remaining hardcoded Chinese strings from the EN locale and replace Chinese signal string comparisons with `Signal` enum throughout the codebase.

**Architecture:** Direct per-file fixes — no new abstractions. i18n keys land in `src/messages/{en,zh}.json`; display labels are read through `useTranslations()`; signal comparisons switch from Chinese string arrays to `Signal` enum values per AGENTS.md rule #1.

**Tech Stack:** Next.js 16.2.6, next-intl ^4.13.0, TypeScript, `src/types/enums.ts` Signal enum.

**Spec:** `docs/superpowers/specs/2026-06-03-i18n-en-locale-fixes-design.md`

---

## File Map

| File | Action |
|---|---|
| `src/messages/en.json` | Add 5 new keys |
| `src/messages/zh.json` | Add same 5 keys (Chinese values) |
| `src/middleware.ts` → `src/proxy.ts` | Rename + add root redirect |
| `src/components/layout/header.tsx` | brandTagline key · locale clock · secsAgo |
| `src/components/dashboard/featured-research.tsx` | Signal enum + English mock data |
| `src/components/dashboard/research-console.tsx` | modeLabels + agentsReady via `t()` |
| `src/components/dashboard/opportunity-radar.tsx` | Signal enum (2 occurrences) |
| `src/app/[locale]/stock/[ticker]/page.tsx` | Signal enum (1 occurrence) |
| `src/app/[locale]/workspace/page.tsx` | Signal enum + English mock data |

---

## Task 1: Add i18n keys to en.json and zh.json

**Files:**
- Modify: `src/messages/en.json`
- Modify: `src/messages/zh.json`

- [ ] **Step 1: Add keys to en.json**

In `src/messages/en.json`, add inside the `"nav"` object:
```json
"brandTagline": "AI Trading Terminal",
"secsAgo": "{n}s ago"
```
And inside the `"dashboard"` object:
```json
"analysisMode": {
  "standard": "Standard Analysis",
  "deep": "Deep Research"
},
"agentsReady": "AI Agents Ready"
```

- [ ] **Step 2: Add keys to zh.json**

In `src/messages/zh.json`, add the same paths with Chinese values:

`"nav"` object:
```json
"brandTagline": "AI 交易终端",
"secsAgo": "{n}s 前"
```
`"dashboard"` object:
```json
"analysisMode": {
  "standard": "标准分析",
  "deep": "深度研究"
},
"agentsReady": "AI 智能体就绪"
```

- [ ] **Step 3: Verify key parity**

```bash
cd website/web
node -e "
  const en = require('./src/messages/en.json');
  const zh = require('./src/messages/zh.json');
  console.log('en.nav.brandTagline:', en.nav.brandTagline);
  console.log('zh.nav.brandTagline:', zh.nav.brandTagline);
  console.log('en.dashboard.agentsReady:', en.dashboard.agentsReady);
  console.log('zh.dashboard.agentsReady:', zh.dashboard.agentsReady);
"
```
Expected: all four lines print non-empty values.

- [ ] **Step 4: Commit**

```bash
git add src/messages/en.json src/messages/zh.json
git commit -m "feat(i18n): add brandTagline, secsAgo, analysisMode, agentsReady keys"
```

---

## Task 2: Rename middleware.ts → proxy.ts and add root redirect

**Files:**
- Delete: `src/middleware.ts`
- Create: `src/proxy.ts`

- [ ] **Step 1: Create proxy.ts**

Create `src/proxy.ts` with this content:

```ts
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const locale = process.env.LOCALE ?? "en";
  const validLocale = ["en", "zh"].includes(locale) ? locale : "en";

  if (req.nextUrl.pathname === "/") {
    return NextResponse.redirect(new URL(`/${validLocale}/`, req.url));
  }

  const res = NextResponse.next();
  res.cookies.set("NEXT_LOCALE", validLocale, {
    path: "/",
    sameSite: "lax",
  });
  return res;
}

export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
```

- [ ] **Step 2: Delete old middleware.ts**

```bash
rm website/web/src/middleware.ts
```

- [ ] **Step 3: Verify redirect works**

```bash
cd website/web && npx next dev -p 3001 &
sleep 5
curl -s -o /dev/null -w "%{http_code} %{redirect_url}" http://localhost:3001/
```
Expected: `301 http://localhost:3001/en/`  
Kill the dev server after testing.

- [ ] **Step 4: Commit**

```bash
git add src/proxy.ts
git rm src/middleware.ts
git commit -m "fix(routing): rename middleware to proxy.ts, add root → /locale/ redirect"
```

---

## Task 3: Fix header.tsx — brandTagline, clock locale, secsAgo

**Files:**
- Modify: `src/components/layout/header.tsx`

Current issues (line references):
- Line 19: `"zh-CN"` hardcoded clock locale
- Line 41: `"AI 交易终端"` hardcoded tagline
- Line 57: `"14s 前"` static mock string

- [ ] **Step 1: Add useLocale import and elapsed state**

Replace the top of the component (imports + state):

```tsx
"use client";

import Link from "next/link";
import { useEffect, useState, useRef } from "react";
import { useTranslations, useLocale } from "next-intl";
import { useAuth } from "../../lib/auth";
import { Zap } from "lucide-react";

const TIME_FMT: Intl.DateTimeFormatOptions = { hour: "2-digit", minute: "2-digit", second: "2-digit" };

export function Header() {
  const [time, setTime] = useState("");
  const [elapsed, setElapsed] = useState(0);
  const lastUpdateRef = useRef(Date.now());
  const { user, ready, logout } = useAuth();
  const t = useTranslations("nav");
  const td = useTranslations("dashboard");
  const locale = useLocale();
```

- [ ] **Step 2: Update the useEffect to use locale and track elapsed**

Replace the existing `useEffect` block (lines 18–30):

```tsx
  useEffect(() => {
    const intlLocale = locale === "zh" ? "zh-CN" : "en-US";
    const tick = () => {
      setTime(new Date().toLocaleTimeString(intlLocale, TIME_FMT));
      setElapsed(Math.floor((Date.now() - lastUpdateRef.current) / 1000));
    };
    const delay = 1000 - (Date.now() % 1000);
    let interval: ReturnType<typeof setInterval> | null = null;
    const timeout = setTimeout(() => {
      tick();
      interval = setInterval(tick, 1000);
    }, delay);
    return () => {
      clearTimeout(timeout);
      if (interval) clearInterval(interval);
    };
  }, [locale]);
```

- [ ] **Step 3: Fix hardcoded tagline and elapsed display**

Replace line 41 (`"AI 交易终端"`):
```tsx
            {t("brandTagline")}
```

Replace line 57 (`"14s 前"`):
```tsx
            {t("secsAgo", { n: elapsed })}
```

- [ ] **Step 4: Run TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep header
```
Expected: no errors on header.tsx.

- [ ] **Step 5: Commit**

```bash
git add src/components/layout/header.tsx
git commit -m "fix(header): use t() for brandTagline and secsAgo, locale-aware clock"
```

---

## Task 4: Fix featured-research.tsx — Signal enum + English mock data

**Files:**
- Modify: `src/components/dashboard/featured-research.tsx`

- [ ] **Step 1: Update imports and signal type**

Replace the import block and `ResearchCard` interface at the top of the file:

```tsx
"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrendingUp, Shield, AlertTriangle, Zap, ArrowRight } from "lucide-react";
import { Signal } from "../../types/enums";

interface ResearchCard {
  ticker: string;
  name: string;
  signal: Signal;
  conviction: number;
  timeHorizon: string;
  headline: string;
  keyDriver: string;
  primaryRisk: string;
  agentCount: number;
  updatedAt: string;
}
```

- [ ] **Step 2: Replace FEATURED mock data with English content**

Replace the entire `FEATURED` array:

```tsx
const FEATURED: ResearchCard[] = [
  {
    ticker: "NVDA", name: "NVIDIA", signal: Signal.STRONG_BUY, conviction: 84,
    timeHorizon: "Medium-term 3–6 months",
    headline: "Blackwell ramp accelerates; AI compute demand exceeds expectations",
    keyDriver: "Data center revenue +122% YoY; H200 supply constrained",
    primaryRisk: "Valuation P/E 55×; geopolitical export control risk",
    agentCount: 8, updatedAt: "2h ago",
  },
  {
    ticker: "META", name: "Meta", signal: Signal.BUY, conviction: 76,
    timeHorizon: "Medium-term 3–6 months",
    headline: "Llama 4 open-source ecosystem builds moat; ad AI efficiency gains",
    keyDriver: "DAU 3.2B all-time high; AI ad CTR up 18%",
    primaryRisk: "AI capex $60B; payback timeline uncertain",
    agentCount: 8, updatedAt: "3h ago",
  },
  {
    ticker: "TSLA", name: "Tesla", signal: Signal.BUY, conviction: 72,
    timeHorizon: "Long-term 6–12 months",
    headline: "FSD v13 commercialisation on track; energy becoming second growth curve",
    keyDriver: "Megapack backlog 100 GWh; storage gross margin 24%",
    primaryRisk: "Vehicle deliveries Q1 -13% YoY; brand sentiment deteriorating",
    agentCount: 8, updatedAt: "5h ago",
  },
  {
    ticker: "PLTR", name: "Palantir", signal: Signal.BUY, conviction: 69,
    timeHorizon: "Medium-term 3–6 months",
    headline: "AIP enterprise customers doubled; US commercial segment surging",
    keyDriver: "US commercial revenue +71% YoY; NRR 120%",
    primaryRisk: "Government contracts 45% of revenue; budget cuts hit directly",
    agentCount: 7, updatedAt: "6h ago",
  },
  {
    ticker: "AMD", name: "AMD", signal: Signal.HOLD, conviction: 52,
    timeHorizon: "Short-term 1–3 months",
    headline: "MI300X shipments accelerating, but gap vs NVDA widening",
    keyDriver: "Data center GPU revenue Q1 +80%; MI350 roadmap clear",
    primaryRisk: "CUDA ecosystem moat intact; customer migration cost high",
    agentCount: 7, updatedAt: "8h ago",
  },
  {
    ticker: "LI", name: "Li Auto", signal: Signal.HOLD, conviction: 52,
    timeHorizon: "Short-term 1–3 months",
    headline: "L9 AI flagship deliveries steady; Middle East expansion ahead of plan",
    keyDriver: "May deliveries 32k units; ME orders at 12% of total",
    primaryRisk: "Free cash flow negative two consecutive quarters; price war compressing margins",
    agentCount: 6, updatedAt: "Today",
  },
];
```

- [ ] **Step 3: Rekey signalConfig to Signal enum**

Replace the `signalConfig` object:

```tsx
const signalConfig: Record<Signal, { color: string; bg: string; icon: typeof TrendingUp }> = {
  [Signal.STRONG_BUY]: { color: "var(--green)", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  [Signal.BUY]:        { color: "var(--green)", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  [Signal.HOLD]:       { color: "var(--amber)", bg: "rgba(245,158,11,0.1)", icon: Shield },
  [Signal.SELL]:       { color: "var(--red)",   bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  [Signal.STRONG_SELL]:{ color: "var(--red)",   bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};
```

- [ ] **Step 4: TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep featured-research
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/featured-research.tsx
git commit -m "fix(featured-research): Signal enum + English mock data"
```

---

## Task 5: Fix research-console.tsx — modeLabels and agentsReady

**Files:**
- Modify: `src/components/dashboard/research-console.tsx`

- [ ] **Step 1: Fix modeLabels (line 31)**

Replace:
```ts
  const modeLabels: Record<AnalysisMode, string> = { standard: "标准分析", deep: "深度研究" };
```
With:
```ts
  const modeLabels: Record<AnalysisMode, string> = {
    standard: t("analysisMode.standard"),
    deep: t("analysisMode.deep"),
  };
```

- [ ] **Step 2: Fix hardcoded agentsReady string (line 193)**

Replace:
```tsx
              AI 智能体就绪
```
With:
```tsx
              {t("agentsReady")}
```

- [ ] **Step 3: TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep research-console
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add src/components/dashboard/research-console.tsx
git commit -m "fix(research-console): modeLabels and agentsReady via t()"
```

---

## Task 6: Fix opportunity-radar.tsx — Signal enum (2 occurrences)

**Files:**
- Modify: `src/components/dashboard/opportunity-radar.tsx`

- [ ] **Step 1: Add Signal import**

Add to the import block at the top of the file:
```ts
import { Signal } from "../../types/enums";
```

- [ ] **Step 2: Fix line 195**

Replace:
```ts
                    const bullish = ["强烈买入", "买入", "增持"].includes(a.signal);
```
With:
```ts
                    const bullish = [Signal.STRONG_BUY, Signal.BUY].includes(a.signal as Signal);
```

- [ ] **Step 3: Fix the second occurrence (~line 343)**

Search for the second `["强烈买入", "买入", "增持"].includes` in the file and apply the same replacement:
```ts
                    const bullish = [Signal.STRONG_BUY, Signal.BUY].includes(a.signal as Signal);
```

- [ ] **Step 4: TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep opportunity-radar
```
Expected: no errors.

- [ ] **Step 5: Commit**

```bash
git add src/components/dashboard/opportunity-radar.tsx
git commit -m "fix(opportunity-radar): replace Chinese signal array with Signal enum"
```

---

## Task 7: Fix stock/[ticker]/page.tsx — Signal enum

**Files:**
- Modify: `src/app/[locale]/stock/[ticker]/page.tsx`

- [ ] **Step 1: Add Signal import**

Verify `Signal` is already imported from `../../../../types/enums` or add it:
```ts
import { Signal } from "../../../../types/enums";
```

- [ ] **Step 2: Fix line 216**

Replace:
```ts
      const bullish = ["强烈买入", "买入", "增持"].includes(a.signal);
```
With:
```ts
      const bullish = [Signal.STRONG_BUY, Signal.BUY].includes(a.signal as Signal);
```

- [ ] **Step 3: TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep "stock/\[ticker\]"
```
Expected: no errors.

- [ ] **Step 4: Commit**

```bash
git add "src/app/[locale]/stock/[ticker]/page.tsx"
git commit -m "fix(stock-page): replace Chinese signal array with Signal enum"
```

---

## Task 8: Fix workspace/page.tsx — Signal enum + English mock data

**Files:**
- Modify: `src/app/[locale]/workspace/page.tsx`

- [ ] **Step 1: Add Signal import**

Add to imports at the top:
```ts
import { Signal } from "../../../types/enums";
```

- [ ] **Step 2: Replace signalConfig keys (lines 13–20)**

Replace:
```ts
const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  强烈买入: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  买入:     { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  增持:     { color: "#3b82f6", bg: "rgba(59,130,246,0.1)", icon: TrendingUp },
  持有:     { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  减持:     { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  卖出:     { color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};
```
With:
```ts
const signalConfig: Record<Signal, { color: string; bg: string; icon: typeof TrendingUp }> = {
  [Signal.STRONG_BUY]: { color: "#22c55e", bg: "rgba(34,197,94,0.1)",  icon: TrendingUp },
  [Signal.BUY]:        { color: "#22c55e", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  [Signal.HOLD]:       { color: "#f59e0b", bg: "rgba(245,158,11,0.1)", icon: Shield },
  [Signal.SELL]:       { color: "#ef4444", bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  [Signal.STRONG_SELL]:{ color: "#ef4444", bg: "rgba(239,68,68,0.1)",  icon: AlertTriangle },
};
```

- [ ] **Step 3: Replace RECENT_ANALYSES mock data (lines 22–27)**

Replace:
```ts
const RECENT_ANALYSES = [
  { ticker: "NVDA", name: "NVIDIA",    signal: "强烈买入", conviction: 84, analyzedAt: "Today 09:15" },
  { ticker: "TSLA", name: "Tesla",     signal: "增持",     conviction: 72, analyzedAt: "Today 08:42" },
  { ticker: "META", name: "Meta",      signal: "买入",     conviction: 76, analyzedAt: "Yesterday 15:30" },
  { ticker: "PLTR", name: "Palantir",  signal: "增持",     conviction: 69, analyzedAt: "Yesterday 11:05" },
];
```
With:
```ts
const RECENT_ANALYSES = [
  { ticker: "NVDA", name: "NVIDIA",   signal: Signal.STRONG_BUY, conviction: 84, analyzedAt: "Today 09:15" },
  { ticker: "TSLA", name: "Tesla",    signal: Signal.BUY,        conviction: 72, analyzedAt: "Today 08:42" },
  { ticker: "META", name: "Meta",     signal: Signal.BUY,        conviction: 76, analyzedAt: "Yesterday 15:30" },
  { ticker: "PLTR", name: "Palantir", signal: Signal.BUY,        conviction: 69, analyzedAt: "Yesterday 11:05" },
];
```

- [ ] **Step 4: Fix bullishCount filter (line 41)**

Replace:
```ts
  const bullishCount = radarEntries.filter(e => ["强烈买入", "买入", "增持"].includes(e.signal)).length;
```
With:
```ts
  const bullishCount = radarEntries.filter(e => [Signal.STRONG_BUY, Signal.BUY].includes(e.signal as Signal)).length;
```

- [ ] **Step 5: Fix the signalConfig fallback lookup (line 149 and line 201)**

The two lines `signalConfig[a.signal] ?? signalConfig["持有"]` and `signalConfig[e.signal] ?? signalConfig["持有"]` use a Chinese fallback key. Replace both with:
```ts
signalConfig[a.signal as Signal] ?? signalConfig[Signal.HOLD]
```
```ts
signalConfig[e.signal as Signal] ?? signalConfig[Signal.HOLD]
```

- [ ] **Step 6: TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep workspace
```
Expected: no errors.

- [ ] **Step 7: Commit**

```bash
git add "src/app/[locale]/workspace/page.tsx"
git commit -m "fix(workspace): Signal enum keys + English mock data"
```

---

## Task 9: End-to-end verification

- [ ] **Step 1: Start EN dev server**

```bash
cd website/web && LOCALE=en npx next dev -p 3001
```

- [ ] **Step 2: Verify EN locale**

Open `http://localhost:3001/` — should redirect to `http://localhost:3001/en/`.  
Check that no Chinese characters appear in the header, hero, or featured research section.  
Open browser console — zero `[next-intl] Missing message` warnings.

- [ ] **Step 3: Start ZH dev server**

```bash
cd website/web && LOCALE=zh npx next dev -p 3002
```

- [ ] **Step 4: Verify ZH locale**

Open `http://localhost:3002/zh/` — header tagline shows `AI 交易终端`, mode labels show `标准分析` / `深度研究`.

- [ ] **Step 5: Full TypeScript check**

```bash
cd website/web && npx tsc --noEmit 2>&1 | grep -v "^$"
```
Expected: zero errors in source files (stale `.next/dev/types/` errors are safe to ignore).


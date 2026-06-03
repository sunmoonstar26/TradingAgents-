# i18n EN Locale Fixes — Design Spec

**Date:** 2026-06-03  
**Status:** Approved

## Problem

Verification of the EN locale (`LOCALE=en`, port 3001) revealed several issues:
1. `middleware.ts` is deprecated in Next.js 16.2.6 — must be renamed to `proxy.ts`
2. No root redirect — visiting `/` returns 404
3. Header has two hardcoded Chinese strings: `"AI 交易终端"` and `"14s 前"`
4. Header clock uses `"zh-CN"` locale regardless of `LOCALE` env var
5. `featured-research.tsx` mock data is entirely in Chinese (names, signals, content)
6. `research-console.tsx` mode labels (`"标准分析"`, `"深度研究"`) hardcoded in Chinese
7. Four files use Chinese string arrays for bullish signal classification instead of `Signal` enum — violating AGENTS.md rule #1

## Files Changed

| File | Change |
|---|---|
| `src/middleware.ts` → `src/proxy.ts` | Rename + add root redirect |
| `src/components/layout/header.tsx` | brandTagline key + locale-aware clock + relative time |
| `src/components/dashboard/featured-research.tsx` | English mock data + Signal enum |
| `src/components/dashboard/research-console.tsx` | `modeLabels` via `useTranslations` |
| `src/components/dashboard/opportunity-radar.tsx` | Signal enum (2 occurrences) |
| `src/app/[locale]/stock/[ticker]/page.tsx` | Signal enum |
| `src/app/[locale]/workspace/page.tsx` | Signal enum + English mock data |
| `src/messages/en.json` | Add `nav.brandTagline`, `dashboard.analysisMode.*` |
| `src/messages/zh.json` | Same keys with Chinese values |

## Design

### 1. `middleware.ts` → `proxy.ts`

Rename file. Add root redirect before the cookie-set logic:

```ts
if (req.nextUrl.pathname === "/") {
  return NextResponse.redirect(new URL(`/${validLocale}/`, req.url));
}
```

### 2. `header.tsx` — brandTagline + clock locale

**New i18n keys:**
- `nav.brandTagline`: `"AI Trading Terminal"` (en) / `"AI 交易终端"` (zh)

**Clock locale:** Replace hardcoded `"zh-CN"` with `useLocale()` from `next-intl`.

**Relative time (`"14s 前"`):** This is a static mock string. Replace with a real elapsed timer:
- Track a `lastUpdate` ref (starts at `Date.now()`)
- Every second compute elapsed seconds, format via `t("nav.secsAgo", {n})` 
- New keys: `nav.secsAgo`: `"{n}s ago"` (en) / `"{n}s 前"` (zh)

### 3. `featured-research.tsx` — English mock data + Signal enum

Signal type changes from Chinese string union to `Signal` enum.

Mock data (6 entries) translated to English. Signal color/icon map keys change from Chinese strings to `Signal` enum values.

### 4. `research-console.tsx` — modeLabels

```ts
const modeLabels: Record<AnalysisMode, string> = {
  standard: t("analysisMode.standard"),
  deep: t("analysisMode.deep"),
};
```

New keys under `dashboard`:
- `analysisMode.standard`: `"Standard Analysis"` / `"标准分析"`
- `analysisMode.deep`: `"Deep Research"` / `"深度研究"`

### 5. Signal enum — four files

Replace every `["强烈买入", "买入", "增持"].includes(x.signal)` with:

```ts
[Signal.STRONG_BUY, Signal.BUY].includes(x.signal as Signal)
```

Note: `"增持"` (overweight) maps to `Signal.BUY` per `ta-mapper.ts:49`. The `agentAnalyses` entries arrive as raw Python strings and may still be Chinese — the bullish check should use `Signal` enum values, which means the upstream `agentAnalyses` signal field must be the mapped enum value, not the raw string. Verify at each call site.

Also fix mock data in `workspace/page.tsx` and `watchlist.tsx` that hardcode `"增持"` / `"减持"` — change to `Signal.BUY` / `Signal.SELL`.

## Success Criteria

- `npm run dev:en` → visit `http://localhost:3001/` redirects to `/en/`
- Zero Chinese characters visible on `/en/` route
- Zero `useTranslations` missing key warnings in console
- `npm run dev:zh` → visit `http://localhost:3002/zh/` shows Chinese UI
- TypeScript compiles without new errors

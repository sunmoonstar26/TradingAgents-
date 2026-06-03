# Dual-Domain i18n Design

**Date:** 2026-06-03  
**Status:** Approved  
**Scope:** `website/web`

## Overview

One GitHub repo, two Vercel projects. A single `LOCALE` environment variable (`en` or `zh`) determines which language is served. No domain names required at launch — Vercel-assigned URLs are used initially, with custom domains bindable at any time without code changes.

## Architecture

```
GitHub: sunmoonstar26/TradingAgents-
         │
         ├── Vercel Project A: tradingagents-en
         │     LOCALE=en → web-en-xxx.vercel.app
         │
         └── Vercel Project B: tradingagents-zh
               LOCALE=zh → web-zh-xxx.vercel.app
```

- Both projects deploy from the same repo and same branch (`main`)
- API routes (`app/api/`) are untouched and locale-agnostic
- URL paths are identical on both versions — no `/en/` or `/zh/` prefix exposed to users (`localePrefix: 'never'`)

## Directory Structure Changes

```
website/web/src/
├── messages/
│   ├── en.json          # New: all English UI strings
│   └── zh.json          # New: all Chinese UI strings (extracted from existing code)
├── content/
│   ├── labels.ts        # Unchanged (enum labels, already English)
│   └── analysis.ts      # Unchanged (already English)
├── middleware.ts         # New: reads LOCALE env → sets next-intl locale
├── i18n.ts              # New: next-intl config
└── app/
    └── [locale]/        # New wrapper — all existing pages move here
        ├── layout.tsx
        ├── page.tsx
        └── ...
```

## Data Flow

```
Incoming request
    ↓
middleware.ts
  reads process.env.LOCALE ("en" | "zh")
  sets locale cookie
  next-intl takes over
    ↓
app/[locale]/layout.tsx
  NextIntlClientProvider injects messages
    ↓
Any page/component
  const t = useTranslations('dashboard')
  t('title') → "AI Trading Terminal" | "AI 交易终端"
```

## String Management

Strings grouped by page/feature in `messages/*.json`:

```json
{
  "nav": { "workspace": "My Workspace", "history": "History", ... },
  "dashboard": { "title": "AI Trading Terminal", "marketStatus": "Global Market Status", ... },
  "market": { "usStocks": "US Stocks", "stable": "Stable", ... },
  "radar": { "title": "AI Opportunity Radar", "subtitle": "Multi-agent full market scan", ... },
  "billing": { ... },
  "settings": { ... },
  "auth": { ... },
  "stock": { ... },
  "analysis": { ... }
}
```

`content/labels.ts` enum labels (Signal, RiskLevel, AlertLevel, AgentPersonality) are already English and are **not** moved into messages — they are data labels, not UI copy.

## Local Development

```bash
# package.json
"dev:en": "LOCALE=en next dev -p 3001",
"dev:zh": "LOCALE=zh next dev -p 3002"
```

`.env.local` (not committed):
```
LOCALE=en   # or zh
```

Port allocation:
- `localhost:3000` — reserved for other existing project
- `localhost:3001` — English version
- `localhost:3002` — Chinese version

## Vercel Configuration

| Project | Env Var | URL |
|---|---|---|
| `tradingagents-en` | `LOCALE=en` | `web-en-xxx.vercel.app` |
| `tradingagents-zh` | `LOCALE=zh` | `web-zh-xxx.vercel.app` |

Custom domains can be bound in Vercel project settings at any time — no code changes required.

## Migration Scope

| Area | Files | Notes |
|---|---|---|
| Architecture scaffolding | 4 new files | middleware.ts, i18n.ts, messages/en.json, messages/zh.json |
| `app/` pages | 15 files | Move into `[locale]/`, replace hardcoded Chinese strings |
| `components/` | ~9 files | Replace hardcoded Chinese strings |
| `lib/` stores | ~8 files | Replace Chinese error messages and status text |
| `next.config.ts` | 1 file | Add next-intl plugin |

## Key Constraints

- `localePrefix: 'never'` — locale is invisible in the URL
- API routes stay outside `[locale]/` — they are unaffected
- `content/labels.ts` enum labels are not translated — they are treated as data, not copy
- No third-party translation service — strings are maintained manually in `messages/*.json`

# Dual-Domain i18n Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Migrate TradingAgents to next-intl so one codebase serves English (`LOCALE=en`) and Chinese (`LOCALE=zh`) via two separate Vercel projects.

**Architecture:** `middleware.ts` reads `process.env.LOCALE` and sets the next-intl locale. All pages live under `app/[locale]/` with `localePrefix: 'never'` so URLs stay clean. Strings live in `messages/en.json` and `messages/zh.json`; components use `useTranslations()`.

**Tech Stack:** Next.js 15 App Router, next-intl ^3, TypeScript

---

## File Map

| Action | Path | Purpose |
|---|---|---|
| Create | `src/i18n/request.ts` | next-intl server config |
| Create | `src/middleware.ts` | reads LOCALE env → locale cookie |
| Create | `src/messages/en.json` | all English UI strings |
| Create | `src/messages/zh.json` | all Chinese UI strings |
| Modify | `next.config.ts` | add createNextIntlPlugin |
| Modify | `src/app/layout.tsx` → move to | `src/app/[locale]/layout.tsx` |
| Modify | `src/app/page.tsx` → move to | `src/app/[locale]/page.tsx` |
| Move+edit | all `src/app/*/page.tsx` | move into `[locale]/`, replace hardcoded strings |
| Edit | `src/components/**/*.tsx` | replace hardcoded strings with `useTranslations()` |
| Create | `.env.local` (gitignored) | local LOCALE=en or zh |
| Modify | `package.json` | add dev:en and dev:zh scripts |

---

## Task 1: Install next-intl and configure next.config.ts

**Files:**
- Modify: `website/web/package.json`
- Modify: `website/web/next.config.ts`

- [ ] **Step 1: Install next-intl**

```bash
cd website/web
npm install next-intl
```

Expected: next-intl appears in package.json dependencies.

- [ ] **Step 2: Update next.config.ts**

Replace full content of `website/web/next.config.ts`:

```typescript
import type { NextConfig } from "next";
import path from "path";
import createNextIntlPlugin from "next-intl/plugin";

const withNextIntl = createNextIntlPlugin("./src/i18n/request.ts");

const nextConfig: NextConfig = {
  turbopack: {
    resolveAlias: {
      "@": "./src",
    },
  },
  webpack(config) {
    config.resolve.alias = {
      ...config.resolve.alias,
      "@": path.resolve(__dirname, "src"),
    };
    return config;
  },
};

export default withNextIntl(nextConfig);
```

- [ ] **Step 3: Commit**

```bash
git add website/web/package.json website/web/package-lock.json website/web/next.config.ts
git commit -m "feat(i18n): install next-intl, configure plugin"
```


---

## Task 2: Create i18n server config and middleware

**Files:**
- Create: `src/i18n/request.ts`
- Create: `src/middleware.ts`

- [ ] **Step 1: Create `src/i18n/request.ts`**

```typescript
import { getRequestConfig } from "next-intl/server";
import { cookies } from "next/headers";

export default getRequestConfig(async () => {
  const cookieStore = await cookies();
  const locale = cookieStore.get("NEXT_LOCALE")?.value ?? process.env.LOCALE ?? "en";
  const validLocale = ["en", "zh"].includes(locale) ? locale : "en";

  return {
    locale: validLocale,
    messages: (await import(`../messages/${validLocale}.json`)).default,
  };
});
```

- [ ] **Step 2: Create `src/middleware.ts`**

```typescript
import { NextRequest, NextResponse } from "next/server";

export function middleware(req: NextRequest) {
  const locale = process.env.LOCALE ?? "en";
  const validLocale = ["en", "zh"].includes(locale) ? locale : "en";

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

- [ ] **Step 3: Commit**

```bash
git add website/web/src/i18n/request.ts website/web/src/middleware.ts
git commit -m "feat(i18n): add next-intl server config and locale middleware"
```

---

## Task 3: Create messages/en.json and messages/zh.json

**Files:**
- Create: `src/messages/en.json`
- Create: `src/messages/zh.json`

- [ ] **Step 1: Create `src/messages/en.json`**

```json
{
  "meta": {
    "title": "TradingAgents — AI Trading Terminal",
    "description": "Bloomberg Terminal × OpenAI Multi-Agent System × AI Hedge Fund Workstation"
  },
  "nav": {
    "workspace": "My Workspace",
    "history": "History",
    "credits": "Credits",
    "logout": "Sign Out",
    "modelOnline": "Model Online"
  },
  "dashboard": {
    "marketStatus": "Global Market Status",
    "radarTitle": "AI Opportunity Radar",
    "radarSubtitle": "Multi-agent full market scan · Updates every 30s",
    "consoleTitle": "AI Research Console",
    "consoleSubtitle": "Multi-agent workflow engine",
    "agentsOnline": "Agents Online",
    "running": "Running",
    "debating": "Debating",
    "consensusUpdate": "Consensus Update",
    "searchPlaceholder": "Enter ticker or company name, press Enter to start analysis...",
    "market": "Market",
    "depth": "Depth",
    "startAnalysis": "Start AI Analysis",
    "errorLoad": "Failed to load data, please try again",
    "updateAll": "Update All",
    "colCode": "Code",
    "colSignal": "Signal",
    "colConfidence": "Confidence",
    "colRisk": "Risk",
    "colConsensus": "Consensus",
    "colPosition": "Position",
    "colUpdated": "Updated"
  },
  "market": {
    "usStocks": "US Stocks",
    "hkStocks": "HK Stocks",
    "aShares": "A-Shares",
    "aiVolume": "AI Sector Volume",
    "marketRisk": "Market Risk",
    "stable": "Stable"
  },
  "billing": {
    "pageTitle": "Credits Center",
    "pageSubtitle": "Standard Analysis 1 Credit · Deep Research 3 Credits · Risk Scan 1 Credit",
    "back": "Back to Home",
    "loginPrompt": "Sign in to view balance",
    "registerCta": "Register to get 5 free Credits and start AI analysis",
    "registerBtn": "Sign Up Free",
    "loginBtn": "Sign In",
    "currentBalance": "Current Balance",
    "usageHistory": "Usage History",
    "recharge": "Top Up",
    "rechargeOnline": "Top Up Online",
    "rechargeUnit": "1 Credit = 1 AI Analysis",
    "standardPrice": "Standard Price",
    "rechargeNow": "Top Up Now",
    "paymentNote": "Payments processed by Creem · Credits credited instantly · Never expire",
    "planStarter": "Starter",
    "planStarterDesc": "First experience, pay as you go",
    "planValue": "Value",
    "planValueDesc": "Most popular, best value",
    "planBulk": "Bulk",
    "planBulkDesc": "Heavy users, biggest discount",
    "historyAiNvda": "AI Analysis · NVDA",
    "historyDeepTsla": "Deep Research · TSLA",
    "historyRegister": "Registration Bonus",
    "historyRiskAmd": "Risk Scan · AMD"
  },
  "history": {
    "back": "Back to Home",
    "pageTitle": "Analysis History",
    "pageSubtitle": "AI Investment Committee archived analyses",
    "recordCount": "{count} records",
    "loginPrompt": "Sign in to view history",
    "loginDesc": "Each AI analysis is auto-saved for future reference",
    "registerBtn": "Sign Up Free",
    "loginBtn": "Sign In",
    "deepResearch": "Deep Research",
    "standardAnalysis": "Standard Analysis"
  },
  "auth": {
    "loginTitle": "Sign In to TradingAgents",
    "loginSubtitle": "AI Investment Committee Workstation",
    "email": "Email",
    "password": "Password",
    "signingIn": "Signing in...",
    "signIn": "Sign In",
    "registerLink": "Sign Up Free · Get 5 Credits",
    "registerTitle": "Sign Up Free",
    "registerSubtitle": "Unlock AI Investment Committee · Get 5 Credits",
    "registering": "Registering...",
    "registerBtn": "Sign Up & Get 5 Credits",
    "registerError": "Registration failed, please try again",
    "registerSuccess": "Registration successful! Please check your email to verify, then sign in",
    "hasAccount": "Already have an account?",
    "directLogin": "Sign In",
    "feature1": "Multi-Agent Real-time Debate",
    "feature2": "AI Deep Research Report",
    "feature3": "Dynamic Risk Simulation",
    "feature4": "Historical Analysis Records"
  },
  "settings": {
    "pageTitle": "Settings",
    "comingSoon": "Coming Soon"
  },
  "watchlist": {
    "back": "Back to Home",
    "pageTitle": "Watchlist",
    "pageSubtitle": "Tracked tickers from AI Opportunity Radar",
    "tickerCount": "{count} tickers",
    "loginPrompt": "Sign in to view watchlist",
    "loginDesc": "Add tickers in the AI Opportunity Radar to manage them here",
    "registerBtn": "Sign Up Free",
    "loginBtn": "Sign In",
    "emptyTitle": "Watchlist is empty",
    "emptyDesc": "Add tickers from AI Opportunity Radar or stock detail pages",
    "goToRadar": "Go to AI Opportunity Radar",
    "footer": "Data from AI Opportunity Radar · Click a ticker to see full analysis"
  },
  "workspace": {
    "back": "Back to Home",
    "loginPrompt": "Sign in to access workspace",
    "loginDesc": "Manage your AI analyses, watchlist, and Credits",
    "registerBtn": "Sign Up Free",
    "loginBtn": "Sign In",
    "greeting": "Hello, {name}",
    "subtitle": "AI Investment Committee Workstation",
    "creditsBalance": "Credits Balance",
    "radarTickers": "Radar Tickers",
    "bullish": "Bullish",
    "avgConfidence": "Avg Confidence",
    "recentAnalyses": "Recent Analyses",
    "viewAll": "View All →",
    "radarSnapshot": "Radar Snapshot",
    "manageWatchlist": "Manage Watchlist →",
    "radarEmpty": "No tickers in radar",
    "goAddTickers": "Add tickers on home →",
    "moreTickersLabel": "+{count} more tickers",
    "actionAnalysis": "Start AI Analysis",
    "actionAnalysisDesc": "Analyze new ticker",
    "actionHistory": "History",
    "actionHistoryDesc": "View past analyses",
    "actionCredits": "Top Up Credits",
    "actionCreditsDesc": "Purchase analysis quota"
  },
  "stock": {
    "notFound": "Not Found",
    "notAnalyzed": "No AI analysis has been run for this ticker yet",
    "analysisDesc": "8 AI agents will form an Investment Committee · Multi-dimensional analysis · Full research report",
    "starting": "Starting AI Investment Committee...",
    "startBtn": "Start AI Analysis",
    "back": "Back",
    "workstationTitle": "⚡ AI Investment Committee Workstation",
    "workstationDesc": "8 AI agents collaborating in real-time · Multi-dimensional analysis · Dynamic decision-making",
    "bootStep1": "Connecting to market data",
    "bootStep2": "Fundamental analysis agent ready",
    "bootStep3": "Sentiment analysis engine ready",
    "bootStep4": "Debate system online",
    "bootStep5": "Position engine ready"
  },
  "privateZone": {
    "defaultLabel": "AI Research Console",
    "unlockPrompt": "Sign in to unlock AI analysis",
    "unlockCta": "Unlock Free · Get 5 Credits"
  },
  "loginModal": {
    "title": "Unlock AI Investment Committee",
    "subtitle": "Use TradingAgents multi-agent system for deep investment research",
    "creditsNote": "Get 5 Credits on first registration, start AI analysis immediately",
    "registerBtn": "Sign Up Free · Get 5 Credits",
    "loginBtn": "Already have an account, sign in",
    "feature1": "Multi-Agent Real-time Debate",
    "feature2": "AI Deep Research Report",
    "feature3": "Dynamic Risk Simulation",
    "feature4": "AI Opportunity Radar",
    "feature5": "Historical Analysis Records",
    "feature6": "Custom Portfolio"
  },
  "common": {
    "noContent": "No content",
    "riskScore": "Risk Score / 100",
    "triggered": "Triggered",
    "riskTerminal": "Risk Terminal"
  }
}
```

- [ ] **Step 2: Create `src/messages/zh.json`**

```json
{
  "meta": {
    "title": "TradingAgents — AI 交易终端",
    "description": "Bloomberg Terminal × OpenAI 多智能体系统 × AI 对冲基金工作台"
  },
  "nav": {
    "workspace": "我的工作台",
    "history": "历史记录",
    "credits": "Credits",
    "logout": "登出",
    "modelOnline": "模型在线"
  },
  "dashboard": {
    "marketStatus": "全球市场状态",
    "radarTitle": "AI 机会雷达",
    "radarSubtitle": "全市场多智能体扫描 · 每 30 秒更新",
    "consoleTitle": "AI 研究控制台",
    "consoleSubtitle": "多智能体工作流引擎",
    "agentsOnline": "智能体在线",
    "running": "运行中",
    "debating": "辩论中",
    "consensusUpdate": "共识更新",
    "searchPlaceholder": "输入股票代码或公司名称，按 Enter 启动分析...",
    "market": "市场",
    "depth": "模式",
    "startAnalysis": "启动 AI 分析",
    "errorLoad": "数据加载失败，请稍后重试",
    "updateAll": "更新全部",
    "colCode": "代码",
    "colSignal": "信号",
    "colConfidence": "置信度",
    "colRisk": "风险",
    "colConsensus": "共识",
    "colPosition": "建议仓位",
    "colUpdated": "更新"
  },
  "market": {
    "usStocks": "美股",
    "hkStocks": "港股",
    "aShares": "A 股",
    "aiVolume": "AI 板块动量",
    "marketRisk": "市场风险",
    "stable": "平稳"
  },
  "billing": {
    "pageTitle": "Credits 充值中心",
    "pageSubtitle": "标准分析 1 Credit · 深度研究 3 Credits · 风险扫描 1 Credit",
    "back": "返回首页",
    "loginPrompt": "登录后查看余额",
    "registerCta": "注册即赠 5 Credits，立即开始 AI 分析",
    "registerBtn": "免费注册",
    "loginBtn": "已有账号登录",
    "currentBalance": "当前余额",
    "usageHistory": "使用明细",
    "recharge": "充值",
    "rechargeOnline": "在线充值",
    "rechargeUnit": "1 Credit = 1 次 AI 分析",
    "standardPrice": "标准价",
    "rechargeNow": "立即充值",
    "paymentNote": "支付由 Creem 处理 · 充值后 Credits 自动到账 · 永久有效",
    "planStarter": "入门",
    "planStarterDesc": "首次体验，按需购买",
    "planValue": "超值",
    "planValueDesc": "最受欢迎，性价比最高",
    "planBulk": "囤货",
    "planBulkDesc": "重度用户首选，折扣最大",
    "historyAiNvda": "AI 分析 · NVDA",
    "historyDeepTsla": "深度研究 · TSLA",
    "historyRegister": "注册赠送",
    "historyRiskAmd": "风险扫描 · AMD"
  },
  "history": {
    "back": "返回首页",
    "pageTitle": "历史分析记录",
    "pageSubtitle": "AI 投资委员会历次分析存档",
    "recordCount": "共 {count} 条记录",
    "loginPrompt": "登录后查看历史记录",
    "loginDesc": "每次 AI 分析结果自动保存，随时回顾",
    "registerBtn": "免费注册",
    "loginBtn": "已有账号登录",
    "deepResearch": "深度研究",
    "standardAnalysis": "标准分析"
  },
  "auth": {
    "loginTitle": "登录 TradingAgents",
    "loginSubtitle": "AI 投资委员会工作台",
    "email": "邮箱",
    "password": "密码",
    "signingIn": "登录中...",
    "signIn": "登录",
    "registerLink": "免费注册 · 赠 5 Credits",
    "registerTitle": "免费注册",
    "registerSubtitle": "解锁 AI 投资委员会 · 赠送 5 Credits",
    "registering": "注册中...",
    "registerBtn": "注册并获取 5 Credits",
    "registerError": "注册失败，请重试",
    "registerSuccess": "✓ 注册成功！请检查邮箱完成验证后登录",
    "hasAccount": "已有账号？",
    "directLogin": "直接登录",
    "feature1": "多 Agent 实时辩论",
    "feature2": "AI 深度研究报告",
    "feature3": "风险动态推演",
    "feature4": "历史分析记录"
  },
  "settings": {
    "pageTitle": "设置",
    "comingSoon": "即将推出"
  },
  "watchlist": {
    "back": "返回首页",
    "pageTitle": "自选列表",
    "pageSubtitle": "来自 AI 机会雷达的关注标的",
    "tickerCount": "{count} 只标的",
    "loginPrompt": "登录后查看自选列表",
    "loginDesc": "在 AI 机会雷达添加标的后，可在此统一管理",
    "registerBtn": "免费注册",
    "loginBtn": "已有账号登录",
    "emptyTitle": "自选列表为空",
    "emptyDesc": "在 AI 机会雷达或股票详情页添加标的",
    "goToRadar": "去 AI 机会雷达添加",
    "footer": "数据来自 AI 机会雷达 · 点击标的查看完整分析"
  },
  "workspace": {
    "back": "返回首页",
    "loginPrompt": "登录后进入工作台",
    "loginDesc": "管理你的 AI 分析、自选列表和 Credits",
    "registerBtn": "免费注册",
    "loginBtn": "已有账号登录",
    "greeting": "你好，{name}",
    "subtitle": "AI 投资委员会工作台",
    "creditsBalance": "Credits 余额",
    "radarTickers": "雷达标的",
    "bullish": "看涨标的",
    "avgConfidence": "平均置信度",
    "recentAnalyses": "最近分析",
    "viewAll": "查看全部 →",
    "radarSnapshot": "雷达快照",
    "manageWatchlist": "管理自选 →",
    "radarEmpty": "雷达暂无标的",
    "goAddTickers": "去首页添加 →",
    "moreTickersLabel": "还有 {count} 只标的",
    "actionAnalysis": "启动 AI 分析",
    "actionAnalysisDesc": "分析新标的",
    "actionHistory": "历史记录",
    "actionHistoryDesc": "查看过往分析",
    "actionCredits": "充值 Credits",
    "actionCreditsDesc": "购买分析额度"
  },
  "stock": {
    "notFound": "未找到",
    "notAnalyzed": "尚未对该标的进行 AI 分析",
    "analysisDesc": "8 个 AI 智能体将组成投资委员会 · 多维分析 · 生成完整研究报告",
    "starting": "正在启动 AI 投资委员会...",
    "startBtn": "启动 AI 分析",
    "back": "返回上一页",
    "workstationTitle": "⚡ AI 投资委员会工作台",
    "workstationDesc": "8 个 AI 智能体实时协作 · 多维分析 · 动态决策",
    "bootStep1": "连接市场数据",
    "bootStep2": "基本面分析智能体就绪",
    "bootStep3": "情绪分析引擎就绪",
    "bootStep4": "辩论系统在线",
    "bootStep5": "仓位引擎就绪"
  },
  "privateZone": {
    "defaultLabel": "AI 研究控制台",
    "unlockPrompt": "登录后解锁 AI 分析能力",
    "unlockCta": "免费解锁 · 赠 5 Credits"
  },
  "loginModal": {
    "title": "解锁 AI 投资委员会",
    "subtitle": "使用 TradingAgents 多智能体系统进行深度投资研究",
    "creditsNote": "首次注册赠送 5 Credits，立即开始 AI 分析",
    "registerBtn": "免费注册 · 获取 5 Credits",
    "loginBtn": "已有账号，直接登录",
    "feature1": "多 Agent 实时辩论",
    "feature2": "AI 深度研究报告",
    "feature3": "风险动态推演",
    "feature4": "AI 机会雷达",
    "feature5": "历史分析记录",
    "feature6": "自定义投资组合"
  },
  "common": {
    "noContent": "暂无内容",
    "riskScore": "风险分数 / 100",
    "triggered": "触发",
    "riskTerminal": "风险终端"
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add website/web/src/messages/
git commit -m "feat(i18n): add en.json and zh.json message files"
```


---

## Task 4: Restructure app/ — add [locale] wrapper

**Files:**
- Create: `src/app/[locale]/layout.tsx` (from existing `src/app/layout.tsx`)
- Modify: `src/app/layout.tsx` (becomes minimal shell)

- [ ] **Step 1: Create `src/app/[locale]/layout.tsx`**

```tsx
import type { Metadata } from "next";
import { Inter, JetBrains_Mono } from "next/font/google";
import { NextIntlClientProvider } from "next-intl";
import { getMessages, getTranslations } from "next-intl/server";
import "../globals.css";
import { Providers } from "@/components/providers";

const inter = Inter({ subsets: ["latin"], variable: "--font-inter" });
const jetbrainsMono = JetBrains_Mono({
  subsets: ["latin"],
  variable: "--font-jetbrains-mono",
});

export async function generateMetadata(): Promise<Metadata> {
  const t = await getTranslations("meta");
  return {
    title: t("title"),
    description: t("description"),
  };
}

export default async function LocaleLayout({
  children,
  params,
}: {
  children: React.ReactNode;
  params: Promise<{ locale: string }>;
}) {
  const { locale } = await params;
  const messages = await getMessages();

  return (
    <html lang={locale}>
      <body className={`${inter.variable} ${jetbrainsMono.variable}`}>
        <NextIntlClientProvider messages={messages}>
          <Providers>{children}</Providers>
        </NextIntlClientProvider>
      </body>
    </html>
  );
}
```

- [ ] **Step 2: Replace `src/app/layout.tsx` with minimal shell**

The root `layout.tsx` must remain but only renders children — `[locale]/layout.tsx` handles HTML/body:

```tsx
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
```

- [ ] **Step 3: Commit**

```bash
git add website/web/src/app/\[locale\]/ website/web/src/app/layout.tsx
git commit -m "feat(i18n): add [locale] layout wrapper with NextIntlClientProvider"
```

---

## Task 5: Move and update app pages — auth pages

**Files:**
- Create: `src/app/[locale]/login/page.tsx`
- Create: `src/app/[locale]/register/page.tsx`
- Create: `src/app/[locale]/reset-password/page.tsx`
- Delete (after move): `src/app/login/`, `src/app/register/`, `src/app/reset-password/`

- [ ] **Step 1: Create `src/app/[locale]/login/page.tsx`**

Copy existing `src/app/login/page.tsx` and replace all Chinese strings with `useTranslations`:

```tsx
"use client";
import { useTranslations } from "next-intl";
// ... keep all existing imports

export default function LoginPage() {
  const t = useTranslations("auth");
  // replace every Chinese string:
  // "登录 TradingAgents"  → t("loginTitle")
  // "AI 投资委员会工作台" → t("loginSubtitle")
  // "邮箱"               → t("email")
  // "密码"               → t("password")
  // "登录中..."           → t("signingIn")
  // "登录"               → t("signIn")
  // "免费注册 · 赠 5 Credits" → t("registerLink")
  // keep all logic unchanged
}
```

- [ ] **Step 2: Create `src/app/[locale]/register/page.tsx`**

Copy existing `src/app/register/page.tsx`, replace strings:
```
"多 Agent 实时辩论"          → t("feature1")
"AI 深度研究报告"             → t("feature2")
"风险动态推演"                → t("feature3")
"历史分析记录"                → t("feature4")
"免费注册"                   → t("registerTitle")
"解锁 AI 投资委员会 · 赠送 5 Credits" → t("registerSubtitle")
"邮箱"                      → t("email")
"密码"                      → t("password")
"注册中..."                  → t("registering")
"注册并获取 5 Credits"        → t("registerBtn")
"注册失败，请重试"             → t("registerError")
"✓ 注册成功！..."             → t("registerSuccess")
"已有账号？"                  → t("hasAccount")
"直接登录"                   → t("directLogin")
```

- [ ] **Step 3: Create `src/app/[locale]/reset-password/page.tsx`**

Copy existing file (check for any Chinese strings and replace using `auth` namespace).

- [ ] **Step 4: Remove old auth directories**

```bash
rm -rf website/web/src/app/login
rm -rf website/web/src/app/register
rm -rf website/web/src/app/reset-password
```

- [ ] **Step 5: Commit**

```bash
git add website/web/src/app/\[locale\]/
git commit -m "feat(i18n): migrate auth pages to [locale] with useTranslations"
```

---

## Task 6: Move and update app pages — dashboard, settings, history, watchlist, workspace, billing

**Files:**
- Create: `src/app/[locale]/page.tsx`
- Create: `src/app/[locale]/settings/page.tsx`
- Create: `src/app/[locale]/history/page.tsx`
- Create: `src/app/[locale]/watchlist/page.tsx`
- Create: `src/app/[locale]/workspace/page.tsx`
- Create: `src/app/[locale]/billing/page.tsx`
- Delete: original `src/app/page.tsx`, `src/app/settings/`, `src/app/history/`, `src/app/watchlist/`, `src/app/workspace/`, `src/app/billing/`

- [ ] **Step 1: Create `src/app/[locale]/page.tsx`** (dashboard)

Copy `src/app/page.tsx`, add at top: `const t = useTranslations("dashboard");`, replace:
```
"数据加载失败，请稍后重试" → t("errorLoad")
// locale: "zh-CN" date formatting → use locale from useLocale() hook
```
Also update header status labels via `useTranslations("dashboard")`:
```
"智能体在线" → t("agentsOnline")
"运行中"    → t("running")
"辩论中"    → t("debating")
"共识更新"  → t("consensusUpdate")
```
Radar table column headers:
```
"代码" → t("colCode"), "信号" → t("colSignal"), etc.
```

- [ ] **Step 2: Create `src/app/[locale]/settings/page.tsx`**

```tsx
"use client";
import { useTranslations } from "next-intl";

export default function SettingsPage() {
  const t = useTranslations("settings");
  return (
    <div className="min-h-screen bg-[#0a0a0a] flex items-center justify-center">
      <div className="text-center">
        <h1 className="text-white text-2xl font-bold mb-2">{t("pageTitle")}</h1>
        <p className="text-gray-400">{t("comingSoon")}</p>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Create `src/app/[locale]/history/page.tsx`**

Copy existing, replace all Chinese strings using `useTranslations("history")` per the key mapping in `zh.json`/`en.json`.

- [ ] **Step 4: Create `src/app/[locale]/watchlist/page.tsx`**

Copy existing, replace all Chinese strings using `useTranslations("watchlist")`.
Note: `signalConfig` mapping in this file uses `Signal` enum values as keys — keep enum keys, replace Chinese label strings:
```tsx
const t = useTranslations("watchlist");
// table headers: t("colCode") etc. — reuse "dashboard" namespace
```

- [ ] **Step 5: Create `src/app/[locale]/workspace/page.tsx`**

Copy existing, replace Chinese strings using `useTranslations("workspace")`.
Mock data `RECENT_ANALYSES` company names (英伟达, 特斯拉 etc.) are display data — replace with English equivalents directly in the mock array.

- [ ] **Step 6: Create `src/app/[locale]/billing/page.tsx`**

Copy existing, replace Chinese strings using `useTranslations("billing")`.
`PLANS` array: replace Chinese labels inline with `t()` calls.
`MOCK_HISTORY` array: replace Chinese labels with `t()` calls.

- [ ] **Step 7: Remove old page directories**

```bash
rm -f website/web/src/app/page.tsx
rm -rf website/web/src/app/settings
rm -rf website/web/src/app/history
rm -rf website/web/src/app/watchlist
rm -rf website/web/src/app/workspace
rm -rf website/web/src/app/billing
```

- [ ] **Step 8: Commit**

```bash
git add website/web/src/app/\[locale\]/
git commit -m "feat(i18n): migrate dashboard and secondary pages to [locale]"
```

---

## Task 7: Move and update stock pages

**Files:**
- Create: `src/app/[locale]/stock/[ticker]/page.tsx`
- Create: `src/app/[locale]/stock/[ticker]/agent/[type]/page.tsx`
- Create: `src/app/[locale]/stock/[ticker]/allocation/page.tsx`
- Create: `src/app/[locale]/stock/[ticker]/debate/[side]/page.tsx`
- Create: `src/app/[locale]/stock/[ticker]/risk-detail/[stance]/page.tsx`
- Create: `src/app/[locale]/analysis/[session_id]/page.tsx`
- Delete: original `src/app/stock/` and `src/app/analysis/`

- [ ] **Step 1: Create `src/app/[locale]/stock/[ticker]/page.tsx`**

Copy existing, replace Chinese strings using `useTranslations("stock")`:
```
"连接市场数据"        → t("bootStep1")
"基本面分析智能体就绪" → t("bootStep2")
"情绪分析引擎就绪"    → t("bootStep3")
"辩论系统在线"        → t("bootStep4")
"仓位引擎就绪"        → t("bootStep5")
"尚未对该标的进行..."  → t("notAnalyzed")
"8 个 AI 智能体..."   → t("analysisDesc")
"正在启动..."         → t("starting")
"启动 AI 分析"        → t("startBtn")
"返回上一页"          → t("back")
"未找到"             → t("notFound")
"⚡ AI 投资委员会工作台" → t("workstationTitle")
"8 个 AI 智能体实时协作..." → t("workstationDesc")
```
For `locale: "zh-CN"` date formatting — replace with `useLocale()` from next-intl:
```tsx
import { useLocale } from "next-intl";
const locale = useLocale();
// new Date(d.updatedAt).toLocaleString(locale === "zh" ? "zh-CN" : "en-US")
```

- [ ] **Step 2: Move remaining stock sub-pages and analysis page**

Copy `agent/[type]/page.tsx`, `allocation/page.tsx`, `debate/[side]/page.tsx`, `risk-detail/[stance]/page.tsx`, and `analysis/[session_id]/page.tsx` into the `[locale]/` tree. Check each for Chinese strings and replace with appropriate namespace keys. If new strings are needed, add them to both `en.json` and `zh.json`.

- [ ] **Step 3: Remove old directories**

```bash
rm -rf website/web/src/app/stock
rm -rf website/web/src/app/analysis
```

- [ ] **Step 4: Commit**

```bash
git add website/web/src/app/\[locale\]/
git commit -m "feat(i18n): migrate stock and analysis pages to [locale]"
```

---

## Task 8: Update components — auth and layout

**Files:**
- Modify: `src/components/auth/PrivateZone.tsx`
- Modify: `src/components/auth/LoginUnlockModal.tsx`
- Modify: `src/components/layout/header.tsx`

- [ ] **Step 1: Update `src/components/auth/PrivateZone.tsx`**

```tsx
"use client";
import { useTranslations } from "next-intl";

// Replace:
// "AI 研究控制台"          → t("defaultLabel")  (privateZone namespace)
// "登录后解锁 AI 分析能力"  → t("unlockPrompt")
// "免费解锁 · 赠 5 Credits" → t("unlockCta")

const t = useTranslations("privateZone");
```

- [ ] **Step 2: Update `src/components/auth/LoginUnlockModal.tsx`**

```tsx
"use client";
import { useTranslations } from "next-intl";
const t = useTranslations("loginModal");

// Replace all 12 Chinese strings using loginModal namespace keys
// feature array: [t("feature1"), t("feature2"), t("feature3"), t("feature4"), t("feature5"), t("feature6")]
```

- [ ] **Step 3: Update `src/components/layout/header.tsx`**

```tsx
"use client";
import { useTranslations } from "next-intl";
const t = useTranslations("nav");

// Replace:
// "我的工作台" → t("workspace")
// "历史记录"  → t("history")
// "Credits"   → t("credits") (same in both)
// "登出"      → t("logout")
// "模型在线"  → t("modelOnline")
// Also replace status labels using useTranslations("dashboard"):
// "智能体在线" → td("agentsOnline")
// "运行中"    → td("running")  etc.
```

- [ ] **Step 4: Commit**

```bash
git add website/web/src/components/auth/ website/web/src/components/layout/
git commit -m "feat(i18n): update auth and layout components with useTranslations"
```

---

## Task 9: Update dashboard components

**Files:**
- Modify: `src/components/dashboard/global-market-state.tsx`
- Modify: `src/components/dashboard/opportunity-radar.tsx`
- Modify: `src/components/dashboard/research-console.tsx`
- Modify: `src/components/dashboard/risk-terminal.tsx`
- Modify: `src/components/dashboard/live-feed.tsx`
- Modify: `src/components/dashboard/watchlist.tsx`
- Modify: `src/components/dashboard/conviction-ideas.tsx`
- Modify: `src/components/dashboard/featured-research.tsx`
- Modify: `src/components/dashboard/sector-heatmap.tsx`

- [ ] **Step 1: Update each dashboard component**

For each file: add `"use client"` if not present, import `useTranslations`, replace Chinese strings.

**global-market-state.tsx** — market names use `useTranslations("market")`:
```tsx
const t = useTranslations("market");
// "美股" → t("usStocks"), "港股" → t("hkStocks"), "A 股" → t("aShares")
// "AI 板块动量" → t("aiVolume"), "市场风险" → t("marketRisk"), "平稳" → t("stable")
```

**opportunity-radar.tsx** — column headers use `useTranslations("dashboard")`:
```tsx
const t = useTranslations("dashboard");
// "代码" → t("colCode"), "信号" → t("colSignal"), etc.
// "AI 机会雷达" → t("radarTitle"), "全市场多智能体扫描" → t("radarSubtitle")
// "更新全部" → t("updateAll")
```

**research-console.tsx**:
```tsx
const t = useTranslations("dashboard");
// "AI 研究控制台" → t("consoleTitle")
// search placeholder → t("searchPlaceholder")
// "市场" → t("market"), "模式" → t("depth")
// "启动 AI 分析" → t("startAnalysis")
```

**risk-terminal.tsx**:
```tsx
const t = useTranslations("common");
// "风险终端" → t("riskTerminal")
// "风险分数 / 100" → t("riskScore")
// "触发" → t("triggered")
```

**live-feed.tsx**, **watchlist.tsx**, **conviction-ideas.tsx**, **featured-research.tsx**, **sector-heatmap.tsx** — check each file for Chinese strings and replace using appropriate namespace from `en.json`/`zh.json`. If a string is missing from messages, add it to both JSON files first.

- [ ] **Step 2: Commit**

```bash
git add website/web/src/components/dashboard/
git commit -m "feat(i18n): update dashboard components with useTranslations"
```

---

## Task 10: Update stock components

**Files:**
- Modify: `src/components/stock/analyzing-state.tsx`
- Modify: `src/components/stock/stock-header.tsx`
- Modify: `src/components/stock/final-decision.tsx`
- Modify: `src/components/stock/bull-bear-debate.tsx`
- Modify: `src/components/stock/portfolio-decision.tsx`
- Modify: `src/components/stock/risk-analysis.tsx`
- Modify: `src/components/stock/reflection-memory.tsx`
- Modify: `src/components/stock/live-rail.tsx`
- Modify: `src/components/stock/agent-analysis.tsx`
- Modify: `src/components/ui/MarkdownContent.tsx`

- [ ] **Step 1: Update each stock component**

For each file: read it, find Chinese strings, replace with `useTranslations()`. Add any missing keys to both `en.json` and `zh.json` before replacing in the component.

**analyzing-state.tsx** — boot steps use `useTranslations("stock")`:
```tsx
const t = useTranslations("stock");
// BOOT_STEPS array → [t("bootStep1"), t("bootStep2"), ...]
```

**MarkdownContent.tsx**:
```tsx
const t = useTranslations("common");
// "暂无内容" → t("noContent")
```

For any stock component strings not already in `messages/*.json`, add entries under a `"stockComponents"` namespace in both JSON files.

- [ ] **Step 2: Commit**

```bash
git add website/web/src/components/stock/ website/web/src/components/ui/
git commit -m "feat(i18n): update stock and UI components with useTranslations"
```

---

## Task 11: Local dev environment setup

**Files:**
- Modify: `website/web/package.json`
- Create: `website/web/.env.local` (gitignored, not committed)

- [ ] **Step 1: Add dev scripts to package.json**

In the `scripts` section, add:
```json
"dev:en": "LOCALE=en next dev -p 3001",
"dev:zh": "LOCALE=zh next dev -p 3002"
```

- [ ] **Step 2: Verify .gitignore covers .env.local**

```bash
grep ".env.local" website/web/.gitignore || echo ".env.local" >> website/web/.gitignore
```

- [ ] **Step 3: Test English version locally**

```bash
cd website/web
LOCALE=en npm run dev:en
```

Open `http://localhost:3001` — all text should be in English.

- [ ] **Step 4: Test Chinese version locally**

```bash
LOCALE=zh npm run dev:zh
```

Open `http://localhost:3002` — all text should be in Chinese.

- [ ] **Step 5: Commit package.json changes**

```bash
git add website/web/package.json
git commit -m "feat(i18n): add dev:en and dev:zh scripts"
```

---

## Task 12: Deploy two Vercel projects

- [ ] **Step 1: Push all changes to main**

```bash
git push origin main
```

- [ ] **Step 2: Create English Vercel project**

```bash
cd website/web
npx vercel link --scope sunmoonstar26s-projects --yes
# When prompted, create a new project named: tradingagents-en
npx vercel env add LOCALE production
# Enter value: en
npx vercel deploy --prod --scope sunmoonstar26s-projects
```

- [ ] **Step 3: Create Chinese Vercel project**

In Vercel dashboard (vercel.com), import the same GitHub repo as a **new project** named `tradingagents-zh`. Set environment variable `LOCALE=zh`. Deploy.

Alternatively via CLI from a fresh directory:
```bash
npx vercel link --scope sunmoonstar26s-projects --yes
# create new project: tradingagents-zh
npx vercel env add LOCALE production
# Enter value: zh
npx vercel deploy --prod
```

- [ ] **Step 4: Verify both deployments**

- English URL: open Vercel dashboard → `tradingagents-en` → copy production URL → confirm all text is English
- Chinese URL: open Vercel dashboard → `tradingagents-zh` → copy production URL → confirm all text is Chinese

- [ ] **Step 5: (Future) Bind custom domains**

When domains are ready: Vercel dashboard → project Settings → Domains → Add domain. No code changes required.


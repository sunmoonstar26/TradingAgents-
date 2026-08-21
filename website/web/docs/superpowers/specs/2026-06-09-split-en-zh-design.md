# 拆分 EN / ZH 双版本 — 设计文档

**目标：** 将 `website/web/`（现有双语 next-intl 代码）拆成两个独立的 Next.js 项目，各自独立维护、独立部署。

---

## 架构决策

### 拆分后的目录结构

```
website/
├── web-en/    ← 英文版（线上 Vercel 生产，目标用户：欧美市场）
└── web-zh/    ← 中文版（本地开发 / 内部使用）
```

原 `website/web/` 保留作备份，拆完确认无误后可手动删除。

### 核心变更：移除 next-intl，路由扁平化

| 变更项 | 现在 | 拆分后 |
|--------|------|--------|
| 路由路径 | `/en/dashboard`、`/zh/dashboard` | `/dashboard` |
| 翻译机制 | next-intl + `useTranslations()` | 硬编码字符串 |
| 文案来源 | `src/messages/en.json` / `zh.json` | 内联在组件中 |
| 中间件 | `proxy.ts`（读 `LOCALE` env） | 无需中间件 |
| 路由配置 | `routing.ts`、`navigation.ts` | 无 |
| i18n 请求配置 | `src/i18n/request.ts` | 无 |

### 删除的文件（每个版本）

- `src/routing.ts`
- `src/navigation.ts`
- `src/proxy.ts`（含 `middleware` 导出）
- `src/i18n/request.ts`（及 `src/i18n/` 目录）
- `src/messages/en.json`
- `src/messages/zh.json`
- `src/app/[locale]/` → 重命名为 `src/app/`（路由扁平化）

### next-intl 依赖清理

`package.json` 移除 `next-intl`，`next.config.ts` 移除 `withNextIntl` 包装。

---

## 文案替换策略

每个组件中：
- `useTranslations("ns")` → 删除
- `t("key")` → 直接替换为对应语言的字符串值
- `t("key", { param })` → 使用模板字符串 `` `...${param}...` ``
- `getTranslations("ns")` → 删除（server components）

`generateMetadata()` 中的翻译 → 硬编码 `title` / `description`。

---

## 路由扁平化策略

所有 `src/app/[locale]/xxx/page.tsx` → `src/app/xxx/page.tsx`

- `useParams()` 中读取 `locale` 的代码 → 删除
- `useLocale()` → 删除（或替换为硬编码 `"en"` / `"zh-CN"` 用于 `toLocaleString`）
- `useRouter` from `@/navigation` → 改回 `useRouter` from `next/navigation`
- `Link` from `@/navigation` → 改回 `Link` from `next/link`
- `router.push("/stock/NVDA")` → 无需改动（路径已是扁平）

---

## Layout 变更

`src/app/[locale]/layout.tsx` → `src/app/layout.tsx`

移除：
- `NextIntlClientProvider`
- `getMessages()`
- `params: Promise<{ locale: string }>`

保留：字体、CSS、`Providers`、`TooltipProvider`，`lang` 属性硬编码为 `"en"` 或 `"zh"`。

---

## Vercel 部署

| 版本 | 目录 | Vercel 项目 | 环境变量 |
|------|------|-------------|---------|
| 英文 | `website/web-en/` | `tradingagents-en` | 无需 `LOCALE` |
| 中文 | `website/web-zh/` | （可选，未来按需） | 无需 `LOCALE` |

`web-en/` 的 `.vercel/project.json` 指向 `tradingagents-en`。

---

## 实施顺序

1. 复制 `website/web/` → `website/web-en/` 和 `website/web-zh/`
2. 对 `web-en/`：全部替换为英文文案 + 移除 i18n 层
3. 对 `web-zh/`：全部替换为中文文案 + 移除 i18n 层
4. 验证两个版本均可 `npm run build` 通过
5. `web-en/` 配置 `.vercel/project.json` 指向 `tradingagents-en`
6. 部署 `web-en/` 到 Vercel production

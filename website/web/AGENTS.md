<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

---

# 项目规则：中文开发 / 英文产品

## 语言边界

| 场景 | 语言 |
|------|------|
| 开发文档、任务说明、代码注释 | 简体中文（允许） |
| 用户可见界面文案 | 英文（强制） |
| 数据库字段、API 字段、类型定义、枚举值 | 英文（强制） |
| 组件名、函数名、变量名 | 英文（强制） |
| TradingAgents AI 输出内容 | 英文（强制，由 `TRADINGAGENTS_OUTPUT_LANGUAGE=en` 保证） |
| 后台管理界面 | 中文（允许） |

## 强制规则

1. **禁止在业务逻辑中用中文字符串做条件判断。** 所有信号/风险/告警等级统一使用 `src/types/enums.ts` 中的 TypeScript Enum。

2. **所有用户界面文案统一放置于 `src/content/` 目录**，不允许在组件中直接硬编码字符串。新写功能直接走 `content/`。

3. **枚举定义唯一来源**：`src/types/enums.ts`。目前已定义：
   - `Signal` — STRONG_BUY / BUY / HOLD / SELL / STRONG_SELL
   - `RiskLevel` — LOW / MEDIUM / HIGH / DANGER
   - `AlertLevel` — DANGER / WARNING / WATCH
   - `Verdict` — BULLISH / BEARISH / NEUTRAL
   - `AgentPersonality` — FUNDAMENTAL / TECHNICAL / SENTIMENT / RISK / NEWS / MACRO

4. **枚举展示文案**统一从 `src/content/labels.ts` 读取（SIGNAL_LABELS、RISK_LABELS、AGENTS 等），不在组件内写死。

5. **`ta-mapper.ts` 是信号映射的唯一入口**。Python 输出 → Signal Enum 的转换只在此处发生，不在其他地方重复实现。

## 目录结构约定

```
src/
├── types/
│   ├── index.ts     — 接口定义（re-export enums）
│   └── enums.ts     — 所有 TypeScript Enum（唯一来源）
└── content/
    ├── labels.ts    — 枚举展示文案 + 颜色映射
    ├── analysis.ts  — 分析页文案
    └── ...          — 其他页面文案按需新增
```

# AlphaCouncil 上线前欧美合规审计

目标：

对整个 AlphaCouncil 网站进行一次完整的欧美 SaaS + AI + Investment Research Platform 合规审计。

输出格式：

/docs/pre-launch-audit.md

审计结果必须按照：

PASS
WARNING
FAIL

三级输出。

---

## 第一部分：品牌与知识产权审计

检查：

- AlphaCouncil 品牌名称
- alpha-council.com 域名
- Logo
- 网站文案

确认：

- 不侵犯第三方商标
- 不出现 OpenAI、Bloomberg、Goldman Sachs 等误导性品牌引用
- 不存在用户可能误认为官方合作关系的描述

输出：

Brand Compliance Report

---

## 第二部分：投资合规审计

扫描全站所有页面文案。

重点检查：

禁止出现：

Guaranteed Profit
Guaranteed Return
Risk Free
Winning Strategy
Beat The Market
Get Rich

以及类似表达。

发现后列出：

文件路径
代码位置
修改建议

确认网站整体定位为：

AI Research Platform

而不是：

Investment Advisor
Investment Manager
Broker Dealer

输出：

Investment Compliance Report

---

## 第三部分：风险披露审计

检查：

Privacy Policy
Terms of Service
Risk Disclosure

是否存在。

检查 Footer 是否可访问。

确认存在以下内容：

- Not Financial Advice
- Educational Purpose
- No Investment Recommendation
- Investing Involves Risk
- Loss Of Capital Possible

缺失项列出。

输出：

Risk Disclosure Report

---

## 第四部分：支付合规审计

检查：

Billing
Credits
Checkout

确认：

价格在付款前可见

必须存在：

5 Credits = $5
20 Credits = $15
50 Credits = $30

或者对应价格。

检查：

是否存在隐藏收费。

输出：

Payment Compliance Report

---

## 第五部分：用户数据与隐私审计

检查：

Supabase Auth

确认：

- Privacy Policy 已说明用户数据用途
- Cookie 使用说明
- 用户删除账户机制
- Contact Email

输出：

Privacy Compliance Report

---

## 第六部分：GDPR 审计（欧盟）

检查：

- Privacy Policy
- 数据收集说明
- 用户数据删除权
- 用户数据导出权

输出：

GDPR Report

并标注：

PASS
WARNING
FAIL

---

## 第七部分：AI 透明度审计

检查：

所有 AI 分析页面。

确认存在：

AI-generated analysis
May contain errors
Not professional advice

相关声明。

输出：

AI Transparency Report

---

## 第八部分：营销与 Landing Page 审计

审计首页。

检查：

是否清晰表达：

What is AlphaCouncil
Who is it for
How it works
Pricing
FAQ

输出：

Landing Page Conversion Report

并给出：

Top 10 Improvements

---

## 第九部分：SEO 审计

检查：

metadata
title
description
OpenGraph
robots
sitemap

输出：

SEO Audit Report

---

## 第十部分：上线阻断项

最终生成：

Launch Checklist

分类：

Critical Issues
High Priority
Medium Priority
Low Priority

并给出：

上线评分（0-100）

若低于90分：
禁止上线

若高于90分：
允许上线

最终输出：

AlphaCouncil Pre-Launch Audit Score
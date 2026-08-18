# 第一阶段：公司赚钱路数持续追踪系统

## 一、任务总览

将 `Company Overview（公司概览）`改为具有的核心能力。

### 本阶段的唯一核心任务

建立一个：

> **公司赚钱路数持续追踪系统（Business Engine Tracker）**

这个系统不负责写公司介绍，不负责生成公司百科，也不负责评价护城河。

它只回答：

> **这家公司现在靠什么赚钱？**
>
> **公司最近推出了哪些新的赚钱方式？**
>
> **哪些新业务正在从“公司战略/故事”变成真实的收入来源？**
>
> **哪些原有赚钱方式正在增长、停滞或衰退？**
>
> **与上一次 TradingAgents 分析相比，公司的赚钱结构发生了什么变化？**

---

# 二、产品定位

当前页面名称：

> **公司概览**

但内部产品定位必须是：

> **商业引擎追踪系统**

核心理念：

> **不是介绍公司，而是持续追踪公司的赚钱机器。**

不要把它做成传统的：

* 公司简介
* 公司历史
* CEO介绍
* 员工数量
* 产品介绍
* 公司百科
* SWOT
* AI生成公司介绍文章

本阶段只关注：

> **Business → Monetization → Revenue → Evolution**

---

# 三、本阶段严格禁止扩展范围

第一阶段只实现以下内容：

1. 当前赚钱业务
2. 新推出的赚钱业务
3. 新业务生命周期
4. 赚钱方式 / Monetization
5. 业务重要程度
6. 业务增长 / 衰退趋势
7. 业务历史变化
8. TradingAgents 每次分析后的业务结构更新
9. 业务变化证据
10. Business Evolution

### 本阶段暂时不要实现：

* 护城河
* 竞争优势评分
* ROIC
* 资本配置
* 投资论点
* 估值
* 股票评级
* 买入/卖出建议
* 风险评分
* Opportunity Score
* Moat Score
* Company Quality Score

这些全部留到后续阶段。

### 但是

数据结构必须允许未来扩展。

不要设计成无法继续扩展的临时方案。

---

# 四、先审计现有代码，再修改

在任何代码修改之前，先完整检查当前项目。

重点检查：

```text
1. Next.js 项目结构
2. 当前 Company / Stock 页面
3. 当前 Ticker 搜索流程
4. TradingAgents 集成方式
5. TradingAgents 输出结构
6. TradingAgents 分析结果保存方式
7. Supabase 数据结构
8. API Routes
9. Server Actions
10. 当前 UI Component
11. 当前 Design System
12. 当前 i18n
13. 当前 Research / Evidence 数据
14. 当前 Analysis History
15. 当前文章 / Research Console
```

重点搞清楚当前数据流：

```text
用户输入股票
    ↓
Ticker / Company
    ↓
TradingAgents
    ↓
Research
    ↓
Analysis
    ↓
Final Result
```

然后确定：

> 商业引擎追踪系统 最适合插入现有系统的什么位置。

---

# 五、审计完成后先输出报告

在修改代码之前输出：

```text
# 项目审计报告

## 当前架构
...

## TradingAgents 数据流
...

## 当前股票 / 公司数据结构
...

## 当前分析结果保存方式
...

## 当前 Evidence / Research 数据结构
...

## 当前 Company / Stock 页面
...

## 可以复用的现有组件
...

## 需要新增的组件
...

## 需要修改的文件
...

## 需要新增的文件
...

## 是否需要数据库 Migration
...

## 推荐实现方案
...

## 潜在风险
...
```

**审计完成后再开始实现。**

---

# 六、核心概念：什么叫 Business Engine

不要把 Business Engine 简单理解为：

> “公司有哪些业务部门？”

Business Engine 的定义是：

> **公司通过某种产品、服务或商业模式，持续从客户获得收入和现金流的机制。**

因此每一个 Business Engine 都必须回答：

```text
谁付钱？
↓
为什么付钱？
↓
购买什么？
↓
如何收费？
↓
如何产生收入？
↓
这个赚钱方式现在处于什么阶段？
↓
它的重要性是在上升还是下降？
```

---

# 七、Business Engine 数据模型

如果现有数据库已经有类似结构，优先扩展。

不要重复创建完全相同的数据模型。

建议建立：

```text
BusinessEngine
```

至少包含：

```text
id
company_id

name
description

customer_segment
product_or_service

monetization_model

revenue_role
lifecycle_stage

importance
trend

confidence

evidence

last_verified_at

created_at
updated_at
```

---

# 八、字段定义

## 8.1 name

表示具体的赚钱路数。

例如：

```text
Azure
AWS
iPhone
Google Search
Meta Advertising
Microsoft 365
Gaming
Data Center
Payment Processing
Cloud Infrastructure
```

不要写成过于宽泛的：

```text
Technology
Cloud
Consumer
Enterprise
AI
Software
```

除非它确实代表一个独立的赚钱机制。

---

# 九、description

一句话解释：

> 这项业务到底是怎么赚钱的。

例如：

```text
通过企业云基础设施使用量、长期合同和相关云服务获得收入。
```

不要生成大段介绍。

---

# 十、customer_segment

明确谁在付钱。

可以使用：

```text
消费者
企业
开发者
广告主
金融机构
政府
中小企业
创作者
平台商家
AI 公司
其他
未知
```

允许一个 Business Engine 对应多个客户群。

---

# 十一、product_or_service

明确公司通过什么产品或服务赚钱。

例如：

```text
Azure
Microsoft 365
iPhone
Google Search
AWS
Meta Ads
AWS Compute
Payment Network
```

---

# 十二、monetization_model

这是本模块非常重要的字段。

必须回答：

> **钱到底是怎么进入公司的？**

支持：

```text
订阅
按使用量收费
广告
交易手续费
硬件销售
软件授权
平台抽佣
云计算消费
佣金
长期合同
一次性购买
混合模式
未知
```

如果无法确认：

```text
未知
```

禁止 AI 猜测。

---

# 十三、Revenue Role

定义这个赚钱路数目前在公司中的角色：

```text
核心
主要
新兴
实验
衰退
未知
```

解释：

### 核心

目前是公司的核心赚钱引擎。

### 主要

重要收入来源，但不是绝对核心。

### 新兴

已经出现商业化，但规模还在发展。

### 实验

公司正在测试、推出或下注，但尚未证明商业价值。

### 衰退

历史上重要，但当前正在失去重要性。

### 未知

证据不足。

---

# 十四、Lifecycle Stage

建立独立的业务生命周期。

支持：

```text
已宣布
已推出
早期采用
已经产生收入
规模化增长
核心业务
衰退
重组
已放弃
未知
```

这非常重要。

因为：

> “公司宣布一个业务”

不等于：

> “这个业务已经赚钱”。

必须追踪：

```text
宣布
↓
推出
↓
用户采用
↓
产生收入
↓
规模化
↓
成为核心业务
```

也允许：

```text
推出
↓
采用不及预期
↓
衰退
↓
重组
↓
放弃
```

---

# 十五、Business Engine 状态

每个 Business Engine 必须保存：

```text
当前状态
上一次状态
趋势
置信度
最后验证时间
```

趋势：

```text
上升
稳定
下降
未知
```

置信度：

```text
高
中
低
```

---

# 十六、Evidence 证据系统

每一个重要 Business Engine 状态必须尽可能绑定 Evidence。

至少包括：

```text
来源
来源类型
日期
事实 / Claim
影响
方向
置信度
```

例如：

```text
来源：
公司财报

日期：
2026-08-15

事实：
云业务收入同比明显增长。

影响：
Azure Business Engine

方向：
正面

置信度：
高
```

---

# 十七、优先复用现有 Evidence 系统

如果 TradingAgents 当前已经拥有：

* 新闻来源
* 公司财报
* Research
* Citation
* Search Result
* Earnings Data
* Analyst Research

必须优先复用。

不要重新建立一套完全独立的数据来源体系。

---

# 十八、严格禁止 AI 编造事实

如果没有足够证据：

```text
未知
```

或者：

```text
证据不足
```

禁止 AI 猜测：

* 收入
* 收入占比
* 市场份额
* 用户数量
* 采用率
* 利润率
* 商业化程度
* 客户数量

尤其禁止：

> 为了让 Company Overview 看起来完整而补充不存在的数据。

---

# 十九、TradingAgents 集成

这是本阶段最核心的功能。

当前：

```text
用户
↓
Ticker
↓
TradingAgents
↓
Analysis
```

升级为：

```text
用户
↓
Ticker
↓
TradingAgents
↓
Analysis
↓
Business Engine Scan
↓
与历史 Business State 比较
↓
识别变化
↓
更新 Business Engine
↓
保存 Snapshot
```

---

# 二十、每一次 TradingAgents 更新必须扫描公司赚钱路数

每次分析完成后，系统自动回答：

### 问题 1

> 公司目前有哪些主要赚钱引擎？

### 问题 2

> 哪些赚钱引擎正在增长？

### 问题 3

> 哪些赚钱引擎正在下降？

### 问题 4

> 公司最近推出或宣布了哪些新的商业模式？

### 问题 5

> 哪些新业务已经开始出现真实商业化证据？

### 问题 6

> 与上一次分析相比，哪些赚钱路数的重要性发生了变化？

---

# 二十一、Business Engine Scan 不是重新生成公司介绍

禁止：

```text
TradingAgents
↓
AI
↓
重新写一篇 Company Overview
↓
覆盖旧内容
```

必须：

```text
历史 Business State
+
本次 TradingAgents 新证据
↓
Business Engine Evaluation
↓
Change Detection
↓
更新状态
↓
保存历史 Snapshot
```

核心原则：

> **公司概览是一个持续变化的状态系统，不是一篇 AI 文章。**

---

# 二十二、New Business Detection

系统必须主动发现：

> **公司最近推出了什么新的赚钱方式？**

例如公司宣布：

> 推出 AI Agent 产品。

系统应该记录：

```text
新业务：
AI Agent

生命周期：
已推出

客户：
企业

收费方式：
订阅 + 按使用量

商业化：
早期

收入：
未知

置信度：
中
```

而不是直接写：

```text
AI Agent 已成为新的收入引擎
```

除非有证据证明。

---

# 二十三、必须区分“推出业务”和“真正赚钱”

这是本系统最重要的逻辑。

例如：

```text
公司宣布 AI 产品
```

只能说明：

```text
已宣布
```

如果公司正式上线：

```text
已推出
```

如果出现客户采用：

```text
早期采用
```

如果出现明确收入：

```text
已经产生收入
```

如果开始快速扩大：

```text
规模化增长
```

如果已经成为主要收入来源：

```text
核心业务
```

因此系统必须追踪：

```text
宣布
→
推出
→
采用
→
收入
→
规模化
→
核心
```

这让 AlphaCouncil 能够回答：

> **公司是在讲一个新故事，还是已经把故事变成了真实的赚钱机器？**

---

# 二十四、Business Engine Change Detection

每一次 TradingAgents 分析都必须：

```text
Previous State
vs
New Evidence
```

检测：

```text
新出现
增长
稳定
减弱
衰退
升级
降级
放弃
未知
```

例如：

```text
Azure

上一次：
主要 / 规模化增长

本次：
核心 / 规模化增长

变化：
升级

原因：
收入贡献和战略重要性继续提升。

置信度：
高
```

---

# 二十五、Business Engine Snapshot

不能覆盖历史。

建立：

```text
BusinessEngineSnapshot
```

至少保存：

```text
id
company_id
business_engine_id
run_id
timestamp

revenue_role
lifecycle_stage
importance
trend
confidence

evidence_summary
```

每次 TradingAgents 分析完成之后创建新的 Snapshot。

例如：

```text
2026-07-01
2026-07-08
2026-07-15
2026-07-22
2026-08-01
2026-08-17
```

以后可以直接查看：

> 这个业务过去几个月到底发生了什么。

---

# 二十六、Business Evolution

Company Overview 增加：

```text
业务演化
```

这个区域回答：

> **公司的赚钱机器是怎么变化的？**

例如：

```text
2022
Gaming
核心

2023
Data Center
新兴 ↑

2024
AI Infrastructure
新兴 ↑

2025
AI Infrastructure
核心 ↑

2026
AI Software
早期采用
```

第一阶段不需要复杂图表。

先实现：

```text
时间
+
Business Engine
+
状态
+
变化
```

---

# 二十七、页面结构

Company Overview 第一阶段建议只包含以下区域：

```text
COMPANY OVERVIEW

公司名称 / Ticker

Business Engine
这家公司现在如何赚钱，
以及未来的赚钱引擎正在从哪里出现。

────────────────────────

当前赚钱引擎

────────────────────────

新兴赚钱引擎

────────────────────────

衰退中的赚钱引擎

────────────────────────

业务演化

────────────────────────

最近发生的业务变化
```

---

# 二十八、当前赚钱引擎 UI

例如：

```text
当前赚钱引擎

Azure
核心 ↑
按使用量 / 订阅

Microsoft 365
核心 →
订阅

Advertising
主要 ↑
广告

Gaming
主要 →
硬件 / 内容 / 订阅
```

点击某个业务后显示：

```text
Azure

如何赚钱
通过企业云基础设施使用量、
长期合同和相关云服务获得收入。

客户
企业
开发者
AI 公司

收费方式
按使用量
订阅
长期合同

当前状态
核心 ↑

最近变化
...

证据
...

最后验证
...
```

---

# 二十九、新兴赚钱引擎 UI

例如：

```text
新兴赚钱引擎

AI Agents
已推出 → 早期采用

AI Software
早期采用 ↑

Enterprise AI
实验
```

每个新业务必须能够看到：

```text
是什么？
谁付钱？
怎么收费？
目前处于哪个生命周期？
有没有收入证据？
```

---

# 三十、衰退业务

不能只展示公司的好消息。

增加：

```text
衰退中的赚钱引擎
```

例如：

```text
Legacy Hardware
衰退 ↓

原因：
客户需求向新产品迁移。

证据：
...
```

如果已经退出：

```text
已放弃
```

---

# 三十一、最近业务变化

页面增加：

```text
最近业务变化
```

只显示重要变化。

例如：

```text
+ AI Software
新业务推出

↑ Azure
从“主要”升级为“核心”

↓ Legacy Hardware
收入重要性下降

→ Gaming
保持稳定
```

每一个变化都必须能够点击查看：

```text
发生了什么？
为什么变化？
依据是什么？
置信度是多少？
```

---

# 三十二、变化重要性

不要把每条新闻都当成 Business Engine Change。

建立：

```text
变化重要性

高
中
低
```

页面默认只展示：

```text
高
中
```

低重要性变化可以隐藏。

---

# 三十三、重复证据不能制造虚假变化

例如同一条新闻被多个来源重复报道。

不能因为：

```text
5 个新闻来源
```

就错误判断：

> Business Engine 强烈增长。

必须考虑：

```text
Evidence Strength
Evidence Recency
Evidence Consistency
Evidence Materiality
Duplicate Detection
```

重复新闻应该去重。

---

# 三十四、首次分析

如果某家公司从未建立 Business Engine：

```text
TradingAgents
↓
Business Engine Scan
↓
建立 Baseline
```

页面显示：

```text
首次建立业务基线

Baseline Established
```

不要显示：

```text
增长
```

因为没有历史状态可比较。

---

# 三十五、后续分析

第二次及以后：

```text
Previous Business State
+
New Evidence
↓
Comparison
↓
Change
```

如果没有变化：

```text
稳定
```

如果有变化：

```text
增长 / 衰退 / 新业务 / 升级 / 降级
```

---

# 三十六、AI 输出必须结构化

不要：

```text
LLM
↓
Markdown
↓
直接渲染
```

必须：

```text
LLM
↓
Structured JSON
↓
Schema Validation
↓
Normalization
↓
Database
↓
UI
```

例如：

```json
{
  "business_engine": {
    "name": "Azure",
    "description": "...",
    "customer_segment": ["Enterprise", "Developers"],
    "monetization_model": ["Usage-based", "Subscription"],
    "revenue_role": "CORE",
    "lifecycle_stage": "SCALING",
    "trend": "UP",
    "confidence": "HIGH"
  },
  "change": {
    "type": "STRENGTHENED",
    "materiality": "HIGH",
    "reason": "...",
    "evidence": []
  }
}
```

具体 JSON Schema 根据现有项目技术架构实现。

---

# 三十七、AI 必须区分事实和推断

每个 Business Engine 分析至少分成：

```text
事实
推断
置信度
```

例如：

```text
事实：
公司财报显示云收入增长。

推断：
该业务的重要性进一步提升。

置信度：
高
```

不要把：

> AI 推测

直接写成：

> 公司事实。

---

# 三十八、Business Engine 的“赚钱路径”

这是页面中非常重要的一个字段。

每一个 Business Engine 必须能够展示：

```text
客户
↓
产品 / 服务
↓
使用
↓
收费
↓
收入
```

例如：

```text
AI 公司
↓
Azure GPU Infrastructure
↓
Compute Consumption
↓
Usage-based Pricing
↓
Cloud Revenue
```

第一阶段不要做复杂流程图。

可以先采用文字结构：

```text
客户：
AI 公司 / 企业

产品：
Cloud Infrastructure

收费：
按使用量

收入：
Cloud Revenue
```

未来再升级为可视化 Business Engine Map。

---

# 三十九、UI 设计要求

必须延续 AlphaCouncil 当前设计语言：

```text
Apple-like
Minimal
Institutional
High information density
Clean typography
Strong hierarchy
```

避免：

```text
SaaS Dashboard
大量彩色卡片
大量渐变
AI 紫色渐变
大面积背景色
过度圆角
大量图标
复杂动画
```

优先使用：

```text
Typography
Divider
Whitespace
Small State Indicator
Dense Information Rows
Timeline
```

---

# 四十、不要把页面做成卡片墙

错误：

```text
[业务卡片]
[业务卡片]
[业务卡片]
[业务卡片]
[业务卡片]
```

推荐：

```text
BUSINESS ENGINE

Azure        CORE ↑        Usage-based
M365         CORE →        Subscription
Gaming       MAJOR →       Hardware / Content
AI Agents    EMERGING ↑    Subscription / Usage
```

用信息行、分隔线和层级表达信息。

---

# 四十一、Responsive

必须支持：

```text
Desktop
Tablet
Mobile
```

Desktop：

信息密度高。

Mobile：

改成：

```text
公司信息

Business Engine

当前赚钱引擎

新兴赚钱引擎

衰退业务

业务演化

最近变化
```

禁止横向溢出。

---

# 四十二、i18n

必须继续使用现有国际化架构。

如果项目当前使用：

```text
messages/en.json
messages/zh.json
```

继续沿用。

不要在 TSX 中直接写中文。

内部状态使用统一 enum，例如：

```text
CORE
MAJOR
EMERGING
EXPERIMENTAL
DECLINING
UNKNOWN
```

UI 再通过 i18n 翻译。

---

# 四十三、状态枚举统一

Revenue Role：

```text
CORE
MAJOR
EMERGING
EXPERIMENTAL
DECLINING
UNKNOWN
```

Lifecycle：

```text
ANNOUNCED
LAUNCHED
EARLY_ADOPTION
REVENUE_GENERATING
SCALING
CORE
DECLINING
RESTRUCTURING
ABANDONED
UNKNOWN
```

Trend：

```text
UP
STABLE
DOWN
UNKNOWN
```

Confidence：

```text
HIGH
MEDIUM
LOW
```

Change：

```text
NEW
GROWING
STABLE
WEAKENING
DECLINING
PROMOTED
DEMOTED
ABANDONED
UNCERTAIN
```

不要在不同文件中创造另一套类似 enum。

---

# 四十四、TradingAgents 失败与 Business Engine 更新失败必须解耦

如果：

```text
TradingAgents Analysis
```

成功，但：

```text
Business Engine Update
```

失败。

不能让整个 TradingAgents 分析失败。

应该：

```text
TradingAgents
SUCCESS

Business Engine Update
FAILED

Retry available
```

Company Overview 更新属于增强层。

不能破坏核心分析流程。

---

# 四十五、异步更新

如果当前架构允许：

```text
TradingAgents
    │
    ├── 投资分析
    │
    └── Business Engine Update
```

Business Engine Update 可以异步执行。

UI 显示：

```text
分析完成

正在更新公司业务状态...
```

完成：

```text
公司业务状态已更新
```

失败：

```text
公司业务状态更新失败
[重试]
```

---

# 四十六、测试要求

至少完成以下测试。

## 测试 1：首次分析

输入：

```text
NVDA
```

第一次运行。

预期：

```text
建立 Business Engine Baseline
```

---

## 测试 2：没有重大变化

再次分析相同公司，没有明显新证据。

预期：

```text
Business Engine
稳定
```

不能制造变化。

---

## 测试 3：新业务

出现新的业务发布。

预期：

```text
NEW BUSINESS
```

并进入：

```text
ANNOUNCED
```

或者：

```text
LAUNCHED
```

不能直接进入：

```text
CORE
```

---

## 测试 4：新业务产生收入

出现可靠收入证据。

预期：

```text
REVENUE_GENERATING
```

---

## 测试 5：业务规模化

持续出现增长证据。

预期：

```text
SCALING
```

---

## 测试 6：业务衰退

出现可靠负面证据。

预期：

```text
DECLINING
```

---

## 测试 7：业务放弃

公司明确退出业务。

预期：

```text
ABANDONED
```

---

## 测试 8：证据不足

预期：

```text
UNKNOWN
```

或者：

```text
LOW CONFIDENCE
```

不能猜测。

---

## 测试 9：重复新闻

相同新闻被多个来源重复报道。

预期：

> 不产生虚假增长。

---

## 测试 10：Business Engine Update 失败

预期：

```text
TradingAgents 分析仍然成功。
```

---

# 四十七、代码质量

必须：

* TypeScript strict
* 完整类型
* AI 输出 Schema Validation
* Database Validation
* Server / Client Boundary 清晰
* Error Handling
* Loading State
* Empty State
* Retry
* Responsive
* i18n
* 不重复造轮子

禁止：

* 大量使用 `any`
* 在 UI 中直接调用 LLM
* LLM 输出直接进入 UI
* 硬编码 NVIDIA
* 硬编码某一家公司的业务
* 删除现有功能
* 无关的大规模重构
* 为第一阶段引入不必要的复杂依赖

---

# 四十八、架构原则

整个模块最终应该形成：

```text
TradingAgents
      ↓
Research / Evidence
      ↓
Business Engine Extractor
      ↓
Business Engine Evaluator
      ↓
State Change Detector
      ↓
Business Engine State
      ↓
Business Engine Snapshot
      ↓
Company Overview
```

未来再向下面扩展：

```text
Business Engine
      ↓
Competitive Engine
      ↓
Capital Engine
      ↓
Risk / Erosion Engine
      ↓
Investment Thesis
```

但：

> **现在只实现 Business Engine。**

---

# 四十九、第一阶段最终页面应该回答什么

用户打开一个公司的 Company Overview 后，30 秒内必须能够回答：

### 1

这家公司现在靠什么赚钱？

### 2

哪个赚钱引擎最重要？

### 3

哪些赚钱引擎正在增长？

### 4

公司最近推出了什么新的赚钱方式？

### 5

哪些新业务只是“故事”，哪些已经开始产生收入？

### 6

哪些赚钱方式正在衰退？

### 7

与上一次 TradingAgents 分析相比，公司的赚钱地图发生了什么变化？

如果页面不能回答这些问题，就说明第一阶段没有完成。

---

# 五十、最终验收标准

完成之后，我应该能够：

1. 搜索一个股票。
2. 运行 TradingAgents。
3. TradingAgents 正常生成原有分析结果。
4. 系统自动执行 Business Engine Scan。
5. 首次运行建立该公司的赚钱路数 Baseline。
6. Company Overview 展示当前赚钱引擎。
7. 展示每个赚钱引擎的客户。
8. 展示产品 / 服务。
9. 展示收费方式。
10. 展示业务重要程度。
11. 展示生命周期。
12. 展示增长 / 稳定 / 衰退趋势。
13. 自动发现新业务。
14. 区分“宣布业务”和“真正产生收入”。
15. 保存每一次 Business Engine Snapshot。
16. 第二次 TradingAgents 分析时与历史状态比较。
17. 自动识别业务变化。
18. 展示最近发生的业务变化。
19. 点击变化可以看到原因和证据。
20. 没有证据时显示未知，而不是 AI 猜测。
21. TradingAgents 正常分析不受 Business Engine Update 失败影响。
22. 页面支持 Desktop / Mobile。
23. 页面支持中英文。
24. 不破坏现有 AlphaCouncil 功能。

---

# 五十一、最终执行报告

全部完成后，输出：

```text
# 第一阶段实施报告

## 1. 项目审计结果
...

## 2. 架构设计
...

## 3. 新增文件
...

## 4. 修改文件
...

## 5. 数据库 Migration
...

## 6. Business Engine 数据模型
...

## 7. TradingAgents 集成方式
...

## 8. State Change Detection
...

## 9. Evidence 系统
...

## 10. Company Overview UI
...

## 11. i18n
...

## 12. 测试结果
...

## 13. lint
...

## 14. typecheck
...

## 15. build
...

## 16. 已知问题
...

## 17. 下一阶段建议
...
```

必须实际运行：

```text
lint
typecheck
test
build
```

并报告真实结果。

如果失败：

```text
状态：FAILED

原因：
...

影响：
...

建议：
...
```

不要隐藏错误。

---

# 最终产品原则

整个第一阶段始终遵循下面这句话：

> **不要告诉用户“这家公司有哪些业务”。**
>
> **要告诉用户“这家公司有哪些赚钱机器，以及这些赚钱机器正在发生什么变化”。**

最终 Company Overview 的核心应该是：

```text
公司
 ↓
赚钱引擎
 ↓
谁付钱
 ↓
怎么收费
 ↓
业务生命周期
 ↓
重要性
 ↓
增长 / 衰退
 ↓
新业务
 ↓
真实收入验证
 ↓
历史变化
```

最终目标：

> **让 商业引擎追踪系统 能持续观察一家公司的“赚钱地图”如何演化。**

而不是每次 TradingAgents 运行后，重新生成一篇公司介绍。

**第一阶段到此为止。不要自行扩展到护城河、估值、ROIC、投资论点或风险评分。**

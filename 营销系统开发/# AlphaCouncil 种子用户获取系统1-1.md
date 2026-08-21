# AlphaCouncil 种子用户获取系统（V1）

## Hermes 执行指令

版本：V1.0

目标：

30天内获得 30 个欧美真实种子用户

---

# 一、项目目标

当前阶段：

不要追求收入

不要追求 SEO

不要追求自动化矩阵

不要追求复杂运营系统

唯一目标：

获得：

- 30 个真实注册用户
- 10 个实际使用用户
- 5 个反馈用户

验证：

AlphaCouncil 是否具有真实市场需求

---

# 二、执行原则

Hermes 必须遵守：

## 原则1

不开发与种子用户获取无关的功能

禁止开发：

- Newsletter
- LinkedIn
- Discord
- SEO矩阵
- CRM
- Referral
- Community
- 多级会员

---

## 原则2

只保留最短增长路径

路径：

访问者

↓

看到分析案例

↓

注册

↓

免费体验

↓

留下反馈

---

## 原则3

所有新增功能必须服务于：

获得用户

而非展示技术能力

---

# 三、系统架构

构建两个Agent

---

Agent A

Research Agent

职责：

生成公开研究内容

---

Agent B

Content Agent

职责：

生成社交媒体传播内容

---

# 四、Research Agent

## 功能

每天自动运行 TradingAgents

分析固定股票

---

股票池

第一阶段固定：

NVDA

TSLA

META

AMD

PLTR

---

不要增加更多股票

保持稳定

---

## 执行时间

每天：

08:00 EST

---

## 输出格式

创建：

src/types/research.ts

```ts
export interface ResearchSummary {
  ticker: string;

  company: string;

  verdict: "Bullish" | "Neutral" | "Bearish";

  confidence: number;

  bullPoints: string[];

  bearPoints: string[];

  committeeSummary: string;

  createdAt: string;
}
```

---

## 数据保存

Supabase

新增表：

research_summaries

```sql
create table research_summaries (
 id uuid primary key default gen_random_uuid(),

 ticker text not null,

 company text not null,

 verdict text not null,

 confidence integer not null,

 bull_points jsonb,

 bear_points jsonb,

 committee_summary text,

 created_at timestamptz default now()
);
```

---

## 内容提炼规则

不要保存完整报告

只保存：

Bull Thesis

Bear Thesis

Committee Summary

---

最多：

300字

---

# 五、Content Agent

## 功能

读取：

research_summaries

自动生成：

Twitter内容

Reddit内容

---

## Twitter模板

生成格式：

```text
8 AI analysts debated NVDA.

Bull:
• CUDA moat remains dominant
• AI spending accelerating

Bear:
• Valuation remains elevated
• Export restrictions remain a risk

Result:
7/8 analysts bullish

Confidence:
84%

What would you do?
```

---

长度：

280字符以内

---

## Reddit模板

生成格式：

```text
We asked our AI Investment Committee to analyze NVDA.

Bull Case

• ...

Bear Case

• ...

Committee Verdict

Bullish

Confidence

84%

What do you think?
```

---

禁止：

注册链接

收费宣传

营销话术

---

目标：

获得讨论

---

## 存储

新增表：

content_posts

```sql
create table content_posts (
 id uuid primary key default gen_random_uuid(),

 ticker text,

 platform text,

 content text,

 created_at timestamptz default now()
);
```

---

# 六、首页新增板块

位置：

Hero下方

Global Market Dynamics上方

---

新增板块

Latest Committee Research

---

设计风格

保持当前 AlphaCouncil 风格

---

显示：

最近5份研究

---

卡片结构

Ticker

Verdict

Confidence

3 Core Insights

Read Research

---

示例

NVDA

Bullish

84%

• CUDA moat

• Enterprise AI growth

• Strong analyst consensus

[Read Research]

---

点击进入：

/stock/nvda

---

# 七、Join Beta模块

位置：

Latest Committee Research下方

---

新增区块

Join AlphaCouncil Beta

---

标题

Get Institutional Research Before Everyone Else

---

说明

Join our beta program and receive free AI-powered stock research.

---

输入框

仅保留：

Email

---

按钮

Join Beta

---

不要收集：

姓名

电话

职业

国家

---

# 八、Beta数据库

新增表

beta_waitlist

```sql
create table beta_waitlist (
 id uuid primary key default gen_random_uuid(),

 email text unique not null,

 source text default 'homepage',

 created_at timestamptz default now()
);
```

---

新增API

/api/beta/join

POST

---

请求

```json
{
  "email":"user@example.com"
}
```

---

响应

```json
{
  "success": true
}
```

---

# 九、免费体验机制

注册成功后

自动获得：

3 Credits

---

目的

体验完整分析流程

---

不要：

限制功能

不要：

弹窗收费

---

当前阶段重点：

获得反馈

---

# 十、反馈收集

新增页面

/feedback

---

内容

How was your experience?

---

评分

1-5

---

文本框

What would make AlphaCouncil more useful?

---

存入：

feedbacks

表

---

SQL

```sql
create table feedbacks (
 id uuid primary key default gen_random_uuid(),

 user_id uuid,

 rating integer,

 comment text,

 created_at timestamptz default now()
);
```

---

# 十一、导航调整

新增：

Beta

---

导航结构

Home

Research

Pricing

About

Beta

Login

---

# 十二、数据统计

新增：

Admin Dashboard

仅管理员可见

---

显示：

Beta用户数量

注册用户数量

分析次数

热门股票

反馈数量

---

不要做复杂图表

数字即可

---

# 十三、成功标准

30天内

达到：

30 Beta Users

10 Analysis Users

5 Feedback Users

---

达到即视为：

产品存在初步市场需求

---

# 十四、验收标准

Research Agent

✓ 每天生成5份研究摘要

Content Agent

✓ 自动生成Twitter内容

✓ 自动生成Reddit内容

Homepage

✓ Latest Committee Research

✓ Join Beta

Database

✓ research_summaries

✓ beta_waitlist

✓ feedbacks

User System

✓ 注册送3 Credits

Feedback

✓ 用户可提交反馈

Analytics

✓ 管理后台统计数据

---

重要说明

当前阶段：

不要继续开发高级功能

不要继续优化UI细节

不要继续扩展股票池

不要开发SEO矩阵

不要开发邮件系统

不要开发推荐系统

全部资源集中于：

获得30个真实欧美种子用户

验证AlphaCouncil市场需求

这是V1唯一目标。
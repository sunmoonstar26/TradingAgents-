// AnalysisResult 强类型契约 —— TradingAgents ↔ AlphaOS 之间唯一的运行时校验边界。
// 字段严格对应 website/api-server-zh/run_analysis_zh.py 实际写出的 JSON（见 run_analysis_zh.py:69-98, :225）。
import { z } from "zod";

const InvestmentDebateStateSchema = z.object({
  bull_history: z.string(),
  bear_history: z.string(),
  judge_decision: z.string(),
});

const RiskDebateStateSchema = z.object({
  aggressive_history: z.string(),
  conservative_history: z.string(),
  neutral_history: z.string(),
  judge_decision: z.string(),
});

/** run_analysis_zh.py:69-98 成功分支实际写出的字段 */
export const TARawResultSchema = z.object({
  ticker: z.string(),
  company_name: z.string(),
  trade_date: z.string(),
  signal: z.string(),
  report_dir: z.string().nullable().optional(),
  market_report: z.string(),
  sentiment_report: z.string(),
  news_report: z.string(),
  fundamentals_report: z.string(),
  investment_plan: z.string(),
  investment_debate_state: InvestmentDebateStateSchema,
  trader_investment_plan: z.string(),
  risk_debate_state: RiskDebateStateSchema,
  final_trade_decision: z.string(),
  // Python 侧 quote.get("d", 0) 在 Finnhub 显式返回 null 时会得到 None
  // 而不是默认值 0（见 run_analysis_zh.py:112-113），真实历史数据里存在这种情况
  price: z.number().nullable().optional(),
  change: z.number().nullable().optional(),
  changePercent: z.number().nullable().optional(),
  marketCap: z.string().optional(),
  pe: z.string().optional(),
  // 运行耗时/token 消耗/模型标签：run_analysis_zh.py 用 UsageMetadataCallbackHandler
  // 采集的真实值。历史样本 JSON 文件没有这三个字段，设为可选以保持兼容。
  runtime_ms: z.number().optional(),
  token_usage: z.number().optional(),
  model: z.string().optional(),
  // 分析完成后独立调用 Finnhub 抓取、经 LLM 筛选相关性+翻译+分类的结构化新闻
  // （标题/摘要为中文，category 为主题分类），历史样本 JSON 文件没有这个字段，
  // 设为可选并兜底空数组
  news_items: z
    .array(
      z.object({
        title: z.string(),
        summary: z.string().nullable().optional(),
        source: z.string().nullable().optional(),
        url: z.string().nullable().optional(),
        published_at: z.string(),
        category: z.string().optional(),
      })
    )
    .optional()
    .default([]),
  // 分析完成后从 fundamentals_report 中用 LLM 只提取资产负债表/现金流量表/
  // 利润表相关解读（简体中文），供财报解读版本历史使用；历史样本 JSON 文件
  // 没有这个字段，且提取失败时上游会兜底空字符串，设为可选并兜底空字符串
  financial_statement_analysis: z.string().optional().default(""),
  // 每个 Business Engine 的完整状态（Python 端 business_engine_extractor.py 输出）。
  // 历史样本 JSON 文件没有这个字段，且提取失败时上游兜底空数组，设为可选并兜底空数组。
  business_engine_scan: z
    .array(
      z.object({
        name: z.string(),
        description: z.string(),
        customer_segment: z.array(z.string()),
        product_or_service: z.string().nullable().optional(),
        monetization_model: z.array(z.string()),
        revenue_role: z.string(),
        lifecycle_stage: z.string(),
        trend: z.string(),
        confidence: z.string(),
        evidence: z.array(
          z.object({
            source: z.string(),
            source_type: z.enum(["news", "financial_statement"]),
            date: z.string(),
            claim: z.string(),
            direction: z.enum(["POSITIVE", "NEGATIVE", "NEUTRAL"]),
            confidence: z.string(),
          })
        ),
      })
    )
    .optional()
    .default([]),
});

/** run_analysis_zh.py:225 失败分支写出的字段（子进程抛异常时的另一种 shape） */
export const TAErrorResultSchema = z.object({
  ticker: z.string(),
  signal: z.string(),
  error: z.string(),
  status: z.literal("failed"),
});

/**
 * TradingAgents 唯一输出的判别联合类型。
 * 成功分支的原始 JSON 不带 status 字段，这里用 preprocess 补一个
 * status: "completed"，使其可以和失败分支一起走 discriminatedUnion，
 * 避免下游用可选链默默吞掉字段缺失（AlphaOS 原则：契约必须被强制）。
 */
export const TAResultSchema = z.preprocess(
  (val) => {
    if (val && typeof val === "object" && !("status" in val)) {
      return { ...val, status: "completed" as const };
    }
    return val;
  },
  z.discriminatedUnion("status", [
    TARawResultSchema.extend({ status: z.literal("completed") }),
    TAErrorResultSchema,
  ])
);

export type TARawResult = z.infer<typeof TARawResultSchema>;
export type TAErrorResult = z.infer<typeof TAErrorResultSchema>;
export type TAResult = z.infer<typeof TAResultSchema>;

export type ParseTAResult =
  | { ok: true; data: TARawResult }
  | { ok: false; error: TAErrorResult | { ticker?: string; message: string } };

/**
 * 校验 Python 侧写出的原始结果。契约被打破时（字段缺失/类型不符）
 * 必须在这里报错，而不是让 ta-mapper.ts 用可选链静默吞掉。
 */
export function parseTAResult(raw: unknown): ParseTAResult {
  const parsed = TAResultSchema.safeParse(raw);
  if (!parsed.success) {
    return {
      ok: false,
      error: {
        ticker:
          raw && typeof raw === "object" && "ticker" in raw
            ? String((raw as Record<string, unknown>).ticker)
            : undefined,
        message: parsed.error.message,
      },
    };
  }
  if (parsed.data.status === "failed") {
    return { ok: false, error: parsed.data };
  }
  const { status: _status, ...data } = parsed.data;
  return { ok: true, data };
}

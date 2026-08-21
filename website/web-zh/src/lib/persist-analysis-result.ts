// 持久化适配层：把校验通过的 TARawResult 落进 AlphaOS Company 四层模型（本地 Postgres）。
// company/analysis_result 是所有下游模块的前提，保留在此处直接写入；
// timeline/thesis/dashboard/research_history 四个模块通过 event-bus 解耦，
// 各自的写入逻辑见 ./analysis-subscribers/。
import type { TARawResult } from "@/schemas/analysis-result";
import type { StockDetail } from "@/types";
import type { AnalysisCompletedEvent } from "@/types/events";
import { getDb } from "./db";
import { emit } from "./event-bus";
import "./analysis-subscribers/write-timeline-event";
import "./analysis-subscribers/write-thesis";
import "./analysis-subscribers/write-dashboard";
import "./analysis-subscribers/write-research-history";
import "./analysis-subscribers/write-business-engine";

export async function persistAnalysisResult(
  raw: TARawResult,
  detail: StockDetail,
  sessionId: string
): Promise<void> {
  const sql = getDb();
  const ticker = raw.ticker.toUpperCase();

  // 1. upsert companies（按 ticker 唯一）
  const [company] = await sql<{ id: string }[]>`
    insert into companies (ticker, name, market)
    values (${ticker}, ${detail.name}, 'US')
    on conflict (ticker) do update set name = excluded.name, updated_at = now()
    returning id
  `;
  const companyId = company.id;

  // 2. insert analysis_results（session_id 唯一，永不覆盖）
  const [analysisResult] = await sql<{ id: string }[]>`
    insert into analysis_results (
      company_id, session_id, raw_json, summary, recommendation, confidence, risk, opportunity, model
    ) values (
      ${companyId},
      ${sessionId},
      ${sql.json(raw)},
      ${detail.committeeDecision.rationale},
      ${raw.signal},
      ${detail.committeeDecision.conviction},
      ${detail.riskExposures[0]?.value ?? null},
      ${detail.committeeDecision.recommendedExposure},
      ${raw.model ?? null}
    )
    returning id
  `;
  const analysisResultId = analysisResult.id;

  // 3. 触发事件，Timeline/Thesis/Dashboard/ResearchHistory 各自的订阅者独立写入
  const event: AnalysisCompletedEvent = {
    companyId,
    analysisResultId,
    sessionId,
    raw,
    detail,
  };
  // event-bus 会让全部订阅者都执行完毕（互不阻断），再把期间捕获的错误汇总返回；
  // 只要有订阅者失败，就在这里聚合成一个 Error 抛出，
  // 恢复调用方（analysis-store.ts）原本能看到失败的可观测性契约。
  const errors = await emit("analysis.completed", event);
  if (errors.length > 0) {
    throw new Error(
      `[persistAnalysisResult] ${errors.length} 个订阅者执行失败: ${errors
        .map((e) => (e instanceof Error ? e.message : String(e)))
        .join("; ")}`
    );
  }
}

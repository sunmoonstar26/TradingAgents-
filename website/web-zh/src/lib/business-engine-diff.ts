// 确定性的 Business Engine 状态变化判定：输入输出都是已校验过的枚举值，
// 不调用 LLM，保证"重复证据不能制造虚假变化"——变化类型必须可解释、可复现。
import {
  RevenueRole, LifecycleStage, EngineTrend, EngineChangeType,
} from "@/types/enums";
import type { BusinessEngine, ExtractedBusinessEngine } from "@/types";

const REVENUE_ROLE_RANK: Record<RevenueRole, number> = {
  [RevenueRole.DECLINING]: 0,
  [RevenueRole.EXPERIMENTAL]: 1,
  [RevenueRole.EMERGING]: 2,
  [RevenueRole.MAJOR]: 3,
  [RevenueRole.CORE]: 4,
  [RevenueRole.UNKNOWN]: -1, // UNKNOWN 不参与升降判断，见下方 compareRank 处理
};

function compareRoleRank(previous: RevenueRole, incoming: RevenueRole): number {
  if (previous === RevenueRole.UNKNOWN || incoming === RevenueRole.UNKNOWN) return 0;
  return REVENUE_ROLE_RANK[incoming] - REVENUE_ROLE_RANK[previous];
}

/**
 * 判定单个 Business Engine 相对上一次记录状态发生的变化类型。
 *
 * @param previous 该业务在数据库中的上一条记录；为 null 表示这个名字还没有记录。
 * @param incoming 本次分析新提取出的业务状态。
 * @param companyHasBaseline 该公司是否已经有过任意 Business Engine 记录（公司级事实，
 *   与具体某个 engine 无关）。用于区分 previous 为 null 的两种情况：
 *   - false：公司从未有过任何业务记录 —— 真正的首次建立基线，判定为 BASELINE。
 *   - true：公司已有其他业务记录，只是这个名字是新出现的 —— 判定为 NEW（新识别的赚钱路数）。
 */
export function detectChange(
  previous: BusinessEngine | null,
  incoming: ExtractedBusinessEngine,
  companyHasBaseline: boolean
): { changeType: EngineChangeType; reason: string } {
  if (!previous) {
    if (companyHasBaseline) {
      return { changeType: EngineChangeType.NEW, reason: "新识别的赚钱路数" };
    }
    return { changeType: EngineChangeType.BASELINE, reason: "首次建立业务基线" };
  }

  if (
    incoming.lifecycle_stage === LifecycleStage.ABANDONED &&
    previous.lifecycle_stage !== LifecycleStage.ABANDONED
  ) {
    return { changeType: EngineChangeType.ABANDONED, reason: "公司已明确退出该业务" };
  }

  const roleRankChanged = compareRoleRank(previous.revenue_role, incoming.revenue_role);
  if (roleRankChanged > 0) {
    return { changeType: EngineChangeType.PROMOTED, reason: "营收角色升级" };
  }
  if (roleRankChanged < 0) {
    return { changeType: EngineChangeType.DEMOTED, reason: "营收角色降级" };
  }

  if (incoming.trend === EngineTrend.UP && previous.trend !== EngineTrend.UP) {
    return { changeType: EngineChangeType.GROWING, reason: "趋势转为上升" };
  }
  if (incoming.trend === EngineTrend.DOWN && previous.trend !== EngineTrend.DOWN) {
    return { changeType: EngineChangeType.WEAKENING, reason: "趋势转为下降" };
  }

  const noChange =
    previous.revenue_role === incoming.revenue_role &&
    previous.lifecycle_stage === incoming.lifecycle_stage &&
    previous.trend === incoming.trend &&
    previous.confidence === incoming.confidence;
  if (noChange) {
    return { changeType: EngineChangeType.STABLE, reason: "无明显变化" };
  }

  return {
    changeType: EngineChangeType.UNCERTAIN,
    reason: "状态发生变化但无法归类为明确的升级/降级",
  };
}

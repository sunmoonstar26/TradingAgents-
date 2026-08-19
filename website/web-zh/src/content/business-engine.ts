// website/web-zh/src/content/business-engine.ts
// Business Engine Tracker 板块的全部中文展示文案，组件内不出现硬编码字符串。

import {
  RevenueRole, LifecycleStage, EngineChangeType,
  CustomerSegment, MonetizationModel, EngineTrend, EngineConfidence,
} from "@/types/enums";

export const REVENUE_ROLE_LABELS: Record<RevenueRole, string> = {
  [RevenueRole.CORE]: "核心业务",
  [RevenueRole.MAJOR]: "主要业务",
  [RevenueRole.EMERGING]: "新兴业务",
  [RevenueRole.EXPERIMENTAL]: "实验性业务",
  [RevenueRole.DECLINING]: "衰退业务",
  [RevenueRole.UNKNOWN]: "未知",
};

export const LIFECYCLE_STAGE_LABELS: Record<LifecycleStage, string> = {
  [LifecycleStage.ANNOUNCED]: "已宣布",
  [LifecycleStage.LAUNCHED]: "已推出",
  [LifecycleStage.EARLY_ADOPTION]: "早期采用",
  [LifecycleStage.REVENUE_GENERATING]: "产生营收",
  [LifecycleStage.SCALING]: "规模化扩张",
  [LifecycleStage.CORE]: "核心运营",
  [LifecycleStage.DECLINING]: "衰退期",
  [LifecycleStage.RESTRUCTURING]: "重组中",
  [LifecycleStage.ABANDONED]: "已放弃",
  [LifecycleStage.UNKNOWN]: "未知",
};

export const CHANGE_TYPE_LABELS: Record<EngineChangeType, string> = {
  [EngineChangeType.BASELINE]: "基线已建立",
  [EngineChangeType.NEW]: "新识别",
  [EngineChangeType.GROWING]: "上升趋势",
  [EngineChangeType.STABLE]: "保持稳定",
  [EngineChangeType.WEAKENING]: "增长放缓",
  [EngineChangeType.DECLINING]: "衰退",
  [EngineChangeType.PROMOTED]: "升级",
  [EngineChangeType.DEMOTED]: "降级",
  [EngineChangeType.ABANDONED]: "已放弃",
  [EngineChangeType.UNCERTAIN]: "状态变化",
  [EngineChangeType.MANUAL_EDIT]: "人工修改",
};

export const CUSTOMER_SEGMENT_LABELS: Record<CustomerSegment, string> = {
  [CustomerSegment.CONSUMER]: "消费者",
  [CustomerSegment.ENTERPRISE]: "企业",
  [CustomerSegment.DEVELOPER]: "开发者",
  [CustomerSegment.ADVERTISER]: "广告主",
  [CustomerSegment.FINANCIAL_INSTITUTION]: "金融机构",
  [CustomerSegment.GOVERNMENT]: "政府",
  [CustomerSegment.SMB]: "中小企业",
  [CustomerSegment.CREATOR]: "创作者",
  [CustomerSegment.PLATFORM_MERCHANT]: "平台商家",
  [CustomerSegment.AI_COMPANY]: "AI 公司",
  [CustomerSegment.OTHER]: "其他",
  [CustomerSegment.UNKNOWN]: "未知",
};

export const MONETIZATION_MODEL_LABELS: Record<MonetizationModel, string> = {
  [MonetizationModel.SUBSCRIPTION]: "订阅制",
  [MonetizationModel.USAGE_BASED]: "按使用量收费",
  [MonetizationModel.ADVERTISING]: "广告",
  [MonetizationModel.TRANSACTION_FEE]: "交易手续费",
  [MonetizationModel.HARDWARE_SALES]: "硬件销售",
  [MonetizationModel.SOFTWARE_LICENSE]: "软件授权",
  [MonetizationModel.PLATFORM_COMMISSION]: "平台抽佣",
  [MonetizationModel.LONG_TERM_CONTRACT]: "长期合同",
  [MonetizationModel.ONE_TIME_PURCHASE]: "一次性购买",
  [MonetizationModel.HYBRID]: "混合模式",
  [MonetizationModel.UNKNOWN]: "未知",
};

export const ENGINE_TREND_LABELS: Record<EngineTrend, string> = {
  [EngineTrend.UP]: "上升",
  [EngineTrend.STABLE]: "稳定",
  [EngineTrend.DOWN]: "下降",
  [EngineTrend.UNKNOWN]: "未知",
};

export const ENGINE_CONFIDENCE_LABELS: Record<EngineConfidence, string> = {
  [EngineConfidence.HIGH]: "高",
  [EngineConfidence.MEDIUM]: "中",
  [EngineConfidence.LOW]: "低",
};

export const BUSINESS_ENGINE_TEXT = {
  sectionTitle: "商业引擎",
  cardTitle: "赚钱路数追踪",
  emptyTitle: "尚未建立业务基线",
  emptySubtitle: "运行首次分析后自动生成 Business Engine",
  expandLabel: "查看详情与证据",
  collapseLabel: "收起",
  customerSegmentLabel: "客户群体",
  productOrServiceLabel: "产品 / 服务",
  monetizationModelLabel: "变现模式",
  confidenceLabel: "置信度",
  evidenceLabel: "证据",
  evidenceSourceTypeLabels: {
    news: "新闻",
    financial_statement: "财报",
  } as Record<"news" | "financial_statement", string>,
  evidenceDirectionLabels: {
    POSITIVE: "正面",
    NEGATIVE: "负面",
    NEUTRAL: "中性",
  } as Record<"POSITIVE" | "NEGATIVE" | "NEUTRAL", string>,
} as const;

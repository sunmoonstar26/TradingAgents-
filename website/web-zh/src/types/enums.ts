// website/web/src/types/enums.ts

export enum Signal {
  STRONG_BUY  = "STRONG_BUY",
  BUY         = "BUY",
  HOLD        = "HOLD",
  SELL        = "SELL",
  STRONG_SELL = "STRONG_SELL",
}

export enum RiskLevel {
  LOW    = "LOW",
  MEDIUM = "MEDIUM",
  HIGH   = "HIGH",
  DANGER = "DANGER",
}

export enum AlertLevel {
  DANGER  = "DANGER",
  WARNING = "WARNING",
  WATCH   = "WATCH",
}

export enum Verdict {
  BULLISH = "BULLISH",
  BEARISH = "BEARISH",
  NEUTRAL = "NEUTRAL",
}

export enum AgentPersonality {
  FUNDAMENTAL = "fundamental",
  TECHNICAL   = "technical",
  SENTIMENT   = "sentiment",
  RISK        = "risk",
  NEWS        = "news",
  MACRO       = "macro",
}

export enum RevenueRole {
  CORE         = "CORE",
  MAJOR        = "MAJOR",
  EMERGING     = "EMERGING",
  EXPERIMENTAL = "EXPERIMENTAL",
  DECLINING    = "DECLINING",
  UNKNOWN      = "UNKNOWN",
}

export enum LifecycleStage {
  ANNOUNCED          = "ANNOUNCED",
  LAUNCHED           = "LAUNCHED",
  EARLY_ADOPTION     = "EARLY_ADOPTION",
  REVENUE_GENERATING = "REVENUE_GENERATING",
  SCALING            = "SCALING",
  CORE               = "CORE",
  DECLINING          = "DECLINING",
  RESTRUCTURING      = "RESTRUCTURING",
  ABANDONED          = "ABANDONED",
  UNKNOWN            = "UNKNOWN",
}

export enum EngineTrend {
  UP      = "UP",
  STABLE  = "STABLE",
  DOWN    = "DOWN",
  UNKNOWN = "UNKNOWN",
}

export enum EngineConfidence {
  HIGH   = "HIGH",
  MEDIUM = "MEDIUM",
  LOW    = "LOW",
}

export enum EngineChangeType {
  BASELINE    = "BASELINE",
  NEW         = "NEW",
  GROWING     = "GROWING",
  STABLE      = "STABLE",
  WEAKENING   = "WEAKENING",
  DECLINING   = "DECLINING",
  PROMOTED    = "PROMOTED",
  DEMOTED     = "DEMOTED",
  ABANDONED   = "ABANDONED",
  UNCERTAIN   = "UNCERTAIN",
  MANUAL_EDIT = "MANUAL_EDIT",
}

export enum CustomerSegment {
  CONSUMER               = "CONSUMER",
  ENTERPRISE             = "ENTERPRISE",
  DEVELOPER              = "DEVELOPER",
  ADVERTISER             = "ADVERTISER",
  FINANCIAL_INSTITUTION  = "FINANCIAL_INSTITUTION",
  GOVERNMENT             = "GOVERNMENT",
  SMB                    = "SMB",
  CREATOR                = "CREATOR",
  PLATFORM_MERCHANT      = "PLATFORM_MERCHANT",
  AI_COMPANY             = "AI_COMPANY",
  OTHER                  = "OTHER",
  UNKNOWN                = "UNKNOWN",
}

export enum MonetizationModel {
  SUBSCRIPTION        = "SUBSCRIPTION",
  USAGE_BASED         = "USAGE_BASED",
  ADVERTISING         = "ADVERTISING",
  TRANSACTION_FEE     = "TRANSACTION_FEE",
  HARDWARE_SALES      = "HARDWARE_SALES",
  SOFTWARE_LICENSE    = "SOFTWARE_LICENSE",
  PLATFORM_COMMISSION = "PLATFORM_COMMISSION",
  LONG_TERM_CONTRACT  = "LONG_TERM_CONTRACT",
  ONE_TIME_PURCHASE   = "ONE_TIME_PURCHASE",
  HYBRID              = "HYBRID",
  UNKNOWN             = "UNKNOWN",
}

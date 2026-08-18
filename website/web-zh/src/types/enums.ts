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

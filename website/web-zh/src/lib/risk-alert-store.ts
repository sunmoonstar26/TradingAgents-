"use client";

import { RiskAlert } from "../types";
import { AlertLevel } from "../types/enums";

const STORAGE_KEY = "tradingagents_risk_alerts";

const SEVERITY_LEVEL: Record<string, AlertLevel> = {
  high: AlertLevel.DANGER,
  medium: AlertLevel.WARNING,
  low: AlertLevel.WATCH,
  "高": AlertLevel.DANGER,
  "中": AlertLevel.WARNING,
  "低": AlertLevel.WATCH,
};

const AGENT_LABEL: Record<string, string> = {
  aggressive: "Aggressive Analyst",
  conservative: "Conservative Analyst",
  neutral: "Neutral Analyst",
};

/** 从 insights.risk_items 转换为 RiskAlert 格式并合并写入 localStorage */
export function upsertRiskAlertsFromInsights(
  ticker: string,
  riskItems: {
    risk_type: string;
    why_matters: string;
    potential_impact: string;
    triggered_by: string;
    mitigation: string;
    severity: "high" | "medium" | "low";
  }[]
): void {
  if (typeof window === "undefined") return;

  const existing = getRiskAlerts();
  // 清除同一 ticker 旧的条目
  const filtered = existing.filter((a) => a.source !== ticker);

  const now = new Date().toISOString();
  const newAlerts: RiskAlert[] = riskItems.slice(0, 4).map((item) => ({
    type: item.risk_type,
    level: SEVERITY_LEVEL[item.severity] ?? AlertLevel.WATCH,
    source: ticker,
    detail: `${item.why_matters}${item.potential_impact ? ". " + item.potential_impact : ""}`,
    timestamp: now,
    triggeredBy: [AGENT_LABEL[item.triggered_by] ?? item.triggered_by].filter(Boolean),
  }));

  // 合并后按 level 优先级排序：危险 > 警告 > 关注
  const all = [...filtered, ...newAlerts].sort((a, b) => {
    const order: Record<string, number> = { [AlertLevel.DANGER]: 0, [AlertLevel.WARNING]: 1, [AlertLevel.WATCH]: 2 };
    return (order[a.level] ?? 2) - (order[b.level] ?? 2);
  });

  // 最多保留 12 条（页面 4 列 × 最多 3 行）
  localStorage.setItem(STORAGE_KEY, JSON.stringify(all.slice(0, 12)));
}

export function getRiskAlerts(): RiskAlert[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as RiskAlert[];
  } catch {
    return [];
  }
}

/** 用 /api/dashboard 的静态数据作为初始种子（localStorage 为空或为空数组时写入）。返回是否实际写入 */
export function seedRiskAlertsFromApi(alerts: RiskAlert[]): boolean {
  if (typeof window === "undefined") return false;
  const raw = localStorage.getItem(STORAGE_KEY);
  if (raw) {
    try {
      const existing = JSON.parse(raw) as RiskAlert[];
      if (existing.length > 0) return false;
    } catch {
      // 解析失败则覆盖
    }
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
  return true;
}

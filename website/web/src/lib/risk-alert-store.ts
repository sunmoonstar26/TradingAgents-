"use client";

import { RiskAlert } from "../types";

const STORAGE_KEY = "tradingagents_risk_alerts";

const SEVERITY_LEVEL: Record<string, RiskAlert["level"]> = {
  高: "危险",
  中: "警告",
  低: "关注",
};

const AGENT_LABEL: Record<string, string> = {
  aggressive: "激进分析师",
  conservative: "保守分析师",
  neutral: "中性分析师",
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
    severity: "高" | "中" | "低";
  }[]
): void {
  if (typeof window === "undefined") return;

  const existing = getRiskAlerts();
  // 清除同一 ticker 旧的条目
  const filtered = existing.filter((a) => a.source !== ticker);

  const now = new Date().toISOString();
  const newAlerts: RiskAlert[] = riskItems.slice(0, 4).map((item) => ({
    type: item.risk_type,
    level: SEVERITY_LEVEL[item.severity] ?? "关注",
    source: ticker,
    detail: `${item.why_matters}${item.potential_impact ? "。" + item.potential_impact : ""}`,
    timestamp: now,
    triggeredBy: [AGENT_LABEL[item.triggered_by] ?? item.triggered_by].filter(Boolean),
  }));

  // 合并后按 level 优先级排序：危险 > 警告 > 关注
  const all = [...filtered, ...newAlerts].sort((a, b) => {
    const order = { 危险: 0, 警告: 1, 关注: 2 };
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

/** 用 /api/dashboard 的静态数据作为初始种子（仅在 localStorage 为空时写入） */
export function seedRiskAlertsFromApi(alerts: RiskAlert[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  localStorage.setItem(STORAGE_KEY, JSON.stringify(alerts));
}

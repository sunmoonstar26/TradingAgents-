"use client";

import { LiveFeedEntry } from "../types";

const STORAGE_KEY = "tradingagents_livefeed";
const MAX_ENTRIES = 30;

const VERDICT_SIGNAL: Record<string, string> = {
  看涨: "看涨", 看跌: "看跌", 中性: "中性",
  多方胜出: "多方", 空方胜出: "空方", 势均力敌: "平局",
  买入: "买入", 卖出: "卖出", 持有: "持有",
  高: "高风险", 中: "中风险", 低: "低风险",
};

const AGENT_ZH: Record<string, string> = {
  market: "技术面分析智能体",
  sentiment: "情绪分析智能体",
  news: "新闻分析智能体",
  fundamentals: "基本面分析智能体",
  macro: "宏观分析智能体",
  "多方": "多方研究员",
  "空方": "空方研究员",
  "裁判": "研究主管",
};

export interface FeedItem {
  id: string;
  ticker: string;
  agent: string;
  signal: string;
  message: string;
  timestamp: string; // ISO
}

export function getLiveFeed(): FeedItem[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return raw ? (JSON.parse(raw) as FeedItem[]) : [];
  } catch {
    return [];
  }
}

/** 从 insights 提取并追加 feed 条目（分析完成后调用） */
export function upsertFeedFromInsights(
  ticker: string,
  insights: {
    analysts?: Record<string, { verdict?: string; core_insight?: string }>;
    debate?: Record<string, { verdict?: string; core_conflict?: string }>;
    risk?: { overall_risk_level?: string; risk_items?: { risk_type: string; why_matters: string; severity: string }[] };
    trading?: { action?: string; allocation_rationale?: string };
  }
): void {
  if (typeof window === "undefined") return;

  const now = new Date().toISOString();
  const newItems: FeedItem[] = [];

  const push = (agent: string, signal: string, message: string) => {
    if (!message?.trim()) return;
    newItems.push({
      id: `${ticker}-${agent}-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      ticker,
      agent,
      signal: VERDICT_SIGNAL[signal] ?? signal,
      message: message.trim(),
      timestamp: now,
    });
  };

  // 各分析师核心观点
  for (const [key, v] of Object.entries(insights.analysts ?? {})) {
    if (v?.core_insight) {
      push(AGENT_ZH[key] ?? key, v.verdict ?? "", v.core_insight);
    }
  }

  // 辩论裁决
  const judge = insights.debate?.["裁判"];
  if (judge?.core_conflict) {
    push("研究主管", judge.verdict ?? "", judge.core_conflict);
  }

  // 首条最高级风险
  const topRisk = insights.risk?.risk_items?.[0];
  if (topRisk) {
    push("风险分析智能体", insights.risk?.overall_risk_level ?? "中",
      `${topRisk.risk_type}：${topRisk.why_matters}`);
  }

  // 交易建议
  if (insights.trading?.allocation_rationale) {
    push("交易员", insights.trading.action ?? "",
      insights.trading.allocation_rationale);
  }

  // 合并：新条目在前，去掉同 ticker 旧条目，最多保留 MAX_ENTRIES
  const existing = getLiveFeed().filter((f) => f.ticker !== ticker);
  const merged = [...newItems, ...existing].slice(0, MAX_ENTRIES);
  localStorage.setItem(STORAGE_KEY, JSON.stringify(merged));
  if (typeof window !== "undefined") {
    window.dispatchEvent(new Event("ta_feed_change"));
  }
}

/** 将 mock LiveFeedEntry[] 转换并作为初始种子（仅当 localStorage 为空时） */
export function seedFeedFromMock(entries: LiveFeedEntry[]): void {
  if (typeof window === "undefined") return;
  if (localStorage.getItem(STORAGE_KEY)) return;
  const items: FeedItem[] = entries.map((e, i) => ({
    id: `mock-${i}`,
    ticker: e.message.match(/^[A-Z]{2,5}/)?.[0] ?? "—",
    agent: e.agent,
    signal: "",
    message: e.message,
    timestamp: new Date(Date.now() - (entries.length - i) * 60000).toISOString(),
  }));
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { AgentAnalysis, AnalystInsight, KeyInsight, StockInsights } from "../../types";
import {
  Brain, TrendingUp, MessageCircle, ShieldAlert, Newspaper, Globe,
  FileText, ChevronRight, Zap, CheckCircle2, AlertTriangle,
} from "lucide-react";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

const personalityConfig: Record<string, { borderClass: string; icon: typeof Brain; iconColor: string; label: string; mapKey: string }> = {
  fundamental: { borderClass: "agent-fundamental", icon: Brain, iconColor: "text-[var(--blue)]", label: "Fundamentals", mapKey: "fundamentals" },
  technical: { borderClass: "agent-technical", icon: TrendingUp, iconColor: "text-[var(--green)]", label: "Technical", mapKey: "market" },
  sentiment: { borderClass: "agent-sentiment", icon: MessageCircle, iconColor: "text-[var(--amber)]", label: "Sentiment", mapKey: "sentiment" },
  risk: { borderClass: "agent-risk", icon: ShieldAlert, iconColor: "text-[var(--red)]", label: "Risk", mapKey: "__risk__" },
  news: { borderClass: "agent-news", icon: Newspaper, iconColor: "text-[var(--cyan)]", label: "News", mapKey: "news" },
  macro: { borderClass: "agent-macro", icon: Globe, iconColor: "text-[var(--purple)]", label: "Macro", mapKey: "__macro__" },
};

const verdictStyles: Record<string, { bg: string; text: string }> = {
  // Chinese keys (legacy backend)
  "看涨": { bg: "bg-[var(--green)]/12", text: "text-[var(--green)]" },
  "看跌": { bg: "bg-[var(--red)]/12", text: "text-[var(--red)]" },
  "中性": { bg: "bg-[var(--amber)]/12", text: "text-[var(--amber)]" },
  "强烈买入": { bg: "bg-[var(--green)]/15", text: "text-[var(--green)]" },
  "买入": { bg: "bg-[var(--green)]/10", text: "text-[var(--green)]" },
  "增持": { bg: "bg-[var(--blue)]/15", text: "text-[var(--blue)]" },
  "持有": { bg: "bg-[var(--amber)]/15", text: "text-[var(--amber)]" },
  "减持": { bg: "bg-[var(--red)]/10", text: "text-[var(--red)]" },
  "卖出": { bg: "bg-[var(--red)]/15", text: "text-[var(--red)]" },
  // English keys (new backend)
  "Bullish":    { bg: "bg-[var(--green)]/12", text: "text-[var(--green)]" },
  "Bearish":    { bg: "bg-[var(--red)]/12",   text: "text-[var(--red)]" },
  "Neutral":    { bg: "bg-[var(--amber)]/12", text: "text-[var(--amber)]" },
  "Strong Buy": { bg: "bg-[var(--green)]/15", text: "text-[var(--green)]" },
  "Buy":        { bg: "bg-[var(--green)]/10", text: "text-[var(--green)]" },
  "Hold":       { bg: "bg-[var(--amber)]/15", text: "text-[var(--amber)]" },
  "Sell":       { bg: "bg-[var(--red)]/10",   text: "text-[var(--red)]" },
  "Strong Sell":{ bg: "bg-[var(--red)]/15",   text: "text-[var(--red)]" },
};

interface Props {
  data: AgentAnalysis[];
  ticker: string;
  insights?: StockInsights;
}

export function MultiAgentAnalysis({ data, ticker, insights }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.2 }}
    >
      <h2 className="mb-4 text-[11px] font-semibold text-[var(--text-secondary)] uppercase tracking-widest">
        Agent Analysis Network
      </h2>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
        {data.map((agent, index) => {
          const cfg = personalityConfig[agent.personality] || personalityConfig.fundamental;
          const Icon = cfg.icon;

          let insight: AnalystInsight | undefined;
          if (cfg.mapKey === "__risk__") {
            // 从 insights.risk.risk_items 合成 AnalystInsight
            const riskData = insights?.risk;
            if (riskData?.risk_items?.length) {
              const items = riskData.risk_items.slice(0, 3);
              insight = {
                verdict: riskData.overall_risk_level === "high" ? "Bearish" : riskData.overall_risk_level === "low" ? "Bullish" : "Neutral",
                core_insight: items[0]?.risk_type || "",
                supporting_signals: items.slice(1).map((r) => r.risk_type),
                primary_risk: items[0]?.potential_impact || "",
                confidence: riskData.confidence || agent.conviction,
                key_insights: items.map((r, i) => ({
                  title: `${r.risk_type}：${r.why_matters}`,
                  type: i === 0 ? "primary" : i === 2 ? "risk" : "supporting",
                  confidence: riskData.confidence || agent.conviction,
                  source_agent: agent.agentName,
                })),
              } as AnalystInsight;
            }
          } else if (cfg.mapKey === "__macro__") {
            // 优先用萃取的 macro insights（下次分析后会有）
            const macroExtracted = insights?.analysts?.["macro"];
            if (macroExtracted && !macroExtracted.error) {
              insight = macroExtracted;
            } else {
              // 降级：从 debate key_topics 里找宏观维度拼凑
              const debateInsights = insights?.debate;
              const macroTopics: { title: string; type: "primary" | "supporting" | "risk" }[] = [];
              const keywordsRe = /宏观|利率|通胀|美联储|GDP|周期|资金|货币|全球/;
              if (debateInsights) {
                for (const role of ["多方", "裁判", "空方"] as const) {
                  const roleData = debateInsights[role];
                  for (const t of (roleData?.key_topics || [])) {
                    if (keywordsRe.test(t.topic) || keywordsRe.test(t.bull_view) || keywordsRe.test(t.bear_view)) {
                      const view = role === "空方" ? t.bear_view : t.bull_view;
                      macroTopics.push({
                        title: `${t.topic}：${view}`,
                        type: macroTopics.length === 0 ? "primary" : macroTopics.length === 2 ? "risk" : "supporting",
                      });
                      if (macroTopics.length >= 3) break;
                    }
                  }
                  if (macroTopics.length >= 3) break;
                }
              }
              if (macroTopics.length < 3) {
                const fundInsight = insights?.analysts?.["fundamentals"];
                for (const kd of (fundInsight?.key_drivers || [])) {
                  if (macroTopics.length >= 3) break;
                  macroTopics.push({
                    title: kd,
                    type: macroTopics.length === 0 ? "primary" : macroTopics.length === 2 ? "risk" : "supporting",
                  });
                }
              }
              if (macroTopics.length > 0) {
                insight = {
                  verdict: "Neutral",
                  core_insight: macroTopics[0]?.title || "",
                  supporting_signals: macroTopics.slice(1).map((t) => t.title),
                  primary_risk: macroTopics.find((t) => t.type === "risk")?.title || "",
                  confidence: agent.conviction,
                  key_insights: macroTopics.map((t) => ({
                    title: t.title,
                    type: t.type,
                    confidence: agent.conviction,
                    source_agent: agent.agentName,
                  })),
                } as AnalystInsight;
              }
            }
          } else {
            const raw = insights?.analysts?.[cfg.mapKey];
            if (raw && !raw.error) insight = raw;
          }

          const hasInsight = !!insight;

          return (
            <AgentCard
              key={agent.agentName}
              agent={agent}
              cfg={cfg}
              Icon={Icon}
              insight={hasInsight ? insight : undefined}
              ticker={ticker}
              index={index}
            />
          );
        })}
      </div>
    </motion.section>
  );
}

// ── 从萃取数据或原始数据提取 3 条 Key Insight ──
function buildKeyInsights(
  insight: AnalystInsight | undefined,
  agent: AgentAnalysis
): KeyInsight[] {
  // 优先使用萃取数据中的 key_insights
  if (insight?.key_insights?.length) {
    return insight.key_insights.slice(0, 3);
  }

  const results: KeyInsight[] = [];

  // Primary Insight
  if (insight?.core_insight) {
    results.push({
      title: insight.core_insight,
      type: "primary",
      confidence: insight.confidence || agent.conviction,
      source_agent: agent.agentName,
    });
  } else if (agent.keyPoints?.[0]) {
    results.push({
      title: stripAllMarkdown(agent.keyPoints[0]),
      type: "primary",
      confidence: agent.conviction,
      source_agent: agent.agentName,
    });
  }

  // Supporting Insight
  if (insight?.supporting_signals?.[0]) {
    results.push({
      title: insight.supporting_signals[0],
      type: "supporting",
      confidence: Math.max((insight.confidence || agent.conviction) - 4, 50),
      source_agent: agent.agentName,
    });
  } else if (agent.keyPoints?.[1]) {
    results.push({
      title: stripAllMarkdown(agent.keyPoints[1]),
      type: "supporting",
      confidence: Math.max(agent.conviction - 5, 50),
      source_agent: agent.agentName,
    });
  }

  // Risk Insight
  if (insight?.primary_risk) {
    results.push({
      title: insight.primary_risk,
      type: "risk",
      confidence: insight.confidence ? insight.confidence - 9 : 70,
      source_agent: agent.agentName,
    });
  } else if (agent.riskFactors?.[0]) {
    results.push({
      title: stripAllMarkdown(agent.riskFactors[0]),
      type: "risk",
      confidence: Math.max(agent.conviction - 10, 50),
      source_agent: agent.agentName,
    });
  }

  return results;
}

function AgentCard({
  agent, cfg, Icon, insight, ticker, index,
}: {
  agent: AgentAnalysis;
  cfg: (typeof personalityConfig)[string];
  Icon: typeof Brain;
  insight?: AnalystInsight;
  ticker: string;
  index: number;
}) {
  const verdict = insight?.verdict || agent.signal;
  const confidence = insight?.confidence || agent.conviction;
  const verdictCfg = verdictStyles[verdict] || verdictStyles["Hold"] || verdictStyles["持有"];
  const keyInsights = buildKeyInsights(insight, agent);

  return (
    <motion.div
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.35, delay: index * 0.04 }}
      className={`card-terminal !p-0 overflow-hidden ${cfg.borderClass} border-l-2`}
    >
      {/* ── 头部：Agent 名称 + 判决 + 置信度 ── */}
      <div className="px-4 pt-4 pb-3">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-[var(--panel2)] flex items-center justify-center">
              <Icon className={`w-4 h-4 ${cfg.iconColor}`} />
            </div>
            <div>
              <p className="text-[13px] font-semibold text-[var(--text-primary)]">{agent.agentName}</p>
              <p className="text-[10px] text-[var(--text-secondary)]/60">{cfg.label} Analysis</p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-[10px] font-mono text-[var(--green)]">{confidence}%</span>
            <span className={`px-2 py-0.5 rounded-full text-[10px] font-medium ${verdictCfg.bg} ${verdictCfg.text}`}>
              {verdict}
            </span>
          </div>
        </div>
      </div>

      {/* ── 3 Key Insights（核心区域）── */}
      {keyInsights.length > 0 ? (
        <div className="px-4 pb-3 space-y-2.5">
          {keyInsights.map((ki, i) => (
            <InsightRow key={i} insight={ki} index={i} />
          ))}
        </div>
      ) : (
        /* 无数据回退 */
        <div className="px-4 pb-3">
          <p className="text-[13px] text-[var(--text-secondary)] leading-relaxed line-clamp-2">
            {stripAllMarkdown(agent.summary)}
          </p>
        </div>
      )}

      {/* ── 底部：展开完整报告 ── */}
      <Link
        href={`/stock/${ticker}/agent/${agent.personality}`}
        className="flex items-center justify-center gap-1.5 py-2.5 border-t border-[var(--border-custom)] text-[11px] text-[var(--blue)] hover:bg-[var(--blue)]/5 transition-colors font-medium"
      >
        <FileText className="w-3.5 h-3.5" />
        Full Report
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </motion.div>
  );
}

// ── 单条 Insight 行 ──
function InsightRow({ insight, index }: { insight: KeyInsight; index: number }) {
  const isPrimary = insight.type === "primary";
  const isRisk = insight.type === "risk";

  const rowBg = isRisk
    ? "bg-[var(--red)]/5 border border-[var(--red)]/10"
    : isPrimary
    ? "bg-[var(--panel2)]/80 border border-[var(--border-custom)]"
    : "bg-[var(--panel2)]/40 border border-transparent";

  const iconEl = isRisk ? (
    <AlertTriangle className="w-3.5 h-3.5 text-[var(--red)]/70 shrink-0 mt-0.5" />
  ) : isPrimary ? (
    <Zap className="w-3.5 h-3.5 text-[var(--blue)] shrink-0 mt-0.5" />
  ) : (
    <CheckCircle2 className="w-3.5 h-3.5 text-[var(--green)]/70 shrink-0 mt-0.5" />
  );

  return (
    <motion.div
      initial={{ opacity: 0, x: -6 }}
      animate={{ opacity: 1, x: 0 }}
      transition={{ delay: 0.05 * index }}
      className={`rounded-lg p-3 ${rowBg}`}
    >
      {/* 标题行：icon + 标题 + 置信度 */}
      <div className="flex items-start gap-2">
        {iconEl}
        <div className="flex-1 min-w-0">
          <p
            className={`leading-snug font-medium ${
              isPrimary
                ? "text-[13px] text-[var(--text-primary)]"
                : "text-[12px] text-[var(--text-secondary)]"
            }`}
          >
            {insight.title}
          </p>
          {/* 置信度条 + 来源标签 */}
          <div className="flex items-center gap-2 mt-1.5">
            <div className="flex-1 h-1 bg-[var(--panel2)] rounded-full overflow-hidden max-w-[80px]">
              <motion.div
                className={`h-full rounded-full ${
                  isRisk ? "bg-[var(--red)]/50" : "bg-[var(--green)]/50"
                }`}
                initial={{ width: 0 }}
                animate={{ width: `${insight.confidence}%` }}
                transition={{ duration: 0.5, delay: 0.1 * index }}
              />
            </div>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]/50">
              {insight.confidence}%
            </span>
            <span className="text-[10px] text-[var(--text-secondary)]/40 bg-[var(--panel2)] px-1.5 py-0.5 rounded">
              {insight.source_agent}
            </span>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

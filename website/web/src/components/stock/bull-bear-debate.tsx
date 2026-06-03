"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { DebatePoint, ConflictRow, DebateInsight } from "../../types";
import { TrendingUp, TrendingDown, Scale, Swords, ChevronRight, AlertTriangle, Zap } from "lucide-react";
import { stripAllMarkdown } from "../../components/ui/MarkdownContent";

interface Props {
  bullThesis: DebatePoint[];
  moderatorVerdict: string;
  bearThesis: DebatePoint[];
  battleBar: { bullScore: number; bearScore: number };
  conflictMatrix: ConflictRow[];
  ticker: string;
  debateInsights?: Record<string, DebateInsight>;
}

interface ConflictCardData {
  topic: string;
  bullArgument: string;
  bearArgument: string;
  coreDisagreement: string;
  winner: "bull" | "bear" | "tie";
  intensity: number;
  portfolioImpact: "High" | "Medium" | "Low";
  index: number;
}

function intensityLabel(score: number): string {
  if (score >= 85) return "Extreme Conflict";
  if (score >= 70) return "High Conflict";
  if (score >= 50) return "Moderate Conflict";
  return "Low Conflict";
}

function intensityColor(score: number): string {
  if (score >= 85) return "#E05A6A";
  if (score >= 70) return "#F59E0B";
  if (score >= 50) return "#60A5FA";
  return "#6B7280";
}

function impactColor(impact: "High" | "Medium" | "Low"): string {
  if (impact === "High") return "#E05A6A";
  if (impact === "Medium") return "#F59E0B";
  return "#6B7280";
}

function verdictLabel(winner: "bull" | "bear" | "tie"): string {
  if (winner === "bull") return "Committee Favors Bulls";
  if (winner === "bear") return "Committee Favors Bears";
  return "Committee Split";
}

function verdictColor(winner: "bull" | "bear" | "tie"): string {
  if (winner === "bull") return "#18C37E";
  if (winner === "bear") return "#E05A6A";
  return "#F59E0B";
}

// ── Battle Meter（多空力量条）──
function BattleMeter({
  bullPct, bearPct, judgeVerdict, coreConflict,
}: {
  bullPct: number;
  bearPct: number;
  judgeVerdict?: string;
  coreConflict?: string;
}) {
  return (
    <div
      className="rounded-2xl p-5 mb-6 border"
      style={{
        background: "rgba(8,16,32,0.92)",
        borderColor: "rgba(255,255,255,0.06)",
      }}
    >
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2.5">
          <Swords className="w-4 h-4 text-[#F59E0B]" />
          <span className="text-[13px] font-semibold text-white/90">
            {judgeVerdict || "Battle Stance"}
          </span>
        </div>
        {coreConflict && (
          <span className="text-[10px] font-mono text-white/35 max-w-[200px] text-right leading-tight">
            {coreConflict}
          </span>
        )}
      </div>
      <div className="flex items-center gap-4">
        <div className="text-center w-14">
          <div className="text-xl font-mono font-bold" style={{ color: "#18C37E" }}>{bullPct}%</div>
          <div className="text-[10px] text-white/40 mt-0.5">Bulls</div>
        </div>
        <div className="flex-1 h-3 rounded-full overflow-hidden" style={{ background: "rgba(255,255,255,0.06)" }}>
          <motion.div
            className="h-full flex"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ duration: 0.6 }}
          >
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, #18C37E88, #18C37E)" }}
              initial={{ width: 0 }}
              animate={{ width: `${bullPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
            <motion.div
              className="h-full"
              style={{ background: "linear-gradient(90deg, #E05A6A, #E05A6A88)" }}
              initial={{ width: 0 }}
              animate={{ width: `${bearPct}%` }}
              transition={{ duration: 1, ease: "easeOut" }}
            />
          </motion.div>
        </div>
        <div className="text-center w-14">
          <div className="text-xl font-mono font-bold" style={{ color: "#E05A6A" }}>{bearPct}%</div>
          <div className="text-[10px] text-white/40 mt-0.5">Bears</div>
        </div>
      </div>
    </div>
  );
}

// ── 单张冲突卡片 ──
function ConflictCard({ card, ticker }: { card: ConflictCardData; ticker: string }) {
  const iColor = intensityColor(card.intensity);
  const vColor = verdictColor(card.winner);

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: card.index * 0.08 }}
      whileHover={{ y: -3, boxShadow: `0 8px 32px rgba(0,0,0,0.4), 0 0 0 1px rgba(255,255,255,0.08)` }}
      className="overflow-hidden"
      style={{
        background: "rgba(8,16,32,0.92)",
        border: "1px solid rgba(255,255,255,0.06)",
        borderRadius: "24px",
        padding: "0",
        transition: "box-shadow 0.25s, transform 0.25s",
      }}
    >
      {/* ── 顶部：Conflict Intensity Bar ── */}
      <div className="h-1 w-full" style={{ background: "rgba(255,255,255,0.04)" }}>
        <motion.div
          className="h-full"
          style={{ background: `linear-gradient(90deg, ${iColor}88, ${iColor})` }}
          initial={{ width: 0 }}
          animate={{ width: `${card.intensity}%` }}
          transition={{ duration: 0.9, ease: "easeOut", delay: card.index * 0.08 + 0.2 }}
        />
      </div>

      <div style={{ padding: "28px 32px 0" }}>
        {/* ── Topic Header ── */}
        <div className="flex items-start justify-between gap-3 mb-5">
          <div>
            <h3 className="font-bold text-white/95 leading-tight" style={{ fontSize: "22px" }}>
              {card.topic}
            </h3>
            <div className="flex items-center gap-2 mt-2">
              <span
                className="text-[11px] font-mono font-semibold px-2 py-0.5 rounded"
                style={{ color: iColor, background: `${iColor}18`, border: `1px solid ${iColor}30` }}
              >
                {intensityLabel(card.intensity)}
              </span>
              <span className="text-[11px] font-mono text-white/35">{card.intensity}%</span>
            </div>
          </div>
          <div className="text-right shrink-0">
            <div className="text-[10px] text-white/30 mb-1">Portfolio Impact</div>
            <span
              className="text-[12px] font-mono font-bold px-2.5 py-1 rounded-lg"
              style={{
                color: impactColor(card.portfolioImpact),
                background: `${impactColor(card.portfolioImpact)}15`,
                border: `1px solid ${impactColor(card.portfolioImpact)}25`,
              }}
            >
              {card.portfolioImpact}
            </span>
          </div>
        </div>

        {/* ── Bull Block ── */}
        <div
          className="rounded-xl p-4 mb-3"
          style={{ background: "rgba(24,195,126,0.06)", border: "1px solid rgba(24,195,126,0.14)" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingUp className="w-3.5 h-3.5 shrink-0" style={{ color: "#18C37E" }} />
            <span className="font-semibold" style={{ fontSize: "13px", color: "#18C37E" }}>
              Bull Case
            </span>
          </div>
          <p className="leading-relaxed text-white/80" style={{ fontSize: "14px" }}>
            {card.bullArgument}
          </p>
        </div>

        {/* ── Bear Block ── */}
        <div
          className="rounded-xl p-4 mb-4"
          style={{ background: "rgba(224,90,106,0.06)", border: "1px solid rgba(224,90,106,0.14)" }}
        >
          <div className="flex items-center gap-2 mb-2.5">
            <TrendingDown className="w-3.5 h-3.5 shrink-0" style={{ color: "#E05A6A" }} />
            <span className="font-semibold" style={{ fontSize: "13px", color: "#E05A6A" }}>
              Bear Case
            </span>
          </div>
          <p className="leading-relaxed text-white/80" style={{ fontSize: "14px" }}>
            {card.bearArgument}
          </p>
        </div>

        {/* ── Core Disagreement ── */}
        <div
          className="rounded-xl p-3.5 mb-4 flex items-start gap-2.5"
          style={{ background: "rgba(245,158,11,0.06)", border: "1px solid rgba(245,158,11,0.12)" }}
        >
          <AlertTriangle className="w-3.5 h-3.5 shrink-0 mt-0.5" style={{ color: "#F59E0B" }} />
          <div>
            <p className="text-[10px] font-semibold uppercase tracking-widest mb-1" style={{ color: "#F59E0B99" }}>
              Core Disagreement
            </p>
            <p className="text-white/70 leading-snug" style={{ fontSize: "13px" }}>
              {card.coreDisagreement}
            </p>
          </div>
        </div>

        {/* ── Committee Verdict ── */}
        <div
          className="rounded-xl p-3.5 mb-5 flex items-center justify-between gap-3"
          style={{ background: `${vColor}0d`, border: `1px solid ${vColor}22` }}
        >
          <div className="flex items-center gap-2.5">
            <Scale className="w-4 h-4 shrink-0" style={{ color: vColor }} />
            <div>
              <p className="text-[10px] font-semibold uppercase tracking-widest mb-0.5" style={{ color: `${vColor}99` }}>
                Committee Verdict
              </p>
              <p className="font-bold" style={{ fontSize: "16px", color: vColor }}>
                {verdictLabel(card.winner)}
              </p>
            </div>
          </div>
          {card.winner !== "tie" && (
            <Zap className="w-4 h-4 shrink-0" style={{ color: vColor, opacity: 0.6 }} />
          )}
        </div>
      </div>

      {/* ── Expand Footer ── */}
      <Link
        href={`/stock/${ticker}/debate/${card.winner === "bull" ? "bull" : card.winner === "bear" ? "bear" : "verdict"}`}
        className="flex items-center justify-center gap-2 py-3.5 transition-colors"
        style={{
          borderTop: "1px solid rgba(255,255,255,0.05)",
          color: "rgba(255,255,255,0.3)",
          fontSize: "12px",
          fontFamily: "monospace",
        }}
        onMouseEnter={(e) => {
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.65)";
          (e.currentTarget as HTMLElement).style.background = "rgba(255,255,255,0.03)";
        }}
        onMouseLeave={(e) => {
          (e.currentTarget as HTMLElement).style.color = "rgba(255,255,255,0.3)";
          (e.currentTarget as HTMLElement).style.background = "";
        }}
      >
        View Full Debate
        <ChevronRight className="w-3.5 h-3.5" />
      </Link>
    </motion.div>
  );
}

export function BullBearDebate({
  bullThesis, moderatorVerdict, bearThesis,
  battleBar, conflictMatrix, ticker, debateInsights,
}: Props) {
  const judgeInsight = debateInsights?.["裁判"];
  const bullInsight = debateInsights?.["多方"];
  const bearInsight = debateInsights?.["空方"];

  // 进度条比例：优先用裁判 verdict 推导，避免与 ta-mapper 硬编码值矛盾
  let bullPct: number;
  let bearPct: number;
  if (judgeInsight?.verdict) {
    const v = judgeInsight.verdict;
    if (v.includes("多方")) {
      // 多方胜出：用 battleBar 原始值（多方 > 空方）
      const raw = Math.round((battleBar.bullScore / (battleBar.bullScore + battleBar.bearScore)) * 100);
      bullPct = Math.max(raw, 51); // 确保多方 > 50%
      bearPct = 100 - bullPct;
    } else if (v.includes("空方")) {
      // 空方胜出：翻转，确保空方 > 50%
      const raw = Math.round((battleBar.bullScore / (battleBar.bullScore + battleBar.bearScore)) * 100);
      bearPct = Math.max(raw, 51);
      bullPct = 100 - bearPct;
    } else {
      // 势均力敌
      bullPct = 50;
      bearPct = 50;
    }
  } else {
    bullPct = Math.round((battleBar.bullScore / (battleBar.bullScore + battleBar.bearScore)) * 100);
    bearPct = 100 - bullPct;
  }
  const rawTopics = judgeInsight?.key_topics?.length
    ? judgeInsight.key_topics
    : bullInsight?.key_topics?.length
    ? bullInsight.key_topics
    : null;

  // 构建 conflict cards
  const cards: ConflictCardData[] = rawTopics
    ? rawTopics.slice(0, 4).map((t, i) => {
        // 用 bull/bear 各角色视角补充 argument 内容
        const bullTopics = bullInsight?.key_topics || [];
        const bearTopics = bearInsight?.key_topics || [];
        const matchBull = bullTopics.find((bt) => bt.topic === t.topic);
        const matchBear = bearTopics.find((bt) => bt.topic === t.topic);

        const bullArg = matchBull?.bull_view || t.bull_view;
        const bearArg = matchBear?.bear_view || t.bear_view;

        // core disagreement: 从 topic 名合成，或用 judge.core_conflict 补充
        const coreDisagreement =
          i === 0 && judgeInsight?.core_conflict
            ? judgeInsight.core_conflict
            : `Bulls and bears fundamentally disagree on "${t.topic}"`;

        // intensity: 用 confidence 作基准，高冲突议题加权
        const baseConf = judgeInsight?.confidence ?? 80;
        const intensityMap: Record<number, number> = { 0: 4, 1: 6, 2: 8, 3: 10 };
        const intensity = Math.min(99, baseConf - (intensityMap[i] ?? 8));

        // portfolio impact: 前两个高，后两个中/低
        const impactMap: (typeof cards[number]["portfolioImpact"])[] = ["High", "High", "Medium", "Low"];

        return {
          topic: t.topic,
          bullArgument: bullArg,
          bearArgument: bearArg,
          coreDisagreement,
          winner: (t.winner as "bull" | "bear" | "tie") || "tie",
          intensity,
          portfolioImpact: impactMap[i] ?? "Medium",
          index: i,
        };
      })
    : conflictMatrix.slice(0, 4).map((c, i) => ({
        topic: c.topic,
        bullArgument: c.bullView,
        bearArgument: c.bearView,
        coreDisagreement: `Bulls and bears fundamentally disagree on "${c.topic}"`,
        winner: "tie" as const,
        intensity: 75 - i * 5,
        portfolioImpact: (["High", "High", "Medium", "Low"] as const)[i] ?? "Medium",
        index: i,
      }));

  return (
    <motion.section
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.15 }}
    >
      {/* ── 模块标题 ── */}
      <div className="flex items-center justify-between mb-5">
        <div>
          <h2 className="text-base font-bold text-white/90">Core Conflict Matrix</h2>
          <p className="text-[11px] text-white/35 mt-0.5">Key disputes from the AI Investment Committee</p>
        </div>
        <div
          className="flex items-center gap-2 px-3 py-1.5 rounded-xl"
          style={{ background: "rgba(245,158,11,0.08)", border: "1px solid rgba(245,158,11,0.15)" }}
        >
          <Swords className="w-3 h-3" style={{ color: "#F59E0B" }} />
          <span className="text-[11px] font-mono font-semibold" style={{ color: "#F59E0B" }}>
            {cards.length} conflicts
          </span>
        </div>
      </div>

      {/* ── Battle Meter ── */}
      <BattleMeter
        bullPct={bullPct}
        bearPct={bearPct}
        judgeVerdict={judgeInsight?.verdict}
        coreConflict={judgeInsight?.core_conflict}
      />

      {/* ── Conflict Cards ── */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
        {cards.map((card) => (
          <ConflictCard key={card.topic} card={card} ticker={ticker} />
        ))}
      </div>

      {/* ── 展开完整辩论入口 ── */}
      <div className="flex items-center justify-center gap-3 mt-5">
        <Link
          href={`/stock/${ticker}/debate/bull`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-medium transition-colors"
          style={{
            color: "#18C37E",
            background: "rgba(24,195,126,0.08)",
            border: "1px solid rgba(24,195,126,0.15)",
          }}
        >
          <TrendingUp className="w-3 h-3" />
          Full Bull Case
        </Link>
        <Link
          href={`/stock/${ticker}/debate/verdict`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-medium transition-colors"
          style={{
            color: "rgba(255,255,255,0.5)",
            background: "rgba(255,255,255,0.04)",
            border: "1px solid rgba(255,255,255,0.08)",
          }}
        >
          <Scale className="w-3 h-3" />
          Full Verdict
        </Link>
        <Link
          href={`/stock/${ticker}/debate/bear`}
          className="flex items-center gap-1.5 px-4 py-2 rounded-xl text-[11px] font-medium transition-colors"
          style={{
            color: "#E05A6A",
            background: "rgba(224,90,106,0.08)",
            border: "1px solid rgba(224,90,106,0.15)",
          }}
        >
          <TrendingDown className="w-3 h-3" />
          Full Bear Case
        </Link>
      </div>
    </motion.section>
  );
}

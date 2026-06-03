"use client";

import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { useTranslations } from "next-intl";
import { TrendingUp, Shield, AlertTriangle, Zap, ArrowRight } from "lucide-react";

interface ResearchCard {
  ticker: string;
  name: string;
  signal: "强烈买入" | "买入" | "增持" | "持有" | "减持" | "卖出";
  conviction: number;
  timeHorizon: string;
  headline: string;       // 一句话核心观点
  keyDriver: string;      // 核心驱动
  primaryRisk: string;    // 主要风险
  agentCount: number;     // 参与智能体数
  updatedAt: string;
}

const FEATURED: ResearchCard[] = [
  {
    ticker: "NVDA", name: "英伟达", signal: "强烈买入", conviction: 84,
    timeHorizon: "中期 3-6月",
    headline: "Blackwell 量产加速，AI 算力需求超预期",
    keyDriver: "数据中心收入同比+122%，H200 供不应求",
    primaryRisk: "估值 P/E 55x，地缘政治出口管制风险",
    agentCount: 8, updatedAt: "2小时前",
  },
  {
    ticker: "META", name: "Meta", signal: "买入", conviction: 76,
    timeHorizon: "中期 3-6月",
    headline: "Llama 4 开源生态构建护城河，广告 AI 化提效",
    keyDriver: "DAU 32亿创历史新高，AI 广告 CTR 提升 18%",
    primaryRisk: "AI 资本开支 600 亿美元，回报周期不确定",
    agentCount: 8, updatedAt: "3小时前",
  },
  {
    ticker: "TSLA", name: "特斯拉", signal: "增持", conviction: 72,
    timeHorizon: "长期 6-12月",
    headline: "FSD v13 商业化落地，能源业务成第二增长曲线",
    keyDriver: "Megapack 订单积压 100GWh，储能毛利率 24%",
    primaryRisk: "汽车交付量 Q1 同比-13%，品牌情绪持续恶化",
    agentCount: 8, updatedAt: "5小时前",
  },
  {
    ticker: "PLTR", name: "Palantir", signal: "增持", conviction: 69,
    timeHorizon: "中期 3-6月",
    headline: "AIP 平台企业客户数翻倍，美国商业业务爆发",
    keyDriver: "美国商业收入同比+71%，净收入留存率 120%",
    primaryRisk: "政府合同占比 45%，预算削减直接冲击营收",
    agentCount: 7, updatedAt: "6小时前",
  },
  {
    ticker: "AMD", name: "AMD", signal: "持有", conviction: 52,
    timeHorizon: "短期 1-3月",
    headline: "MI300X 出货提速，但与 NVDA 差距仍在扩大",
    keyDriver: "数据中心 GPU 收入 Q1 +80%，MI350 路线图清晰",
    primaryRisk: "CUDA 生态壁垒难以撼动，客户迁移成本高",
    agentCount: 7, updatedAt: "8小时前",
  },
  {
    ticker: "LI", name: "理想汽车", signal: "持有", conviction: 52,
    timeHorizon: "短期 1-3月",
    headline: "L9 AI 旗舰交付稳健，中东市场拓展超预期",
    keyDriver: "5月交付量 3.2万辆，中东订单占比升至 12%",
    primaryRisk: "自由现金流连续两季为负，价格战压缩利润空间",
    agentCount: 6, updatedAt: "今天",
  },
];

const signalConfig: Record<string, { color: string; bg: string; icon: typeof TrendingUp }> = {
  强烈买入: { color: "var(--green)", bg: "rgba(34,197,94,0.1)", icon: TrendingUp },
  买入:     { color: "var(--green)", bg: "rgba(34,197,94,0.08)", icon: TrendingUp },
  增持:     { color: "var(--blue)",  bg: "rgba(59,130,246,0.1)", icon: TrendingUp },
  持有:     { color: "var(--amber)", bg: "rgba(245,158,11,0.1)", icon: Shield },
  减持:     { color: "var(--red)",   bg: "rgba(239,68,68,0.08)", icon: AlertTriangle },
  卖出:     { color: "var(--red)",   bg: "rgba(239,68,68,0.1)", icon: AlertTriangle },
};

export function FeaturedResearch() {
  const router = useRouter();
  const t = useTranslations("dashboard");

  return (
    <section>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">{t("featuredTitle")}</h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">{t("featuredSubtitle")}</p>
        </div>
        <span className="text-[10px] font-mono text-[var(--text-secondary)]/40">{t("featuredPublic")}</span>
      </div>

      {/* 桌面端：3列网格 */}
      <div className="hidden md:grid md:grid-cols-3 gap-3">
        {FEATURED.map((card, idx) => {
          const cfg = signalConfig[card.signal] ?? signalConfig["持有"];
          const Icon = cfg.icon;
          return (
            <motion.div
              key={card.ticker}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.35, delay: idx * 0.05 }}
              onClick={() => router.push(`/stock/${card.ticker}`)}
              className="card-terminal !p-0 overflow-hidden cursor-pointer group"
              whileHover={{ y: -2, transition: { duration: 0.2 } }}
            >
              {/* 顶部信号色线 */}
              <div className="h-0.5 w-full" style={{ background: `var(${cfg.color.replace("var(", "").replace(")", "")})` }} />

              <div className="p-4">
                {/* 头部 */}
                <div className="flex items-start justify-between mb-3">
                  <div>
                    <span className="font-mono font-bold text-[13px] text-[var(--text-primary)]">{card.ticker}</span>
                    <span className="ml-1.5 text-[11px] text-[var(--text-secondary)]">{card.name}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium shrink-0"
                    style={{ background: cfg.bg, color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {card.signal}
                  </span>
                </div>

                {/* 核心观点 */}
                <p className="text-[12px] text-[var(--text-primary)] font-medium leading-snug mb-3 line-clamp-2">
                  {card.headline}
                </p>

                {/* 核心驱动 */}
                <div className="p-2.5 rounded-lg bg-[var(--panel2)]/60 border border-[var(--border-custom)] mb-2">
                  <p className="text-[10px] text-[var(--text-secondary)]/50 mb-0.5 flex items-center gap-1">
                    <Zap className="w-2.5 h-2.5" style={{ color: "#00c8ff" }} />
                    {t("featuredKeyDriver")}
                  </p>
                  <p className="text-[11px] text-[var(--text-primary)] leading-snug line-clamp-2">{card.keyDriver}</p>
                </div>

                {/* 主要风险 */}
                <div className="p-2.5 rounded-lg bg-[var(--red)]/5 border border-[var(--red)]/10 mb-3">
                  <p className="text-[10px] text-[var(--red)]/50 mb-0.5 flex items-center gap-1">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    {t("featuredPrimaryRisk")}
                  </p>
                  <p className="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2">{card.primaryRisk}</p>
                </div>

                {/* 底部元数据 */}
                <div className="flex items-center justify-between text-[10px] font-mono">
                  <div className="flex items-center gap-2 text-[var(--text-secondary)]/50">
                    <span className="font-semibold" style={{ color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}>
                      {card.conviction}%
                    </span>
                    <span>·</span>
                    <span>{card.timeHorizon}</span>
                    <span>·</span>
                    <span>{t("featuredAgentCount", { count: card.agentCount })}</span>
                  </div>
                  <span className="text-[var(--text-secondary)]/30">{card.updatedAt}</span>
                </div>
              </div>

              {/* hover 查看详情 */}
              <div className="px-4 pb-3 opacity-0 group-hover:opacity-100 transition-opacity">
                <div className="flex items-center gap-1 text-[10px] font-mono" style={{ color: "#00c8ff" }}>
                  {t("featuredViewFull")}
                  <ArrowRight className="w-3 h-3" />
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>

      {/* 移动端：横向滚动 */}
      <div className="flex md:hidden gap-3 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {FEATURED.map((card) => {
          const cfg = signalConfig[card.signal] ?? signalConfig["持有"];
          const Icon = cfg.icon;
          return (
            <div
              key={card.ticker}
              onClick={() => router.push(`/stock/${card.ticker}`)}
              className="card-terminal !p-0 overflow-hidden min-w-[280px] shrink-0 cursor-pointer"
            >
              <div className="h-0.5 w-full" style={{ background: `var(${cfg.color.replace("var(", "").replace(")", "")})` }} />
              <div className="p-3.5">
                <div className="flex items-center justify-between mb-2">
                  <div>
                    <span className="font-mono font-bold text-xs text-[var(--text-primary)]">{card.ticker}</span>
                    <span className="ml-1 text-[10px] text-[var(--text-secondary)]">{card.name}</span>
                  </div>
                  <span
                    className="inline-flex items-center gap-1 rounded-full px-1.5 py-0.5 text-[10px] font-medium"
                    style={{ background: cfg.bg, color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}
                  >
                    <Icon className="w-2.5 h-2.5" />
                    {card.signal}
                  </span>
                </div>
                <p className="text-[11px] text-[var(--text-primary)] font-medium leading-snug mb-2 line-clamp-2">{card.headline}</p>
                <div className="flex items-center gap-2 text-[10px] font-mono text-[var(--text-secondary)]/50">
                  <span className="font-semibold" style={{ color: `var(${cfg.color.replace("var(", "").replace(")", "")})` }}>{card.conviction}%</span>
                  <span>·</span>
                  <span>{card.timeHorizon}</span>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
}

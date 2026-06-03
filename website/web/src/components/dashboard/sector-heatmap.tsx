"use client";

import { motion } from "framer-motion";
import { SectorFlow } from "../../types";

function MomentumBar({ value }: { value: number }) {
  const color =
    value >= 80
      ? "bg-[var(--green)]"
      : value >= 65
        ? "bg-[var(--blue)]"
        : value >= 50
          ? "bg-[var(--amber)]"
          : "bg-[var(--red)]";

  return (
    <div className="flex items-center gap-2">
      <div className="w-24 h-1.5 rounded-full bg-[var(--border-custom)] overflow-hidden">
        <motion.div
          className={`h-full rounded-full ${color}`}
          initial={{ width: 0 }}
          animate={{ width: `${value}%` }}
          transition={{ duration: 0.5, ease: "easeOut" }}
        />
      </div>
      <span
        className="text-[11px] font-mono font-semibold"
        style={{ color: `var(--${value >= 80 ? "green" : value >= 65 ? "blue" : value >= 50 ? "amber" : "red"})` }}
      >
        {value}
      </span>
    </div>
  );
}

function FlowBadge({ flow }: { flow: SectorFlow["flow"] }) {
  const styles: Record<string, string> = {
    "↑ 强劲": "text-[var(--green)] bg-[var(--green)]/10",
    "↗ 改善": "text-[var(--blue)] bg-[var(--blue)]/10",
    "→ 平稳": "text-[var(--text-secondary)] bg-[var(--text-secondary)]/10",
    "↘ 走弱": "text-[var(--amber)] bg-[var(--amber)]/10",
    "↓ 流出": "text-[var(--red)] bg-[var(--red)]/10",
    "↑ Strong":    "text-[var(--green)] bg-[var(--green)]/10",
    "↗ Improving": "text-[var(--blue)] bg-[var(--blue)]/10",
    "→ Stable":    "text-[var(--text-secondary)] bg-[var(--text-secondary)]/10",
    "↘ Weakening": "text-[var(--amber)] bg-[var(--amber)]/10",
    "↓ Outflow":   "text-[var(--red)] bg-[var(--red)]/10",
  };

  return (
    <span
      className={`inline-flex items-center rounded-full px-2 py-0.5 text-[11px] font-medium ${styles[flow] || styles["→ Stable"] || styles["→ 平稳"]}`}
    >
      {flow}
    </span>
  );
}

interface Props {
  data: SectorFlow[];
}

export function SectorHeatmap({ data }: Props) {
  return (
    <motion.section
      initial={{ opacity: 0, y: 8 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.4, delay: 0.35 }}
    >
      <h2 className="section-heading">Sector Capital Flow</h2>

      {/* 桌面端：列表/表格 */}
      <div className="hidden md:block card-terminal overflow-hidden !p-0">
        <div className="divide-y divide-[var(--border-custom)]">
          {/* 表头 */}
          <div className="flex items-center px-6 py-3 text-[11px] font-medium text-[var(--text-secondary)]">
            <span className="w-32 shrink-0">Sector</span>
            <span className="w-28 shrink-0">Capital Flow</span>
            <span className="flex-1">Momentum</span>
            <span className="w-20 shrink-0 text-right">Change</span>
          </div>
          {/* 数据行 */}
          {data.map((sector, idx) => (
            <motion.div
              key={sector.name}
              className="flex items-center px-6 py-3.5 hover:bg-[var(--panel2)]/50 transition-colors"
              initial={{ opacity: 0, x: -4 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{ duration: 0.3, delay: idx * 0.04 }}
            >
              <span className="w-32 shrink-0 text-xs font-medium text-[var(--text-primary)]">
                {sector.name}
              </span>
              <span className="w-28 shrink-0">
                <FlowBadge flow={sector.flow} />
              </span>
              <span className="flex-1">
                <MomentumBar value={sector.momentum} />
              </span>
              <span
                className={`w-20 shrink-0 text-right text-[11px] font-mono ${
                  sector.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                }`}
              >
                {sector.change >= 0 ? "+" : ""}
                {sector.change}%
              </span>
            </motion.div>
          ))}
        </div>
      </div>

      {/* 移动端：堆叠卡片 */}
      <div className="flex flex-col gap-2 md:hidden">
        {data.map((sector, idx) => (
          <motion.div
            key={sector.name}
            className="card-terminal !p-4 flex items-center justify-between"
            initial={{ opacity: 0, y: 4 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, delay: idx * 0.04 }}
          >
            <div className="flex flex-col gap-1">
              <span className="text-xs font-medium text-[var(--text-primary)]">{sector.name}</span>
              <FlowBadge flow={sector.flow} />
            </div>
            <div className="flex flex-col items-end gap-1">
              <span className="text-xs font-mono font-semibold text-[var(--text-primary)]">
                {sector.momentum}
              </span>
              <span
                className={`text-[10px] font-mono ${
                  sector.change >= 0 ? "text-[var(--green)]" : "text-[var(--red)]"
                }`}
              >
                {sector.change >= 0 ? "+" : ""}
                {sector.change}%
              </span>
            </div>
          </motion.div>
        ))}
      </div>
    </motion.section>
  );
}

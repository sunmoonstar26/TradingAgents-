"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { InvestmentMemo, StockEntry } from "../../types";
import { Signal } from "../../types/enums";
import { Pencil, Trash2, ChevronUp, ChevronDown, Plus, Zap, AlertTriangle, TrendingUp } from "lucide-react";
import { searchStocks } from "../../data/stocks";
import { saveCustomMemoEntries } from "../../lib/memo-store";

const signalStyles: Record<string, string> = {
  [Signal.STRONG_BUY]: "text-[var(--green)] bg-[var(--green)]/10",
  [Signal.BUY]: "text-[var(--green)] bg-[var(--green)]/10",
  [Signal.HOLD]: "text-[var(--amber)] bg-[var(--amber)]/10",
  [Signal.SELL]: "text-[var(--red)] bg-[var(--red)]/10",
  [Signal.STRONG_SELL]: "text-[var(--red)] bg-[var(--red)]/10",
};

function makeMemo(s: StockEntry): InvestmentMemo {
  return {
    ticker: s.ticker, name: s.name, signal: Signal.HOLD, conviction: 50,
    agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: false },
    timeHorizon: "Mid-term 3-6mo", primaryRisk: "Pending", consensus: "4/8 Bullish", exposure: "Underweight", keyDriver: "Pending"
  };
}

interface Props { data: InvestmentMemo[]; onSave?: () => void }

export function ConvictionIdeas({ data, onSave }: Props) {
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<InvestmentMemo[]>([]);
  const [addQuery, setAddQuery] = useState("");
  const [addSuggestions, setAddSuggestions] = useState<StockEntry[]>([]);
  const containerRef = useRef<HTMLDivElement>(null);

  const displayData = editing ? editData : data;

  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        saveCustomMemoEntries(editData);
        onSave?.();
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing, editData, onSave]);

  const toggleEdit = useCallback(() => {
    if (editing) {
      saveCustomMemoEntries(editData);
      onSave?.();
      setEditing(false);
    } else {
      setEditData([...data]);
      setEditing(true);
    }
  }, [editing, data, editData, onSave]);

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    setEditData((prev) => { const n = [...prev]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; saveCustomMemoEntries(n); return n; });
  }, []);
  const moveDown = useCallback((idx: number) => {
    setEditData((prev) => { if (idx >= prev.length - 1) return prev; const n = [...prev]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; saveCustomMemoEntries(n); return n; });
  }, []);
  const removeItem = useCallback((idx: number) => {
    setEditData((prev) => { const n = prev.filter((_, i) => i !== idx); saveCustomMemoEntries(n); return n; });
  }, []);
  const handleAddSearch = useCallback((val: string) => {
    setAddQuery(val);
    setAddSuggestions(val.trim() ? searchStocks(val).filter((s) => !editData.some((e) => e.ticker === s.ticker)) : []);
  }, [editData]);
  const addItem = useCallback((s: StockEntry) => {
    setEditData((prev) => { const n = [...prev, makeMemo(s)]; saveCustomMemoEntries(n); return n; }); setAddQuery(""); setAddSuggestions([]);
  }, []);

  return (
    <motion.section ref={containerRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.2 }}>
      <div className="section-heading justify-between">
        <span>Investment Memo</span>
        <button onClick={toggleEdit} className={`p-1.5 rounded-lg transition-colors ${editing ? "text-[var(--blue)] bg-[var(--blue)]/10" : "text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] hover:bg-[var(--panel2)]"}`} title="Edit">
          <Pencil className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* 桌面端 — 4 列观点优先卡片 */}
      <div className="hidden md:grid md:grid-cols-4 gap-3">
        {displayData.map((item, idx) => (
          <motion.div
            key={item.ticker}
            className={`card-terminal !p-0 overflow-hidden flex flex-col relative ${editing ? "border-[var(--blue)]/30" : ""}`}
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.35, delay: idx * 0.06 }}
          >
            {/* 编辑控件 */}
            {editing && (
              <div className="absolute top-2 right-2 flex items-center gap-0.5 z-10">
                <button onClick={() => moveUp(idx)} className="p-1 rounded text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--panel2)]"><ChevronUp className="w-3 h-3" /></button>
                <button onClick={() => moveDown(idx)} className="p-1 rounded text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)] hover:bg-[var(--panel2)]"><ChevronDown className="w-3 h-3" /></button>
                <button onClick={() => removeItem(idx)} className="p-1 rounded text-[var(--text-secondary)]/40 hover:text-[var(--red)] hover:bg-[var(--panel2)]"><Trash2 className="w-3 h-3" /></button>
              </div>
            )}

            {/* 头部：代码+名称+信号 */}
            <div className="px-4 pt-4 pb-2 flex items-center justify-between">
              <div>
                <span className="font-mono font-bold text-[13px] text-[var(--text-primary)]">{item.ticker}</span>
                <span className="ml-1.5 text-[11px] text-[var(--text-secondary)]">{item.name}</span>
              </div>
              <span className={`inline-flex items-center rounded-full px-2 py-0.5 text-[10px] font-medium ${signalStyles[item.signal]}`}>{item.signal}</span>
            </div>

            {/* 核心驱动 — Primary Insight */}
            <div className="px-4 pb-2.5">
              <div className="p-3 rounded-lg bg-[var(--panel2)]/80 border border-[var(--border-custom)]">
                <div className="flex items-start gap-2">
                  <Zap className="w-3.5 h-3.5 text-[var(--blue)] mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--text-secondary)]/60 mb-0.5">Key Driver</p>
                    <p className="text-[12px] text-[var(--text-primary)] font-medium leading-snug line-clamp-2">
                      {item.keyDriver}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 主要风险 — Risk Insight */}
            <div className="px-4 pb-3">
              <div className="p-2.5 rounded-lg bg-[var(--red)]/5 border border-[var(--red)]/10">
                <div className="flex items-start gap-2">
                  <AlertTriangle className="w-3.5 h-3.5 text-[var(--red)]/70 mt-0.5 shrink-0" />
                  <div className="flex-1 min-w-0">
                    <p className="text-[10px] text-[var(--red)]/60 mb-0.5">Primary Risk</p>
                    <p className="text-[11px] text-[var(--text-secondary)] leading-snug line-clamp-2">
                      {item.primaryRisk}
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* 底部元数据 */}
            <div className="mt-auto px-4 pb-3 pt-1 border-t border-[var(--border-custom)]">
              <div className="flex items-center justify-between text-[10px]">
                <div className="flex items-center gap-3 text-[var(--text-secondary)]/70">
                  <span className="font-mono text-[var(--green)]">{item.conviction}%</span>
                  <span>{item.exposure}</span>
                  <span>{item.timeHorizon}</span>
                </div>
                <span className="text-[var(--text-secondary)]/50">{item.consensus}</span>
              </div>
            </div>
          </motion.div>
        ))}

        {/* 编辑模式：添加卡片 */}
        {editing && (
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }} className="card-terminal !p-5 flex flex-col items-center justify-center gap-3 border-dashed border-[var(--blue)]/20 min-h-[200px] relative">
            <div className="relative w-full">
              <input type="text" value={addQuery} onChange={(e) => handleAddSearch(e.target.value)} placeholder="Add ticker..." className="w-full bg-[var(--panel)] border border-[var(--border-custom)] rounded-lg px-3 py-2 text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/30 focus:outline-none focus:border-[var(--blue)]/40" />
              {addSuggestions.length > 0 && (
                <div className="absolute top-full mt-1 left-0 right-0 bg-[var(--panel)] border border-[var(--border-custom)] rounded-lg shadow-lg overflow-hidden z-50">
                  {addSuggestions.map((s) => (
                    <button key={s.ticker} onClick={() => addItem(s)} className="w-full text-left px-3 py-2 hover:bg-[var(--blue)]/8 flex items-center gap-3 text-xs">
                      <Plus className="w-3 h-3 text-[var(--blue)]" />
                      <span className="font-mono font-semibold text-[var(--text-primary)]">{s.ticker}</span>
                      <span className="text-[var(--text-secondary)]">{s.name}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]/20">Search to add ticker</span>
            <span className="text-[10px] font-mono text-[var(--text-secondary)]/30">{editData.length} tickers</span>
          </motion.div>
        )}
      </div>

      {/* 移动端 */}
      <div className="flex md:hidden gap-2 overflow-x-auto pb-1 -mx-4 px-4 scrollbar-none">
        {displayData.map((item) => (
          <div key={item.ticker} className="card-terminal !p-0 overflow-hidden min-w-[280px] shrink-0 flex flex-col">
            <div className="px-3 pt-3 pb-1.5 flex items-center justify-between">
              <div><span className="font-mono font-bold text-xs text-[var(--text-primary)]">{item.ticker}</span><span className="ml-1 text-[10px] text-[var(--text-secondary)]">{item.name}</span></div>
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-medium ${signalStyles[item.signal]}`}>{item.signal}</span>
            </div>
            <div className="px-3 pb-1.5">
              <div className="flex items-start gap-1.5 p-2 rounded bg-[var(--panel2)]/60 border border-[var(--border-custom)]">
                <Zap className="w-3 h-3 text-[var(--blue)] mt-0.5 shrink-0" />
                <div><p className="text-[10px] text-[var(--text-secondary)]/60">Key Driver</p><p className="text-[11px] text-[var(--text-primary)] font-medium line-clamp-2">{item.keyDriver}</p></div>
              </div>
            </div>
            <div className="px-3 pb-2">
              <div className="flex items-start gap-1.5 p-2 rounded bg-[var(--red)]/5 border border-[var(--red)]/10">
                <AlertTriangle className="w-3 h-3 text-[var(--red)]/70 mt-0.5 shrink-0" />
                <div><p className="text-[10px] text-[var(--red)]/60">Primary Risk</p><p className="text-[11px] text-[var(--text-secondary)] line-clamp-2">{item.primaryRisk}</p></div>
              </div>
            </div>
            <div className="mt-auto px-3 pb-3 pt-1 border-t border-[var(--border-custom)] flex items-center gap-2 text-[10px] text-[var(--text-secondary)]/70">
              <span className="font-mono text-[var(--green)]">{item.conviction}%</span>
              <span>·</span>
              <span>{item.exposure}</span>
            </div>
          </div>
        ))}
      </div>
    </motion.section>
  );
}

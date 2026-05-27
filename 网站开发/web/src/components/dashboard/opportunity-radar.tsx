"use client";

import { useState, useCallback, useRef, useEffect } from "react";
import { motion } from "framer-motion";
import { useRouter } from "next/navigation";
import { OpportunityEntry, StockEntry } from "@/types";
import { Check, X, Pencil, Trash2, ChevronUp, ChevronDown, Plus, RefreshCw, CheckCircle2, XCircle } from "lucide-react";
import { searchStocks } from "@/data/stocks";
import { saveCustomRadarEntries, updateRadarEntryDate, syncRadarFull } from "@/lib/radar-store";

const signalStyles: Record<string, { bg: string; text: string; dot: string }> = {
  强烈买入: { bg: "bg-[var(--green)]/15", text: "text-[var(--green)]", dot: "bg-[var(--green)]" },
  买入: { bg: "bg-[var(--green)]/10", text: "text-[var(--green)]", dot: "bg-[var(--green)]" },
  增持: { bg: "bg-[var(--blue)]/15", text: "text-[var(--blue)]", dot: "bg-[var(--blue)]" },
  持有: { bg: "bg-[var(--amber)]/15", text: "text-[var(--amber)]", dot: "bg-[var(--amber)]" },
  减持: { bg: "bg-[var(--red)]/10", text: "text-[var(--red)]", dot: "bg-[var(--red)]" },
  卖出: { bg: "bg-[var(--red)]/15", text: "text-[var(--red)]", dot: "bg-[var(--red)]" },
};

const riskColors: Record<string, string> = {
  低: "text-[var(--green)]",
  中: "text-[var(--amber)]",
  高: "text-[var(--red)]",
};

/** ISO 日期转紧凑中文显示 */
function formatDate(iso?: string): string {
  if (!iso) return "—";
  const d = new Date(iso);
  const now = new Date();
  const today = new Date(now.getFullYear(), now.getMonth(), now.getDate());
  const target = new Date(d.getFullYear(), d.getMonth(), d.getDate());
  const diff = (today.getTime() - target.getTime()) / 86400000;
  const time = d.toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit" });
  if (diff === 0) return `今天 ${time}`;
  if (diff === 1) return `昨天 ${time}`;
  return `${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

function ConsensusDots({ consensus }: { consensus: string | undefined | null }) {
  if (!consensus) return <span className="font-mono text-[var(--text-secondary)]/60">—</span>;
  const match = consensus.match(/(\d+)\/(\d+)/);
  if (!match) return <span className="font-mono text-[var(--text-primary)]">{consensus}</span>;
  const yes = parseInt(match[1], 10);
  const total = parseInt(match[2], 10);
  const label = consensus.replace(/\d+\/\d+/, "").trim();
  return (
    <span className="conviction-bar">
      {Array.from({ length: total }).map((_, i) => (
        <span key={i} className={i < yes ? "text-[var(--green)]" : "text-[var(--text-secondary)]/30"}>●</span>
      ))}
      <span className="ml-1.5 text-[var(--text-primary)]">{yes}/{total} {label}</span>
    </span>
  );
}

function AgentAlignmentIcons({ alignment }: { alignment: OpportunityEntry["agentAlignment"] }) {
  const agents = [
    { key: "fundamental", val: alignment.fundamental }, { key: "technical", val: alignment.technical },
    { key: "sentiment", val: alignment.sentiment }, { key: "macro", val: alignment.macro }, { key: "risk", val: alignment.risk },
  ] as const;
  return (
    <div className="flex items-center gap-2.5">
      {agents.map((a) => (
        <span key={a.key} className={`inline-flex items-center justify-center w-5 ${a.val ? "text-[var(--green)]" : "text-[var(--red)]/50"}`}>
          {a.val ? <Check className="w-3.5 h-3.5" /> : <X className="w-3.5 h-3.5" />}
        </span>
      ))}
    </div>
  );
}

function makeEntry(s: StockEntry): OpportunityEntry {
  return {
    ticker: s.ticker, name: s.name, signal: "持有", conviction: 50, risk: "中",
    consensus: "4/8 看涨", exposure: "低配",
    agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: false },
    updatedAt: new Date().toISOString(),
  };
}

interface Props {
  data: OpportunityEntry[];
  onSave?: () => void;
}

export function OpportunityRadar({ data, onSave }: Props) {
  const router = useRouter();
  const [activeRow, setActiveRow] = useState<string | null>(null);
  const [editing, setEditing] = useState(false);
  const [editData, setEditData] = useState<OpportunityEntry[]>([]);
  const [addQuery, setAddQuery] = useState("");
  const [addSuggestions, setAddSuggestions] = useState<StockEntry[]>([]);
  const [updateStates, setUpdateStates] = useState<Record<string, { sessionId: string; status: "analyzing" | "completed" | "failed"; completedCount: number; errorMessage?: string }>>({});
  const [bulkUpdating, setBulkUpdating] = useState<{ total: number; done: number; current: string } | null>(null);
  const [bulkAborting, setBulkAborting] = useState(false);
  const bulkAbortRef = useRef(false);
  const pollingRef = useRef<Record<string, ReturnType<typeof setInterval>>>({});
  const containerRef = useRef<HTMLDivElement>(null);

  const displayData = editing ? editData : data;

  // 点击外部退出编辑
  useEffect(() => {
    if (!editing) return;
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        onSave?.();
        setEditing(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, [editing, onSave]);

  // 清理轮询定时器
  useEffect(() => {
    return () => { Object.values(pollingRef.current).forEach(clearInterval); };
  }, []);

  const toggleEdit = useCallback(() => {
    if (editing) {
      onSave?.();
      setEditing(false);
    } else {
      const copy = [...data];
      setEditData(copy);
      saveCustomRadarEntries(copy);
      setEditing(true);
    }
  }, [editing, data, onSave]);

  const moveUp = useCallback((idx: number) => {
    if (idx === 0) return;
    setEditData((prev) => { const n = [...prev]; [n[idx-1], n[idx]] = [n[idx], n[idx-1]]; saveCustomRadarEntries(n); return n; });
  }, []);
  const moveDown = useCallback((idx: number) => {
    setEditData((prev) => { if (idx >= prev.length - 1) return prev; const n = [...prev]; [n[idx], n[idx+1]] = [n[idx+1], n[idx]]; saveCustomRadarEntries(n); return n; });
  }, []);
  const removeItem = useCallback((idx: number) => {
    setEditData((prev) => { const n = prev.filter((_, i) => i !== idx); saveCustomRadarEntries(n); return n; });
  }, []);
  const addItem = useCallback((s: StockEntry) => {
    setEditData((prev) => { const n = [...prev, makeEntry(s)]; saveCustomRadarEntries(n); return n; });
    setAddQuery(""); setAddSuggestions([]);
  }, []);

  const handleAddSearch = useCallback((val: string) => {
    setAddQuery(val);
    setAddSuggestions(val.trim() ? searchStocks(val).filter((s) => !editData.some((e) => e.ticker === s.ticker)) : []);
  }, [editData]);

  /** 触发单只股票的 AI 分析更新 — 轮询进度 */
  const handleRefresh = useCallback(async (ticker: string, e: React.MouseEvent) => {
    e.stopPropagation();
    if (updateStates[ticker]) return;
    try {
      const res = await fetch("/api/radar/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker }),
      });
      if (!res.ok) return;
      const data = await res.json();
      if (!data.success) return;

      const sid = data.session_id;
      setUpdateStates((prev) => ({ ...prev, [ticker]: { sessionId: sid, status: "analyzing", completedCount: 0 } }));

      const interval = setInterval(async () => {
        try {
          const sr = await fetch(`/api/analysis/${sid}`);
          const sd = await sr.json();
          const sess = sd?.data;
          if (!sess) return;
          const done = Object.values(sess.progress || {}).filter((s) => s === "completed").length;
          if (sess.status === "completed") {
            clearInterval(interval);
            delete pollingRef.current[ticker];
            // 获取分析结果并同步全部指标到雷达
            try {
              const stockRes = await fetch(`/api/stocks/${ticker}`);
              if (stockRes.ok) {
                const stockData = await stockRes.json();
                const d = stockData?.data;
                if (d) {
                  // 从 agentAnalyses 构建 agentAlignment
                  const agentAlignment = {
                    fundamental: false, technical: false, sentiment: false, macro: false, risk: false,
                  };
                  (d.agentAnalyses || []).forEach((a: { personality: string; signal: string }) => {
                    const bullish = ["强烈买入", "买入", "增持"].includes(a.signal);
                    if (a.personality === "fundamental") agentAlignment.fundamental = bullish;
                    if (a.personality === "technical") agentAlignment.technical = bullish;
                    if (a.personality === "sentiment") agentAlignment.sentiment = bullish;
                    if (a.personality === "macro") agentAlignment.macro = bullish;
                    if (a.personality === "risk") agentAlignment.risk = bullish;
                  });
                  syncRadarFull(ticker, d.name || ticker, {
                    signal: d.committeeDecision?.signal,
                    conviction: d.committeeDecision?.conviction,
                    risk: (d.committeeDecision?.conviction ?? 50) >= 60 ? "低" as const : "中" as const,
                    consensus: d.committeeDecision?.consensus,
                    exposure: d.committeeDecision?.recommendedExposure,
                    agentAlignment,
                    updatedAt: new Date().toISOString(),
                  });
                }
              }
            } catch { /* 同步失败不阻塞 */ }
            onSave?.();
            setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker], status: "completed", completedCount: done } }));
            setTimeout(() => {
              setUpdateStates((prev) => { const n = { ...prev }; delete n[ticker]; return n; });
            }, 3000);
          } else if (sess.status === "failed") {
            clearInterval(interval);
            delete pollingRef.current[ticker];
            setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker], status: "failed", completedCount: done, errorMessage: sess.error_message ?? undefined } }));
          } else {
            setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker], completedCount: done } }));
          }
        } catch { /* 轮询失败不中断 */ }
      }, 3000);
      pollingRef.current[ticker] = interval;
    } catch {}
  }, [updateStates, onSave]);

  /** 批量更新全部股票 */
  const handleRefreshAll = useCallback(async () => {
    if (bulkUpdating) {
      bulkAbortRef.current = true;
      setBulkAborting(true);
      return;
    }
    const tickers = displayData.map((d) => d.ticker);
    if (tickers.length === 0) return;
    bulkAbortRef.current = false;
    setBulkAborting(false);
    setBulkUpdating({ total: tickers.length, done: 0, current: tickers[0] });

    for (let i = 0; i < tickers.length; i++) {
      if (bulkAbortRef.current) break;
      const ticker = tickers[i];
      setBulkUpdating({ total: tickers.length, done: i, current: ticker });

      try {
        const res = await fetch("/api/radar/update", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ ticker }),
        });
        if (!res.ok) continue;
        const data = await res.json();
        if (!data.success) continue;
        const sid = data.session_id;

        // 触发该行的独立进度显示
        setUpdateStates((prev) => ({ ...prev, [ticker]: { sessionId: sid, status: "analyzing", completedCount: 0 } }));

        // 轮询等待完成
        await new Promise<void>((resolve) => {
          const interval = setInterval(async () => {
            if (bulkAbortRef.current) {
              clearInterval(interval);
              setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker]!, status: "failed", completedCount: prev[ticker]?.completedCount || 0 } }));
              return resolve();
            }
            try {
              const sr = await fetch(`/api/analysis/${sid}`);
              const sd = await sr.json();
              const sess = sd?.data;
              if (!sess) return;
              const done = Object.values(sess.progress || {}).filter((s) => s === "completed").length;
              if (sess.status === "completed") {
                clearInterval(interval);
                // 同步结果
                try {
                  const stockRes = await fetch(`/api/stocks/${ticker}`);
                  if (stockRes.ok) {
                    const stockData = await stockRes.json();
                    const d = stockData?.data;
                    if (d) {
                      const agentAlignment = { fundamental: false, technical: false, sentiment: false, macro: false, risk: false };
                      (d.agentAnalyses || []).forEach((a: { personality: string; signal: string }) => {
                        const bullish = ["强烈买入", "买入", "增持"].includes(a.signal);
                        if (a.personality === "fundamental") agentAlignment.fundamental = bullish;
                        if (a.personality === "technical") agentAlignment.technical = bullish;
                        if (a.personality === "sentiment") agentAlignment.sentiment = bullish;
                        if (a.personality === "macro") agentAlignment.macro = bullish;
                        if (a.personality === "risk") agentAlignment.risk = bullish;
                      });
                      syncRadarFull(ticker, d.name || ticker, {
                        signal: d.committeeDecision?.signal,
                        conviction: d.committeeDecision?.conviction,
                        risk: (d.committeeDecision?.conviction ?? 50) >= 60 ? "低" : "中",
                        consensus: d.committeeDecision?.consensus,
                        exposure: d.committeeDecision?.recommendedExposure,
                        agentAlignment,
                        updatedAt: new Date().toISOString(),
                      });
                    }
                  }
                } catch {}
                setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker]!, status: "completed", completedCount: done } }));
                // 3s 后清除该行的完成状态
                setTimeout(() => {
                  setUpdateStates((prev) => { const n = { ...prev }; delete n[ticker]; return n; });
                }, 3000);
                resolve();
              } else if (sess.status === "failed") {
                clearInterval(interval);
                setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker]!, status: "failed", completedCount: done, errorMessage: sess.error_message ?? undefined } }));
                resolve();
              } else {
                setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker]!, completedCount: done } }));
              }
            } catch { /* 忽略轮询错误 */ }
          }, 3000);
          // 8分钟超时（TradingAgents 分析+洞察萃取需 ~5 分钟）
          setTimeout(() => {
            clearInterval(interval);
            setUpdateStates((prev) => ({ ...prev, [ticker]: { ...prev[ticker]!, status: "failed", completedCount: prev[ticker]?.completedCount || 0 } }));
            resolve();
          }, 480000);
        });
      } catch {}
    }

    onSave?.();
    setBulkUpdating(null);
    setBulkAborting(false);
  }, [bulkUpdating, displayData, onSave]);

  return (
    <motion.section ref={containerRef} initial={{ opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.4, delay: 0.1 }}>
      <div className="flex items-center justify-between mb-4">
        <div>
          <h2 className="text-sm font-semibold text-[var(--text-primary)]">AI 机会雷达</h2>
          <p className="text-[11px] text-[var(--text-secondary)] mt-0.5">全市场多智能体扫描</p>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={toggleEdit} className={`p-1.5 rounded-lg transition-colors ${editing ? "text-[var(--blue)] bg-[var(--blue)]/10" : "text-[var(--text-secondary)]/40 hover:text-[var(--text-secondary)] hover:bg-[var(--panel2)]"}`} title="编辑">
            <Pencil className="w-3.5 h-3.5" />
          </button>
          <button
            onClick={handleRefreshAll}
            className={`text-[10px] font-mono flex items-center gap-1.5 px-2.5 py-1 rounded-lg transition-all ${
              bulkUpdating
                ? "text-[var(--amber)] bg-[var(--amber)]/10 hover:bg-[var(--amber)]/20"
                : "text-[var(--blue)] hover:bg-[var(--blue)]/10"
            }`}
            title={bulkUpdating ? "点击取消" : "更新全部股票分析"}
          >
            <RefreshCw className={`w-3 h-3 ${bulkUpdating && !bulkAborting ? "animate-spin" : ""}`} />
            {bulkUpdating
              ? `更新中 ${bulkUpdating.done}/${bulkUpdating.total}`
              : "更新全部"}
          </button>
        </div>
      </div>

      {/* 桌面端表格 */}
      <div className="hidden md:block card-hero overflow-visible !p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead>
              <tr className="border-b border-[var(--border-custom)]">
                {editing && <th className="w-16" />}
                <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">代码</th>
                <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">信号</th>
                <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">置信度</th>
                <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">风险</th>
                <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">共识</th>
                <th className="text-left px-5 py-3.5 font-medium text-[var(--text-secondary)]">建议仓位</th>
                <th className="text-center px-0 py-3.5 font-medium text-[10px] text-[var(--text-secondary)] w-10">基</th>
                <th className="text-center px-0 py-3.5 font-medium text-[10px] text-[var(--text-secondary)]/60 w-10">技</th>
                <th className="text-center px-0 py-3.5 font-medium text-[10px] text-[var(--text-secondary)]/60 w-10">情</th>
                <th className="text-center px-0 py-3.5 font-medium text-[10px] text-[var(--text-secondary)]/60 w-10">宏</th>
                <th className="text-center px-0 py-3.5 font-medium text-[10px] text-[var(--text-secondary)]/60 w-10">险</th>
                <th className="text-right px-5 py-3.5 font-medium text-[var(--text-secondary)]">更新</th>
              </tr>
            </thead>
            <tbody>
              {displayData.map((item, idx) => {
                const style = signalStyles[item.signal] || signalStyles["持有"];
                const isActive = activeRow === item.ticker;
                const updateState = updateStates[item.ticker];
                return (
                  <motion.tr
                    key={item.ticker}
                    className={`border-b border-[var(--border-custom)]/40 transition-all ${editing ? "" : "cursor-pointer"} relative ${isActive && !editing ? "bg-[var(--blue)]/8" : editing ? "" : "hover:bg-[var(--blue)]/6"}`}
                    onClick={() => !editing && router.push(`/stock/${item.ticker}`)}
                    onMouseEnter={() => setActiveRow(item.ticker)}
                    onMouseLeave={() => setActiveRow(null)}
                    initial={{ opacity: 0, x: -4 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ duration: 0.3, delay: idx * 0.04 }}
                  >
                    {editing && (
                      <td className="pl-3 pr-0 py-3.5">
                        <div className="flex items-center gap-1">
                          <button onClick={(e) => { e.stopPropagation(); moveUp(idx); }} className="text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)]"><ChevronUp className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); moveDown(idx); }} className="text-[var(--text-secondary)]/50 hover:text-[var(--text-primary)]"><ChevronDown className="w-3 h-3" /></button>
                          <button onClick={(e) => { e.stopPropagation(); removeItem(idx); }} className="ml-1 p-0.5 text-[var(--text-secondary)]/40 hover:text-[var(--red)]"><Trash2 className="w-3 h-3" /></button>
                        </div>
                      </td>
                    )}
                    <td className={`px-5 py-3.5 font-mono font-semibold text-[var(--text-primary)] relative ${editing ? "pl-3" : "pl-6"}`}>
                      {isActive && !editing && <div className="absolute left-0 top-0 bottom-0 w-0.5 bg-[var(--blue)] scan-bar-active rounded-r" />}
                      {item.ticker}
                      <span className="ml-2 text-[var(--text-secondary)] font-normal font-sans">{item.name}</span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[11px] font-medium ${style.bg} ${style.text}`}>
                        <span className={`w-1 h-1 rounded-full ${style.dot}`} />{item.signal}
                      </span>
                    </td>
                    <td className="px-5 py-3.5">
                      <span className="conviction-bar">
                        <span className="font-mono font-semibold text-[var(--text-primary)] w-8">{item.conviction}%</span>
                        <span className="w-20 h-1.5 rounded-full bg-[var(--border-custom)] overflow-hidden ml-1">
                          <motion.div className={`h-full rounded-full ${item.conviction >= 75 ? "bg-[var(--green)]" : item.conviction >= 55 ? "bg-[var(--blue)]" : item.conviction >= 35 ? "bg-[var(--amber)]" : "bg-[var(--red)]"}`} initial={{ width: 0 }} animate={{ width: `${item.conviction}%` }} transition={{ duration: 0.6, ease: "easeOut", delay: idx * 0.04 }} />
                        </span>
                      </span>
                    </td>
                    <td className="px-5 py-3.5"><span className={`text-[11px] font-medium ${riskColors[item.risk]}`}>{item.risk}</span></td>
                    <td className="px-5 py-3.5"><ConsensusDots consensus={item.consensus} /></td>
                    <td className="px-5 py-3.5 font-mono font-semibold text-[var(--blue)]">{item.exposure}</td>
                    <td className="text-center py-3.5">{item.agentAlignment.fundamental ? <Check className="w-3.5 h-3.5 text-[var(--green)] mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--red)]/50 mx-auto" />}</td>
                    <td className="text-center py-3.5">{item.agentAlignment.technical ? <Check className="w-3.5 h-3.5 text-[var(--green)] mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--red)]/50 mx-auto" />}</td>
                    <td className="text-center py-3.5">{item.agentAlignment.sentiment ? <Check className="w-3.5 h-3.5 text-[var(--green)] mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--red)]/50 mx-auto" />}</td>
                    <td className="text-center py-3.5">{item.agentAlignment.macro ? <Check className="w-3.5 h-3.5 text-[var(--green)] mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--red)]/50 mx-auto" />}</td>
                    <td className="text-center py-3.5">{item.agentAlignment.risk ? <Check className="w-3.5 h-3.5 text-[var(--green)] mx-auto" /> : <X className="w-3.5 h-3.5 text-[var(--red)]/50 mx-auto" />}</td>
                    <td className="px-5 py-3.5 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {updateState?.status === "completed" ? (
                          <span className="text-[10px] font-mono text-[var(--green)] flex items-center gap-1">
                            <CheckCircle2 className="w-3 h-3" />已完成
                          </span>
                        ) : updateState?.status === "analyzing" ? (
                          <span className="text-[10px] font-mono text-[var(--blue)] flex items-center gap-1">
                            <RefreshCw className="w-3 h-3 animate-spin" />分析中 {updateState.completedCount}/6
                          </span>
                        ) : updateState?.status === "failed" ? (
                          <span className="text-[10px] font-mono text-[var(--red)] flex items-center gap-1" title={updateState.errorMessage || "分析失败"}>
                            <XCircle className="w-3 h-3" />失败
                          </span>
                        ) : (
                          <>
                            <span className="text-[10px] font-mono text-[var(--text-secondary)]/70">
                              {formatDate(item.updatedAt)}
                            </span>
                            <button
                              onClick={(e) => handleRefresh(item.ticker, e)}
                              className="p-1 rounded text-[var(--text-secondary)]/30 hover:text-[var(--blue)] hover:bg-[var(--blue)]/10 transition-all"
                              title="重新分析"
                            >
                              <RefreshCw className="w-3 h-3" />
                            </button>
                          </>
                        )}
                      </div>
                    </td>
                  </motion.tr>
                );
              })}
              {/* 编辑模式：添加行 */}
              {editing && (
                <tr className="border-b border-[var(--border-custom)]/20 bg-[var(--blue)]/[0.03]">
                  <td colSpan={13} className="px-5 py-2.5">
                    <div className="relative">
                      <div className="flex items-center gap-2">
                        <Plus className="w-3.5 h-3.5 text-[var(--text-secondary)]/30 shrink-0" />
                        <input
                          type="text" value={addQuery} onChange={(e) => handleAddSearch(e.target.value)}
                          placeholder="添加股票..."
                          className="flex-1 bg-transparent text-xs font-mono text-[var(--text-primary)] placeholder:text-[var(--text-secondary)]/20 focus:outline-none"
                        />
                        {editing && <span className="text-[10px] font-mono text-[var(--text-secondary)]/30">{editData.length} 只标的</span>}
                      </div>
                      {addSuggestions.length > 0 && (
                        <div className="absolute top-full mt-1 left-6 right-0 bg-[var(--panel)] border border-[var(--border-custom)] rounded-lg shadow-lg overflow-hidden z-50">
                          {addSuggestions.map((s) => (
                            <button key={s.ticker} onClick={() => addItem(s)} className="w-full text-left px-3 py-2 hover:bg-[var(--blue)]/8 flex items-center gap-3 text-xs">
                              <span className="font-mono font-semibold text-[var(--text-primary)]">{s.ticker}</span>
                              <span className="text-[var(--text-secondary)]">{s.name}</span>
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* 移动端 */}
      <div className="flex flex-col gap-2 md:hidden">
        {displayData.map((item) => {
          const style = signalStyles[item.signal] || signalStyles["持有"];
          const updateState = updateStates[item.ticker];
          return (
            <motion.div key={item.ticker} className="card-terminal !p-4 cursor-pointer active:bg-[var(--panel2)]" onClick={() => !editing && router.push(`/stock/${item.ticker}`)} whileTap={{ scale: 0.98 }}>
              <div className="flex items-center justify-between mb-2.5">
                <div><span className="font-mono font-semibold text-sm text-[var(--text-primary)]">{item.ticker}</span><span className="ml-2 text-xs text-[var(--text-secondary)]">{item.name}</span></div>
                <span className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px] font-medium ${style.bg} ${style.text}`}>{item.signal}</span>
              </div>
              <div className="flex items-center gap-3 text-[10px] text-[var(--text-secondary)] mb-2">
                <span>置信度 <span className="font-mono text-[var(--text-primary)]">{item.conviction}%</span></span>
                <span>风险 <span className={`font-mono ${riskColors[item.risk]}`}>{item.risk}</span></span>
                <span>仓位 <span className="font-mono text-[var(--blue)]">{item.exposure}</span></span>
              </div>
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-[10px]"><ConsensusDots consensus={item.consensus} /></div>
                <div className="flex items-center gap-1.5 text-[10px] font-mono text-[var(--text-secondary)]/70">
                  {updateState?.status === "completed" ? (
                    <span className="text-[var(--green)] flex items-center gap-1"><CheckCircle2 className="w-2.5 h-2.5" />已完成</span>
                  ) : updateState?.status === "analyzing" ? (
                    <span className="text-[var(--blue)] flex items-center gap-1"><RefreshCw className="w-2.5 h-2.5 animate-spin" />分析中 {updateState.completedCount}/6</span>
                  ) : updateState?.status === "failed" ? (
                    <span className="text-[var(--red)] flex items-center gap-1" title={updateState.errorMessage || "分析失败"}><XCircle className="w-2.5 h-2.5" />失败</span>
                  ) : (
                    <>
                      <span>{formatDate(item.updatedAt)}</span>
                      <button
                        onClick={(e) => handleRefresh(item.ticker, e)}
                        className="p-0.5 rounded text-[var(--text-secondary)]/30 hover:text-[var(--blue)]"
                        title="重新分析"
                      >
                        <RefreshCw className="w-2.5 h-2.5" />
                      </button>
                    </>
                  )}
                </div>
              </div>
              <div className="mt-2 scale-90 origin-left"><AgentAlignmentIcons alignment={item.agentAlignment} /></div>
            </motion.div>
          );
        })}
      </div>
    </motion.section>
  );
}

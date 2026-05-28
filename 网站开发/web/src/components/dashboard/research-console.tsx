"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useRouter } from "next/navigation";
import { searchStocks, isValidTickerFormat, inferMarket } from "@/data/stocks";
import { AnalysisMode, AnalysisStartResponse, Market, StockEntry } from "@/types";
import { Search, Sparkles, Zap, ChevronDown } from "lucide-react";

const MARKET_LABELS: Record<Market, string> = { US: "美股", HK: "港股", CN: "A股" };
const MODE_LABELS: Record<AnalysisMode, string> = { standard: "标准分析", deep: "深度研究" };

const TRENDING = ["NVDA", "TSLA", "META", "PLTR", "AMD"];

const BOOT_STEPS = [
  "连接市场数据",
  "基本面分析智能体就绪",
  "情绪分析引擎就绪",
  "辩论系统在线",
  "仓位引擎就绪",
];

export function AIResearchConsole() {
  const router = useRouter();
  const [query, setQuery] = useState("");
  const [selectedStock, setSelectedStock] = useState<StockEntry | null>(null);
  const [market, setMarket] = useState<Market>("US");
  const [mode, setMode] = useState<AnalysisMode>("standard");
  const [suggestions, setSuggestions] = useState<StockEntry[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [highlightIndex, setHighlightIndex] = useState(-1);
  const [showMarketMenu, setShowMarketMenu] = useState(false);
  const [showModeMenu, setShowModeMenu] = useState(false);
  const [isStarting, setIsStarting] = useState(false);
  const [bootStep, setBootStep] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    function handleClick(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setShowSuggestions(false);
        setShowMarketMenu(false);
        setShowModeMenu(false);
      }
    }
    document.addEventListener("mousedown", handleClick);
    return () => document.removeEventListener("mousedown", handleClick);
  }, []);

  const handleInput = useCallback((value: string) => {
    setQuery(value);
    setSelectedStock(null);
    setHighlightIndex(-1);
    if (value.trim()) {
      const results = searchStocks(value);
      setSuggestions(results);
      // keyword 完全匹配时自动选中第一条（如输入 "salesforce" 直接锁定 CRM）
      const q = value.trim().toLowerCase();
      const autoMatch = results.find(
        (s) =>
          s.ticker.toLowerCase() === q ||
          s.name.toLowerCase() === q ||
          s.keywords.some((k) => k === q)
      );
      if (autoMatch) {
        setSelectedStock(autoMatch);
        setMarket(autoMatch.market);
        setShowSuggestions(false);
      } else {
        setShowSuggestions(results.length > 0);
        // 纯 ticker 格式输入时自动推断市场
        if (isValidTickerFormat(value.trim()) && results.length === 0) {
          setMarket(inferMarket(value.trim()));
        }
      }
    } else {
      setSuggestions([]);
      setShowSuggestions(false);
    }
  }, []);

  const handleSelect = useCallback((stock: StockEntry) => {
    setSelectedStock(stock);
    setQuery(`${stock.ticker} · ${stock.name}`);
    setMarket(stock.market);
    setShowSuggestions(false);
    setHighlightIndex(-1);
  }, []);

  const handleTrending = useCallback((ticker: string) => {
    const found = searchStocks(ticker).find((s) => s.ticker === ticker);
    if (found) handleSelect(found);
  }, [handleSelect]);

  const handleLaunch = useCallback(async () => {
    // 如果建议列表有高亮项，先选中它
    if (showSuggestions && highlightIndex >= 0 && suggestions[highlightIndex]) {
      handleSelect(suggestions[highlightIndex]);
      return;
    }
    const rawInput = query.trim();
    // 支持直接输入 ticker（未在 stockMap 收录的也可以分析）
    const ticker = selectedStock?.ticker || rawInput.split(/[\s·\-]/)[0].trim().toUpperCase();
    if (!ticker) return;

    setIsStarting(true);
    setBootStep(0);

    for (let i = 0; i < BOOT_STEPS.length; i++) {
      await new Promise((r) => setTimeout(r, 350));
      setBootStep(i + 1);
    }
    await new Promise((r) => setTimeout(r, 300));

    try {
      // 未收录 ticker 自动推断市场（除非用户已手动选择）
      const effectiveMarket = selectedStock?.market ?? inferMarket(ticker);
      const res = await fetch("/api/analysis/start", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ticker, market: effectiveMarket, mode }),
      });
      const data: AnalysisStartResponse = await res.json();
      if (data.success) {
        router.push(`/analysis/${data.session_id}`);
      }
    } catch {
      router.push(`/analysis/sess_${ticker.toLowerCase()}_${Date.now()}`);
    }
  }, [selectedStock, query, market, mode, router, showSuggestions, highlightIndex, suggestions, handleSelect]);

  // canLaunch：有选中股票 或 输入是合法 ticker 格式
  const canLaunch = !!(selectedStock || isValidTickerFormat(query.trim()));

  return (
    <motion.section
      ref={containerRef}
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 0.5, delay: 0.08 }}
      className="max-w-[980px] mx-auto"
    >
      {/* ═══ Hero Console Card ═══ */}
      <div
        className="relative rounded-2xl overflow-visible"
        style={{
          background: "#071122",
          border: "1px solid rgba(80,120,255,0.15)",
          boxShadow:
            "0 0 0 1px rgba(80,120,255,0.05), 0 0 60px rgba(0,120,255,0.08), 0 4px 32px rgba(0,0,0,0.4)",
        }}
      >
        {/* ── 顶部状态栏 ── */}
        <div className="flex items-center justify-between px-5 pt-3.5 pb-3 border-b border-[rgba(80,120,255,0.08)]">
          <div>
            <h2 className="text-xs font-semibold text-white/90 flex items-center gap-1.5 tracking-wider">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--blue)]" />
              AI 研究控制台
            </h2>
            <p className="text-[10px] text-white/25 mt-0.5 font-mono">
              多智能体工作流引擎
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--green)] pulse-green" />
            <span className="text-[10px] text-[var(--green)]/80 font-mono">
              AI 智能体就绪
            </span>
          </div>
        </div>

        {/* ── 主内容区 ── */}
        <div className="px-5 py-4">
          {/* 搜索 + 控件同行 */}
          <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
            {/* 搜索框 */}
            <div className="flex-1 relative min-w-0">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-4 h-4 text-white/15" />
              <input
                ref={inputRef}
                type="text"
                value={query}
                onChange={(e) => handleInput(e.target.value)}
                onFocus={() => {
                  if (suggestions.length > 0) setShowSuggestions(true);
                }}
                onKeyDown={(e) => {
                  if (e.key === "ArrowDown") {
                    e.preventDefault();
                    setHighlightIndex((i) => Math.min(i + 1, suggestions.length - 1));
                    setShowSuggestions(true);
                  } else if (e.key === "ArrowUp") {
                    e.preventDefault();
                    setHighlightIndex((i) => Math.max(i - 1, -1));
                  } else if (e.key === "Enter") {
                    e.preventDefault();
                    if (showSuggestions && highlightIndex >= 0 && suggestions[highlightIndex]) {
                      handleSelect(suggestions[highlightIndex]);
                    } else if (canLaunch && !isStarting) {
                      handleLaunch();
                    }
                  } else if (e.key === "Escape") {
                    setShowSuggestions(false);
                    setHighlightIndex(-1);
                  }
                }}
                placeholder="输入股票代码或公司名称，按 Enter 启动分析..."
                className="w-full bg-white/[0.03] border border-white/[0.06] rounded-lg pl-11 pr-4 text-sm font-mono font-semibold text-white placeholder:text-white/15 focus:outline-none focus:border-[var(--blue)]/40 focus:bg-white/[0.05] transition-all"
                style={{ height: 48 }}
              />

              {/* 自动补全 */}
              <AnimatePresence>
                {showSuggestions && suggestions.length > 0 && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 left-0 right-0 bg-[#0a1a3a] border border-[rgba(80,120,255,0.18)] rounded-lg shadow-xl overflow-hidden z-50"
                  >
                    {suggestions.map((s, idx) => (
                      <button
                        key={s.ticker}
                        onClick={() => handleSelect(s)}
                        onMouseEnter={() => setHighlightIndex(idx)}
                        className={`w-full text-left px-4 py-2.5 transition-colors flex items-center gap-3 border-b border-white/[0.04] last:border-0 ${
                          idx === highlightIndex ? "bg-[var(--blue)]/15" : "hover:bg-[var(--blue)]/10"
                        }`}
                      >
                        <span className="font-mono font-bold text-white text-xs w-16">
                          {s.ticker}
                        </span>
                        <span className="text-white/50 text-xs">{s.name}</span>
                        <span className="ml-auto text-[10px] text-white/25 font-mono">
                          {MARKET_LABELS[s.market]}
                        </span>
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Market */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowMarketMenu(!showMarketMenu);
                  setShowModeMenu(false);
                }}
                className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-0 text-xs font-mono text-white/70 hover:border-white/[0.12] transition-all min-w-[110px]"
                style={{ height: 48 }}
              >
                <span className="text-[9px] text-white/20">市场</span>
                <span className="text-white">{MARKET_LABELS[market]}</span>
                <ChevronDown className={`ml-auto w-3 h-3 text-white/20 transition-transform ${showMarketMenu ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showMarketMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 left-0 bg-[#0a1a3a] border border-[rgba(80,120,255,0.18)] rounded-lg shadow-xl overflow-hidden z-50 min-w-[130px]"
                  >
                    {(Object.keys(MARKET_LABELS) as Market[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMarket(m); setShowMarketMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${m === market ? "text-[var(--blue)] bg-[var(--blue)]/10" : "text-white/50 hover:bg-white/[0.04]"}`}
                      >
                        {MARKET_LABELS[m]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* Mode */}
            <div className="relative shrink-0">
              <button
                onClick={() => {
                  setShowModeMenu(!showModeMenu);
                  setShowMarketMenu(false);
                }}
                className="flex items-center gap-1.5 bg-white/[0.04] border border-white/[0.06] rounded-lg px-3 py-0 text-xs font-mono text-white/70 hover:border-white/[0.12] transition-all min-w-[120px]"
                style={{ height: 48 }}
              >
                <span className="text-[9px] text-white/20">模式</span>
                <span className="text-white">{MODE_LABELS[mode]}</span>
                <ChevronDown className={`ml-auto w-3 h-3 text-white/20 transition-transform ${showModeMenu ? "rotate-180" : ""}`} />
              </button>
              <AnimatePresence>
                {showModeMenu && (
                  <motion.div
                    initial={{ opacity: 0, y: -4 }}
                    animate={{ opacity: 1, y: 0 }}
                    exit={{ opacity: 0, y: -4 }}
                    className="absolute top-full mt-1 left-0 bg-[#0a1a3a] border border-[rgba(80,120,255,0.18)] rounded-lg shadow-xl overflow-hidden z-50 min-w-[140px]"
                  >
                    {(Object.keys(MODE_LABELS) as AnalysisMode[]).map((m) => (
                      <button
                        key={m}
                        onClick={() => { setMode(m); setShowModeMenu(false); }}
                        className={`w-full text-left px-3 py-2 text-xs font-mono transition-colors ${m === mode ? "text-[var(--blue)] bg-[var(--blue)]/10" : "text-white/50 hover:bg-white/[0.04]"}`}
                      >
                        {MODE_LABELS[m]}
                      </button>
                    ))}
                  </motion.div>
                )}
              </AnimatePresence>
            </div>

            {/* CTA */}
            <motion.button
              onClick={handleLaunch}
              disabled={!canLaunch || isStarting}
              whileHover={canLaunch && !isStarting ? { scale: 1.02 } : {}}
              whileTap={canLaunch && !isStarting ? { scale: 0.98 } : {}}
              className={`shrink-0 flex items-center justify-center gap-2 rounded-lg font-semibold text-xs tracking-wide transition-all ${
                canLaunch && !isStarting
                  ? "bg-[var(--blue)] text-white hover:bg-[var(--blue)]/90 shadow-lg shadow-[var(--blue)]/25 cursor-pointer"
                  : "bg-white/[0.03] text-white/15 cursor-not-allowed"
              }`}
              style={{ height: 48, paddingLeft: 24, paddingRight: 24, minWidth: 160 }}
            >
              <Zap className="w-3.5 h-3.5" />
              启动 AI 分析
            </motion.button>
          </div>

          {/* 热门快捷入口 */}
          <div className="flex items-center gap-1.5 mt-3 flex-wrap">
            <span className="text-[9px] text-white/12 font-mono mr-1">热门</span>
            {TRENDING.map((t) => (
              <button
                key={t}
                onClick={() => handleTrending(t)}
                className="px-2.5 py-1 rounded text-[10px] font-mono font-semibold text-white/30 hover:text-[var(--blue)] hover:bg-[var(--blue)]/6 border border-white/[0.03] hover:border-[var(--blue)]/20 transition-all"
              >
                {t}
              </button>
            ))}
          </div>
        </div>

        {/* 底部光感线 */}
        <div
          className="absolute -bottom-px left-1/2 -translate-x-1/2 w-3/4 h-px"
          style={{
            background:
              "linear-gradient(90deg, transparent, rgba(80,120,255,0.25), transparent)",
          }}
        />
      </div>

      {/* ═══ Boot Sequence Overlay ═══ */}
      <AnimatePresence>
        {isStarting && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[100] bg-black/85 backdrop-blur-md flex items-center justify-center"
          >
            <motion.div
              initial={{ scale: 0.96, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              className="max-w-lg w-full mx-6"
              style={{
                background: "#071122",
                border: "1px solid rgba(80,120,255,0.2)",
                borderRadius: 20,
                padding: 40,
                boxShadow:
                  "0 0 0 1px rgba(80,120,255,0.08), 0 0 100px rgba(0,120,255,0.12)",
              }}
            >
              <div className="flex items-center gap-3 mb-8">
                <span className="w-2.5 h-2.5 rounded-full bg-[var(--blue)] pulse-blue" />
                <h2 className="text-sm font-semibold text-white tracking-wider">
                  正在启动 AI 投资委员会...
                </h2>
              </div>

              <div className="space-y-3 font-mono text-sm">
                {BOOT_STEPS.map((step, i) => {
                  const done = bootStep > i;
                  const current = bootStep === i + 1;
                  return (
                    <motion.div
                      key={i}
                      initial={{ opacity: 0, x: -8 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: i * 0.08 }}
                      className={`flex items-center gap-3 py-1.5 transition-all duration-300 ${
                        done
                          ? "text-[var(--green)]"
                          : current
                            ? "text-[var(--blue)]"
                            : "text-white/10"
                      }`}
                    >
                      <span className="w-5 text-center text-xs">
                        {done ? (
                          "✓"
                        ) : current ? (
                          <span className="inline-block w-3 h-3 border-2 border-[var(--blue)] border-t-transparent rounded-full animate-spin" />
                        ) : (
                          "○"
                        )}
                      </span>
                      {step}
                    </motion.div>
                  );
                })}
              </div>

              {bootStep >= BOOT_STEPS.length && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="mt-7 pt-5 border-t border-[rgba(80,120,255,0.1)] text-center"
                >
                  <span className="text-xs text-[var(--green)]/80 font-mono">
                    启动分析会话...
                  </span>
                </motion.div>
              )}
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </motion.section>
  );
}

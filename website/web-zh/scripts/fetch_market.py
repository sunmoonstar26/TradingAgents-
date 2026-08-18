#!/usr/bin/env python3
"""
全球市场数据拉取脚本
每天运行一次，写入 web/data/market.json 供前端读取

指标：标普500 / 恒生指数 / 沪深300 / VIX / AI板块(SMH) / 纳斯达克
"""

import json
import os
import sys
from datetime import datetime, date
from pathlib import Path

# 路径: web/scripts/fetch_market.py → web → 网站开发 → TradingAgents 项目
WEB_DIR = Path(__file__).resolve().parent.parent
OUTPUT_FILE = WEB_DIR / "data" / "market.json"

SYMBOLS = {
    "us":      {"ticker": "^GSPC",    "label": "标普 500",   "type": "index"},
    "hk":      {"ticker": "^HSI",     "label": "恒生指数",   "type": "index"},
    "cn":      {"ticker": "000300.SS","label": "沪深 300",   "type": "index"},
    "vix":     {"ticker": "^VIX",     "label": "VIX",        "type": "vix"},
    "ai":      {"ticker": "SMH",      "label": "AI 板块",    "type": "etf"},
    "nasdaq":  {"ticker": "^IXIC",    "label": "纳斯达克",   "type": "index"},
}


def fmt_value(price: float, sym_type: str) -> str:
    if sym_type == "vix":
        return f"{price:.2f}"
    if price >= 10000:
        return f"{price:,.0f}"
    if price >= 1000:
        return f"{price:,.2f}"
    return f"{price:.2f}"


def calc_status(change_pct: float | None, sym_type: str) -> str:
    if change_pct is None:
        return "neutral"
    if sym_type == "vix":
        if change_pct >= 10:
            return "danger"
        if change_pct >= 5:
            return "warning"
        return "neutral"
    if change_pct >= 0.5:
        return "up"
    if change_pct <= -0.5:
        return "down"
    return "neutral"


def fetch_all() -> dict:
    import yfinance as yf

    results = {}
    fetch_errors = []

    for key, cfg in SYMBOLS.items():
        ticker_str = cfg["ticker"]
        sym_type = cfg["type"]
        try:
            t = yf.Ticker(ticker_str)
            # 拉最近 5 天保证节假日也能拿到最新一根
            hist = t.history(period="5d", auto_adjust=True)
            if hist.empty:
                raise ValueError(f"no data for {ticker_str}")

            last = hist.iloc[-1]
            prev = hist.iloc[-2] if len(hist) >= 2 else None

            close = float(last["Close"])
            if prev is not None:
                prev_close = float(prev["Close"])
                change_pct = round((close - prev_close) / prev_close * 100, 2)
            else:
                change_pct = None

            results[key] = {
                "label":  cfg["label"],
                "ticker": ticker_str,
                "value":  fmt_value(close, sym_type),
                "change": change_pct,
                "status": calc_status(change_pct, sym_type),
                "date":   str(hist.index[-1].date()),
            }
            print(f"  ✓ {cfg['label']:12s} {results[key]['value']:>12s}  {change_pct:+.2f}%" if change_pct else f"  ✓ {cfg['label']:12s} {results[key]['value']:>12s}")
        except Exception as e:
            fetch_errors.append(f"{ticker_str}: {e}")
            print(f"  ✗ {cfg['label']:12s} 失败: {e}", file=sys.stderr)
            # 保留旧值（若已有文件）
            results[key] = None

    # 合并旧数据：拉失败的指标保留上一次的值
    old_data = {}
    if OUTPUT_FILE.exists():
        try:
            old_data = json.loads(OUTPUT_FILE.read_text())
        except Exception:
            pass

    for key in results:
        if results[key] is None:
            results[key] = old_data.get("indicators", {}).get(key, {
                "label": SYMBOLS[key]["label"],
                "ticker": SYMBOLS[key]["ticker"],
                "value": "—",
                "change": None,
                "status": "neutral",
                "date": None,
            })

    # AI 板块动量文字化（SMH 涨跌幅 → 强/平/弱）
    ai_change = results.get("ai", {}).get("change")
    ai_momentum_label = "强" if (ai_change or 0) >= 1 else "弱" if (ai_change or 0) <= -1 else "平"
    ai_momentum_status = "up" if (ai_change or 0) >= 1 else "down" if (ai_change or 0) <= -1 else "neutral"

    # 市场风险等级：根据 VIX 判断
    vix_val = None
    try:
        vix_val = float(results["vix"]["value"].replace(",", ""))
    except Exception:
        pass
    if vix_val is None:
        risk_label, risk_status = "未知", "neutral"
    elif vix_val >= 30:
        risk_label, risk_status = "高", "danger"
    elif vix_val >= 20:
        risk_label, risk_status = "中高", "warning"
    elif vix_val >= 15:
        risk_label, risk_status = "中低", "warning"
    else:
        risk_label, risk_status = "低", "up"

    output = {
        "updatedAt": datetime.utcnow().isoformat() + "Z",
        "fetchDate": str(date.today()),
        "errors": fetch_errors,
        "indicators": results,
        # 前端 marketState 格式（直接映射 GlobalMarketState 字段）
        "marketState": {
            "usMarket": {
                "label": "美股",
                "value": results["us"]["value"],
                "change": results["us"]["change"],
                "status": results["us"]["status"],
            },
            "hkMarket": {
                "label": "港股",
                "value": results["hk"]["value"],
                "change": results["hk"]["change"],
                "status": results["hk"]["status"],
            },
            "cnMarket": {
                "label": "A 股",
                "value": results["cn"]["value"],
                "change": results["cn"]["change"],
                "status": results["cn"]["status"],
            },
            "vix": {
                "label": "VIX",
                "value": results["vix"]["value"],
                "change": results["vix"]["change"],
                "status": results["vix"]["status"],
            },
            "aiSectorMomentum": {
                "label": "AI 板块动量",
                "value": ai_momentum_label,
                "change": ai_change,
                "status": ai_momentum_status,
            },
            "marketRiskLevel": {
                "label": "市场风险",
                "value": risk_label,
                "change": None,
                "status": risk_status,
            },
        },
    }

    return output


def main():
    print(f"[fetch_market] {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}")
    OUTPUT_FILE.parent.mkdir(parents=True, exist_ok=True)

    data = fetch_all()

    OUTPUT_FILE.write_text(json.dumps(data, ensure_ascii=False, indent=2))
    print(f"[fetch_market] 写入 {OUTPUT_FILE}")

    if data["errors"]:
        print(f"[fetch_market] {len(data['errors'])} 个指标拉取失败（已保留旧值）", file=sys.stderr)


if __name__ == "__main__":
    main()

#!/usr/bin/env python3
"""
Finnhub 数据提供者 — 替代 yfinance，避免限速问题

Finnhub Free Tier 限制:
- /stock/candle: 1年历史，日线，60次/分钟
- /stock/profile2 + /stock/metric: 公司基本面
- /company-news: 1年新闻
- 不支持: 财务报表(balance/cashflow/income)、内幕交易 → 自动回退 yfinance
"""

import time
import os
import json
import logging
from datetime import datetime
from typing import Annotated, Optional
import pandas as pd
import requests
from pathlib import Path

from .config import get_config
from .utils import safe_ticker_component

logger = logging.getLogger(__name__)

# Finnhub API 配置
FINNHUB_BASE = "https://finnhub.io/api/v1"
FINNHUB_KEY = os.environ.get("FINNHUB_API_KEY", "d7g9kcpr01qqb8rirc20d7g9kcpr01qqb8rirc2g")

# 速率限制: free tier 60次/分钟 → 两次调用间隔 ≥ 1.1s
_last_call_time = 0
_MIN_CALL_INTERVAL = 1.1


def _rate_limit():
    """确保 API 调用频率不超过 Finnhub 限制"""
    global _last_call_time
    elapsed = time.time() - _last_call_time
    if elapsed < _MIN_CALL_INTERVAL:
        time.sleep(_MIN_CALL_INTERVAL - elapsed)
    _last_call_time = time.time()


def _finnhub_get(endpoint: str, params: dict = None) -> dict | list:
    """调用 Finnhub API，带速率限制和错误处理"""
    if params is None:
        params = {}
    params["token"] = FINNHUB_KEY

    _rate_limit()

    resp = requests.get(f"{FINNHUB_BASE}{endpoint}", params=params, timeout=15)
    resp.raise_for_status()

    data = resp.json()

    # Finnhub 返回 {"error": "..."} 表示限速
    if isinstance(data, dict) and data.get("error"):
        raise RuntimeError(f"Finnhub API error: {data['error']}")

    return data


# ═══════════════════════════════════════════════════════════════
# 1. OHLCV 价格数据（替代 yf.download / yf.Ticker.history）
# ═══════════════════════════════════════════════════════════════

def load_ohlcv_finnhub(symbol: str, curr_date: str) -> pd.DataFrame:
    """使用 Finnhub /stock/candle 获取 OHLCV，带本地缓存。

    与原 load_ohlcv() 接口兼容，返回 DataFrame with columns:
    Date, Open, High, Low, Close, Volume, Adj Close
    """
    safe_symbol = safe_ticker_component(symbol)
    config = get_config()
    curr_date_dt = pd.to_datetime(curr_date)

    # 缓存窗口: 向前1年（free tier 限制）
    today = pd.Timestamp.today()
    start_date = today - pd.DateOffset(years=1)
    start_str = start_date.strftime("%Y-%m-%d")
    end_str = today.strftime("%Y-%m-%d")

    os.makedirs(config["data_cache_dir"], exist_ok=True)
    data_file = os.path.join(
        config["data_cache_dir"],
        f"{safe_symbol}-FH-data-{start_str}-{end_str}.csv",
    )

    if os.path.exists(data_file):
        data = pd.read_csv(data_file, on_bad_lines="skip", encoding="utf-8")
    else:
        from_timestamp = int(start_date.timestamp())
        to_timestamp = int(today.timestamp())

        raw = _finnhub_get("/stock/candle", {
            "symbol": symbol.upper(),
            "resolution": "D",
            "from": str(from_timestamp),
            "to": str(to_timestamp),
        })

        if raw.get("s") != "ok" or not raw.get("t"):
            raise RuntimeError(f"Finnhub: No candle data for {symbol}")

        df = pd.DataFrame({
            "Date": pd.to_datetime(raw["t"], unit="s"),
            "Open": raw["o"],
            "High": raw["h"],
            "Low": raw["l"],
            "Close": raw["c"],
            "Volume": raw["v"],
            "Adj Close": raw["c"],  # Finnhub 没有调整收盘价，直接用收盘价
        })
        df.to_csv(data_file, index=False, encoding="utf-8")
        data = df

    data["Date"] = pd.to_datetime(data["Date"], errors="coerce")
    data = data.dropna(subset=["Date"])

    price_cols = ["Open", "High", "Low", "Close", "Volume", "Adj Close"]
    data[price_cols] = data[price_cols].apply(pd.to_numeric, errors="coerce")
    data = data.dropna(subset=["Close"])
    data[price_cols] = data[price_cols].ffill().bfill()

    # 过滤未来数据（防止前视偏差）
    data = data[data["Date"] <= curr_date_dt]

    return data


def get_stock_data_finnhub(
    symbol: Annotated[str, "ticker symbol"],
    start_date: Annotated[str, "Start date YYYY-mm-dd"],
    end_date: Annotated[str, "End date YYYY-mm-dd"],
) -> str:
    """Finnhub 版 get_stock_data — 返回 CSV 格式的 OHLCV 数据"""
    datetime.strptime(start_date, "%Y-%m-%d")
    datetime.strptime(end_date, "%Y-%m-%d")

    start_dt = pd.to_datetime(start_date)
    end_dt = pd.to_datetime(end_date)

    from_ts = int(start_dt.timestamp())
    to_ts = int(end_dt.timestamp())

    raw = _finnhub_get("/stock/candle", {
        "symbol": symbol.upper(),
        "resolution": "D",
        "from": str(from_ts),
        "to": str(to_ts),
    })

    if raw.get("s") != "ok" or not raw.get("t"):
        return f"# No data found for symbol '{symbol}' between {start_date} and {end_date}\n"

    df = pd.DataFrame({
        "Date": pd.to_datetime(raw["t"], unit="s").strftime("%Y-%m-%d"),
        "Open": [round(v, 2) for v in raw["o"]],
        "High": [round(v, 2) for v in raw["h"]],
        "Low": [round(v, 2) for v in raw["l"]],
        "Close": [round(v, 2) for v in raw["c"]],
        "Volume": raw["v"],
        "Adj Close": [round(v, 2) for v in raw["c"]],
    })

    csv_str = df.to_csv(index=False)
    header = f"# Stock data for {symbol.upper()} from {start_date} to {end_date}\n"
    header += f"# Total records: {len(df)}\n"
    header += f"# Data retrieved on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
    header += f"# Source: Finnhub\n\n"

    return header + csv_str


# ═══════════════════════════════════════════════════════════════
# 2. 技术指标（复用 OHLCV，由 stockstats 计算）
# ═══════════════════════════════════════════════════════════════

def get_indicator_finnhub(
    symbol: Annotated[str, "ticker symbol"],
    indicator: Annotated[str, "technical indicator name"],
    curr_date: Annotated[str, "current date YYYY-mm-dd"],
    look_back_days: Annotated[int, "lookback days"],
) -> str:
    """Finnhub 版技术指标 — 与 yfinance 版本接口兼容。

    实际指标计算委托给 stockstats 库，这里只负责提供 OHLCV 数据。
    为了保持兼容性，我们直接调用 yfinance 版本的逻辑，
    但确保底层 load_ohlcv 走 Finnhub 路径。

    对于这个函数，如果 config 指定了 finnhub，load_ohlcv 已经会走 Finnhub。
    这里作为接口入口保持函数签名一致即可。
    """
    # 直接委托给 stockstats 计算（load_ohlcv 根据配置走 Finnhub 或 yfinance）
    from .y_finance import get_stock_stats_indicators_window
    return get_stock_stats_indicators_window(symbol, indicator, curr_date, look_back_days)


# ═══════════════════════════════════════════════════════════════
# 3. 公司基本面（/stock/profile2 + /stock/metric）
# ═══════════════════════════════════════════════════════════════

def get_fundamentals_finnhub(
    ticker: Annotated[str, "ticker symbol"],
    curr_date: Annotated[str, "current date"] = None,
) -> str:
    """从 Finnhub 获取公司基本面，合并 profile2 + metrics"""
    try:
        sym = ticker.upper()

        # 并行获取 profile 和 metrics（需串行因为 rate limit）
        profile = _finnhub_get("/stock/profile2", {"symbol": sym})
        metrics = _finnhub_get("/stock/metric", {"symbol": sym, "metric": "all"})

        if not profile:
            return f"No fundamentals data found for symbol '{ticker}'"

        metric = metrics.get("metric", {}) if isinstance(metrics, dict) else {}

        fields = [
            ("Name", profile.get("name")),
            ("Sector/Industry", profile.get("finnhubIndustry")),
            ("Country", profile.get("country")),
            ("Currency", profile.get("currency")),
            ("Exchange", profile.get("exchange")),
            ("IPO Date", profile.get("ipo")),
            ("Market Cap (M)", metric.get("marketCapitalization")),
            ("Shares Outstanding (M)", profile.get("shareOutstanding")),
            # Valuation
            ("PE Ratio (TTM)", metric.get("peNormalizedAnnual") or metric.get("peBasicExclExtraTTM") or metric.get("peTTM")),
            ("Forward PE", metric.get("peExclExtraAnnual")),
            ("PEG Ratio", metric.get("pegRatio")),
            ("Price to Book", metric.get("pbAnnual") or metric.get("pbQuarterly")),
            ("Price to Sales (TTM)", metric.get("psTTM")),
            # Earnings
            ("EPS (TTM)", metric.get("epsBasicExclExtraItemsTTM")),
            ("EPS Growth (YoY %)", metric.get("epsGrowth3Y")),
            ("Dividend Yield (%)", metric.get("dividendYieldIndicatedAnnual")),
            # Beta & Volatility
            ("Beta", metric.get("beta")),
            ("52 Week High", metric.get("52WeekHigh")),
            ("52 Week Low", metric.get("52WeekLow")),
            ("52 Week High Date", metric.get("52WeekHighDate")),
            ("52 Week Price Return (%)", metric.get("52WeekPriceReturnDaily")),
            # Profitability
            ("Revenue (TTM, M)", metric.get("revenueTTM")),
            ("Gross Margin (%)", metric.get("grossMarginTTM")),
            ("Operating Margin (%)", metric.get("operatingMarginTTM")),
            ("Net Profit Margin (%)", metric.get("netProfitMarginTTM")),
            ("EBITDA (TTM, M)", metric.get("ebitdaTTM")),
            ("ROE (%)", metric.get("roeTTM") or metric.get("roeRfy")),
            ("ROA (%)", metric.get("roaTTM") or metric.get("roaRfy")),
            # Financial Health
            ("Debt to Equity (%)", metric.get("totalDebt/totalEquityAnnual") or metric.get("totalDebt/totalEquityQuarterly")),
            ("Current Ratio", metric.get("currentRatioAnnual") or metric.get("currentRatioQuarterly")),
            ("Book Value/Share", metric.get("bookValuePerShareAnnual") or metric.get("bookValuePerShareQuarterly")),
            ("Free Cash Flow/Share", metric.get("freeCashFlowPerShareTTM")),
            ("Cash/Share", metric.get("cashPerSharePerShareAnnual") or metric.get("cashPerSharePerShareQuarterly")),
            # Growth
            ("Revenue Growth (YoY %)", metric.get("revenueGrowth3Y")),
            ("Net Income Growth (YoY %)", metric.get("netIncomeGrowth3Y")),
        ]

        lines = []
        for label, value in fields:
            if value is not None:
                lines.append(f"{label}: {value}")

        header = f"# Company Fundamentals for {sym}\n"
        header += f"# Data retrieved on: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n"
        header += f"# Source: Finnhub\n\n"

        return header + "\n".join(lines)

    except Exception as e:
        return f"Error retrieving Finnhub fundamentals for {ticker}: {str(e)}"


# ═══════════════════════════════════════════════════════════════
# 4. 财务报表 — Finnhub Free Tier 不支持，回退 yfinance
# ═══════════════════════════════════════════════════════════════

def get_balance_sheet_finnhub(
    ticker: Annotated[str, "ticker symbol"],
    freq: Annotated[str, "'annual' or 'quarterly'"] = "quarterly",
    curr_date: Annotated[str, "current date"] = None,
) -> str:
    """Finnhub Free Tier 不提供财务报表，返回提示让系统回退 yfinance"""
    raise RuntimeError("Finnhub free tier does not support balance sheet data")


def get_cashflow_finnhub(
    ticker: Annotated[str, "ticker symbol"],
    freq: Annotated[str, "'annual' or 'quarterly'"] = "quarterly",
    curr_date: Annotated[str, "current date"] = None,
) -> str:
    """Finnhub Free Tier 不提供现金流表"""
    raise RuntimeError("Finnhub free tier does not support cash flow data")


def get_income_statement_finnhub(
    ticker: Annotated[str, "ticker symbol"],
    freq: Annotated[str, "'annual' or 'quarterly'"] = "quarterly",
    curr_date: Annotated[str, "current date"] = None,
) -> str:
    """Finnhub Free Tier 不提供利润表"""
    raise RuntimeError("Finnhub free tier does not support income statement data")


# ═══════════════════════════════════════════════════════════════
# 5. 内幕交易 — Finnhub Free Tier 不支持
# ═══════════════════════════════════════════════════════════════

def get_insider_transactions_finnhub(
    ticker: Annotated[str, "ticker symbol"],
) -> str:
    """Finnhub Free Tier 不提供内幕交易数据"""
    raise RuntimeError("Finnhub free tier does not support insider transactions")


# ═══════════════════════════════════════════════════════════════
# 6. 新闻 — /company-news
# ═══════════════════════════════════════════════════════════════

def get_news_finnhub(
    ticker: Annotated[str, "ticker symbol"],
    start_date: Annotated[str, "Start date YYYY-MM-DD"] = None,
    end_date: Annotated[str, "End date YYYY-MM-DD"] = None,
    limit: Annotated[int, "max articles"] = 20,
) -> str:
    """从 Finnhub 获取公司新闻"""
    try:
        sym = ticker.upper()

        if not start_date:
            start_date = (pd.Timestamp.today() - pd.DateOffset(days=7)).strftime("%Y-%m-%d")
        if not end_date:
            end_date = pd.Timestamp.today().strftime("%Y-%m-%d")

        articles = _finnhub_get("/company-news", {
            "symbol": sym,
            "from": start_date,
            "to": end_date,
        })

        if not articles:
            return f"No news found for {sym} from {start_date} to {end_date}"

        lines = [f"# News for {sym} from {start_date} to {end_date}"]
        lines.append(f"# Source: Finnhub")
        lines.append(f"# Retrieved: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        for i, article in enumerate(articles[:limit]):
            ts = datetime.fromtimestamp(article.get("datetime", 0)).strftime("%Y-%m-%d %H:%M")
            headline = article.get("headline", "N/A")
            source = article.get("source", "N/A")
            summary = article.get("summary", "")[:300]
            url = article.get("url", "")

            lines.append(f"## {i+1}. {headline}")
            lines.append(f"   Date: {ts} | Source: {source}")
            if summary:
                lines.append(f"   Summary: {summary}")
            if url:
                lines.append(f"   URL: {url}")
            lines.append("")

        return "\n".join(lines)

    except Exception as e:
        return f"Error retrieving Finnhub news for {ticker}: {str(e)}"


def get_global_news_finnhub(
    curr_date: Annotated[str, "current date YYYY-MM-DD"] = None,
    look_back_days: Annotated[int, "lookback days"] = None,
    limit: Annotated[int, "max articles"] = 10,
) -> str:
    """从 Finnhub 获取市场宏观新闻"""
    # 尝试多个新闻类别获取最相关的内容
    categories = ["general", "forex"]
    all_articles = []
    
    try:
        for cat in categories:
            try:
                articles = _finnhub_get("/news", {"category": cat})
                if articles:
                    all_articles.extend(articles)
            except Exception:
                continue

        if not all_articles:
            return "No global news available from Finnhub. Falling back to yfinance."

        # 去重（按 headline）
        seen = set()
        unique = []
        for a in all_articles:
            headline = a.get("headline", "")
            if headline not in seen:
                seen.add(headline)
                unique.append(a)

        lines = ["# Global Market News"]
        lines.append(f"# Source: Finnhub")
        lines.append(f"# Retrieved: {datetime.now().strftime('%Y-%m-%d %H:%M:%S')}\n")

        for i, article in enumerate(unique[:limit]):
            ts = datetime.fromtimestamp(article.get("datetime", 0)).strftime("%Y-%m-%d %H:%M")
            headline = article.get("headline", "N/A")
            source = article.get("source", "N/A")
            summary = article.get("summary", "")[:300]
            url = article.get("url", "")

            lines.append(f"## {i+1}. {headline}")
            lines.append(f"   Date: {ts} | Source: {source}")
            if summary:
                lines.append(f"   Summary: {summary}")
            if url:
                lines.append(f"   URL: {url}")
            lines.append("")

        return "\n".join(lines)

    except Exception as e:
        raise RuntimeError(f"Finnhub global news failed: {e}")

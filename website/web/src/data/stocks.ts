import { StockEntry, Market } from "../types";

// Local stock lookup table — used for autocomplete, no external API needed
export const stockMap: StockEntry[] = [
  // ── US: Large-cap tech ──
  { ticker: "NVDA", name: "NVIDIA", market: "US", keywords: ["nvidia", "gpu", "chips", "ai"] },
  { ticker: "META", name: "Meta", market: "US", keywords: ["facebook", "fb", "metaverse", "social"] },
  { ticker: "TSLA", name: "Tesla", market: "US", keywords: ["tesla", "ev", "fsd", "musk"] },
  { ticker: "AMZN", name: "Amazon", market: "US", keywords: ["amazon", "aws", "cloud", "ecommerce"] },
  { ticker: "GOOGL", name: "Alphabet", market: "US", keywords: ["google", "alphabet", "search", "gemini"] },
  { ticker: "GOOG", name: "Alphabet Class C", market: "US", keywords: ["google", "alphabet"] },
  { ticker: "MSFT", name: "Microsoft", market: "US", keywords: ["microsoft", "azure", "openai", "copilot"] },
  { ticker: "AAPL", name: "Apple", market: "US", keywords: ["apple", "iphone", "ios", "cook"] },
  { ticker: "AMD", name: "AMD", market: "US", keywords: ["amd", "cpu", "gpu", "lisa su"] },
  { ticker: "INTC", name: "Intel", market: "US", keywords: ["intel", "cpu", "chips"] },
  { ticker: "QCOM", name: "Qualcomm", market: "US", keywords: ["qualcomm", "snapdragon", "5g"] },
  { ticker: "AVGO", name: "Broadcom", market: "US", keywords: ["broadcom", "chips", "networking"] },
  { ticker: "TSM", name: "TSMC", market: "US", keywords: ["tsmc", "foundry", "semiconductor"] },
  { ticker: "ASML", name: "ASML", market: "US", keywords: ["asml", "lithography", "netherlands"] },
  { ticker: "MU", name: "Micron Technology", market: "US", keywords: ["micron", "memory", "hbm", "dram"] },

  // ── US: AI / Software ──
  { ticker: "PLTR", name: "Palantir", market: "US", keywords: ["palantir", "aip", "data", "defense"] },
  { ticker: "SNOW", name: "Snowflake", market: "US", keywords: ["snowflake", "data warehouse", "saas"] },
  { ticker: "CRM", name: "Salesforce", market: "US", keywords: ["salesforce", "crm", "saas"] },
  { ticker: "NOW", name: "ServiceNow", market: "US", keywords: ["servicenow", "saas", "enterprise"] },
  { ticker: "ORCL", name: "Oracle", market: "US", keywords: ["oracle", "database", "cloud"] },
  { ticker: "IBM", name: "IBM", market: "US", keywords: ["ibm", "watson", "enterprise"] },
  { ticker: "ADBE", name: "Adobe", market: "US", keywords: ["adobe", "photoshop", "creative", "ai"] },

  // ── US: Cybersecurity / Cloud ──
  { ticker: "NET", name: "Cloudflare", market: "US", keywords: ["cloudflare", "cdn", "security"] },
  { ticker: "CRWD", name: "CrowdStrike", market: "US", keywords: ["crowdstrike", "security", "endpoint"] },
  { ticker: "PANW", name: "Palo Alto Networks", market: "US", keywords: ["palo alto", "firewall", "security"] },
  { ticker: "ZS", name: "Zscaler", market: "US", keywords: ["zscaler", "zero trust", "cloud security"] },

  // ── US: EV / Clean Energy ──
  { ticker: "RIVN", name: "Rivian", market: "US", keywords: ["rivian", "electric truck", "amazon"] },
  { ticker: "LCID", name: "Lucid Motors", market: "US", keywords: ["lucid", "ev", "luxury"] },
  { ticker: "LI", name: "Li Auto", market: "US", keywords: ["li auto", "l9", "extended range", "ev"] },
  { ticker: "NIO", name: "NIO", market: "US", keywords: ["nio", "battery swap", "ev"] },
  { ticker: "XPEV", name: "XPeng", market: "US", keywords: ["xpeng", "autonomous driving", "ev"] },

  // ── US: China ADRs ──
  { ticker: "BABA", name: "Alibaba", market: "US", keywords: ["alibaba", "taobao", "tmall", "jack ma"] },
  { ticker: "JD", name: "JD.com", market: "US", keywords: ["jd", "jd.com", "logistics", "ecommerce"] },
  { ticker: "PDD", name: "PDD Holdings", market: "US", keywords: ["pdd", "temu", "ecommerce"] },
  { ticker: "BIDU", name: "Baidu", market: "US", keywords: ["baidu", "apollo", "ernie", "ai"] },
  { ticker: "BILI", name: "Bilibili", market: "US", keywords: ["bilibili", "video", "anime"] },
  { ticker: "FUTU", name: "Futu Holdings", market: "US", keywords: ["futu", "moomoo", "brokerage"] },
  { ticker: "BYDDY", name: "BYD ADR", market: "US", keywords: ["byd", "ev", "battery"] },
  { ticker: "TME", name: "Tencent Music", market: "US", keywords: ["tencent music", "qq music", "streaming"] },

  // ── US: Finance / Crypto ──
  { ticker: "COIN", name: "Coinbase", market: "US", keywords: ["coinbase", "crypto", "btc", "eth"] },
  { ticker: "SOFI", name: "SoFi", market: "US", keywords: ["sofi", "fintech", "banking"] },
  { ticker: "JPM", name: "JPMorgan Chase", market: "US", keywords: ["jpmorgan", "chase", "bank"] },
  { ticker: "GS", name: "Goldman Sachs", market: "US", keywords: ["goldman sachs", "investment bank"] },
  { ticker: "V", name: "Visa", market: "US", keywords: ["visa", "payments"] },
  { ticker: "MA", name: "Mastercard", market: "US", keywords: ["mastercard", "payments"] },

  // ── US: Other popular ──
  { ticker: "NFLX", name: "Netflix", market: "US", keywords: ["netflix", "streaming", "content"] },
  { ticker: "DIS", name: "Disney", market: "US", keywords: ["disney", "streaming", "theme park"] },
  { ticker: "UBER", name: "Uber", market: "US", keywords: ["uber", "rideshare", "delivery"] },
  { ticker: "LYFT", name: "Lyft", market: "US", keywords: ["lyft", "rideshare"] },
  { ticker: "ABNB", name: "Airbnb", market: "US", keywords: ["airbnb", "homestay", "travel"] },
  { ticker: "SPOT", name: "Spotify", market: "US", keywords: ["spotify", "music streaming", "podcast"] },
  { ticker: "RBLX", name: "Roblox", market: "US", keywords: ["roblox", "gaming", "metaverse"] },
  { ticker: "SMCI", name: "Super Micro", market: "US", keywords: ["supermicro", "server", "ai"] },
  { ticker: "ARM", name: "Arm Holdings", market: "US", keywords: ["arm", "chip architecture", "softbank"] },
  { ticker: "MRVL", name: "Marvell Technology", market: "US", keywords: ["marvell", "chips", "ai"] },
  { ticker: "ANET", name: "Arista Networks", market: "US", keywords: ["arista", "networking", "ai"] },
  { ticker: "APP", name: "AppLovin", market: "US", keywords: ["applovin", "ads", "mobile gaming"] },
  { ticker: "HOOD", name: "Robinhood", market: "US", keywords: ["robinhood", "brokerage", "retail"] },

  // ── HK ──
  { ticker: "0700", name: "Tencent Holdings", market: "HK", keywords: ["tencent", "wechat", "gaming"] },
  { ticker: "9988", name: "Alibaba-SW", market: "HK", keywords: ["alibaba", "taobao", "cloud"] },
  { ticker: "9618", name: "JD.com-SW", market: "HK", keywords: ["jd", "jd.com", "logistics"] },
  { ticker: "3690", name: "Meituan-W", market: "HK", keywords: ["meituan", "food delivery"] },
  { ticker: "1810", name: "Xiaomi-W", market: "HK", keywords: ["xiaomi", "su7", "ev", "phone"] },
  { ticker: "2015", name: "Li Auto-W", market: "HK", keywords: ["li auto", "l9", "ev"] },
  { ticker: "9866", name: "NIO-SW", market: "HK", keywords: ["nio", "battery swap", "ev"] },
  { ticker: "9868", name: "XPeng-W", market: "HK", keywords: ["xpeng", "autonomous", "ev"] },
  { ticker: "1211", name: "BYD Co.", market: "HK", keywords: ["byd", "ev", "battery"] },
  { ticker: "9888", name: "Baidu-SW", market: "HK", keywords: ["baidu", "ernie", "apollo"] },
  { ticker: "1024", name: "Kuaishou-W", market: "HK", keywords: ["kuaishou", "short video"] },
  { ticker: "9999", name: "NetEase-S", market: "HK", keywords: ["netease", "gaming", "music"] },
  { ticker: "0941", name: "China Mobile", market: "HK", keywords: ["china mobile", "telecom", "5g"] },
  { ticker: "0388", name: "HKEX", market: "HK", keywords: ["hkex", "exchange", "hong kong"] },
  { ticker: "2382", name: "Sunny Optical", market: "HK", keywords: ["sunny optical", "lens", "camera"] },
  { ticker: "0992", name: "Lenovo Group", market: "HK", keywords: ["lenovo", "pc", "thinkpad"] },

  // ── CN A-shares ──
  { ticker: "600519", name: "Kweichow Moutai", market: "CN", keywords: ["moutai", "baijiu", "maotai"] },
  { ticker: "000858", name: "Wuliangye", market: "CN", keywords: ["wuliangye", "baijiu"] },
  { ticker: "002594", name: "BYD", market: "CN", keywords: ["byd", "ev", "battery"] },
  { ticker: "300750", name: "CATL", market: "CN", keywords: ["catl", "battery", "ev"] },
  { ticker: "601012", name: "LONGi Green Energy", market: "CN", keywords: ["longi", "solar", "pv"] },
  { ticker: "300059", name: "East Money", market: "CN", keywords: ["east money", "brokerage", "fund"] },
  { ticker: "600036", name: "China Merchants Bank", market: "CN", keywords: ["cmb", "bank"] },
  { ticker: "300124", name: "Inovance Technology", market: "CN", keywords: ["inovance", "automation", "inverter"] },
  { ticker: "688981", name: "SMIC", market: "CN", keywords: ["smic", "chips", "semiconductor"] },
  { ticker: "688111", name: "Kingsoft Office", market: "CN", keywords: ["kingsoft", "wps", "office"] },
  { ticker: "000001", name: "Ping An Bank", market: "CN", keywords: ["ping an bank", "bank"] },
  { ticker: "600000", name: "SPD Bank", market: "CN", keywords: ["spd bank", "bank"] },
  { ticker: "601318", name: "Ping An Insurance", market: "CN", keywords: ["ping an", "insurance"] },
  { ticker: "600276", name: "Hengrui Medicine", market: "CN", keywords: ["hengrui", "pharma", "oncology"] },
  { ticker: "300760", name: "Mindray Medical", market: "CN", keywords: ["mindray", "medical device"] },
  { ticker: "603288", name: "Haitian Flavouring", market: "CN", keywords: ["haitian", "soy sauce", "condiment"] },
];

/** Fuzzy search: matches ticker / name / keywords, prioritising exact prefix matches */
export function searchStocks(query: string, maxResults = 8): StockEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();

  const exact: StockEntry[] = [];
  const prefix: StockEntry[] = [];
  const fuzzy: StockEntry[] = [];

  for (const s of stockMap) {
    const tickerLower = s.ticker.toLowerCase();
    const nameLower = s.name.toLowerCase();
    if (tickerLower === q || nameLower === q) {
      exact.push(s);
    } else if (
      tickerLower.startsWith(q) ||
      nameLower.startsWith(q)
    ) {
      prefix.push(s);
    } else if (
      tickerLower.includes(q) ||
      nameLower.includes(q) ||
      s.keywords.some((k) => k.includes(q))
    ) {
      fuzzy.push(s);
    }
  }

  return [...exact, ...prefix, ...fuzzy].slice(0, maxResults);
}

/** Exact ticker match */
export function findStock(ticker: string): StockEntry | undefined {
  return stockMap.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
}

/** Returns true if the input looks like a valid ticker (allows unlisted tickers to be analysed directly) */
export function isValidTickerFormat(input: string): boolean {
  const t = input.trim().toUpperCase();
  // US: 1-5 uppercase letters
  if (/^[A-Z]{1,5}$/.test(t)) return true;
  // HK: 4-5 digits
  if (/^\d{4,5}$/.test(t)) return true;
  // CN A-share: 6 digits
  if (/^\d{6}$/.test(t)) return true;
  return false;
}

/** Infer market from ticker format */
export function inferMarket(ticker: string): Market {
  const t = ticker.trim().toUpperCase();
  if (/^\d{4,5}$/.test(t)) return "HK";
  if (/^\d{6}$/.test(t)) return "CN";
  return "US";
}

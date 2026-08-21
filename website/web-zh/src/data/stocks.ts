import { StockEntry, Market } from "../types";

// Local stock lookup table — used for autocomplete, no external API needed
export const stockMap: StockEntry[] = [
  // ── US: Large-cap tech ──
  { ticker: "NVDA", name: "NVIDIA", nameZh: "英伟达", market: "US", keywords: ["nvidia", "gpu", "chips", "ai", "英伟达", "芯片", "人工智能"] },
  { ticker: "META", name: "Meta", nameZh: "Meta", market: "US", keywords: ["facebook", "fb", "metaverse", "social", "脸书", "元宇宙", "社交"] },
  { ticker: "TSLA", name: "Tesla", nameZh: "特斯拉", market: "US", keywords: ["tesla", "ev", "fsd", "musk", "特斯拉", "电动车", "马斯克"] },
  { ticker: "AMZN", name: "Amazon", nameZh: "亚马逊", market: "US", keywords: ["amazon", "aws", "cloud", "ecommerce", "亚马逊", "云计算", "电商"] },
  { ticker: "GOOGL", name: "Alphabet", nameZh: "谷歌", market: "US", keywords: ["google", "alphabet", "search", "gemini", "谷歌", "搜索"] },
  { ticker: "GOOG", name: "Alphabet Class C", nameZh: "谷歌 C 股", market: "US", keywords: ["google", "alphabet", "谷歌"] },
  { ticker: "MSFT", name: "Microsoft", nameZh: "微软", market: "US", keywords: ["microsoft", "azure", "openai", "copilot", "微软", "云计算"] },
  { ticker: "AAPL", name: "Apple", nameZh: "苹果", market: "US", keywords: ["apple", "iphone", "ios", "cook", "苹果", "手机"] },
  { ticker: "AMD", name: "AMD", nameZh: "超微半导体", market: "US", keywords: ["amd", "cpu", "gpu", "lisa su", "超微", "芯片"] },
  { ticker: "INTC", name: "Intel", nameZh: "英特尔", market: "US", keywords: ["intel", "cpu", "chips", "英特尔", "芯片"] },
  { ticker: "QCOM", name: "Qualcomm", nameZh: "高通", market: "US", keywords: ["qualcomm", "snapdragon", "5g", "高通", "骁龙"] },
  { ticker: "AVGO", name: "Broadcom", nameZh: "博通", market: "US", keywords: ["broadcom", "chips", "networking", "博通", "芯片"] },
  { ticker: "TSM", name: "TSMC", nameZh: "台积电", market: "US", keywords: ["tsmc", "foundry", "semiconductor", "台积电", "晶圆代工"] },
  { ticker: "ASML", name: "ASML", nameZh: "阿斯麦", market: "US", keywords: ["asml", "lithography", "netherlands", "阿斯麦", "光刻机"] },
  { ticker: "MU", name: "Micron Technology", nameZh: "美光科技", market: "US", keywords: ["micron", "memory", "hbm", "dram", "美光", "内存"] },

  // ── US: AI / Software ──
  { ticker: "PLTR", name: "Palantir", nameZh: "Palantir", market: "US", keywords: ["palantir", "aip", "data", "defense", "大数据", "国防"] },
  { ticker: "SNOW", name: "Snowflake", nameZh: "雪花", market: "US", keywords: ["snowflake", "data warehouse", "saas", "雪花", "数据仓库"] },
  { ticker: "CRM", name: "Salesforce", nameZh: "赛富时", market: "US", keywords: ["salesforce", "crm", "saas", "赛富时"] },
  { ticker: "NOW", name: "ServiceNow", nameZh: "ServiceNow", market: "US", keywords: ["servicenow", "saas", "enterprise"] },
  { ticker: "ORCL", name: "Oracle", nameZh: "甲骨文", market: "US", keywords: ["oracle", "database", "cloud", "甲骨文", "数据库"] },
  { ticker: "IBM", name: "IBM", nameZh: "IBM", market: "US", keywords: ["ibm", "watson", "enterprise"] },
  { ticker: "ADBE", name: "Adobe", nameZh: "Adobe", market: "US", keywords: ["adobe", "photoshop", "creative", "ai"] },

  // ── US: Cybersecurity / Cloud ──
  { ticker: "NET", name: "Cloudflare", nameZh: "Cloudflare", market: "US", keywords: ["cloudflare", "cdn", "security", "网络安全"] },
  { ticker: "CRWD", name: "CrowdStrike", nameZh: "CrowdStrike", market: "US", keywords: ["crowdstrike", "security", "endpoint", "网络安全"] },
  { ticker: "PANW", name: "Palo Alto Networks", nameZh: "派拓网络", market: "US", keywords: ["palo alto", "firewall", "security", "派拓", "防火墙"] },
  { ticker: "ZS", name: "Zscaler", nameZh: "Zscaler", market: "US", keywords: ["zscaler", "zero trust", "cloud security"] },

  // ── US: EV / Clean Energy ──
  { ticker: "RIVN", name: "Rivian", nameZh: "Rivian", market: "US", keywords: ["rivian", "electric truck", "amazon", "电动卡车"] },
  { ticker: "LCID", name: "Lucid Motors", nameZh: "Lucid", market: "US", keywords: ["lucid", "ev", "luxury", "电动车"] },
  { ticker: "LI", name: "Li Auto", nameZh: "理想汽车", market: "US", keywords: ["li auto", "l9", "extended range", "ev", "理想", "理想汽车", "增程"] },
  { ticker: "NIO", name: "NIO", nameZh: "蔚来", market: "US", keywords: ["nio", "battery swap", "ev", "蔚来", "换电"] },
  { ticker: "XPEV", name: "XPeng", nameZh: "小鹏", market: "US", keywords: ["xpeng", "autonomous driving", "ev", "小鹏", "自动驾驶"] },

  // ── US: China ADRs ──
  { ticker: "BABA", name: "Alibaba", nameZh: "阿里巴巴", market: "US", keywords: ["alibaba", "taobao", "tmall", "jack ma", "阿里", "阿里巴巴", "淘宝", "天猫", "马云"] },
  { ticker: "JD", name: "JD.com", nameZh: "京东", market: "US", keywords: ["jd", "jd.com", "logistics", "ecommerce", "京东"] },
  { ticker: "PDD", name: "PDD Holdings", nameZh: "拼多多", market: "US", keywords: ["pdd", "temu", "ecommerce", "拼多多", "多多"] },
  { ticker: "BIDU", name: "Baidu", nameZh: "百度", market: "US", keywords: ["baidu", "apollo", "ernie", "ai", "百度", "文心"] },
  { ticker: "BILI", name: "Bilibili", nameZh: "哔哩哔哩", market: "US", keywords: ["bilibili", "video", "anime", "哔哩哔哩", "B站"] },
  { ticker: "FUTU", name: "Futu Holdings", nameZh: "富途控股", market: "US", keywords: ["futu", "moomoo", "brokerage", "富途", "牛牛"] },
  { ticker: "BYDDY", name: "BYD ADR", nameZh: "比亚迪 ADR", market: "US", keywords: ["byd", "ev", "battery", "比亚迪", "新能源"] },
  { ticker: "TME", name: "Tencent Music", nameZh: "腾讯音乐", market: "US", keywords: ["tencent music", "qq music", "streaming", "腾讯音乐", "QQ音乐"] },

  // ── US: Finance / Crypto ──
  { ticker: "COIN", name: "Coinbase", nameZh: "Coinbase", market: "US", keywords: ["coinbase", "crypto", "btc", "eth", "加密货币"] },
  { ticker: "SOFI", name: "SoFi", nameZh: "SoFi", market: "US", keywords: ["sofi", "fintech", "banking", "金融科技"] },
  { ticker: "JPM", name: "JPMorgan Chase", nameZh: "摩根大通", market: "US", keywords: ["jpmorgan", "chase", "bank", "摩根大通", "银行"] },
  { ticker: "GS", name: "Goldman Sachs", nameZh: "高盛", market: "US", keywords: ["goldman sachs", "investment bank", "高盛", "投行"] },
  { ticker: "V", name: "Visa", nameZh: "Visa", market: "US", keywords: ["visa", "payments", "支付"] },
  { ticker: "MA", name: "Mastercard", nameZh: "万事达", market: "US", keywords: ["mastercard", "payments", "万事达", "支付"] },

  // ── US: Other popular ──
  { ticker: "NFLX", name: "Netflix", nameZh: "奈飞", market: "US", keywords: ["netflix", "streaming", "content", "奈飞", "流媒体"] },
  { ticker: "DIS", name: "Disney", nameZh: "迪士尼", market: "US", keywords: ["disney", "streaming", "theme park", "迪士尼"] },
  { ticker: "UBER", name: "Uber", nameZh: "优步", market: "US", keywords: ["uber", "rideshare", "delivery", "优步", "网约车"] },
  { ticker: "LYFT", name: "Lyft", nameZh: "Lyft", market: "US", keywords: ["lyft", "rideshare", "网约车"] },
  { ticker: "ABNB", name: "Airbnb", nameZh: "爱彼迎", market: "US", keywords: ["airbnb", "homestay", "travel", "爱彼迎", "民宿"] },
  { ticker: "SPOT", name: "Spotify", nameZh: "Spotify", market: "US", keywords: ["spotify", "music streaming", "podcast", "音乐"] },
  { ticker: "RBLX", name: "Roblox", nameZh: "Roblox", market: "US", keywords: ["roblox", "gaming", "metaverse", "游戏"] },
  { ticker: "SMCI", name: "Super Micro", nameZh: "超微电脑", market: "US", keywords: ["supermicro", "server", "ai", "超微电脑", "服务器"] },
  { ticker: "ARM", name: "Arm Holdings", nameZh: "安谋控股", market: "US", keywords: ["arm", "chip architecture", "softbank", "安谋", "芯片架构"] },
  { ticker: "MRVL", name: "Marvell Technology", nameZh: "美满电子", market: "US", keywords: ["marvell", "chips", "ai", "美满"] },
  { ticker: "ANET", name: "Arista Networks", nameZh: "Arista", market: "US", keywords: ["arista", "networking", "ai", "网络"] },
  { ticker: "APP", name: "AppLovin", nameZh: "AppLovin", market: "US", keywords: ["applovin", "ads", "mobile gaming", "广告", "游戏"] },
  { ticker: "HOOD", name: "Robinhood", nameZh: "罗宾汉", market: "US", keywords: ["robinhood", "brokerage", "retail", "罗宾汉", "券商"] },

  // ── HK ──
  { ticker: "0700", name: "Tencent Holdings", nameZh: "腾讯", market: "HK", keywords: ["tencent", "wechat", "gaming", "腾讯", "微信", "游戏"] },
  { ticker: "9988", name: "Alibaba-SW", nameZh: "阿里巴巴", market: "HK", keywords: ["alibaba", "taobao", "cloud", "阿里", "阿里巴巴", "淘宝"] },
  { ticker: "9618", name: "JD.com-SW", nameZh: "京东", market: "HK", keywords: ["jd", "jd.com", "logistics", "京东"] },
  { ticker: "3690", name: "Meituan-W", nameZh: "美团", market: "HK", keywords: ["meituan", "food delivery", "美团", "外卖"] },
  { ticker: "1810", name: "Xiaomi-W", nameZh: "小米", market: "HK", keywords: ["xiaomi", "su7", "ev", "phone", "小米", "手机"] },
  { ticker: "2015", name: "Li Auto-W", nameZh: "理想汽车", market: "HK", keywords: ["li auto", "l9", "ev", "理想", "理想汽车"] },
  { ticker: "9866", name: "NIO-SW", nameZh: "蔚来", market: "HK", keywords: ["nio", "battery swap", "ev", "蔚来", "换电"] },
  { ticker: "9868", name: "XPeng-W", nameZh: "小鹏", market: "HK", keywords: ["xpeng", "autonomous", "ev", "小鹏"] },
  { ticker: "1211", name: "BYD Co.", nameZh: "比亚迪", market: "HK", keywords: ["byd", "ev", "battery", "比亚迪", "新能源"] },
  { ticker: "9888", name: "Baidu-SW", nameZh: "百度", market: "HK", keywords: ["baidu", "ernie", "apollo", "百度", "文心"] },
  { ticker: "1024", name: "Kuaishou-W", nameZh: "快手", market: "HK", keywords: ["kuaishou", "short video", "快手", "短视频"] },
  { ticker: "9999", name: "NetEase-S", nameZh: "网易", market: "HK", keywords: ["netease", "gaming", "music", "网易", "游戏"] },
  { ticker: "0941", name: "China Mobile", nameZh: "中国移动", market: "HK", keywords: ["china mobile", "telecom", "5g", "中国移动", "电信"] },
  { ticker: "0388", name: "HKEX", nameZh: "港交所", market: "HK", keywords: ["hkex", "exchange", "hong kong", "港交所", "交易所"] },
  { ticker: "2382", name: "Sunny Optical", nameZh: "舜宇光学", market: "HK", keywords: ["sunny optical", "lens", "camera", "舜宇光学", "镜头"] },
  { ticker: "0992", name: "Lenovo Group", nameZh: "联想", market: "HK", keywords: ["lenovo", "pc", "thinkpad", "联想", "电脑"] },

  // ── CN A-shares ──
  { ticker: "600519", name: "Kweichow Moutai", nameZh: "贵州茅台", market: "CN", keywords: ["moutai", "baijiu", "maotai", "茅台", "贵州茅台", "白酒"] },
  { ticker: "000858", name: "Wuliangye", nameZh: "五粮液", market: "CN", keywords: ["wuliangye", "baijiu", "五粮液", "白酒"] },
  { ticker: "002594", name: "BYD", nameZh: "比亚迪", market: "CN", keywords: ["byd", "ev", "battery", "比亚迪", "新能源"] },
  { ticker: "300750", name: "CATL", nameZh: "宁德时代", market: "CN", keywords: ["catl", "battery", "ev", "宁德时代", "电池"] },
  { ticker: "601012", name: "LONGi Green Energy", nameZh: "隆基绿能", market: "CN", keywords: ["longi", "solar", "pv", "隆基", "隆基绿能", "光伏"] },
  { ticker: "300059", name: "East Money", nameZh: "东方财富", market: "CN", keywords: ["east money", "brokerage", "fund", "东方财富", "证券"] },
  { ticker: "600036", name: "China Merchants Bank", nameZh: "招商银行", market: "CN", keywords: ["cmb", "bank", "招商银行", "招行"] },
  { ticker: "300124", name: "Inovance Technology", nameZh: "汇川技术", market: "CN", keywords: ["inovance", "automation", "inverter", "汇川技术", "自动化"] },
  { ticker: "688981", name: "SMIC", nameZh: "中芯国际", market: "CN", keywords: ["smic", "chips", "semiconductor", "中芯国际", "芯片"] },
  { ticker: "688111", name: "Kingsoft Office", nameZh: "金山办公", market: "CN", keywords: ["kingsoft", "wps", "office", "金山办公", "WPS"] },
  { ticker: "000001", name: "Ping An Bank", nameZh: "平安银行", market: "CN", keywords: ["ping an bank", "bank", "平安银行", "平安"] },
  { ticker: "600000", name: "SPD Bank", nameZh: "浦发银行", market: "CN", keywords: ["spd bank", "bank", "浦发银行", "浦发"] },
  { ticker: "601318", name: "Ping An Insurance", nameZh: "中国平安", market: "CN", keywords: ["ping an", "insurance", "中国平安", "平安保险"] },
  { ticker: "600276", name: "Hengrui Medicine", nameZh: "恒瑞医药", market: "CN", keywords: ["hengrui", "pharma", "oncology", "恒瑞医药", "恒瑞"] },
  { ticker: "300760", name: "Mindray Medical", nameZh: "迈瑞医疗", market: "CN", keywords: ["mindray", "medical device", "迈瑞医疗", "迈瑞"] },
  { ticker: "603288", name: "Haitian Flavouring", nameZh: "海天味业", market: "CN", keywords: ["haitian", "soy sauce", "condiment", "海天味业", "酱油"] },
];

/** Fuzzy search: matches ticker / nameZh / name / keywords, prioritising exact prefix matches */
export function searchStocks(query: string, maxResults = 8): StockEntry[] {
  if (!query.trim()) return [];
  const q = query.toLowerCase().trim();

  const exact: StockEntry[] = [];
  const prefix: StockEntry[] = [];
  const fuzzy: StockEntry[] = [];

  for (const s of stockMap) {
    const tickerLower = s.ticker.toLowerCase();
    const nameLower = s.name.toLowerCase();
    const nameZhLower = s.nameZh?.toLowerCase() ?? "";
    if (tickerLower === q || nameLower === q || nameZhLower === q) {
      exact.push(s);
    } else if (
      tickerLower.startsWith(q) ||
      nameLower.startsWith(q) ||
      nameZhLower.startsWith(q)
    ) {
      prefix.push(s);
    } else if (
      tickerLower.includes(q) ||
      nameLower.includes(q) ||
      nameZhLower.includes(q) ||
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

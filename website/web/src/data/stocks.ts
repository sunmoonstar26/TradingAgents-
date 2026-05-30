import { StockEntry, Market } from "../types";

// 本地股票映射表 — 用于自动补全，无需外部 API
export const stockMap: StockEntry[] = [
  // ── 美股：科技大盘 ──
  { ticker: "NVDA", name: "英伟达", market: "US", keywords: ["nvidia", "gpu", "芯片", "ai"] },
  { ticker: "META", name: "Meta", market: "US", keywords: ["facebook", "fb", "元宇宙", "社交"] },
  { ticker: "TSLA", name: "特斯拉", market: "US", keywords: ["tesla", "电动车", "fsd", "马斯克"] },
  { ticker: "AMZN", name: "亚马逊", market: "US", keywords: ["amazon", "aws", "云计算", "电商"] },
  { ticker: "GOOGL", name: "谷歌", market: "US", keywords: ["google", "alphabet", "搜索", "gemini"] },
  { ticker: "GOOG", name: "谷歌 C 类", market: "US", keywords: ["google", "alphabet"] },
  { ticker: "MSFT", name: "微软", market: "US", keywords: ["microsoft", "azure", "openai", "copilot"] },
  { ticker: "AAPL", name: "苹果", market: "US", keywords: ["apple", "iphone", "ios", "库克"] },
  { ticker: "AMD", name: "AMD", market: "US", keywords: ["amd", "cpu", "gpu", "苏姿丰"] },
  { ticker: "INTC", name: "英特尔", market: "US", keywords: ["intel", "cpu", "芯片"] },
  { ticker: "QCOM", name: "高通", market: "US", keywords: ["qualcomm", "高通", "骁龙", "5g"] },
  { ticker: "AVGO", name: "博通", market: "US", keywords: ["broadcom", "博通", "芯片"] },
  { ticker: "TSM", name: "台积电", market: "US", keywords: ["tsmc", "台积电", "晶圆", "半导体"] },
  { ticker: "ASML", name: "阿斯麦", market: "US", keywords: ["asml", "光刻机", "荷兰"] },
  { ticker: "MU", name: "美光科技", market: "US", keywords: ["micron", "美光", "内存", "hbm"] },

  // ── 美股：AI / 软件 ──
  { ticker: "PLTR", name: "Palantir", market: "US", keywords: ["palantir", "aip", "大数据", "国防"] },
  { ticker: "SNOW", name: "Snowflake", market: "US", keywords: ["snowflake", "数据仓库", "saas"] },
  { ticker: "CRM", name: "Salesforce", market: "US", keywords: ["salesforce", "crm", "saas"] },
  { ticker: "NOW", name: "ServiceNow", market: "US", keywords: ["servicenow", "saas", "企业软件"] },
  { ticker: "ORCL", name: "甲骨文", market: "US", keywords: ["oracle", "甲骨文", "数据库", "云"] },
  { ticker: "IBM", name: "IBM", market: "US", keywords: ["ibm", "watson", "企业it"] },
  { ticker: "ADBE", name: "Adobe", market: "US", keywords: ["adobe", "photoshop", "创意", "ai"] },

  // ── 美股：网络安全 / 云 ──
  { ticker: "NET", name: "Cloudflare", market: "US", keywords: ["cloudflare", "cdn", "网络安全"] },
  { ticker: "CRWD", name: "CrowdStrike", market: "US", keywords: ["crowdstrike", "安全", "端点"] },
  { ticker: "PANW", name: "Palo Alto", market: "US", keywords: ["palo alto", "防火墙", "安全"] },
  { ticker: "ZS", name: "Zscaler", market: "US", keywords: ["zscaler", "零信任", "云安全"] },

  // ── 美股：新能源 / 电动车 ──
  { ticker: "RIVN", name: "Rivian", market: "US", keywords: ["rivian", "电动皮卡", "亚马逊"] },
  { ticker: "LCID", name: "Lucid Motors", market: "US", keywords: ["lucid", "电动车", "豪华"] },
  { ticker: "LI", name: "理想汽车", market: "US", keywords: ["li auto", "理想", "l9", "增程"] },
  { ticker: "NIO", name: "蔚来", market: "US", keywords: ["nio", "蔚来", "换电", "李斌"] },
  { ticker: "XPEV", name: "小鹏汽车", market: "US", keywords: ["xpeng", "小鹏", "智驾"] },

  // ── 美股：中概股 ──
  { ticker: "BABA", name: "阿里巴巴", market: "US", keywords: ["alibaba", "阿里", "淘宝", "天猫", "马云"] },
  { ticker: "JD", name: "京东", market: "US", keywords: ["jd", "京东", "物流", "电商"] },
  { ticker: "PDD", name: "拼多多", market: "US", keywords: ["pdd", "拼多多", "temu", "电商"] },
  { ticker: "BIDU", name: "百度", market: "US", keywords: ["baidu", "百度", "apollo", "文心"] },
  { ticker: "BILI", name: "哔哩哔哩", market: "US", keywords: ["bilibili", "b站", "视频", "二次元"] },
  { ticker: "FUTU", name: "富途控股", market: "US", keywords: ["futu", "富途", "港股", "券商"] },
  { ticker: "BYDDY", name: "比亚迪 ADR", market: "US", keywords: ["byd", "比亚迪", "电动车"] },
  { ticker: "TME", name: "腾讯音乐", market: "US", keywords: ["tencent music", "腾讯音乐", "qq音乐"] },

  // ── 美股：金融 / 加密 ──
  { ticker: "COIN", name: "Coinbase", market: "US", keywords: ["coinbase", "加密货币", "btc", "eth"] },
  { ticker: "SOFI", name: "SoFi", market: "US", keywords: ["sofi", "金融科技"] },
  { ticker: "JPM", name: "摩根大通", market: "US", keywords: ["jpmorgan", "摩根", "银行"] },
  { ticker: "GS", name: "高盛", market: "US", keywords: ["goldman sachs", "高盛", "投行"] },
  { ticker: "V", name: "Visa", market: "US", keywords: ["visa", "支付"] },
  { ticker: "MA", name: "Mastercard", market: "US", keywords: ["mastercard", "支付"] },

  // ── 美股：其他热门 ──
  { ticker: "NFLX", name: "奈飞", market: "US", keywords: ["netflix", "流媒体", "奈飞"] },
  { ticker: "DIS", name: "迪士尼", market: "US", keywords: ["disney", "迪士尼", "流媒体"] },
  { ticker: "UBER", name: "Uber", market: "US", keywords: ["uber", "网约车", "外卖"] },
  { ticker: "LYFT", name: "Lyft", market: "US", keywords: ["lyft", "网约车"] },
  { ticker: "ABNB", name: "Airbnb", market: "US", keywords: ["airbnb", "民宿", "短租"] },
  { ticker: "SPOT", name: "Spotify", market: "US", keywords: ["spotify", "音乐流媒体"] },
  { ticker: "RBLX", name: "Roblox", market: "US", keywords: ["roblox", "游戏", "元宇宙"] },
  { ticker: "SMCI", name: "超微电脑", market: "US", keywords: ["supermicro", "服务器", "ai"] },
  { ticker: "ARM", name: "ARM", market: "US", keywords: ["arm", "芯片架构", "软银"] },
  { ticker: "MRVL", name: "迈威尔科技", market: "US", keywords: ["marvell", "芯片", "ai"] },
  { ticker: "ANET", name: "Arista Networks", market: "US", keywords: ["arista", "网络", "ai"] },
  { ticker: "APP", name: "AppLovin", market: "US", keywords: ["applovin", "广告", "移动游戏"] },
  { ticker: "HOOD", name: "Robinhood", market: "US", keywords: ["robinhood", "券商", "散户"] },

  // ── 港股 ──
  { ticker: "0700", name: "腾讯控股", market: "HK", keywords: ["tencent", "腾讯", "微信", "游戏"] },
  { ticker: "9988", name: "阿里巴巴-SW", market: "HK", keywords: ["alibaba", "阿里", "淘宝"] },
  { ticker: "9618", name: "京东集团-SW", market: "HK", keywords: ["jd", "京东"] },
  { ticker: "3690", name: "美团-W", market: "HK", keywords: ["meituan", "美团", "外卖"] },
  { ticker: "1810", name: "小米集团-W", market: "HK", keywords: ["xiaomi", "小米", "su7"] },
  { ticker: "2015", name: "理想汽车-W", market: "HK", keywords: ["li auto", "理想"] },
  { ticker: "9866", name: "蔚来-SW", market: "HK", keywords: ["nio", "蔚来"] },
  { ticker: "9868", name: "小鹏汽车-W", market: "HK", keywords: ["xpeng", "小鹏"] },
  { ticker: "1211", name: "比亚迪股份", market: "HK", keywords: ["byd", "比亚迪"] },
  { ticker: "9888", name: "百度集团-SW", market: "HK", keywords: ["baidu", "百度"] },
  { ticker: "1024", name: "快手-W", market: "HK", keywords: ["kuaishou", "快手"] },
  { ticker: "9999", name: "网易-S", market: "HK", keywords: ["netease", "网易"] },
  { ticker: "0941", name: "中国移动", market: "HK", keywords: ["china mobile", "中国移动", "电信"] },
  { ticker: "0388", name: "香港交易所", market: "HK", keywords: ["hkex", "港交所"] },
  { ticker: "2382", name: "舜宇光学", market: "HK", keywords: ["sunny optical", "舜宇", "镜头"] },
  { ticker: "0992", name: "联想集团", market: "HK", keywords: ["lenovo", "联想", "pc"] },

  // ── A 股 ──
  { ticker: "600519", name: "贵州茅台", market: "CN", keywords: ["茅台", "白酒", "maotai"] },
  { ticker: "000858", name: "五粮液", market: "CN", keywords: ["五粮液", "白酒"] },
  { ticker: "002594", name: "比亚迪", market: "CN", keywords: ["byd", "比亚迪", "电动车"] },
  { ticker: "300750", name: "宁德时代", market: "CN", keywords: ["catl", "宁德", "电池"] },
  { ticker: "601012", name: "隆基绿能", market: "CN", keywords: ["隆基", "光伏", "太阳能"] },
  { ticker: "300059", name: "东方财富", market: "CN", keywords: ["东方财富", "券商", "基金"] },
  { ticker: "600036", name: "招商银行", market: "CN", keywords: ["招行", "银行"] },
  { ticker: "300124", name: "汇川技术", market: "CN", keywords: ["汇川", "自动化", "变频器"] },
  { ticker: "688981", name: "中芯国际", market: "CN", keywords: ["smic", "芯片", "半导体"] },
  { ticker: "688111", name: "金山办公", market: "CN", keywords: ["金山", "wps", "办公"] },
  { ticker: "000001", name: "平安银行", market: "CN", keywords: ["平安银行", "银行"] },
  { ticker: "600000", name: "浦发银行", market: "CN", keywords: ["浦发", "银行"] },
  { ticker: "601318", name: "中国平安", market: "CN", keywords: ["平安", "保险"] },
  { ticker: "600276", name: "恒瑞医药", market: "CN", keywords: ["恒瑞", "医药", "创新药"] },
  { ticker: "300760", name: "迈瑞医疗", market: "CN", keywords: ["迈瑞", "医疗器械"] },
  { ticker: "603288", name: "海天味业", market: "CN", keywords: ["海天", "酱油", "调味品"] },
];

/** 模糊搜索：匹配 ticker / 名称 / 关键词，优先精确前缀匹配 */
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

/** 精确匹配 ticker */
export function findStock(ticker: string): StockEntry | undefined {
  return stockMap.find((s) => s.ticker.toUpperCase() === ticker.toUpperCase());
}

/** 判断输入是否像一个合法的股票代码（允许直接分析未收录的 ticker）*/
export function isValidTickerFormat(input: string): boolean {
  const t = input.trim().toUpperCase();
  // 美股：1-5 个大写字母
  if (/^[A-Z]{1,5}$/.test(t)) return true;
  // 港股：4-5 位数字
  if (/^\d{4,5}$/.test(t)) return true;
  // A 股：6 位数字
  if (/^\d{6}$/.test(t)) return true;
  return false;
}

/** 根据 ticker 格式推断市场 */
export function inferMarket(ticker: string): Market {
  const t = ticker.trim().toUpperCase();
  if (/^\d{4,5}$/.test(t)) return "HK";
  if (/^\d{6}$/.test(t)) return "CN";
  return "US";
}

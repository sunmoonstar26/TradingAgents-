import { DashboardData } from "@/types";

export const mockDashboardData: DashboardData = {
  // ── AI 系统状态层 ──
  systemStatus: {
    agentsOnline: 12,
    running: 4,
    debating: 2,
    consensusUpdated: "14s",
    lastSync: new Date().toLocaleTimeString("zh-CN", { hour: "2-digit", minute: "2-digit", second: "2-digit" }),
    modelStatus: "在线",
  },

  // ── 全球市场状态 ──
  marketState: {
    usMarket: { label: "美股", value: "标普 500", change: 0.34, status: "up" },
    hkMarket: { label: "港股", value: "恒生指数", change: -0.87, status: "down" },
    cnMarket: { label: "A股", value: "沪深 300", change: 0.12, status: "neutral" },
    vix: { label: "VIX", value: "17.22", change: null, status: "warning" },
    aiSectorMomentum: { label: "AI 板块动量", value: "强", change: null, status: "up" },
    marketRiskLevel: { label: "市场风险等级", value: "中低", change: null, status: "warning" },
  },

  // ── AI 机会雷达（Hero） ──
  opportunities: [
    { ticker: "NVDA", name: "英伟达", signal: "强烈买入", conviction: 84, risk: "中", consensus: { bullish: 7, neutral: 0, bearish: 1 }, exposure: "15-20%", agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-24T09:15:00Z" },
    { ticker: "META", name: "Meta", signal: "买入", conviction: 76, risk: "中", consensus: { bullish: 6, neutral: 0, bearish: 2 }, exposure: "10-15%", agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-23T14:30:00Z" },
    { ticker: "TSLA", name: "特斯拉", signal: "增持", conviction: 72, risk: "中", consensus: { bullish: 6, neutral: 0, bearish: 2 }, exposure: "10-15%", agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: true }, updatedAt: "2026-05-25T08:00:00Z" },
    { ticker: "AMZN", name: "亚马逊", signal: "增持", conviction: 71, risk: "低", consensus: { bullish: 6, neutral: 0, bearish: 2 }, exposure: "10-15%", agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-22T11:00:00Z" },
    { ticker: "GOOGL", name: "谷歌", signal: "增持", conviction: 68, risk: "低", consensus: { bullish: 5, neutral: 0, bearish: 3 }, exposure: "8-12%", agentAlignment: { fundamental: true, technical: false, sentiment: true, macro: true, risk: false }, updatedAt: "2026-05-21T16:45:00Z" },
    { ticker: "MSFT", name: "微软", signal: "持有", conviction: 58, risk: "低", consensus: { bullish: 4, neutral: 0, bearish: 4 }, exposure: "5-10%", agentAlignment: { fundamental: true, technical: false, sentiment: true, macro: false, risk: false }, updatedAt: "2026-05-20T10:00:00Z" },
    { ticker: "AMD", name: "AMD", signal: "持有", conviction: 52, risk: "高", consensus: { bullish: 4, neutral: 0, bearish: 4 }, exposure: "5-8%", agentAlignment: { fundamental: false, technical: true, sentiment: false, macro: true, risk: true }, updatedAt: "2026-05-19T13:20:00Z" },
    { ticker: "AAPL", name: "苹果", signal: "减持", conviction: 35, risk: "低", consensus: { bullish: 3, neutral: 0, bearish: 5 }, exposure: "0-5%", agentAlignment: { fundamental: false, technical: false, sentiment: false, macro: false, risk: true }, updatedAt: "2026-05-18T09:00:00Z" },
    { ticker: "LI", name: "理想汽车", signal: "持有", conviction: 52, risk: "高", consensus: { bullish: 4, neutral: 0, bearish: 4 }, exposure: "低配", agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: false }, updatedAt: "2026-05-24T15:45:00Z" },
  ],

  // ── 投资备忘录（替代 Conviction Ideas） ──
  memos: [
    { ticker: "NVDA", name: "英伟达", signal: "强烈买入", conviction: 84, agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, timeHorizon: "中期 3-6月", primaryRisk: "估值处于历史高位，地缘政治风险", consensus: "7/8 看涨", exposure: "15-20%", keyDriver: "AI 芯片需求持续爆发，Blackwell 架构量产" },
    { ticker: "META", name: "Meta", signal: "买入", conviction: 76, agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: true, risk: false }, timeHorizon: "中期 3-6月", primaryRisk: "AI 资本开支回报周期不确定", consensus: "6/8 看涨", exposure: "10-15%", keyDriver: "Llama 4 开源生态领先" },
    { ticker: "TSLA", name: "特斯拉", signal: "增持", conviction: 72, agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: true }, timeHorizon: "长期 6-12月", primaryRisk: "汽车销量增速放缓", consensus: "6/8 看涨", exposure: "10-15%", keyDriver: "FSD 商业化加速，能源业务翻倍增长" },
    { ticker: "PLTR", name: "Palantir", signal: "增持", conviction: 69, agentAlignment: { fundamental: true, technical: true, sentiment: true, macro: false, risk: false }, timeHorizon: "中期 3-6月", primaryRisk: "政府业务占比过高", consensus: "5/8 看涨", exposure: "5-10%", keyDriver: "AIP 平台企业客户数增长 200%" },
    { ticker: "LI", name: "理想汽车", signal: "持有", conviction: 52, agentAlignment: { fundamental: true, technical: true, sentiment: false, macro: true, risk: false }, timeHorizon: "短期 1-3月", primaryRisk: "自由现金流转负，中国车市需求萎缩", consensus: "4/8 看涨", exposure: "低配", keyDriver: "L9 AI旗舰SUV交付+中东市场拓展" },
  ],

  // ── 风险终端 ──
  riskAlerts: [
    { type: "高波动率", level: "警告", source: "风险分析智能体", detail: "VIX 升至 17+，隐含波动率扩张，关注尾部风险", timestamp: "2 分钟前", riskScore: 72, triggeredBy: ["风险分析智能体", "技术面分析智能体"] },
    { type: "看空分歧", level: "关注", source: "风险分析智能体", detail: "PLTR 空头持仓周增 12%，多空分歧加大", timestamp: "5 分钟前", riskScore: 45, triggeredBy: ["风险分析智能体"] },
    { type: "情绪崩塌", level: "危险", source: "情绪分析智能体", detail: "TSLA 社交媒体情绪指数骤降，散户信心恶化", timestamp: "8 分钟前", riskScore: 85, triggeredBy: ["情绪分析智能体", "风险分析智能体"] },
    { type: "超买警告", level: "警告", source: "技术面分析智能体", detail: "NVDA RSI(14) 达 78.3，技术面超买需回调消化", timestamp: "12 分钟前", riskScore: 65, triggeredBy: ["技术面分析智能体"] },
    { type: "现金流恶化", level: "危险", source: "风险分析智能体", detail: "LI 自由现金流-128亿，Q3单季-74亿加速失血", timestamp: "6 分钟前", riskScore: 88, triggeredBy: ["风险分析智能体", "基本面分析智能体"] },
  ],

  // ── 板块流向热度 ──
  sectorFlow: [
    { name: "人工智能", flow: "↑ 强劲", momentum: 92, change: 3.4 },
    { name: "半导体", flow: "↑ 强劲", momentum: 88, change: 2.8 },
    { name: "云计算", flow: "↗ 改善", momentum: 78, change: 1.5 },
    { name: "加密货币", flow: "↗ 改善", momentum: 71, change: 0.8 },
    { name: "新能源车", flow: "↘ 走弱", momentum: 65, change: -1.2 },
    { name: "网络安全", flow: "→ 平稳", momentum: 62, change: -0.3 },
    { name: "金融科技", flow: "↓ 流出", momentum: 55, change: -1.8 },
  ],

  // ── AI 实时信息流 ──
  liveFeed: [
    { time: "09:41", agent: "情绪分析智能体", message: "NVDA 情绪改善，社交媒体看涨指数升至 86/100" },
    { time: "09:42", agent: "风险分析智能体", message: "TSLA 波动率升高，30 日实现波动率达 58%" },
    { time: "09:43", agent: "宏观分析智能体", message: "美元走强，DXY 突破 105，关注新兴市场压力" },
    { time: "09:44", agent: "技术面分析智能体", message: "META 突破 $520 阻力位，成交量放大确认" },
    { time: "09:45", agent: "新闻分析智能体", message: "Bloomberg: Blackwell 产能瓶颈缓解，台积电 CoWoS 扩产 60%" },
    { time: "09:46", agent: "基本面分析智能体", message: "AMZN AWS 收入增速回升至 19%，AI 云服务贡献增加" },
    { time: "09:47", agent: "风险分析智能体", message: "PLTR 空头持仓周增 12%，关注多空分歧加剧" },
    { time: "09:48", agent: "情绪分析智能体", message: "GOOGL 机构净买入连续 5 周为正，13F 显示增持趋势" },
    { time: "09:49", agent: "风险分析智能体", message: "LI 自由现金流-128亿，Sell the News风险高企，建议低配" },
    { time: "09:50", agent: "新闻分析智能体", message: "LI L9 AI旗舰SUV启动首批交付，中东新分销协议签署" },
  ],

  updatedAt: new Date().toISOString(),
};

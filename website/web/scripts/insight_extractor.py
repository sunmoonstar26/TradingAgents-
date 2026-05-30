#!/usr/bin/env python3
"""
洞察萃取引擎 — 从 TradingAgents 完整分析报告中提取结构化洞察

输入: 完整 Agent 报告文本 (markdown)
输出: 结构化 JSON (thesis, insights, risks, confidence, etc.)

用法:
  python3 insight_extractor.py --report /path/to/fundamentals.md --type fundamentals --output /tmp/insights.json
  python3 insight_extractor.py --report-dir /path/to/reports/BILI_20260522/ --output /tmp/all_insights.json
"""

import argparse
import json
import os
import sys
from pathlib import Path
from openai import OpenAI
import httpx


def load_env(env_path: Path):
    """加载 .env 文件"""
    if env_path.exists():
        with open(env_path) as f:
            for line in f:
                line = line.strip()
                if line and not line.startswith("#") and "=" in line:
                    key, _, value = line.partition("=")
                    # 用直接赋值代替 setdefault，防止 .env 中有空值/旧值导致新 key 被忽略
                    os.environ[key.strip()] = value.strip().strip('"').strip("'")


def get_client() -> OpenAI:
    """创建 OpenAI 兼容客户端（DeepSeek）"""
    provider = os.environ.get("TRADINGAGENTS_LLM_PROVIDER", "deepseek")
    if provider == "deepseek":
        api_key = os.environ.get("DEEPSEEK_API_KEY", "")
        base_url = "https://api.deepseek.com/v1"
        model = os.environ.get("TRADINGAGENTS_DEEP_THINK_LLM", "deepseek-v4-pro")
    elif provider == "openai":
        api_key = os.environ.get("OPENAI_API_KEY", "")
        base_url = None
        model = os.environ.get("TRADINGAGENTS_DEEP_THINK_LLM", "gpt-5.4")
    else:
        api_key = os.environ.get(f"{provider.upper()}_API_KEY", "")
        base_url = os.environ.get("TRADINGAGENTS_LLM_BACKEND_URL", None)
        model = os.environ.get("TRADINGAGENTS_DEEP_THINK_LLM", "")

    return OpenAI(
        api_key=api_key,
        base_url=base_url,
        timeout=httpx.Timeout(30.0, connect=10.0),
    ), model


# ── 萃取 Prompts ──

ANALYST_EXTRACT_PROMPT = """你是一级市场研究分析师。从以下 AI 分析报告提取关键洞察。

报告内容：
{report}

请严格按以下 JSON 格式输出（不要输出其他内容）：
{{
  "verdict": "看涨/看跌/中性",
  "core_insight": "最重要的单一核心观点（中文，30字以内）",
  "supporting_signals": ["信号1（中文，20字内）", "信号2", "信号3"],
  "primary_risk": "最大风险（中文，20字内）",
  "confidence": 85,
  "key_drivers": ["驱动力1", "驱动力2"],
  "risk_factors": ["风险1", "风险2"]
}}"""


DEBATE_EXTRACT_PROMPT = """你研究辩论主持人。从以下 AI 辩论中提取核心冲突。

辩论内容：
{report}

请严格按以下 JSON 格式输出：
{{
  "verdict": "多方胜出/空方胜出/势均力敌",
  "core_conflict": "最核心的分歧主题（中文，20字内）",
  "bull_thesis": "多方核心理由（中文，50字内）",
  "bear_thesis": "空方核心理由（中文，50字内）",
  "conflict_strength": "高/中/低",
  "confidence": 85,
  "key_topics": [
    {{"topic": "主题名", "bull_view": "多方观点", "bear_view": "空方观点", "winner": "bull/bear/tie"}}
  ]
}}"""


TRADING_EXTRACT_PROMPT = """你是交易策略分析师。从以下交易计划提取决策框架。

交易计划：
{report}

请严格按以下 JSON 格式输出：
{{
  "action": "买入/卖出/持有",
  "allocation_rationale": "仓位配置核心理由（中文，50字内）",
  "suggested_exposure": "15-20%",
  "increase_conditions": ["增仓条件1", "增仓条件2"],
  "reduce_conditions": ["减仓条件1", "减仓条件2"],
  "hedge_conditions": ["对冲条件1"],
  "confidence": 80
}}"""


RISK_EXTRACT_PROMPT = """你是风控分析师。从以下风险评估提取关键信息。

风险评估：
{report}

请严格按以下 JSON 格式输出：
{{
  "overall_risk_level": "高/中/低",
  "risk_items": [
    {{
      "risk_type": "风险类型（中文）",
      "why_matters": "为什么重要（30字内）",
      "potential_impact": "潜在影响（30字内）",
      "triggered_by": "触发智能体",
      "mitigation": "缓解建议（30字内）",
      "severity": "高/中/低"
    }}
  ],
  "confidence": 85
}}"""


MEMORY_EXTRACT_PROMPT = """你是系统学习分析师。从以下反思记录提取学习要点。

反思记录：
{report}

请严格按以下 JSON 格式输出：
{{
  "learnings": [
    {{
      "what_happened": "发生了什么（30字内）",
      "what_missed": "智能体忽略了什么（30字内）",
      "system_adjustment": "系统如何调整（30字内）",
      "future_impact": "对未来决策的影响（30字内）"
    }}
  ]
}}"""


THEISIS_EXTRACT_PROMPT = """你是投资委员会主席。从所有分析报告中提炼出最终投资论点。

完整分析报告（合并）：
{report}

请严格按以下 JSON 格式输出：
{{
  "final_signal": "强烈买入/增持/持有/减持/卖出",
  "investment_thesis": "核心投资论点（中文，最多2句话，类似机构研报标题）",
  "decision_summary": "决策摘要（中文，100字内）",
  "conviction": 85,
  "bull_case_summary": "多方摘要（50字内）",
  "bear_case_summary": "空方摘要（50字内）",
  "key_reasons": [
    {{
      "insight": "核心理由（中文，30字内）",
      "source_agents": ["基本面分析智能体", "宏观分析智能体"],
      "confidence": 91,
      "impact": "高/中/低"
    }}
  ],
  "time_horizon": "3-6个月",
  "primary_risk_summary": "最大风险概述（30字内）"
}}"""


# ── 萃取函数 ──

def extract_json(client: OpenAI, model: str, prompt_template: str, report: str) -> dict:
    """调用 LLM 提取结构化 JSON"""
    prompt = prompt_template.format(report=report[:12000])  # 截断过长报告

    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": prompt}],
        temperature=0.1,
        max_tokens=2000,
    )

    content = response.choices[0].message.content.strip()

    # 清理可能的 markdown 包裹
    if content.startswith("```"):
        lines = content.split("\n")
        # 去掉第一行和最后一行 ```
        content = "\n".join(lines[1:-1] if lines[-1].strip() == "```" else lines[1:])

    return json.loads(content)


def extract_analyst(report: str, client: OpenAI, model: str) -> dict:
    return extract_json(client, model, ANALYST_EXTRACT_PROMPT, report)


def extract_debate(report: str, client: OpenAI, model: str) -> dict:
    return extract_json(client, model, DEBATE_EXTRACT_PROMPT, report)


def extract_trading(report: str, client: OpenAI, model: str) -> dict:
    return extract_json(client, model, TRADING_EXTRACT_PROMPT, report)


def extract_risk(report: str, client: OpenAI, model: str) -> dict:
    return extract_json(client, model, RISK_EXTRACT_PROMPT, report)


def extract_memory(report: str, client: OpenAI, model: str) -> dict:
    return extract_json(client, model, MEMORY_EXTRACT_PROMPT, report)


def extract_thesis(combined_report: str, client: OpenAI, model: str) -> dict:
    return extract_json(client, model, THEISIS_EXTRACT_PROMPT, combined_report)


def extract_all(report_dir: Path, output_path: Path):
    """从报告目录提取所有洞察并保存为 JSON"""
    client, model = get_client()

    result = {
        "ticker": report_dir.name.split("_")[0],
        "report_dir": str(report_dir),
        "analysts": {},
        "debate": {},
        "trading": {},
        "risk": {},
        "memory": {},
        "thesis": {},
    }

    # 1. 分析师报告
    analysts_dir = report_dir / "1_analysts"
    if analysts_dir.exists():
        analyst_map = {
            "market": "技术面分析智能体",
            "sentiment": "情绪分析智能体",
            "news": "新闻分析智能体",
            "fundamentals": "基本面分析智能体",
        }
        for fname, agent_name in analyst_map.items():
            fpath = analysts_dir / f"{fname}.md"
            if fpath.exists():
                try:
                    report_text = fpath.read_text(encoding="utf-8")
                    result["analysts"][fname] = extract_analyst(report_text, client, model)
                    result["analysts"][fname]["agent_name"] = agent_name
                    print(f"  ✓ 萃取: {fname}", file=sys.stderr)
                except Exception as e:
                    print(f"  ✗ 萃取失败 {fname}: {e}", file=sys.stderr)
                    result["analysts"][fname] = {"error": str(e), "agent_name": agent_name}

    # 1b. 宏观分析 — 从 complete_report.md 里提取宏观维度洞察
    complete_report = report_dir / "complete_report.md"
    if complete_report.exists():
        try:
            full_text = complete_report.read_text(encoding="utf-8")
            # 截取与宏观相关的段落（关键词过滤，避免发送整份报告）
            macro_lines = []
            in_macro = False
            for line in full_text.split("\n"):
                if any(kw in line for kw in ["宏观", "利率", "美联储", "GDP", "周期", "货币政策", "通胀", "资金流"]):
                    in_macro = True
                if in_macro:
                    macro_lines.append(line)
                if in_macro and line.strip() == "" and len(macro_lines) > 6:
                    in_macro = False
            macro_text = "\n".join(macro_lines[:80]) if macro_lines else ""
            if len(macro_text) > 200:
                result["analysts"]["macro"] = extract_analyst(macro_text, client, model)
                result["analysts"]["macro"]["agent_name"] = "宏观分析智能体"
                print("  ✓ 萃取: macro", file=sys.stderr)
        except Exception as e:
            print(f"  ✗ 萃取失败 macro: {e}", file=sys.stderr)

    # 2. 辩论
    research_dir = report_dir / "2_research"
    if research_dir.exists():
        for side, label in [("bull", "多方"), ("bear", "空方"), ("manager", "裁判")]:
            fpath = research_dir / f"{side}.md"
            if fpath.exists():
                try:
                    report_text = fpath.read_text(encoding="utf-8")
                    result["debate"][label] = extract_debate(report_text, client, model)
                    print(f"  ✓ 萃取: debate/{side}", file=sys.stderr)
                except Exception as e:
                    print(f"  ✗ 萃取失败 debate/{side}: {e}", file=sys.stderr)
                    result["debate"][label] = {"error": str(e)}

    # 3. 交易
    trading_dir = report_dir / "3_trading"
    if trading_dir.exists():
        fpath = trading_dir / "trader.md"
        if fpath.exists():
            try:
                report_text = fpath.read_text(encoding="utf-8")
                result["trading"] = extract_trading(report_text, client, model)
                print(f"  ✓ 萃取: trader", file=sys.stderr)
            except Exception as e:
                print(f"  ✗ 萃取失败 trader: {e}", file=sys.stderr)
                result["trading"] = {"error": str(e)}

    # 4. 风险
    risk_dir = report_dir / "4_risk"
    if risk_dir.exists():
        combined_risk = ""
        for stance in ["aggressive", "conservative", "neutral"]:
            fpath = risk_dir / f"{stance}.md"
            if fpath.exists():
                combined_risk += f"\n## {stance}\n" + fpath.read_text(encoding="utf-8")
        if combined_risk:
            try:
                result["risk"] = extract_risk(combined_risk, client, model)
                print(f"  ✓ 萃取: risk", file=sys.stderr)
            except Exception as e:
                print(f"  ✗ 萃取失败 risk: {e}", file=sys.stderr)
                result["risk"] = {"error": str(e)}

    # 5. 记忆/反思
    memory_dir = report_dir / "5_portfolio"
    if memory_dir.exists():
        fpath = memory_dir / "decision.md"
        if fpath.exists():
            try:
                report_text = fpath.read_text(encoding="utf-8")
                result["memory"] = extract_memory(report_text, client, model)
                print(f"  ✓ 萃取: memory", file=sys.stderr)
            except Exception as e:
                print(f"  ✗ 萃取失败 memory: {e}", file=sys.stderr)
                result["memory"] = {"error": str(e)}

    # 6. 综合论点（从所有报告提取）
    complete = report_dir / "complete_report.md"
    if complete.exists():
        try:
            report_text = complete.read_text(encoding="utf-8")
            result["thesis"] = extract_thesis(report_text, client, model)
            print(f"  ✓ 萃取: thesis", file=sys.stderr)
        except Exception as e:
            print(f"  ✗ 萃取失败 thesis: {e}", file=sys.stderr)
            result["thesis"] = {"error": str(e)}

    # 保存
    output_path.parent.mkdir(parents=True, exist_ok=True)
    with open(output_path, "w", encoding="utf-8") as f:
        json.dump(result, f, ensure_ascii=False, indent=2)

    print(f"\n✅ 洞察萃取完成 → {output_path}", file=sys.stderr)
    return result


def main():
    parser = argparse.ArgumentParser(description="TradingAgents 洞察萃取引擎")
    parser.add_argument("--report-dir", help="报告目录路径")
    parser.add_argument("--output", required=True, help="输出 JSON 路径")
    args = parser.parse_args()

    report_dir = Path(args.report_dir)
    if not report_dir.exists():
        print(f"错误: 报告目录不存在: {report_dir}", file=sys.stderr)
        sys.exit(1)

    # 找到 TA_ROOT 并加载 .env
    # 从 insight_extractor.py 位置推算: 网站开发/web/scripts/ → 网站开发/web → 网站开发 → TA_ROOT
    script_dir = Path(__file__).resolve().parent
    ta_root = script_dir.parent.parent.parent
    load_env(ta_root / ".env")

    result = extract_all(report_dir, Path(args.output))
    json.dump({"status": "ok", "output": str(args.output), "ticker": result["ticker"]}, sys.stdout)
    sys.stdout.flush()


if __name__ == "__main__":
    main()

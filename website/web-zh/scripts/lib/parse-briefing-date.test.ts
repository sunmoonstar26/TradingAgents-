import { test } from "node:test";
import assert from "node:assert/strict";
import { parseBriefingDate } from "./parse-briefing-date";

test("parseBriefingDate 从标准格式正文中提取日期", () => {
  const content = "2026 年 07 月 24 日 新能源汽车产业每日资讯\n\n🛠️ 技术动态\n...";
  assert.equal(parseBriefingDate(content), "2026-07-24");
});

test("parseBriefingDate 支持月/日为单数字", () => {
  const content = "2026 年 7 月 4 日 新能源汽车产业每日资讯\n内容...";
  assert.equal(parseBriefingDate(content), "2026-07-04");
});

test("parseBriefingDate 只取正文中第一个匹配的日期", () => {
  const content = "2026 年 07 月 24 日 简报\n\n提及 2025 年 01 月 01 日 的旧新闻";
  assert.equal(parseBriefingDate(content), "2026-07-24");
});

test("parseBriefingDate 在找不到日期时抛出异常", () => {
  const content = "本文没有任何日期信息，只有正文内容。";
  assert.throws(() => parseBriefingDate(content), /未找到日期/);
});

test("parseBriefingDate 在正文为空字符串时抛出异常", () => {
  assert.throws(() => parseBriefingDate(""), /未找到日期/);
});

const DATE_PATTERN = /(\d{4})\s*年\s*(\d{1,2})\s*月\s*(\d{1,2})\s*日/;

/**
 * 从简报正文中解析出日期，返回 YYYY-MM-DD 格式。
 * 只取正文中第一个匹配（简报开头的标题行），避免正文引用旧新闻日期时误匹配。
 */
export function parseBriefingDate(content: string): string {
  const match = content.match(DATE_PATTERN);
  if (!match) {
    throw new Error("未找到日期：简报正文中没有 'YYYY 年 MM 月 DD 日' 格式的日期");
  }
  const [, year, month, day] = match;
  const mm = month.padStart(2, "0");
  const dd = day.padStart(2, "0");
  return `${year}-${mm}-${dd}`;
}

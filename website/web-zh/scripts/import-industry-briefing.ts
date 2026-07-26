import { readFileSync, existsSync } from "fs";
import { getDb } from "../src/lib/db";
import { parseBriefingDate } from "./lib/parse-briefing-date";

const BRIEFING_FILE = "/tmp/nev_briefing_latest.txt";
const INDUSTRY = "nev";

export async function importBriefing(filePath: string): Promise<void> {
  if (!existsSync(filePath)) {
    throw new Error(`简报文件不存在: ${filePath}`);
  }

  const content = readFileSync(filePath, "utf-8");
  if (!content.trim()) {
    throw new Error(`简报文件为空: ${filePath}`);
  }

  const briefingDate = parseBriefingDate(content);

  const sql = getDb();
  await sql`
    insert into industry_briefings (industry, briefing_date, content)
    values (${INDUSTRY}, ${briefingDate}, ${content})
    on conflict (industry, briefing_date) do update set content = excluded.content
  `;

  console.log(`[import-industry-briefing] 已导入 ${INDUSTRY} ${briefingDate}`);
}

async function main() {
  try {
    await importBriefing(BRIEFING_FILE);
  } catch (err) {
    console.error(`[import-industry-briefing] 失败: ${err instanceof Error ? err.message : err}`);
    process.exitCode = 1;
  }
}

if (require.main === module) {
  main();
}

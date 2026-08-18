import postgres from "postgres";

/**
 * 本地 Postgres 连接（单例）。直连数据库，不经过 PostgREST/Supabase 云端。
 * 仅供服务端持久化代码使用（如 persist-analysis-result.ts / company-research.ts），
 * 绝不能打包进客户端代码或暴露给浏览器。
 */
let cached: ReturnType<typeof postgres> | null = null;

export function getDb() {
  if (cached) return cached;

  const url = process.env.DATABASE_URL;
  if (!url) {
    throw new Error("缺少 DATABASE_URL 环境变量，无法连接本地 Postgres");
  }

  cached = postgres(url, { max: 5 });
  return cached;
}

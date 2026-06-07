import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { email, locale, origin: clientOrigin } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  const lang = locale === "zh" ? "zh" : "en";
  // 优先用客户端传来的 origin（浏览器 window.location.origin），确保和 Supabase 白名单精确匹配
  const origin = clientOrigin ?? `https://tradingagents-en.vercel.app`;
  const redirectTo = `${origin}/${lang}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

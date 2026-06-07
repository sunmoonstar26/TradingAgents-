import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { headers } from "next/headers";

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
);

export async function POST(req: Request) {
  const { email, locale } = await req.json();

  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 });
  }

  // 用请求的 host 动态构造 redirectTo，避免 localhost 在生产环境导致 Supabase 拒绝跳转
  const headersList = headers();
  const host = headersList.get("host") ?? "localhost:3001";
  const proto = headersList.get("x-forwarded-proto") ?? "http";
  const origin = `${proto}://${host}`;

  const lang = locale === "zh" ? "zh" : "en";
  const redirectTo = `${origin}/${lang}/reset-password`;

  const { error } = await supabase.auth.resetPasswordForEmail(email, {
    redirectTo,
  });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  return NextResponse.json({ success: true });
}

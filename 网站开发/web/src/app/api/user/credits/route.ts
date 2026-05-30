import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";

async function createClient() {
  const cookieStore = await cookies();
  return createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() { return cookieStore.getAll(); },
        setAll(cs) { cs.forEach(({ name, value, options }) => cookieStore.set(name, value, options)); },
      },
    }
  );
}

/** GET /api/user/credits — 获取当前用户 Credits */
export async function GET() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data, error } = await supabase
    .from("user_credits")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credits: data.credits });
}

/** POST /api/user/credits — 扣除 Credits */
export async function POST(req: Request) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { amount = 1 } = await req.json();

  // 读取当前余额
  const { data: current } = await supabase
    .from("user_credits")
    .select("credits")
    .eq("id", user.id)
    .single();

  if (!current || current.credits < amount) {
    return NextResponse.json({ error: "insufficient_credits" }, { status: 402 });
  }

  const { data, error } = await supabase
    .from("user_credits")
    .update({ credits: current.credits - amount, updated_at: new Date().toISOString() })
    .eq("id", user.id)
    .select("credits")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ credits: data.credits });
}

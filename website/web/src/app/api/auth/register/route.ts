import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

const supabaseAdmin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!
);

export async function POST(req: Request) {
  const { email, password } = await req.json();

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required" }, { status: 400 });
  }

  // 用 admin API 创建用户并直接确认邮箱
  const { data, error } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
  });

  if (error) {
    // 邮箱已存在
    if (error.message.includes("already been registered") || error.message.includes("already exists")) {
      return NextResponse.json({ error: "Email already registered" }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 400 });
  }

  // 用 Resend 发欢迎邮件
  await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${process.env.RESEND_API_KEY}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from: "TradingAgents <onboarding@resend.dev>",
      to: [email],
      subject: "Welcome to TradingAgents",
      html: `
        <div style="font-family:monospace;background:#050a19;color:#e0e0e0;padding:40px;max-width:480px;margin:0 auto;border-radius:12px;border:1px solid rgba(0,140,255,0.15)">
          <h2 style="color:#00c8ff;margin-bottom:8px">Welcome to TradingAgents</h2>
          <p style="color:rgba(255,255,255,0.6);font-size:13px;margin-bottom:24px">Your account has been created successfully.</p>
          <p style="color:rgba(255,255,255,0.5);font-size:12px">Email: <span style="color:#00c8ff">${email}</span></p>
          <p style="color:rgba(255,255,255,0.5);font-size:12px;margin-top:24px">You can now sign in and start exploring AI-powered market analysis.</p>
          <a href="https://localhost:3002/en/login" style="display:inline-block;margin-top:24px;padding:10px 24px;background:linear-gradient(135deg,rgba(0,140,255,0.9),rgba(0,200,255,0.8));color:#fff;text-decoration:none;border-radius:8px;font-size:13px;font-weight:600">Sign In</a>
        </div>
      `,
    }),
  });

  return NextResponse.json({ user: data.user, needsVerification: false });
}

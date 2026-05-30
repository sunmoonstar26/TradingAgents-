import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";
import { createClient } from "@supabase/supabase-js";

// Supabase service role client（服务端专用，有完整权限）
function getServiceClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } }
  );
}

/** 验证 Creem Webhook 签名 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto
      .createHmac("sha256", secret)
      .update(payload)
      .digest("hex");
    // Creem 签名格式可能是 "sha256=xxx" 或直接是 hex
    const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

/** Credits 套餐映射：product_id → credits 数量 */
function getCreditsForProduct(productId: string): number {
  const map: Record<string, number> = {
    [process.env.CREEM_PRODUCT_ID_BASIC!]: 20,   // $5 → 20 Credits
    [process.env.CREEM_PRODUCT_ID_PRO!]: 100,    // $10 → 100 Credits
  };
  return map[productId] ?? 0;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 验证签名
  const signature =
    req.headers.get("creem-signature") ||
    req.headers.get("x-creem-signature") ||
    req.headers.get("webhook-signature") || "";

  const secret = process.env.CREEM_WEBHOOK_SECRET!;

  if (secret && signature) {
    if (!verifySignature(rawBody, signature, secret)) {
      console.error("[Creem Webhook] 签名验证失败");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }
  }

  let event: {
    eventType?: string;
    event?: string;
    object?: {
      customer?: { email?: string };
      product_id?: string;
      product?: { id?: string };
      metadata?: Record<string, string>;
    };
    data?: {
      customer?: { email?: string };
      product_id?: string;
      product?: { id?: string };
    };
  };

  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // 兼容 Creem 不同的事件格式
  const eventType = event.eventType || event.event || "";
  const obj = event.object || event.data || {};
  const customerEmail = obj.customer?.email;
  const productId = obj.product_id || obj.product?.id;

  console.log("[Creem Webhook] 收到事件:", eventType, "| 产品:", productId, "| 邮箱:", customerEmail);

  if (eventType !== "checkout.completed" && eventType !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  if (!customerEmail || !productId) {
    console.error("[Creem Webhook] 缺少 email 或 product_id", { customerEmail, productId });
    return NextResponse.json({ error: "Missing customer email or product_id" }, { status: 400 });
  }

  const creditsToAdd = getCreditsForProduct(productId);
  if (creditsToAdd === 0) {
    console.warn("[Creem Webhook] 未知产品 ID:", productId);
    return NextResponse.json({ received: true });
  }

  // 用 service role 查找用户并增加 Credits
  const supabase = getServiceClient();

  // 通过 email 找到用户 ID
  const { data: users, error: userError } = await supabase.auth.admin.listUsers();
  if (userError) {
    console.error("[Creem Webhook] 查询用户失败:", userError.message);
    return NextResponse.json({ error: "Database error" }, { status: 500 });
  }

  const user = users.users.find((u) => u.email === customerEmail);
  if (!user) {
    console.warn("[Creem Webhook] 找不到用户:", customerEmail);
    // 用户不存在时仍返回 200，避免 Creem 重试
    return NextResponse.json({ received: true });
  }

  // 读取当前 Credits
  const { data: current } = await supabase
    .from("user_credits")
    .select("credits")
    .eq("id", user.id)
    .single();

  const currentCredits = current?.credits ?? 0;
  const newCredits = currentCredits + creditsToAdd;

  // 更新 Credits
  const { error: updateError } = await supabase
    .from("user_credits")
    .upsert({ id: user.id, credits: newCredits, updated_at: new Date().toISOString() });

  if (updateError) {
    console.error("[Creem Webhook] 更新 Credits 失败:", updateError.message);
    return NextResponse.json({ error: "Failed to update credits" }, { status: 500 });
  }

  console.log(`[Creem Webhook] ✓ ${customerEmail} +${creditsToAdd} Credits → 共 ${newCredits}`);
  return NextResponse.json({ received: true, credits_added: creditsToAdd });
}

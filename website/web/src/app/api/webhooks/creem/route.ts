import { NextRequest, NextResponse } from "next/server";
import crypto from "crypto";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY!;

/** 直接调用 Supabase REST API（不依赖 SDK admin 方法） */
async function supabaseAdmin(path: string, options: RequestInit = {}) {
  const res = await fetch(`${SUPABASE_URL}${path}`, {
    ...options,
    headers: {
      apikey: SERVICE_KEY,
      Authorization: `Bearer ${SERVICE_KEY}`,
      "Content-Type": "application/json",
      Prefer: "return=representation",
      ...(options.headers || {}),
    },
  });
  return res;
}

/** 验证 Creem Webhook 签名 */
function verifySignature(payload: string, signature: string, secret: string): boolean {
  try {
    const expected = crypto.createHmac("sha256", secret).update(payload).digest("hex");
    const sig = signature.startsWith("sha256=") ? signature.slice(7) : signature;
    return crypto.timingSafeEqual(Buffer.from(expected), Buffer.from(sig));
  } catch {
    return false;
  }
}

/** product_id → credits 数量 */
function getCreditsForProduct(productId: string): number {
  const map: Record<string, number> = {
    [process.env.CREEM_PRODUCT_ID_BASIC!]: 20,
    [process.env.CREEM_PRODUCT_ID_PRO!]: 100,
  };
  return map[productId] ?? 0;
}

export async function POST(req: NextRequest) {
  const rawBody = await req.text();

  // 验证签名（有 secret 才验证）
  const secret = process.env.CREEM_WEBHOOK_SECRET ?? "";
  const signature =
    req.headers.get("creem-signature") ||
    req.headers.get("x-creem-signature") ||
    req.headers.get("webhook-signature") || "";

  if (secret && signature && !verifySignature(rawBody, signature, secret)) {
    console.error("[Webhook] 签名验证失败");
    return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
  }

  let event: Record<string, unknown>;
  try {
    event = JSON.parse(rawBody);
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  const eventType = (event.eventType || event.event || "") as string;
  const obj = (event.object || event.data || {}) as Record<string, unknown>;
  const customer = (obj.customer || {}) as Record<string, unknown>;
  const customerEmail = customer.email as string | undefined;
  const productId = (obj.product_id || (obj.product as Record<string, unknown>)?.id) as string | undefined;

  console.log("[Webhook] 事件:", eventType, "| 产品:", productId, "| 邮箱:", customerEmail);

  if (eventType !== "checkout.completed" && eventType !== "payment.succeeded") {
    return NextResponse.json({ received: true });
  }

  if (!customerEmail || !productId) {
    console.error("[Webhook] 缺少 email 或 product_id");
    return NextResponse.json({ error: "Missing fields" }, { status: 400 });
  }

  const creditsToAdd = getCreditsForProduct(productId);
  if (creditsToAdd === 0) {
    console.warn("[Webhook] 未知产品:", productId);
    return NextResponse.json({ received: true });
  }

  // 1. 通过 email 查找用户 ID
  const usersRes = await supabaseAdmin(
    `/auth/v1/admin/users?email=${encodeURIComponent(customerEmail)}`,
    { method: "GET" }
  );
  const usersData = await usersRes.json();
  const users = usersData.users || (Array.isArray(usersData) ? usersData : []);
  const user = users.find((u: { email: string }) => u.email === customerEmail);

  if (!user) {
    console.warn("[Webhook] 找不到用户:", customerEmail);
    return NextResponse.json({ received: true });
  }

  // 2. 读取当前 credits
  const creditsRes = await supabaseAdmin(`/rest/v1/user_credits?id=eq.${user.id}`);
  const creditsData = await creditsRes.json();
  const currentCredits = (creditsData[0]?.credits as number) ?? 0;
  const newCredits = currentCredits + creditsToAdd;

  // 3. 更新 credits
  const updateRes = await supabaseAdmin(
    `/rest/v1/user_credits?id=eq.${user.id}`,
    {
      method: "PATCH",
      body: JSON.stringify({ credits: newCredits, updated_at: new Date().toISOString() }),
    }
  );

  if (!updateRes.ok) {
    const err = await updateRes.text();
    console.error("[Webhook] 更新失败:", err);
    return NextResponse.json({ error: "Update failed" }, { status: 500 });
  }

  console.log(`[Webhook] ✓ ${customerEmail} +${creditsToAdd} → 共 ${newCredits} Credits`);
  return NextResponse.json({ received: true, credits_added: creditsToAdd, total: newCredits });
}

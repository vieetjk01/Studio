import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToOwner } from "@/lib/push";
import { verifyTurnstile } from "@/lib/turnstile";
import { limitByIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Public booking request for a studio (resolved by booking_token). */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const limited = limitByIp(req, "book", 8, 60_000);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    service?: string;
    preferred_date?: string;
    note?: string;
    package_name?: string;
    package_price?: number;
    facebook?: string;
    captcha?: string;
  };

  const captchaOk = await verifyTurnstile(body.captcha);
  if (!captchaOk) return NextResponse.json({ error: "captcha_failed" }, { status: 400 });

  if (!body.name?.trim() || !body.phone?.trim()) {
    return NextResponse.json({ error: "missing" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data: owner } = await db
    .from("profiles")
    .select("id")
    .eq("booking_token", params.token)
    .maybeSingle();
  if (!owner) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const pkgName = body.package_name?.trim() || null;
  const { error } = await db.from("studio_bookings").insert({
    owner_id: owner.id,
    name: body.name.trim(),
    phone: body.phone.trim(),
    service: body.service?.trim() || null,
    preferred_date: body.preferred_date || null,
    note: body.note?.trim() || null,
    package_name: pkgName,
    package_price: body.package_price != null && Number.isFinite(body.package_price) ? Math.max(0, Math.round(body.package_price)) : null,
    facebook: body.facebook?.trim() || null,
  });
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });

  const bookMsg = `Yêu cầu đặt lịch mới từ ${body.name.trim()}${pkgName ? ` · ${pkgName}` : ""}${body.preferred_date ? ` · ${body.preferred_date}` : ""}`;
  await db.from("studio_notifications").insert({
    owner_id: owner.id,
    contract_id: null,
    kind: "info",
    message: bookMsg,
  });
  await sendPushToOwner(owner.id, { title: "Đặt lịch mới", body: bookMsg, url: "/dashboard/studio/bookings", tag: "booking" });

  return NextResponse.json({ ok: true });
}

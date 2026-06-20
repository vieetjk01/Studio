import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public booking request for a studio (resolved by booking_token). */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    phone?: string;
    service?: string;
    preferred_date?: string;
    note?: string;
  };
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

  const { error } = await db.from("studio_bookings").insert({
    owner_id: owner.id,
    name: body.name.trim(),
    phone: body.phone.trim(),
    service: body.service?.trim() || null,
    preferred_date: body.preferred_date || null,
    note: body.note?.trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("studio_notifications").insert({
    owner_id: owner.id,
    contract_id: null,
    kind: "info",
    message: `Yêu cầu đặt lịch mới từ ${body.name.trim()}${body.preferred_date ? ` · ${body.preferred_date}` : ""}`,
  });

  return NextResponse.json({ ok: true });
}

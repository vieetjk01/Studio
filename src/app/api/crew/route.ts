import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToOwner } from "@/lib/push";

export const dynamic = "force-dynamic";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/**
 * Public crew portal (no login). A photographer/cameraman enters their phone to
 * see every job they've been assigned across studios + accept/decline.
 *   POST { phone }                                   -> list assignments + busy days
 *   POST { action: "respond", id, phone, status }    -> accept | decline a job
 *   POST { action: "busy_add", phone, date, note }   -> mark a day unavailable
 *   POST { action: "busy_remove", id, phone }        -> clear a busy day
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    phone?: string;
    action?: string;
    id?: string;
    status?: string;
    date?: string;
    note?: string;
  };
  const phone = digits(body.phone);
  if (!phone) return NextResponse.json({ error: "no_phone" }, { status: 400 });

  const db = createAdminClient();

  if (body.action === "busy_add") {
    if (!body.date) return NextResponse.json({ error: "no_date" }, { status: 400 });
    const { error } = await db
      .from("crew_unavailable")
      .upsert({ phone, date: body.date, note: body.note?.trim() || null }, { onConflict: "phone,date" });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "busy_remove") {
    if (!body.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
    await db.from("crew_unavailable").delete().eq("id", body.id).eq("phone", phone);
    return NextResponse.json({ ok: true });
  }

  if (body.action === "respond") {
    if (!body.id || (body.status !== "accepted" && body.status !== "declined")) {
      return NextResponse.json({ error: "bad_request" }, { status: 400 });
    }
    // Verify the crew row belongs to this phone before updating.
    const { data: row } = await db
      .from("contract_crew")
      .select("id, phone, name, contract:studio_contracts(owner_id, title)")
      .eq("id", body.id)
      .maybeSingle();
    if (!row || digits(row.phone) !== phone) {
      return NextResponse.json({ error: "forbidden" }, { status: 403 });
    }
    const { error } = await db
      .from("contract_crew")
      .update({ status: body.status, responded_at: new Date().toISOString() })
      .eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    const ct = (row as unknown as { contract: { owner_id: string; title: string } | null }).contract;
    if (ct?.owner_id) {
      const crewMsg = `${row.name || phone} đã ${body.status === "accepted" ? "nhận" : "từ chối"} buổi “${ct.title}”`;
      await db.from("studio_notifications").insert({
        owner_id: ct.owner_id,
        contract_id: null,
        kind: body.status === "accepted" ? "crew_accepted" : "crew_declined",
        message: crewMsg,
      });
      await sendPushToOwner(ct.owner_id, { title: "Phản hồi từ thợ", body: crewMsg, url: "/dashboard/studio/team", tag: "crew" });
    }
    return NextResponse.json({ ok: true });
  }

  // List assignments. Match by exact phone first; fall back to digit-only match.
  const { data: rows } = await db
    .from("contract_crew")
    .select(
      "id, name, role, salary, status, note, phone, responded_at, contract:studio_contracts(title, client_name, shoot_type, event_date, event_time, location, status)"
    )
    .order("created_at", { ascending: false });

  const mine = (rows ?? []).filter((r) => digits(r.phone) === phone);

  const { data: busy } = await db
    .from("crew_unavailable")
    .select("id, date, note")
    .eq("phone", phone)
    .order("date");

  return NextResponse.json({ assignments: mine, busy: busy ?? [] });
}

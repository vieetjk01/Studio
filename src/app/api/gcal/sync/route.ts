/**
 * Sync a local event to Google Calendar.
 * Called server-side after a studio_event or studio_contract is saved.
 *
 * POST body:
 *   { kind: "event" | "contract", id: string, action: "upsert" | "delete" }
 *
 * The route fetches the record from Supabase, builds the GCal payload,
 * calls upsert/delete, and writes the returned gcal_event_id back.
 */
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { upsertGCalEvent, deleteGCalEvent } from "@/lib/gcal";
import { SHOOT_TYPE_LABEL } from "@/lib/types";
import type { ShootType } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  try {
    return await handle(req);
  } catch (e) {
    // Lỗi từ Google (token bị thu hồi, quota, sai redirect URI) trước đây bay
    // thẳng thành 500 không nội dung, mà mọi nơi gọi lại bỏ qua phản hồi — nên
    // đồng bộ hỏng hàng tuần cũng không ai biết.
    return NextResponse.json({ ok: false, reason: (e as Error)?.message || String(e) }, { status: 500 });
  }
}

async function handle(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { kind, id, action } = await req.json().catch(() => ({})) as {
    kind?: "event" | "contract";
    id?: string;
    action?: "upsert" | "delete";
  };
  if (!kind || !id || !action) return NextResponse.json({ error: "missing params" }, { status: 400 });

  const db = createAdminClient();

  if (kind === "event") {
    const { data: ev } = await db
      .from("studio_events")
      .select("id, owner_id, title, event_date, event_time, note, gcal_event_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!ev) return NextResponse.json({ error: "not found" }, { status: 404 });

    if (action === "delete") {
      if (ev.gcal_event_id) await deleteGCalEvent(user.id, ev.gcal_event_id);
      return NextResponse.json({ ok: true });
    }

    const gcalId = await upsertGCalEvent(
      user.id,
      { summary: ev.title, description: ev.note ?? undefined, date: ev.event_date, time: ev.event_time, duration: 60 },
      ev.gcal_event_id,
    );
    if (gcalId) await db.from("studio_events").update({ gcal_event_id: gcalId }).eq("id", id);
    // gcalId rỗng ⇒ chưa nối Google Lịch. Nói ra thay vì trả ok trơn.
    return gcalId
      ? NextResponse.json({ ok: true, synced: true, gcal_event_id: gcalId })
      : NextResponse.json({ ok: true, synced: false, reason: "chưa kết nối Google Lịch" });
  }

  if (kind === "contract") {
    const { data: ct } = await db
      .from("studio_contracts")
      .select("id, owner_id, title, client_name, shoot_type, event_date, event_time, location, status, gcal_event_id")
      .eq("id", id)
      .eq("owner_id", user.id)
      .maybeSingle();
    if (!ct) return NextResponse.json({ error: "not found" }, { status: 404 });

    // Only sync if the contract has a scheduled date.
    if (!ct.event_date) return NextResponse.json({ ok: true, synced: false, reason: "hợp đồng chưa có ngày chụp" });

    // Draft/sent (unsigned) contracts don't go on the calendar yet — only once
    // confirmed/signed. If a previously-synced contract drops back to draft,
    // remove its calendar event.
    const onCalendar = ["approved", "in_progress", "completed"].includes(ct.status as string);
    if (action === "upsert" && !onCalendar) {
      if (ct.gcal_event_id) await deleteGCalEvent(user.id, ct.gcal_event_id);
      return NextResponse.json({ ok: true, synced: false, reason: "hợp đồng chưa xác nhận/ký — chỉ lịch đã chốt mới lên Google" });
    }

    if (action === "delete") {
      if (ct.gcal_event_id) await deleteGCalEvent(user.id, ct.gcal_event_id);
      return NextResponse.json({ ok: true });
    }

    const typeLabel = SHOOT_TYPE_LABEL[ct.shoot_type as ShootType] ?? ct.shoot_type ?? "";
    const summary = ct.client_name
      ? `${ct.client_name}${typeLabel ? ` · ${typeLabel}` : ""}${ct.title ? ` — ${ct.title}` : ""}`
      : ct.title || "Lịch chụp";
    const description = [
      ct.client_name ? `Khách: ${ct.client_name}` : null,
      typeLabel ? `Loại: ${typeLabel}` : null,
    ].filter(Boolean).join("\n");

    const gcalId = await upsertGCalEvent(
      user.id,
      { summary, description, location: ct.location ?? undefined, date: ct.event_date, time: ct.event_time, duration: 180 },
      ct.gcal_event_id,
    );
    if (gcalId) await db.from("studio_contracts").update({ gcal_event_id: gcalId }).eq("id", id);
    return gcalId
      ? NextResponse.json({ ok: true, synced: true, gcal_event_id: gcalId })
      : NextResponse.json({ ok: true, synced: false, reason: "chưa kết nối Google Lịch" });
  }

  return NextResponse.json({ error: "unknown kind" }, { status: 400 });
}

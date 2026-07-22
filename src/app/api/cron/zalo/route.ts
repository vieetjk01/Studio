import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoNotify } from "@/lib/zalo/notify";
import {
  clientShootReminderMessage,
  shootReminderMessage,
  paymentDueMessage,
  selectReadyMessage,
} from "@/lib/zalo/messages";
import { ensureIntakeToken, intakeUrl } from "@/lib/contract-intake";
import { listFolderImages } from "@/lib/drive-server";
import { mainUrl } from "@/lib/hosts";
import { vnd, CREW_ROLE_LABEL } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Cron Zalo — chạy 11h trưa VN (04:00 UTC). Gửi tin tự động theo NGÀY cho các
 * studio đã KẾT NỐI Zalo + BẬT từng mốc (autoNotify tự kiểm tra, tự bỏ qua nếu
 * tắt). Các mốc theo-thao-tác (xác nhận cọc, giao khách) gửi ngay ở chỗ khác.
 *
 * Mốc theo ngày ở đây:
 *   • shoot_reminder — nhắc lịch chụp NGÀY MAI cho khách (kèm link form) & thợ.
 *   • payment_due    — đợt thanh toán tới hạn/quá hạn → nhắc khách + link HĐ.
 *   • select_ready   — mời chọn ảnh: khi thư mục ảnh gốc đã có ảnh (Drive), hoặc
 *                      fallback 1 ngày sau ngày chụp.
 * Chống gửi trùng: kiểm tra zalo_messages đã 'sent' cùng (contract, kind) gần đây.
 */
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (!secret || req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const today = ymd(nowVN);
  const tomorrow = ymd(new Date(nowVN.getTime() + 24 * 3600 * 1000));
  const yesterday = ymd(new Date(nowVN.getTime() - 24 * 3600 * 1000));

  // Chống gửi trùng: đã có tin 'sent' cùng (owner, contract, kind) trong N ngày?
  async function alreadySent(ownerId: string, contractId: string, kind: string, days: number): Promise<boolean> {
    const since = new Date(Date.now() - days * 24 * 3600 * 1000).toISOString();
    const { data } = await db
      .from("zalo_messages")
      .select("id")
      .eq("owner_id", ownerId)
      .eq("contract_id", contractId)
      .eq("kind", kind)
      .eq("status", "sent")
      .gte("created_at", since)
      .limit(1);
    return !!(data && data.length);
  }

  // Tên studio để ký tin.
  const ownerNames = new Map<string, string>();
  async function studioName(ownerId: string): Promise<string> {
    if (ownerNames.has(ownerId)) return ownerNames.get(ownerId)!;
    const { data } = await db.from("profiles").select("full_name").eq("id", ownerId).maybeSingle();
    const name = (data?.full_name as string) || "Studio";
    ownerNames.set(ownerId, name);
    return name;
  }

  let shootSent = 0;
  let dueSent = 0;
  let selectSent = 0;

  // ── 1) SHOOT REMINDER (khách + thợ) — chụp NGÀY MAI ──────────────────────
  const { data: shoots } = await db
    .from("studio_contracts")
    .select("id, owner_id, title, client_name, client_phone, event_time, location, intake_token, contract_crew(name, role, phone)")
    .eq("event_date", tomorrow)
    .neq("status", "cancelled");

  for (const s of (shoots ?? []) as any[]) {
    const studio = await studioName(s.owner_id);
    const when = `${tomorrow}${s.event_time ? ` lúc ${s.event_time}` : ""}${s.location ? ` tại ${s.location}` : ""}`;

    if (s.client_phone && !(await alreadySent(s.owner_id, s.id, "shoot_reminder", 1))) {
      const token = await ensureIntakeToken(db, s.id, s.intake_token);
      const r = await autoNotify({
        ownerId: s.owner_id,
        event: "shoot_reminder",
        audience: "client",
        toPhone: s.client_phone,
        toName: s.client_name,
        body: clientShootReminderMessage({
          name: s.client_name,
          title: s.title,
          date: tomorrow,
          time: s.event_time,
          location: s.location,
          formLink: intakeUrl(token),
          studio,
        }),
        contractId: s.id,
      });
      if (r.ok) shootSent++;
    }

    for (const c of (s.contract_crew || []) as any[]) {
      if (!c.phone) continue;
      const r = await autoNotify({
        ownerId: s.owner_id,
        event: "shoot_reminder",
        audience: "crew",
        toPhone: c.phone,
        toName: c.name,
        body: shootReminderMessage({
          name: c.name,
          title: s.title,
          date: tomorrow,
          time: s.event_time,
          location: s.location,
          role: CREW_ROLE_LABEL[c.role as keyof typeof CREW_ROLE_LABEL],
          studio,
        }),
        contractId: s.id,
      });
      if (r.ok) shootSent++;
    }
  }

  // ── 2) PAYMENT DUE — đợt tới hạn/quá hạn → nhắc khách + link HĐ ───────────
  const { data: dues } = await db
    .from("contract_payment_plan")
    .select("amount, due_date, contract:studio_contracts!inner(id, owner_id, title, client_name, client_phone, client_token, status)")
    .eq("paid", false)
    .not("due_date", "is", null)
    .lte("due_date", today);

  for (const d of (dues ?? []) as any[]) {
    const c = d.contract;
    if (!c || !c.client_phone) continue;
    if (c.status === "draft" || c.status === "cancelled") continue;
    if (await alreadySent(c.owner_id, c.id, "payment_due", 3)) continue;
    const studio = await studioName(c.owner_id);
    const r = await autoNotify({
      ownerId: c.owner_id,
      event: "payment_due",
      audience: "client",
      toPhone: c.client_phone,
      toName: c.client_name,
      body: paymentDueMessage({
        name: c.client_name,
        amount: vnd(Number(d.amount) || 0),
        title: c.title,
        link: c.client_token ? mainUrl(`/c/${c.client_token}`) : null,
        overdue: d.due_date < today,
        studio,
      }),
      contractId: c.id,
    });
    if (r.ok) dueSent++;
  }

  // ── 3) SELECT READY — mời chọn ảnh (Drive có ảnh, hoặc 1 ngày sau chụp) ───
  const { data: selCands } = await db
    .from("studio_contracts")
    .select("id, owner_id, title, client_name, client_phone, event_date, selection_album_id, gallery_album_id, drive_tree")
    .lte("event_date", today)
    .eq("status", "in_progress")
    .not("selection_album_id", "is", null)
    .is("gallery_album_id", null);

  for (const c of (selCands ?? []) as any[]) {
    if (!c.client_phone) continue;
    if (await alreadySent(c.owner_id, c.id, "select_ready", 30)) continue;

    // Ưu tiên phát hiện Drive: thư mục ảnh gốc (role selection) đã có ảnh chưa?
    let eligible = false;
    const node = Array.isArray(c.drive_tree) ? c.drive_tree.find((n: any) => n?.role === "selection" && n?.id) : null;
    if (node?.id) {
      try {
        const files = await listFolderImages(node.id);
        if (files.length > 0) eligible = true;
      } catch {
        /* Drive lỗi/không công khai — rơi về fallback theo ngày */
      }
    }
    // Fallback theo ngày: đã qua ngày chụp ít nhất 1 ngày.
    if (!eligible && c.event_date && c.event_date <= yesterday) eligible = true;
    if (!eligible) continue;

    const { data: al } = await db.from("albums").select("slug").eq("id", c.selection_album_id).maybeSingle();
    if (!al?.slug) continue;
    const studio = await studioName(c.owner_id);
    const r = await autoNotify({
      ownerId: c.owner_id,
      event: "select_ready",
      audience: "client",
      toPhone: c.client_phone,
      toName: c.client_name,
      body: selectReadyMessage({ name: c.client_name, link: mainUrl(`/a/${al.slug}`), studio }),
      contractId: c.id,
    });
    if (r.ok) selectSent++;
  }

  return NextResponse.json({ ok: true, shootSent, dueSent, selectSent });
}

import { NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendEmail } from "@/lib/email";
import { vnd } from "@/lib/types";

export const dynamic = "force-dynamic";

// Daily owner digest: shoots tomorrow, instalments due/overdue, late deliveries.
// Scheduled via vercel.json crons (07:00 VN = 00:00 UTC).
export async function GET(req: NextRequest) {
  const secret = process.env.CRON_SECRET;
  if (secret && req.headers.get("authorization") !== `Bearer ${secret}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const db = createAdminClient();

  // Work in VN time (UTC+7).
  const nowVN = new Date(Date.now() + 7 * 3600 * 1000);
  const ymd = (d: Date) => d.toISOString().slice(0, 10);
  const today = ymd(nowVN);
  const tomorrow = ymd(new Date(nowVN.getTime() + 24 * 3600 * 1000));

  const [shootsRes, duesRes, lateRes] = await Promise.all([
    db
      .from("studio_contracts")
      .select("owner_id, title, client_name, event_time, location, contract_crew(name, role)")
      .eq("event_date", tomorrow)
      .neq("status", "cancelled"),
    db
      .from("contract_payment_plan")
      .select("amount, label, due_date, contract:studio_contracts!inner(owner_id, title)")
      .eq("paid", false)
      .not("due_date", "is", null)
      .lte("due_date", tomorrow),
    db
      .from("studio_contracts")
      .select("owner_id, title, delivery_due")
      .not("delivery_due", "is", null)
      .lt("delivery_due", today)
      .neq("status", "completed")
      .neq("status", "cancelled"),
  ]);

  type Shoot = { owner_id: string; title: string; client_name: string | null; event_time: string | null; location: string | null; contract_crew: { name: string; role: string }[] };
  type Due = { amount: number; label: string; due_date: string; contract: { owner_id: string; title: string } | null };
  type Late = { owner_id: string; title: string; delivery_due: string };

  const shoots = (shootsRes.data ?? []) as unknown as Shoot[];
  const dues = (duesRes.data ?? []) as unknown as Due[];
  const late = (lateRes.data ?? []) as unknown as Late[];

  // Group everything by owner.
  type Bucket = { shoots: Shoot[]; dues: Due[]; late: Late[] };
  const byOwner = new Map<string, Bucket>();
  const bucket = (id: string) => {
    let b = byOwner.get(id);
    if (!b) { b = { shoots: [], dues: [], late: [] }; byOwner.set(id, b); }
    return b;
  };
  for (const s of shoots) bucket(s.owner_id).shoots.push(s);
  for (const d of dues) if (d.contract?.owner_id) bucket(d.contract.owner_id).dues.push(d);
  for (const l of late) bucket(l.owner_id).late.push(l);

  const ownerIds = [...byOwner.keys()];
  if (ownerIds.length === 0) return NextResponse.json({ ok: true, sent: 0, note: "nothing to remind" });

  const { data: owners } = await db.from("profiles").select("id, email, full_name").in("id", ownerIds);
  const ownerMap = new Map((owners ?? []).map((o) => [o.id as string, o as { id: string; email: string | null; full_name: string | null }]));

  const esc = (s: string) => s.replace(/[<>&]/g, (c) => ({ "<": "&lt;", ">": "&gt;", "&": "&amp;" }[c] || c));
  let sent = 0;
  const results: { owner: string; ok: boolean; error?: string }[] = [];

  for (const [ownerId, b] of byOwner) {
    const owner = ownerMap.get(ownerId);
    if (!owner?.email) continue;

    const parts: string[] = [];
    if (b.shoots.length) {
      parts.push(
        `<h3 style="margin:18px 0 6px">📸 Lịch chụp ngày mai (${esc(tomorrow)})</h3><ul style="margin:0;padding-left:18px">` +
          b.shoots
            .map((s) => {
              const crew = (s.contract_crew || []).map((c) => esc(c.name)).filter(Boolean).join(", ");
              return `<li>${esc(s.title)}${s.client_name ? ` — ${esc(s.client_name)}` : ""}${s.event_time ? ` · ${esc(s.event_time)}` : ""}${s.location ? ` · ${esc(s.location)}` : ""}${crew ? `<br><span style="color:#666">Ê-kíp: ${crew}</span>` : ""}</li>`;
            })
            .join("") +
          `</ul>`
      );
    }
    if (b.dues.length) {
      parts.push(
        `<h3 style="margin:18px 0 6px">💰 Đợt thu đến hạn / quá hạn</h3><ul style="margin:0;padding-left:18px">` +
          b.dues
            .map((d) => `<li>${esc(d.contract?.title || "Hợp đồng")} · ${esc(d.label)} — <b>${vnd(d.amount)}</b> · hạn ${esc(d.due_date)}${d.due_date < today ? ' <span style="color:#c0392b">(quá hạn)</span>' : ""}</li>`)
            .join("") +
          `</ul>`
      );
    }
    if (b.late.length) {
      parts.push(
        `<h3 style="margin:18px 0 6px">⏰ Trễ hạn giao ảnh</h3><ul style="margin:0;padding-left:18px">` +
          b.late.map((l) => `<li>${esc(l.title)} · hạn ${esc(l.delivery_due)}</li>`).join("") +
          `</ul>`
      );
    }
    if (!parts.length) continue;

    const html = `<div style="font-family:Arial,sans-serif;max-width:560px;margin:0 auto;color:#222">
<h2 style="margin:0 0 4px">Nhắc việc studio</h2>
<p style="color:#666;margin:0 0 8px">Chào ${esc(owner.full_name || "bạn")}, đây là tóm tắt cần xử lý hôm nay.</p>
${parts.join("")}
<p style="margin-top:22px;color:#888;font-size:12px">Email tự động từ Vieetjk Studio.</p>
</div>`;

    const r = await sendEmail({ to: owner.email, subject: `Nhắc việc studio — ${tomorrow}`, html });
    if (r.ok) sent++;
    results.push({ owner: ownerId, ok: r.ok, error: r.error });
  }

  return NextResponse.json({ ok: true, sent, owners: results.length, results });
}

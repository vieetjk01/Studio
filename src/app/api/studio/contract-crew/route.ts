import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoNotify } from "@/lib/zalo/notify";
import { showLabel } from "@/lib/crew-show";
import { fmtDate } from "@/lib/date";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

function normTime(v: string | null | undefined): string | null {
  const m = (v ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23 || Number(m[2]) > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

type CrewInput = {
  id?: string;
  name?: string;
  phone?: string;
  role?: string;
  salary?: number;
  note?: string;
  task?: string;
  side?: string;
  start?: string;
  end?: string;
};

/** Hợp đồng này có thuộc studio đang đăng nhập không. */
async function loadContract(contractId: string) {
  const profile = await requireStudio();
  if (!profile) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const db = createAdminClient();
  const { data: contract } = await db
    .from("studio_contracts")
    .select("id, owner_id, title, event_date, event_time, location")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract || contract.owner_id !== profile.id) {
    return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  }
  return { db, contract, ownerId: profile.id };
}

/**
 * GET ?date=YYYY-MM-DD[&exclude=<contractId>]
 *
 * Ai trong sổ thợ đã bận ngày đó — dùng để cảnh báo NGAY LÚC CHỌN thợ, trước khi
 * studio lỡ gán trùng. Gộp cả hai nguồn bận: mốc lịch thợ tự báo/studio xếp, và
 * phân công ở hợp đồng khác.
 */
export async function GET(req: Request) {
  const profile = await requireStudio();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const url = new URL(req.url);
  const date = url.searchParams.get("date") || "";
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date)) return NextResponse.json({ busy: {} });
  const exclude = url.searchParams.get("exclude");

  const db = createAdminClient();
  const { data: roster } = await db.from("studio_crew").select("phone").eq("owner_id", profile.id);
  const phones = (roster ?? []).map((r) => digits(r.phone as string)).filter(Boolean);
  if (!phones.length) return NextResponse.json({ busy: {} });

  const [{ data: marks }, { data: assigns }] = await Promise.all([
    // Cách ly: mốc của chính studio này + mốc thợ tự báo. Studio khác xếp gì
    // cho thợ là việc của họ, không lộ sang đây.
    db
      .from("crew_unavailable")
      .select("phone, start_time, end_time, title, note")
      .eq("date", date)
      .in("phone", phones)
      .or(`owner_id.is.null,owner_id.eq.${profile.id}`),
    db
      .from("contract_crew")
      .select("phone, contract:studio_contracts!inner(id, owner_id, title, event_date, status)")
      .eq("contract.owner_id", profile.id)
      .eq("contract.event_date", date),
  ]);

  const busy: Record<string, string[]> = {};
  for (const m of (marks ?? []) as Array<{ phone: string; start_time: string | null; end_time: string | null; title: string | null; note: string | null }>) {
    const p = digits(m.phone);
    const when = m.start_time && m.end_time ? `${m.start_time.slice(0, 5)}–${m.end_time.slice(0, 5)}` : "cả ngày";
    (busy[p] ||= []).push(`${when}${m.title ? ` · ${m.title}` : m.note ? ` · ${m.note}` : ""}`);
  }
  type A = { phone: string | null; contract: { id: string; title: string; status: string } | null };
  for (const a of (assigns ?? []) as unknown as A[]) {
    if (!a.contract || a.contract.status === "cancelled") continue;
    if (exclude && a.contract.id === exclude) continue; // hợp đồng đang mở thì không tự báo trùng chính nó
    const p = digits(a.phone);
    if (p) (busy[p] ||= []).push(`Hợp đồng “${a.contract.title}”`);
  }

  return NextResponse.json({ busy });
}

/**
 * POST { contractId, crew: [...] } — lưu danh sách nhân sự của hợp đồng.
 *
 * Chạy phía SERVER thay vì ghi thẳng từ client vì mỗi lần lưu còn kéo theo hai
 * việc client không làm được: ghi mốc lịch của thợ (bảng crew_unavailable chỉ
 * mở policy đọc, ghi phải qua service role) và gửi Zalo (cần bí mật của studio).
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as { contractId?: string; crew?: CrewInput[] } | null;
  if (!body?.contractId) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const g = await loadContract(body.contractId);
  if (g.error) return g.error;
  const { db, contract, ownerId } = g as { db: ReturnType<typeof createAdminClient>; contract: { id: string; title: string; event_date: string | null; event_time: string | null; location: string | null }; ownerId: string };

  const notified: string[] = [];

  for (const [idx, c] of (body.crew ?? []).entries()) {
    const name = (c.name ?? "").trim();
    const phone = (c.phone ?? "").trim();
    if (!name && !phone) continue;

    const row = {
      name,
      phone: phone || null,
      role: c.role || "photographer",
      salary: Math.max(0, Math.round(Number(c.salary) || 0)),
      note: (c.note ?? "").trim() || null,
      task: c.task || null,
      side: c.side || null,
      start_time: normTime(c.start),
      end_time: normTime(c.end),
      position: idx,
    };

    // Trước khi migration crew_profile_show.sql chạy thì chưa có task/side/giờ.
    // Ghi hỏng thì lùi về bộ cột cũ để việc LƯU NHÂN SỰ không chết theo — phần
    // thông tin show đơn giản là chưa lưu được cho tới khi migration chạy.
    const { task: _t, side: _s, start_time: _st, end_time: _et, ...legacy } = row;

    let assignId = c.id ?? null;
    const isNew = !assignId;
    if (assignId) {
      const { error } = await db.from("contract_crew").update(row).eq("id", assignId).eq("contract_id", contract.id);
      if (error) await db.from("contract_crew").update(legacy).eq("id", assignId).eq("contract_id", contract.id);
    } else {
      let { data, error } = await db
        .from("contract_crew")
        .insert({ ...row, contract_id: contract.id })
        .select("id")
        .single();
      if (error) {
        ({ data } = await db.from("contract_crew").insert({ ...legacy, contract_id: contract.id }).select("id").single());
      }
      assignId = (data?.id as string) ?? null;
    }
    if (!assignId) continue;

    // ── Ghi mốc vào lịch của thợ ─────────────────────────────────────────
    // Nối bằng contract_crew_id: mỗi phân công đúng MỘT mốc, sửa thì cập nhật
    // tại chỗ chứ không đẻ thêm; gỡ thợ khỏi hợp đồng thì cascade tự xoá.
    if (phone && contract.event_date) {
      const label = showLabel({ title: contract.title, task: c.task, side: c.side });
      const start = row.start_time ?? normTime(contract.event_time);
      const end = row.end_time;
      const entry = {
        phone: digits(phone),
        date: contract.event_date,
        start_time: start,
        end_time: end,
        overnight: !!(start && end && end <= start),
        title: label,
        owner_id: ownerId,
        contract_crew_id: assignId,
      };
      // Cột contract_crew_id cũng đến từ migration; thiếu nó thì bỏ qua phần
      // ghi lịch chứ không làm hỏng cả lượt lưu.
      const { data: existing, error: findErr } = await db
        .from("crew_unavailable")
        .select("id")
        .eq("contract_crew_id", assignId)
        .maybeSingle();
      if (!findErr) {
        if (existing?.id) await db.from("crew_unavailable").update(entry).eq("id", existing.id);
        else await db.from("crew_unavailable").insert(entry);
      }

      // ── Báo Zalo cho thợ (chỉ lần gán ĐẦU) ─────────────────────────────
      // autoNotify tự bỏ qua nếu studio chưa kết nối Zalo hoặc chưa bật mốc
      // này, nên ở đây không cần kiểm tra gì thêm.
      if (isNew) {
        const when = `${fmtDate(contract.event_date)}${start ? ` lúc ${start}` : ""}`;
        const r = await autoNotify({
          ownerId,
          event: "crew_assigned",
          audience: "crew",
          toPhone: phone,
          toName: name || null,
          body: `Bạn được xếp lịch: ${label} — ${when}${contract.location ? ` tại ${contract.location}` : ""}. Vào mstudo.com/crew để xác nhận.`,
          templateData: { name: name || "", show: label, date: fmtDate(contract.event_date), time: start ?? "", location: contract.location ?? "" },
          contractId: contract.id,
        });
        if (r.ok) notified.push(phone);
      }
    }
  }

  return NextResponse.json({ ok: true, notified: notified.length });
}

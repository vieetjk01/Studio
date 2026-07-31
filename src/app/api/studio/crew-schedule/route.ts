import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function normTime(v: string | null | undefined): string | null {
  const m = (v ?? "").trim().match(/^(\d{1,2}):(\d{2})$/);
  if (!m) return null;
  const h = Number(m[1]);
  if (h > 23 || Number(m[2]) > 59) return null;
  return `${String(h).padStart(2, "0")}:${m[2]}`;
}

/**
 * Studio xếp lịch HỘ một thợ trong sổ thợ của mình ("đã biết thợ đó nhận việc
 * ngày nào thì thêm luôn").
 *
 * Đi qua service role vì crew_unavailable chỉ mở policy ĐỌC cho tài khoản đã
 * đăng nhập — thợ không có tài khoản nên bảng này không gắn owner_id vào RLS
 * được. Bù lại, mỗi request đều kiểm tra SĐT có nằm trong sổ thợ CỦA CHÍNH
 * studio này không, nên không studio nào chạm được vào thợ của studio khác.
 */
async function guard(phoneRaw: string | undefined) {
  const profile = await requireStudio();
  if (!profile) return { error: NextResponse.json({ error: "forbidden" }, { status: 403 }) };
  const phone = digits(phoneRaw);
  if (!phone) return { error: NextResponse.json({ error: "no_phone" }, { status: 400 }) };

  const db = createAdminClient();
  const { data: roster } = await db
    .from("studio_crew")
    .select("phone")
    .eq("owner_id", profile.id);
  const known = (roster ?? []).some((r) => digits(r.phone as string) === phone);
  if (!known) return { error: NextResponse.json({ error: "not_in_roster" }, { status: 403 }) };

  return { db, phone, ownerId: profile.id };
}

export async function POST(req: Request) {
  const body = (await req.json().catch(() => null)) as
    | { phone?: string; date?: string; start?: string; end?: string; title?: string }
    | null;
  const g = await guard(body?.phone);
  if (g.error) return g.error;

  if (!DATE_RE.test(body?.date ?? "")) return NextResponse.json({ error: "bad_date" }, { status: 400 });
  const start = normTime(body?.start);
  const end = normTime(body?.end);
  if ((start && !end) || (!start && end)) return NextResponse.json({ error: "bad_time" }, { status: 400 });

  const { error } = await g.db!.from("crew_unavailable").insert({
    phone: g.phone,
    date: body!.date,
    start_time: start,
    end_time: end,
    overnight: !!(start && end && end <= start),
    title: body?.title?.trim() || null,
    // Đánh dấu studio xếp hộ → thợ thấy được nhưng không tự gỡ.
    owner_id: g.ownerId,
  });
  if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: Request) {
  const body = (await req.json().catch(() => null)) as { phone?: string; id?: string } | null;
  const g = await guard(body?.phone);
  if (g.error) return g.error;
  if (!body?.id) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  // Chỉ gỡ được mốc do CHÍNH studio này xếp — mốc thợ tự thêm là của thợ.
  await g.db!.from("crew_unavailable").delete().eq("id", body.id).eq("phone", g.phone).eq("owner_id", g.ownerId);
  return NextResponse.json({ ok: true });
}

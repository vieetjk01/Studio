import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { effectivePlan, studioTier } from "@/lib/plans";
import { sendPushToOwners } from "@/lib/push";
import type { Profile } from "@/lib/types";

export const dynamic = "force-dynamic";

type Target = "all" | "studio" | "booking";

/**
 * Gửi thông báo hệ thống tới các studio (hiển thị ngay trong webapp qua chuông
 * thông báo). Chỉ admin. Mỗi studio nhận 1 dòng trong studio_notifications.
 *
 * body: { message: string, target: "all" | "studio" | "booking" }
 *   all     — mọi tài khoản chủ studio đang hoạt động
 *   studio  — chỉ gói Studio (đầy đủ hợp đồng/tài chính)
 *   booking — chỉ Photographer/Basic (đặt lịch)
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    message?: unknown;
    target?: unknown;
    push?: unknown;
  };
  const message = String(body.message ?? "").trim();
  const target = (["all", "studio", "booking"].includes(String(body.target))
    ? body.target
    : "all") as Target;
  const wantPush = body.push === true;

  if (!message) return NextResponse.json({ error: "empty_message" }, { status: 400 });
  if (message.length > 1000) return NextResponse.json({ error: "too_long" }, { status: 413 });

  const db = createAdminClient();

  // Chỉ chủ studio (không phải nhân viên phụ), đang hoạt động.
  const { data: profiles, error } = await db
    .from("profiles")
    .select("id, role, plan, plan_expires_at, is_active, studio_owner_id")
    .is("studio_owner_id", null)
    .eq("is_active", true);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const owners = (profiles ?? []) as Pick<
    Profile,
    "id" | "role" | "plan" | "plan_expires_at" | "is_active" | "studio_owner_id"
  >[];

  const recipients = owners.filter((p) => {
    const tier = studioTier(effectivePlan(p.plan, p.plan_expires_at), p.role === "admin");
    if (target === "studio") return tier === "full";
    if (target === "booking") return tier === "booking";
    return tier === "full" || tier === "booking"; // "all" — bất kỳ ai có quyền dùng studio
  });

  if (recipients.length === 0) {
    return NextResponse.json({ ok: true, sent: 0 });
  }

  const rows = recipients.map((p) => ({
    owner_id: p.id,
    contract_id: null,
    kind: "announcement",
    message,
  }));

  // Chèn theo lô để tránh payload quá lớn.
  const CHUNK = 500;
  for (let i = 0; i < rows.length; i += CHUNK) {
    const { error: insErr } = await db
      .from("studio_notifications")
      .insert(rows.slice(i, i + CHUNK));
    if (insErr) return NextResponse.json({ error: insErr.message }, { status: 500 });
  }

  // Web push (khi bật): báo cả khi studio không mở webapp. No-op nếu chưa cấu hình VAPID.
  let pushed = 0;
  if (wantPush) {
    pushed = await sendPushToOwners(
      recipients.map((p) => p.id),
      { title: "Thông báo hệ thống", body: message, url: "/dashboard/studio/notifications", tag: "mstudo-announcement" }
    );
  }

  return NextResponse.json({ ok: true, sent: rows.length, pushed });
}

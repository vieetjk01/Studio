import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { planProfilePatch, trialDaysFor, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** Expiry timestamp for a plan/cycle (null = free / no expiry). */
function expiryFor(plan: Plan, cycle: "month" | "year"): string | null {
  if (plan === "free") return null;
  const d = new Date();
  if (cycle === "year") d.setFullYear(d.getFullYear() + 1);
  else {
    // setMonth(+1) tràn cuối tháng (31/1 → 2-3/3, "nhảy" qua tháng 2 ngắn).
    // Kẹp về ngày cuối tháng kế tiếp khi ngày gốc không tồn tại ở tháng đó.
    const day = d.getDate();
    d.setDate(1);
    d.setMonth(d.getMonth() + 1);
    const last = new Date(d.getFullYear(), d.getMonth() + 1, 0).getDate();
    d.setDate(Math.min(day, last));
  }
  return d.toISOString();
}

/** Update a photographer's role / activation / plan. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    id: string;
    role?: "admin" | "photographer";
    is_active?: boolean;
    can_zip?: boolean;
    can_notes?: boolean;
    can_galleries?: boolean;
    can_watermark_pro?: boolean;
    monthly_album_limit?: number | null;
    plan?: Plan;
    cycle?: "month" | "year";
    trial_plan?: Plan; // admin cấp dùng thử (Studio 7 ngày / Basic·Photographer 30 ngày)
    full_name?: string;
  };

  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of ["role", "is_active", "can_zip", "can_notes", "can_galleries", "can_watermark_pro", "monthly_album_limit", "full_name"] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  // Admin cấp dùng thử cho một tài khoản (ghi đè — vẫn cấp được kể cả đã dùng thử trước đó).
  if (body.trial_plan && body.trial_plan !== "free") {
    const days = trialDaysFor(body.trial_plan);
    const now = new Date();
    Object.assign(patch, planProfilePatch(body.trial_plan), {
      plan_cycle: "trial",
      plan_expires_at: new Date(now.getTime() + days * 86400000).toISOString(),
      trial_used_at: now.toISOString(),
    });
  } else if (body.plan) {
    // Assigning a plan syncs the legacy limit columns + sets the billing cycle/expiry.
    const cycle = body.cycle === "year" ? "year" : "month";
    Object.assign(patch, planProfilePatch(body.plan), {
      plan_cycle: body.plan === "free" ? null : cycle,
      plan_expires_at: expiryFor(body.plan, cycle),
    });
  }

  const db = createAdminClient();
  const { error } = await db.from("profiles").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

/** Delete a photographer account (auth user + cascaded profile/albums). Admin only. */
export async function DELETE(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
  if (id === admin.id) return NextResponse.json({ error: "cannot_delete_self" }, { status: 400 });

  const db = createAdminClient();
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

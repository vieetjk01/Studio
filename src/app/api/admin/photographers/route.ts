import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { planProfilePatch, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

/** Expiry timestamp for a plan/cycle (null = free / no expiry). */
function expiryFor(plan: Plan, cycle: "month" | "year"): string | null {
  if (plan === "free") return null;
  const d = new Date();
  if (cycle === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** Update a photographer's role / activation / plan. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json()) as {
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
    full_name?: string;
  };

  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of ["role", "is_active", "can_zip", "can_notes", "can_galleries", "can_watermark_pro", "monthly_album_limit", "full_name"] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  // Assigning a plan syncs the legacy limit columns + sets the billing cycle/expiry.
  if (body.plan) {
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

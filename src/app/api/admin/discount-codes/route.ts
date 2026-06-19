import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Create or delete a discount code. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json().catch(() => ({}))) as {
    action?: "create" | "delete";
    id?: string;
    code?: string;
    percent?: number;
    plan?: string | null;
    cycle?: string | null;
    max_uses?: number | null;
    expires_at?: string | null;
  };
  const db = createAdminClient();

  if (body.action === "delete") {
    if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });
    const { error } = await db.from("discount_codes").delete().eq("id", body.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  // create
  const code = (body.code ?? "").trim().toUpperCase();
  if (!code) return NextResponse.json({ error: "missing_code" }, { status: 400 });
  const percent = Math.max(0, Math.min(100, Math.round(Number(body.percent) || 0)));
  const plan = body.plan === "basic" || body.plan === "photographer" || body.plan === "studio" ? body.plan : null;
  const cycle = body.cycle === "month" || body.cycle === "year" ? body.cycle : null;
  const max_uses = body.max_uses == null ? null : Math.max(1, Math.round(Number(body.max_uses)));
  const expires_at = body.expires_at ? new Date(body.expires_at).toISOString() : null;

  const { data, error } = await db
    .from("discount_codes")
    .insert({ code, percent, plan, cycle, active: true, max_uses, expires_at })
    .select("id, code, percent, plan, cycle, active, max_uses, used_count, expires_at, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, code: data });
}

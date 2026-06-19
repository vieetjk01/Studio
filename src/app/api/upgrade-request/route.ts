import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** A logged-in photographer requests an account upgrade. */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { note, plan, cycle, discount_code, phone } = (await req.json().catch(() => ({}))) as {
    note?: string;
    plan?: string;
    cycle?: string;
    discount_code?: string;
    phone?: string;
  };

  const code = discount_code?.trim().toUpperCase() || null;
  const db = createAdminClient();
  const { error } = await db.from("upgrade_requests").insert({
    user_id: user.id,
    email: user.email,
    note: note?.trim() || null,
    plan: plan === "basic" || plan === "studio" ? plan : null,
    cycle: cycle === "month" || cycle === "year" ? cycle : null,
    discount_code: code,
    phone: phone?.trim() || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Count one use of the discount code (single-use codes become spent).
  if (code) {
    const { data: dc } = await db.from("discount_codes").select("id, used_count").eq("code", code).maybeSingle();
    if (dc) await db.from("discount_codes").update({ used_count: (dc.used_count ?? 0) + 1 }).eq("id", dc.id);
  }
  return NextResponse.json({ ok: true });
}

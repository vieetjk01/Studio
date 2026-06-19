import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Validate a discount code for a plan (logged-in users on the upgrade page). */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code, plan } = (await req.json().catch(() => ({}))) as { code?: string; plan?: string };
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return NextResponse.json({ valid: false });

  const db = createAdminClient();
  const { data } = await db
    .from("discount_codes")
    .select("code, percent, plan, active, max_uses, used_count")
    .eq("code", c)
    .maybeSingle();

  if (!data || !data.active) return NextResponse.json({ valid: false });
  // Usage cap reached?
  if (data.max_uses != null && (data.used_count ?? 0) >= data.max_uses) {
    return NextResponse.json({ valid: false, reason: "used_up" });
  }
  // Plan-restricted codes only apply to that plan.
  if (data.plan && plan && data.plan !== plan) {
    return NextResponse.json({ valid: false, reason: "wrong_plan", plan: data.plan });
  }
  return NextResponse.json({ valid: true, code: data.code, percent: data.percent, plan: data.plan });
}

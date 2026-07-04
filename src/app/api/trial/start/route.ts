import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planProfilePatch, trialDaysFor, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Self-serve free trial (no payment). Basic & Photographer → 30 ngày; Studio →
 * 7 ngày. MỖI TÀI KHOẢN CHỈ DÙNG THỬ MỘT LẦN (mọi gói) — chốt bằng
 * profiles.trial_used_at.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { plan } = (await req.json().catch(() => ({}))) as { plan?: string };
  if (plan !== "basic" && plan !== "photographer" && plan !== "studio") {
    return NextResponse.json({ error: "bad_plan" }, { status: 400 });
  }
  const days = trialDaysFor(plan as Plan);

  const db = createAdminClient();
  const { data: profile } = await db.from("profiles").select("plan, plan_cycle, plan_expires_at, trial_used_at").eq("id", user.id).maybeSingle();

  // Một lần / tài khoản.
  if (profile?.trial_used_at) return NextResponse.json({ error: "already_used" }, { status: 400 });
  // Đang có gói trả phí còn hạn thì không cần dùng thử.
  if (profile && profile.plan !== "free" && profile.plan_cycle !== "trial" && profile.plan_expires_at && new Date(profile.plan_expires_at).getTime() > Date.now()) {
    return NextResponse.json({ error: "already_paid" }, { status: 400 });
  }

  const now = new Date();
  const expires = new Date(now.getTime() + days * 86400000).toISOString();
  const { error } = await db
    .from("profiles")
    .update({ ...planProfilePatch(plan as Plan), plan_cycle: "trial", plan_expires_at: expires, trial_used_at: now.toISOString() })
    .eq("id", user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await db.from("discount_redemptions").insert({ code: `TRIAL_${(plan as string).toUpperCase()}`, user_id: user.id }).then(() => {}, () => {});
  return NextResponse.json({ ok: true, plan, trial_days: days, expires_at: expires });
}

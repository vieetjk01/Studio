import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planProfilePatch } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Self-serve 1-day Studio trial. Each user can activate this once.
 * Tracked via a synthetic redemption in discount_redemptions using code="TRIAL_STUDIO_1D".
 */
const TRIAL_CODE = "TRIAL_STUDIO_1D";

export async function POST() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();

  // Check if this user already used the trial
  const { data: existing } = await db
    .from("discount_redemptions")
    .select("id")
    .eq("code", TRIAL_CODE)
    .eq("user_id", user.id)
    .maybeSingle();
  if (existing) return NextResponse.json({ error: "already_used" }, { status: 400 });

  // Check current plan — studio users don't need a trial
  const { data: profile } = await db.from("profiles").select("plan, plan_expires_at").eq("id", user.id).maybeSingle();
  if (profile?.plan === "studio" && (!profile.plan_expires_at || new Date(profile.plan_expires_at).getTime() > Date.now())) {
    return NextResponse.json({ error: "already_studio" }, { status: 400 });
  }

  const expires = new Date(Date.now() + 86400000).toISOString(); // 24h from now

  const { error: upErr } = await db
    .from("profiles")
    .update({ ...planProfilePatch("studio"), plan_cycle: "trial", plan_expires_at: expires })
    .eq("id", user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await db.from("discount_redemptions").insert({ code: TRIAL_CODE, user_id: user.id });

  return NextResponse.json({ ok: true, expires_at: expires });
}

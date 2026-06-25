import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planProfilePatch, type Plan } from "@/lib/plans";

export const dynamic = "force-dynamic";

type Db = ReturnType<typeof createAdminClient>;

async function creditAffiliateCommission(
  db: Db,
  userId: string,
  userEmail: string,
  plan: Plan,
  cycle: string,
  saleAmount: number,
) {
  const { data: profile } = await db.from("profiles").select("referred_by").eq("id", userId).maybeSingle();
  if (!profile?.referred_by) return;

  const { data: affCode } = await db
    .from("affiliate_codes")
    .select("user_id")
    .eq("code", profile.referred_by)
    .eq("active", true)
    .maybeSingle();
  if (!affCode) return;

  const planKey = `affiliate_commission_${plan}` as const;
  const { data: settings } = await db.from("site_settings").select(planKey).eq("id", 1).maybeSingle();
  const pct: number = (settings as Record<string, unknown>)?.[planKey] as number ?? 0;
  if (pct <= 0) return;

  const commissionAmount = Math.round(saleAmount * pct / 100);
  await db.from("affiliate_commissions").insert({
    referrer_id: affCode.user_id,
    referred_user_id: userId,
    referred_email: userEmail,
    plan,
    cycle,
    sale_amount: saleAmount,
    commission_pct: pct,
    commission_amount: commissionAmount,
    status: "pending",
  });
}

function expiryFor(cycle: "month" | "year"): string {
  const d = new Date();
  if (cycle === "year") d.setFullYear(d.getFullYear() + 1);
  else d.setMonth(d.getMonth() + 1);
  return d.toISOString();
}

/** A logged-in photographer requests an account upgrade. */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { note, plan, cycle, discount_code, phone, amount } = (await req.json().catch(() => ({}))) as {
    note?: string;
    plan?: string;
    cycle?: string;
    discount_code?: string;
    phone?: string;
    amount?: number;
  };

  const validPlan = plan === "basic" || plan === "photographer" || plan === "studio" ? (plan as Plan) : null;
  const validCycle = cycle === "year" ? "year" : "month";
  const code = discount_code?.trim().toUpperCase() || null;
  const db = createAdminClient();

  // Has this account already redeemed this code?
  let alreadyRedeemed = false;
  if (code) {
    const { data: red } = await db
      .from("discount_redemptions")
      .select("id")
      .eq("code", code)
      .eq("user_id", user.id)
      .maybeSingle();
    alreadyRedeemed = !!red;
  }

  // Server-side: is the code a valid 100% code applicable to this plan? -> auto-activate.
  let activated = false;
  if (code && validPlan && !alreadyRedeemed) {
    const { data: dc } = await db
      .from("discount_codes")
      .select("percent, plan, cycle, active, max_uses, used_count, expires_at")
      .eq("code", code)
      .maybeSingle();
    const usable =
      dc &&
      dc.active &&
      (!dc.expires_at || new Date(dc.expires_at).getTime() >= Date.now()) &&
      (dc.max_uses == null || (dc.used_count ?? 0) < dc.max_uses) &&
      (!dc.plan || dc.plan === validPlan) &&
      (!dc.cycle || dc.cycle === validCycle);
    if (usable && dc.percent >= 100) {
      await db
        .from("profiles")
        .update({ ...planProfilePatch(validPlan), plan_cycle: validCycle, plan_expires_at: expiryFor(validCycle) })
        .eq("id", user.id);
      activated = true;

      // Credit affiliate commission if this user was referred.
      await creditAffiliateCommission(db, user.id, user.email ?? "", validPlan, validCycle, amount ?? 0);
    }
  }

  const { error } = await db.from("upgrade_requests").insert({
    user_id: user.id,
    email: user.email,
    note: note?.trim() || null,
    plan: validPlan,
    cycle: validCycle,
    discount_code: code,
    phone: phone?.trim() || null,
    amount: amount != null && Number.isFinite(amount) ? Math.max(0, Math.round(amount)) : null,
    handled: activated, // auto-activated requests are already done
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Record the per-account redemption + bump the global used count (once per account).
  if (code && !alreadyRedeemed) {
    const { error: redErr } = await db.from("discount_redemptions").insert({ code, user_id: user.id });
    if (!redErr) {
      const { data: dc } = await db.from("discount_codes").select("id, used_count").eq("code", code).maybeSingle();
      if (dc) await db.from("discount_codes").update({ used_count: (dc.used_count ?? 0) + 1 }).eq("id", dc.id);
    }
  }
  return NextResponse.json({ ok: true, activated });
}

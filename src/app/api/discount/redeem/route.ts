import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { planProfilePatch } from "@/lib/plans";

export const dynamic = "force-dynamic";

/**
 * Self-serve trial: redeem a discount code that has trial_days > 0 to instantly
 * activate its plan (e.g. Studio) for N days — no manual approval.
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { code } = (await req.json().catch(() => ({}))) as { code?: string };
  const c = (code ?? "").trim().toUpperCase();
  if (!c) return NextResponse.json({ error: "missing_code" }, { status: 400 });

  const db = createAdminClient();
  const { data } = await db
    .from("discount_codes")
    .select("code, plan, active, max_uses, used_count, expires_at, trial_days")
    .eq("code", c)
    .maybeSingle();

  if (!data || !data.active) return NextResponse.json({ error: "invalid" }, { status: 400 });
  if (!data.trial_days || data.trial_days <= 0) return NextResponse.json({ error: "not_trial" }, { status: 400 });
  if (data.expires_at && new Date(data.expires_at).getTime() < Date.now()) return NextResponse.json({ error: "expired" }, { status: 400 });
  if (data.max_uses != null && (data.used_count ?? 0) >= data.max_uses) return NextResponse.json({ error: "used_up" }, { status: 400 });

  const { data: red } = await db.from("discount_redemptions").select("id").eq("code", c).eq("user_id", user.id).maybeSingle();
  if (red) return NextResponse.json({ error: "already_used" }, { status: 400 });

  // Mỗi tài khoản chỉ dùng thử MỘT lần — kể cả khi có nhiều mã dùng thử cùng loại.
  const { data: prof } = await db.from("profiles").select("trial_used_at").eq("id", user.id).maybeSingle();
  if (prof?.trial_used_at) return NextResponse.json({ error: "already_used" }, { status: 400 });

  const plan = data.plan === "basic" || data.plan === "photographer" || data.plan === "studio" ? data.plan : "studio";
  const expires = new Date(Date.now() + data.trial_days * 86400000).toISOString();

  const { error: upErr } = await db
    .from("profiles")
    .update({ ...planProfilePatch(plan), plan_cycle: "trial", plan_expires_at: expires, trial_used_at: new Date().toISOString() })
    .eq("id", user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  await db.from("discount_redemptions").insert({ code: c, user_id: user.id });
  await db.from("discount_codes").update({ used_count: (data.used_count ?? 0) + 1 }).eq("code", c);

  return NextResponse.json({ ok: true, plan, trial_days: data.trial_days, expires_at: expires });
}

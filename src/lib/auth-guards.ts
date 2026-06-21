import "server-only";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan, studioTier, STUDIO_TIER_RANK } from "@/lib/plans";

/** Returns the current admin profile, or null if the caller is not an admin. */
export async function requireAdmin() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();

  if (!profile || profile.role !== "admin" || !profile.is_active) return null;
  return profile;
}

/**
 * Returns the studio context for the current user, or null if they may not use
 * the requested level of the studio module. For a STAFF login the returned
 * profile is the OWNER's profile (so every page scopes to the studio's data),
 * with extra fields:
 *   actingRole  : 'owner' | 'admin' | 'manager' | 'staff' | 'accountant'
 *   actingUserId: the logged-in user's own id
 *   isStaff     : true when logged in as a staff sub-account
 *   studioTier  : 'booking' | 'full' (the owner's effective access level)
 *
 * `minTier` is the access level a page requires:
 *   "booking" — đặt lịch / bảng giá / lịch chụp / khách hàng (Photographer + Studio)
 *   "full"    — hợp đồng / tài chính / đội ngũ (Studio only). Default.
 */
export async function requireStudio(minTier: "booking" | "full" = "full") {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data: me } = await supabase.from("profiles").select("*").eq("id", user.id).single();
  if (!me || !me.is_active) return null;

  // Staff sub-account: act on the owner's studio (inherits the owner's tier).
  if (me.studio_owner_id) {
    const { data: owner } = await supabase.from("profiles").select("*").eq("id", me.studio_owner_id).single();
    if (!owner || !owner.is_active) return null;
    const tier = studioTier(effectivePlan(owner.plan, owner.plan_expires_at), owner.role === "admin");
    if (STUDIO_TIER_RANK[tier] < STUDIO_TIER_RANK[minTier]) return null;
    return { ...owner, actingRole: me.studio_role || "staff", actingUserId: me.id, isStaff: true, studioTier: tier };
  }

  // Studio owner, photographer or admin.
  const tier = studioTier(effectivePlan(me.plan, me.plan_expires_at), me.role === "admin");
  if (STUDIO_TIER_RANK[tier] < STUDIO_TIER_RANK[minTier]) return null;
  return { ...me, actingRole: me.role === "admin" ? "admin" : "owner", actingUserId: me.id, isStaff: false, studioTier: tier };
}

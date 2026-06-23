import "server-only";
import { cache } from "react";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan, studioTier, STUDIO_TIER_RANK } from "@/lib/plans";

/**
 * Per-request cached auth lookups. React `cache()` dedupes by arguments within
 * a single server render pass, so middleware → layout → requireStudio() share
 * ONE `getUser()` round-trip and ONE `profiles` read per id, instead of the
 * 3× getUser + 2–3× profile queries we used to run on every navigation.
 */
export const getSessionUser = cache(async () => {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getProfileById = cache(async (id: string) => {
  const supabase = createClient();
  const { data } = await supabase.from("profiles").select("*").eq("id", id).single();
  return data;
});

/** Returns the current admin profile, or null if the caller is not an admin. */
export async function requireAdmin() {
  const user = await getSessionUser();
  if (!user) return null;

  const profile = await getProfileById(user.id);
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
  const user = await getSessionUser();
  if (!user) return null;

  const me = await getProfileById(user.id);
  if (!me || !me.is_active) return null;

  // Staff sub-account: act on the owner's studio (inherits the owner's tier).
  if (me.studio_owner_id) {
    const owner = await getProfileById(me.studio_owner_id);
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

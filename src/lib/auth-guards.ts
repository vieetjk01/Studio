import "server-only";
import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/plans";

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
 * Returns the current profile if it may use the studio module (admin, or an
 * active Studio plan), else null. Used to gate studio.vieetjk.com pages/APIs.
 */
export async function requireStudio() {
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

  if (!profile || !profile.is_active) return null;
  const ok =
    profile.role === "admin" ||
    effectivePlan(profile.plan, profile.plan_expires_at) === "studio";
  return ok ? profile : null;
}

import "server-only";
import { createClient } from "@/lib/supabase/server";

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

import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/plans";
import AlbumList from "../AlbumList";

// Album library reachable from the studio shell. Lives at its own path so it
// doesn't collide with the bare /dashboard → /dashboard/studio redirect (which
// makes the studio overview the home page on the main host).
export default async function AlbumsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: albums }, { data: profile }, { data: trialRed }] = await Promise.all([
    supabase.from("albums").select("id, slug, title, cover_url, status, watermark_enabled, download_enabled, photos(drive_file_id), selections(count)").eq("is_gallery", false).eq("owner_id", user?.id ?? "").order("updated_at", { ascending: false }),
    user ? supabase.from("profiles").select("plan, plan_expires_at, role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("discount_redemptions").select("id").eq("user_id", user.id).eq("code", "TRIAL_STUDIO_1D").maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const isAdmin = profile?.role === "admin";
  const showTrial = !isAdmin && (plan === "free" || plan === "basic");
  const trialUsed = !!trialRed;

  return <AlbumList albums={albums ?? []} showTrial={showTrial} trialUsed={trialUsed} />;
}

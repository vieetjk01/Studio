import { createClient } from "@/lib/supabase/server";
import { effectivePlan, planAllowsDelivery, planAllowsWatermark } from "@/lib/plans";
import { fetchAlbumRows } from "@/lib/album-rows";
import AlbumList from "../AlbumList";

// Album library reachable from the studio shell. Lives at its own path so it
// doesn't collide with the bare /dashboard → /dashboard/studio redirect (which
// makes the studio overview the home page on the main host).
export default async function AlbumsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [rows, { data: profile }] = await Promise.all([
    fetchAlbumRows(supabase, user?.id ?? ""),
    user ? supabase.from("profiles").select("plan, plan_expires_at, role, trial_used_at").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const isAdmin = profile?.role === "admin";
  const showTrial = !isAdmin && (plan === "free" || plan === "basic");
  const trialUsed = !!(profile as { trial_used_at?: string | null } | null)?.trial_used_at;

  return <AlbumList albums={rows} showTrial={showTrial} trialUsed={trialUsed} canDelivery={planAllowsDelivery(plan, isAdmin)} canWatermark={planAllowsWatermark(plan, isAdmin)} />;
}

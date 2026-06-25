import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/plans";
import AlbumList from "./AlbumList";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: albums }, { data: profile }, { data: trialRed }] = await Promise.all([
    supabase.from("albums").select("*, photos(drive_file_id), selections(count)").eq("is_gallery", false).order("updated_at", { ascending: false }),
    user ? supabase.from("profiles").select("plan, plan_expires_at, role").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
    user ? supabase.from("discount_redemptions").select("id").eq("user_id", user.id).eq("code", "TRIAL_STUDIO_1D").maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const isAdmin = profile?.role === "admin";
  // Show trial button for free/basic plans (photographer has it on studio page)
  const showTrial = !isAdmin && (plan === "free" || plan === "basic");
  const trialUsed = !!trialRed;

  return <AlbumList albums={albums ?? []} showTrial={showTrial} trialUsed={trialUsed} />;
}

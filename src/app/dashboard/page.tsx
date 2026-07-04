import { createClient } from "@/lib/supabase/server";
import { effectivePlan, planAllowsDelivery } from "@/lib/plans";
import AlbumList from "./AlbumList";

export default async function DashboardPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: albums }, { data: profile }] = await Promise.all([
    supabase.from("albums").select("id, slug, title, cover_url, status, watermark_enabled, download_enabled, phase, photos(drive_file_id), selections(count)").eq("is_gallery", false).eq("owner_id", user?.id ?? "").order("updated_at", { ascending: false }),
    user ? supabase.from("profiles").select("plan, plan_expires_at, role, trial_used_at").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const isAdmin = profile?.role === "admin";
  // Show trial button for free/basic plans (photographer has it on studio page)
  const showTrial = !isAdmin && (plan === "free" || plan === "basic");
  const trialUsed = !!(profile as { trial_used_at?: string | null } | null)?.trial_used_at;

  return <AlbumList albums={albums ?? []} showTrial={showTrial} trialUsed={trialUsed} canDelivery={planAllowsDelivery(plan, isAdmin)} />;
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SettingsPanel, { type Feedback } from "./SettingsPanel";
import type { SiteSettings, UpgradeRequest, DiscountCode } from "@/lib/types";

export default async function SettingsPage() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase.from("profiles").select("role").eq("id", user.id).single();
  if (me?.role !== "admin") redirect("/dashboard");

  const db = createAdminClient();
  // feedbacks table may not exist yet — catch the error so the page still loads.
  const [{ data: settings }, feedbackResult, { data: upgrades }, { data: codes }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("feedbacks").select("*").order("created_at", { ascending: false }).limit(100),
    db.from("upgrade_requests").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("discount_codes").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <SettingsPanel
      settings={settings as SiteSettings | null}
      feedbacks={(feedbackResult.data ?? []) as Feedback[]}
      upgrades={(upgrades ?? []) as UpgradeRequest[]}
      codes={(codes ?? []) as DiscountCode[]}
    />
  );
}

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import SettingsPanel from "./SettingsPanel";
import type { SiteSettings, Booking, UpgradeRequest, DiscountCode } from "@/lib/types";

export const dynamic = "force-dynamic";

export default async function SettingsPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login");

  const { data: me } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (me?.role !== "admin") redirect("/dashboard");

  const db = createAdminClient();
  const [{ data: settings }, { data: bookings }, { data: upgrades }, { data: codes }] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db.from("bookings").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("upgrade_requests").select("*").order("created_at", { ascending: false }).limit(50),
    db.from("discount_codes").select("*").order("created_at", { ascending: false }),
  ]);

  return (
    <SettingsPanel
      settings={settings as SiteSettings | null}
      bookings={(bookings ?? []) as Booking[]}
      upgrades={(upgrades ?? []) as UpgradeRequest[]}
      codes={(codes ?? []) as DiscountCode[]}
    />
  );
}

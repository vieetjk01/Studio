import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { mainUrl } from "@/lib/hosts";
import type { PricelistItem } from "@/lib/types";
import PricingManager from "./PricingManager";

export const dynamic = "force-dynamic";

export default async function PricingPage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();

  // Reuse the public studio token (shared with the booking link).
  let token = profile.booking_token as string | null;
  if (!token && profile.actingRole !== "staff") {
    token = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");
    await supabase.from("profiles").update({ booking_token: token }).eq("id", profile.id);
  }

  const { data } = await supabase
    .from("studio_pricelist")
    .select("*")
    .eq("owner_id", profile.id)
    .order("position");

  return (
    <PricingManager
      ownerId={profile.id}
      initial={(data ?? []) as PricelistItem[]}
      shareUrl={token ? mainUrl(`/gia/${token}`) : ""}
      contact={{
        pl_phone: profile.pl_phone ?? "",
        pl_facebook: profile.pl_facebook ?? "",
        pl_bank_holder: profile.pl_bank_holder ?? "",
        pl_bank_account: profile.pl_bank_account ?? "",
        pl_bank_name: profile.pl_bank_name ?? "",
      }}
    />
  );
}

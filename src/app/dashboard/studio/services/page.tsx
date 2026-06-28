import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type { StudioService } from "@/lib/types";
import ServicesManager from "./ServicesManager";

export default async function ServicesPage() {
  const profile = await requireStudio("booking");
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Photographer trở lên</h1>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Nâng cấp gói</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("studio_services")
    .select("*")
    .eq("owner_id", profile.id)
    .order("position", { ascending: true })
    .order("created_at", { ascending: true });

  return <ServicesManager ownerId={profile.id} initial={(data ?? []) as StudioService[]} />;
}

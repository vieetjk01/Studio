import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { STUDIO_TIER_RANK, type StudioTier } from "@/lib/plans";
import type { StudioService } from "@/lib/types";
import ServicesTemplatesTabs from "./ServicesTemplatesTabs";
import type { TemplateWithItems } from "../templates/TemplatesManager";

export default async function ServicesPage({ searchParams }: { searchParams?: { tab?: string } }) {
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

  const canUseTemplates = STUDIO_TIER_RANK[profile.studioTier as StudioTier] >= STUDIO_TIER_RANK.plus;

  const supabase = createClient();
  const [{ data: services }, { data: templates }] = await Promise.all([
    supabase
      .from("studio_services")
      .select("*")
      .eq("owner_id", profile.id)
      .order("position", { ascending: true })
      .order("created_at", { ascending: true }),
    canUseTemplates
      ? supabase
          .from("contract_templates")
          .select("*, contract_template_items(*)")
          .eq("owner_id", profile.id)
          .order("created_at", { ascending: false })
      : Promise.resolve({ data: [] }),
  ]);

  const initialTab = searchParams?.tab === "templates" ? "templates" : "services";

  return (
    <ServicesTemplatesTabs
      ownerId={profile.id}
      services={(services ?? []) as StudioService[]}
      templates={(templates ?? []) as unknown as TemplateWithItems[]}
      canUseTemplates={canUseTemplates}
      initialTab={initialTab}
    />
  );
}

import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type { StudioCrew } from "@/lib/types";
import CrewManager from "./CrewManager";

export const dynamic = "force-dynamic";

export default async function CrewPage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Tính năng này chỉ dành cho tài khoản gói Studio.
          </p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("studio_crew")
    .select("*")
    .eq("owner_id", profile.id)
    .order("name");

  return <CrewManager ownerId={profile.id} initial={(data ?? []) as StudioCrew[]} />;
}

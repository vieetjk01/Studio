import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { mainUrl } from "@/lib/hosts";
import type { StudioCrew } from "@/lib/types";
import CrewManager from "./CrewManager";


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
  // Link đăng ký riêng của studio (/crew/<crew_token>) — cấp một lần rồi dùng mãi.
  let crewToken = profile.crew_token as string | null;
  if (!crewToken && profile.actingRole !== "staff") {
    crewToken = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");
    await supabase.from("profiles").update({ crew_token: crewToken }).eq("id", profile.id);
  }

  const [{ data }, { data: assignments }] = await Promise.all([
    supabase.from("studio_crew").select("*").eq("owner_id", profile.id).order("name"),
    supabase
      .from("contract_crew")
      .select("phone, status, contract:studio_contracts!inner(owner_id)")
      .eq("contract.owner_id", profile.id)
      .not("phone", "is", null),
  ]);

  // Reliability stats per phone (across all of this studio's contracts).
  const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");
  const stats: Record<string, { total: number; accepted: number; declined: number }> = {};
  for (const a of (assignments ?? []) as Array<{ phone: string | null; status: string }>) {
    const p = digits(a.phone);
    if (!p) continue;
    if (!stats[p]) stats[p] = { total: 0, accepted: 0, declined: 0 };
    stats[p].total += 1;
    if (a.status === "accepted") stats[p].accepted += 1;
    else if (a.status === "declined") stats[p].declined += 1;
  }

  return (
    <CrewManager
      ownerId={profile.id}
      initial={(data ?? []) as StudioCrew[]}
      stats={stats}
      registerUrl={crewToken ? mainUrl(`/crew/${crewToken}`) : ""}
    />
  );
}

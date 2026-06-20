import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import TeamCalendar, { type TeamAssignment } from "./TeamCalendar";

export const dynamic = "force-dynamic";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

export default async function TeamPage() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Tính năng này chỉ dành cho tài khoản gói Studio.</p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const [{ data: crewRows }, { data: roster }] = await Promise.all([
    supabase
      .from("contract_crew")
      .select("name, phone, role, status, contract:studio_contracts!inner(id, owner_id, title, event_date, status)")
      .eq("contract.owner_id", profile.id)
      .not("contract.event_date", "is", null),
    supabase.from("studio_crew").select("name, phone").eq("owner_id", profile.id),
  ]);

  type Row = {
    name: string | null;
    phone: string | null;
    role: TeamAssignment["role"];
    status: TeamAssignment["status"];
    contract: { id: string; title: string; event_date: string | null; status: string } | null;
  };

  const assignments: TeamAssignment[] = ((crewRows ?? []) as unknown as Row[])
    .filter((r) => r.contract?.event_date && r.contract.status !== "cancelled")
    .map((r) => ({
      name: r.name || r.phone || "—",
      phone: r.phone,
      role: r.role,
      status: r.status,
      date: r.contract!.event_date as string,
      contractId: r.contract!.id,
      contractTitle: r.contract!.title,
    }));

  // Busy days for the team (match crew_unavailable by digit phone to the roster).
  const nameByDigits: Record<string, string> = {};
  for (const r of (roster ?? []) as Array<{ name: string | null; phone: string | null }>) {
    const p = digits(r.phone);
    if (p) nameByDigits[p] = r.name || r.phone || p;
  }
  const phones = Object.keys(nameByDigits);
  const busyByDate: Record<string, string[]> = {};
  if (phones.length) {
    const { data: busy } = await supabase.from("crew_unavailable").select("phone, date").in("phone", phones);
    for (const b of (busy ?? []) as Array<{ phone: string; date: string }>) {
      const name = nameByDigits[digits(b.phone)] || b.phone;
      (busyByDate[b.date] ||= []).push(name);
    }
  }

  return <TeamCalendar assignments={assignments} busyByDate={busyByDate} />;
}

import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type { StudioEvent } from "@/lib/types";
import CalendarView, { type ContractMarker } from "./CalendarView";

export const dynamic = "force-dynamic";

export default async function CalendarPage() {
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
  const [{ data: events }, { data: contracts }] = await Promise.all([
    supabase.from("studio_events").select("*").eq("owner_id", profile.id).order("event_date"),
    supabase
      .from("studio_contracts")
      .select("id, title, client_name, event_date, event_time, status")
      .eq("owner_id", profile.id)
      .not("event_date", "is", null)
      .neq("status", "cancelled"),
  ]);

  return (
    <CalendarView
      ownerId={profile.id}
      initialEvents={(events ?? []) as StudioEvent[]}
      contracts={(contracts ?? []) as ContractMarker[]}
    />
  );
}

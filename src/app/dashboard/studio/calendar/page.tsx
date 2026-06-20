import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { mainUrl } from "@/lib/hosts";
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
    (profile.actingRole === "staff"
      ? supabase.from("studio_contracts").select("id, title, client_name, client_phone, location, event_date, event_time, status").eq("owner_id", profile.id).eq("assigned_to", profile.actingUserId)
      : supabase.from("studio_contracts").select("id, title, client_name, client_phone, location, event_date, event_time, status").eq("owner_id", profile.id)
    )
      .not("event_date", "is", null)
      .neq("status", "cancelled"),
  ]);

  // Read-only calendar feed (owner sets it once; staff just see the URL).
  let calToken = profile.calendar_token as string | null;
  if (!calToken && profile.actingRole !== "staff") {
    calToken = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");
    await supabase.from("profiles").update({ calendar_token: calToken }).eq("id", profile.id);
  }
  const feedUrl = calToken ? mainUrl(`/api/calendar/${calToken}`) : "";

  return (
    <CalendarView
      ownerId={profile.id}
      initialEvents={(events ?? []) as StudioEvent[]}
      contracts={(contracts ?? []) as ContractMarker[]}
      feedUrl={feedUrl}
    />
  );
}

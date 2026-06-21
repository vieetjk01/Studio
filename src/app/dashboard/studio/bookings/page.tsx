import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import type { StudioBooking } from "@/lib/types";
import BookingsView from "./BookingsView";

export const dynamic = "force-dynamic";

export default async function BookingsPage() {
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

  // Ensure the studio has a public booking token.
  let token = profile.booking_token as string | null;
  if (!token) {
    token = (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2)).replace(/-/g, "");
    await supabase.from("profiles").update({ booking_token: token }).eq("id", profile.id);
  }

  const { data } = await supabase
    .from("studio_bookings")
    .select("*")
    .eq("owner_id", profile.id)
    .neq("status", "archived")
    .order("created_at", { ascending: false });

  return <BookingsView ownerId={profile.id} token={token} initial={(data ?? []) as StudioBooking[]} />;
}

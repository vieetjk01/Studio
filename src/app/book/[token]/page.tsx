import { createAdminClient } from "@/lib/supabase/admin";
import BookingForm from "./BookingForm";

export const dynamic = "force-dynamic";

export default async function BookingPage({ params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: owner } = await db
    .from("profiles")
    .select("full_name")
    .eq("booking_token", params.token)
    .maybeSingle();

  if (!owner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Không tìm thấy</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Link đặt lịch không hợp lệ.</p>
        </div>
      </div>
    );
  }

  return <BookingForm token={params.token} studioName={owner.full_name || "Studio"} />;
}

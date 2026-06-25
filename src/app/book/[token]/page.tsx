import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { PRICE_LISTS } from "@/lib/pricelist-seeds";
import BookingForm, { type PkgOption } from "./BookingForm";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { token: string } }): Promise<Metadata> {
  const db = createAdminClient();
  const { data: owner } = await db
    .from("profiles")
    .select("full_name")
    .eq("booking_token", params.token)
    .maybeSingle();
  const studioName = owner?.full_name || "Studio";
  const title = `Đặt lịch · ${studioName}`;
  const description = `Đặt lịch chụp ảnh với ${studioName} — nhanh chóng, tiện lợi.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website" },
    twitter: { card: "summary", title, description },
  };
}

export default async function BookingPage({ params, searchParams }: { params: { token: string }; searchParams?: { pkg?: string } }) {
  const db = createAdminClient();
  const { data: owner } = await db
    .from("profiles")
    .select("id, full_name")
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

  const { data: pl } = await db
    .from("studio_pricelist")
    .select("id, list_key, name, price, category")
    .eq("owner_id", owner.id)
    .eq("active", true)
    .gt("price", 0)
    .order("position");

  const label = (k: string) => PRICE_LISTS.find((l) => l.key === k)?.label || "";
  const packages: PkgOption[] = (pl ?? []).map((p) => ({
    name: `${label(p.list_key as string) ? label(p.list_key as string) + " · " : ""}${p.name}`,
    price: (p.price as number) || 0,
  }));

  return (
    <BookingForm
      token={params.token}
      studioName={owner.full_name || "Studio"}
      packages={packages}
      presetPackage={searchParams?.pkg || ""}
    />
  );
}

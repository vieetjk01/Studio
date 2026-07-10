import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WeddingConfig, WeddingInvitation } from "@/lib/types";
import WeddingRenderer, { type Wish } from "./WeddingRenderer";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<WeddingInvitation | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("wedding_invitations")
    .select("id, owner_id, contract_id, slug, edit_token, template, config, published, created_at, updated_at")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (!data) return null;
  return data as WeddingInvitation;
}

/** Tên khách mời từ query (?guest=…) — cắt gọn, chống rỗng. */
function readGuest(sp?: { [k: string]: string | string[] | undefined }): string {
  const raw = sp?.guest ?? sp?.g;
  const v = Array.isArray(raw) ? raw[0] : raw;
  return (v ?? "").toString().trim().slice(0, 80);
}

export async function generateMetadata({ params, searchParams }: { params: { slug: string }; searchParams?: { [k: string]: string | string[] | undefined } }): Promise<Metadata> {
  const inv = await load(params.slug);
  if (!inv) return { title: "Không tìm thấy thiệp cưới" };
  const c = inv.config as WeddingConfig;
  const couple = [c.groom_name, c.bride_name].filter(Boolean).join(" ❤ ") || "Thiệp cưới";
  const guest = readGuest(searchParams);
  const title = `Thiệp cưới · ${couple}`;
  const description = guest
    ? `Trân trọng kính mời ${guest} đến chung vui cùng ${couple}.`
    : c.cover_quote || `Trân trọng kính mời bạn đến chung vui cùng ${couple}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: c.cover_url ? [c.cover_url] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WeddingInvitationPage({ params, searchParams }: { params: { slug: string }; searchParams?: { [k: string]: string | string[] | undefined } }) {
  const inv = await load(params.slug);
  if (!inv) notFound();
  const guest = readGuest(searchParams);

  // Draft (not published yet): show a clear notice instead of bouncing home, so
  // the studio/couple immediately knows they just need to hit "Xuất bản".
  if (!inv.published) {
    return (
      <main className="grid min-h-screen place-items-center px-6 text-center" style={{ background: "#fbf7f2", color: "#3a3530", fontFamily: "var(--font-cormorant)" }}>
        <div className="max-w-md">
          <h1 className="font-serif text-3xl" style={{ color: "#b08968" }}>Thiệp chưa được xuất bản</h1>
          <p className="mx-auto mt-4 text-base" style={{ color: "rgba(58,53,48,0.62)" }}>
            Thiệp này đang ở chế độ nháp. Hãy mở trình chỉnh sửa và bấm <b>“Xuất bản thiệp”</b> để khách có thể xem.
          </p>
        </div>
      </main>
    );
  }

  // Guestbook = well-wishes left through the RSVP form.
  const db = createAdminClient();
  const { data: wishRows } = await db
    .from("wedding_rsvps")
    .select("guest_name, wish, created_at")
    .eq("invitation_id", inv.id)
    .not("wish", "is", null)
    .order("created_at", { ascending: false })
    .limit(100);
  const wishes = ((wishRows ?? []) as Wish[]).filter((w) => w.wish && w.guest_name);

  return <WeddingRenderer inv={inv} wishes={wishes} guest={guest} />;
}

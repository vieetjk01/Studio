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
  if (!data || !data.published) return null;
  return data as WeddingInvitation;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const inv = await load(params.slug);
  if (!inv) return { title: "Không tìm thấy thiệp cưới" };
  const c = inv.config as WeddingConfig;
  const couple = [c.groom_name, c.bride_name].filter(Boolean).join(" ❤ ") || "Thiệp cưới";
  const title = `Thiệp cưới · ${couple}`;
  const description = c.cover_quote || `Trân trọng kính mời bạn đến chung vui cùng ${couple}.`;
  return {
    title,
    description,
    openGraph: { title, description, type: "website", images: c.cover_url ? [c.cover_url] : undefined },
    twitter: { card: "summary_large_image", title, description },
  };
}

export default async function WeddingInvitationPage({ params }: { params: { slug: string } }) {
  const inv = await load(params.slug);
  if (!inv) notFound();

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

  return <WeddingRenderer inv={inv} wishes={wishes} />;
}

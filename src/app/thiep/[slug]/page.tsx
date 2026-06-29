import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import type { WeddingConfig, WeddingInvitation } from "@/lib/types";
import WeddingClassic from "./WeddingClassic";

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
  return <WeddingClassic inv={inv} />;
}

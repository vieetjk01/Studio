import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import SiteRenderer, { type SiteData } from "./SiteRenderer";
import type { Site, SiteBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

async function loadSite(subdomain: string): Promise<SiteData | null> {
  const db = createAdminClient();
  const { data: site } = await db.from("sites").select("*").eq("subdomain", subdomain.toLowerCase()).maybeSingle();
  if (!site || !site.published) return null;

  const ownerId = (site as Site).owner_id;
  const [{ data: owner }, { data: blocks }, { data: albums }, { data: pricelist }] = await Promise.all([
    db.from("profiles").select("full_name, pl_phone, pl_facebook, booking_token").eq("id", ownerId).maybeSingle(),
    db.from("site_blocks").select("*").eq("site_id", (site as Site).id).eq("visible", true).order("position"),
    db.from("albums").select("id, slug, title, cover_url").eq("owner_id", ownerId).eq("status", "published").order("created_at", { ascending: false }).limit(24),
    db.from("studio_pricelist").select("id, name, price, unit, category, description").eq("owner_id", ownerId).eq("active", true).gt("price", 0).order("position"),
  ]);

  const albumList = (albums ?? []) as SiteData["albums"];
  let feedback: SiteData["feedback"] = [];
  if (albumList.length) {
    const { data: fb } = await db
      .from("feedback")
      .select("id, client_name, rating, content")
      .in("album_id", albumList.map((a) => a.id))
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(12);
    feedback = (fb ?? []) as SiteData["feedback"];
  }

  return {
    site: site as Site,
    blocks: (blocks ?? []) as SiteBlock[],
    owner: (owner ?? null) as SiteData["owner"],
    albums: albumList,
    pricelist: (pricelist ?? []) as SiteData["pricelist"],
    feedback,
  };
}

export async function generateMetadata({ params }: { params: { subdomain: string } }): Promise<Metadata> {
  const data = await loadSite(params.subdomain);
  if (!data) return { title: "Không tìm thấy trang" };
  const name = data.owner?.full_name || data.site.subdomain || "Portfolio";
  const title = data.site.seo?.title || name;
  const description = data.site.seo?.description || `Portfolio của ${name}`;
  return {
    title,
    description,
    openGraph: { title, description, images: data.site.seo?.og_image ? [data.site.seo.og_image] : undefined },
  };
}

export default async function SitePage({ params }: { params: { subdomain: string } }) {
  const data = await loadSite(params.subdomain);
  if (!data) notFound();
  return <SiteRenderer data={data} />;
}

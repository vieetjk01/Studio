import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBundle, type SiteData } from "@/lib/site-loader";
import SiteRenderer from "@/components/SiteRenderer";
import type { Site } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(subdomain: string): Promise<SiteData | null> {
  const db = createAdminClient();
  const { data: site } = await db.from("sites").select("*").eq("subdomain", subdomain.toLowerCase()).maybeSingle();
  if (!site || !site.published) return null;
  return loadSiteBundle(db, site as Site, true);
}

export async function generateMetadata({ params }: { params: { subdomain: string } }): Promise<Metadata> {
  const data = await load(params.subdomain);
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
  const data = await load(params.subdomain);
  if (!data) notFound();
  return <SiteRenderer data={data} />;
}

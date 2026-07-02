import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBundle, type SiteData } from "@/lib/site-loader";
import SiteRenderer from "@/components/SiteRenderer";
import type { Site } from "@/lib/types";

export const dynamic = "force-dynamic";

async function load(key: string): Promise<SiteData | null> {
  const db = createAdminClient();
  const k = key.toLowerCase();
  // The middleware routes both <sub>.mstudo.com → /site/<sub> and a custom
  // domain → /site/<domain>. Resolve by subdomain first, then by a verified
  // custom domain (which contains a dot).
  let site: Site | null = null;
  if (k.includes(".")) {
    const { data } = await db.from("sites").select("*").eq("custom_domain", k).eq("custom_domain_verified", true).maybeSingle();
    site = (data as Site) ?? null;
  }
  if (!site) {
    const { data } = await db.from("sites").select("*").eq("subdomain", k).maybeSingle();
    site = (data as Site) ?? null;
  }
  if (!site || !site.published) return null;
  return loadSiteBundle(db, site, true);
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

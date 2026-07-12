import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBundle, type SiteData } from "@/lib/site-loader";
import SiteRenderer from "@/components/SiteRenderer";
import type { Site } from "@/lib/types";
import { BRAND, getService } from "@/lib/vieetjk/content";
import { loadVieetjkData, bookingHref } from "@/lib/vieetjk/data";
import VieetjkChrome from "@/components/vieetjk/VieetjkChrome";
import VieetjkHome from "@/components/vieetjk/VieetjkHome";
import VieetjkService from "@/components/vieetjk/VieetjkService";

export const dynamic = "force-dynamic";

type Params = { subdomain: string; path?: string[] };

/** Đây có phải trang vieetjk (theo domain/subdomain hoặc template)? */
function isVieetjkKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === BRAND.domain || k === "vieetjk" || k === `www.${BRAND.domain}`;
}

async function siteHasVieetjkTemplate(key: string): Promise<boolean> {
  const db = createAdminClient();
  const k = key.toLowerCase();
  const col = k.includes(".") ? "custom_domain" : "subdomain";
  const { data } = await db.from("sites").select("template").eq(col, k).maybeSingle();
  return (data?.template as string | undefined) === "vieetjk";
}

async function loadTenant(key: string): Promise<SiteData | null> {
  const db = createAdminClient();
  const k = key.toLowerCase();
  let site: Site | null = null;
  if (k.includes(".")) {
    const { data } = await db
      .from("sites")
      .select("*")
      .eq("custom_domain", k)
      .eq("custom_domain_verified", true)
      .maybeSingle();
    site = (data as Site) ?? null;
  }
  if (!site) {
    const { data } = await db.from("sites").select("*").eq("subdomain", k).maybeSingle();
    site = (data as Site) ?? null;
  }
  if (!site || !site.published) return null;
  return loadSiteBundle(db, site, true);
}

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const key = params.subdomain;
  if (isVieetjkKey(key) || (await siteHasVieetjkTemplate(key))) {
    const svc = params.path?.length ? getService(params.path[0]) : null;
    const title = svc ? `${svc.title} · ${BRAND.name}` : `${BRAND.name} — ${BRAND.tagline}`;
    const description = svc ? svc.intro : BRAND.heroSub;
    return { title, description, openGraph: { title, description, type: "website" } };
  }
  const data = await loadTenant(key);
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

export default async function SitePage({ params }: { params: Params }) {
  const key = params.subdomain;
  const path = params.path ?? [];

  // ── Trang riêng của vieetjk (thiết kế code tay, không dùng builder) ──────
  const vieetjk = isVieetjkKey(key) || (await siteHasVieetjkTemplate(key));
  if (vieetjk) {
    const data = await loadVieetjkData();
    const href = bookingHref(data.bookingToken);

    if (path.length === 0) {
      return (
        <VieetjkChrome bookingHref={href} active="">
          <VieetjkHome data={data} />
        </VieetjkChrome>
      );
    }
    const svc = getService(path[0]);
    if (svc && path.length === 1) {
      return (
        <VieetjkChrome bookingHref={href} active={svc.slug}>
          <VieetjkService service={svc} data={data} />
        </VieetjkChrome>
      );
    }
    notFound();
  }

  // ── Tenant site thông thường (builder → SiteRenderer). ──────────────────
  if (path.length > 0) notFound(); // các site builder chỉ có 1 trang gốc
  const data = await loadTenant(key);
  if (!data) notFound();
  return <SiteRenderer data={data} />;
}

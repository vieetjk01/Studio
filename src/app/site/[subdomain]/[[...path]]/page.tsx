import { cache } from "react";
import { notFound } from "next/navigation";
import { cookies } from "next/headers";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { loadSiteBundle, type SiteData } from "@/lib/site-loader";
import SiteRenderer from "@/components/SiteRenderer";
import type { Site } from "@/lib/types";
import { BRAND, getService, tr, type Lang } from "@/lib/vieetjk/content";
import { loadVieetjkData } from "@/lib/vieetjk/data";
import VieetjkChrome from "@/components/vieetjk/VieetjkChrome";
import VieetjkHome from "@/components/vieetjk/VieetjkHome";
import VieetjkService from "@/components/vieetjk/VieetjkService";

export const dynamic = "force-dynamic";

type Params = { subdomain: string; path?: string[] };

/** Ngôn ngữ hiện tại từ cookie (mặc định tiếng Việt). */
function currentLang(): Lang {
  return cookies().get("vjk_lang")?.value === "en" ? "en" : "vi";
}

/** Giao diện hiện tại từ cookie (mặc định tối). */
function currentTheme(): "dark" | "light" {
  return cookies().get("vjk_theme")?.value === "light" ? "light" : "dark";
}

/** Đây có phải trang vieetjk (theo domain/subdomain hoặc template)? */
function isVieetjkKey(key: string): boolean {
  const k = key.toLowerCase();
  return k === BRAND.domain || k === "vieetjk" || k === `www.${BRAND.domain}`;
}

// cache(): generateMetadata VÀ SitePage cùng gọi các hàm này trong một request —
// dedupe để mỗi trang chỉ query bảng `sites` một lần thay vì 3-4 lần.
const siteHasVieetjkTemplate = cache(async (key: string): Promise<boolean> => {
  const db = createAdminClient();
  const k = key.toLowerCase();
  const col = k.includes(".") ? "custom_domain" : "subdomain";
  const { data } = await db.from("sites").select("template").eq(col, k).maybeSingle();
  return (data?.template as string | undefined) === "vieetjk";
});

const loadTenant = cache(async (key: string): Promise<SiteData | null> => {
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
});

export async function generateMetadata({ params }: { params: Params }): Promise<Metadata> {
  const key = params.subdomain;
  if (isVieetjkKey(key) || (await siteHasVieetjkTemplate(key))) {
    const lang = currentLang();
    const svc = params.path?.length ? getService(params.path[0]) : null;
    const title = svc ? `${tr(lang, svc.title)} · ${BRAND.name}` : `${BRAND.name} — ${tr(lang, BRAND.tagline)}`;
    const description = svc ? tr(lang, svc.intro) : tr(lang, BRAND.heroSub);
    return { title, description, openGraph: { title, description, type: "website" } };
  }
  const data = await loadTenant(key);
  if (!data) return { title: "Không tìm thấy trang" };
  const name = data.owner?.full_name || data.site.subdomain || "Portfolio";
  const title = data.site.seo?.title || name;
  const description = data.site.seo?.description || `Portfolio của ${name}`;
  // Ảnh chia sẻ: ảnh studio tự đặt → ảnh bìa của khối hero → không có.
  const heroImage = data.blocks.find((b) => b.type === "hero" && typeof b.config?.image === "string" && b.config.image)?.config
    ?.image as string | undefined;
  const image = data.site.seo?.og_image || heroImage;
  const canonical = `https://${data.site.custom_domain_verified && data.site.custom_domain ? data.site.custom_domain : key}`;
  const logo = (data.site.theme || {}).logo;
  return {
    title,
    description,
    alternates: { canonical },
    // Trang chỉ tồn tại khi đã xuất bản (loadTenant trả null nếu chưa), nên cho
    // Google lập chỉ mục bình thường.
    robots: { index: true, follow: true },
    icons: logo ? { icon: logo } : undefined,
    openGraph: {
      type: "website",
      title,
      description,
      url: canonical,
      siteName: name,
      locale: "vi_VN",
      images: image ? [image] : undefined,
    },
    twitter: { card: image ? "summary_large_image" : "summary", title, description, images: image ? [image] : undefined },
  };
}

export default async function SitePage({ params }: { params: Params }) {
  const key = params.subdomain;
  const path = params.path ?? [];

  // ── Trang riêng của vieetjk (thiết kế code tay, không dùng builder) ──────
  const vieetjk = isVieetjkKey(key) || (await siteHasVieetjkTemplate(key));
  if (vieetjk) {
    const lang = currentLang();
    const theme = currentTheme();
    const data = await loadVieetjkData();

    if (path.length === 0) {
      return (
        <VieetjkChrome bookingToken={data.bookingToken} logoUrl={data.logoUrl} active="" lang={lang} theme={theme}>
          <VieetjkHome data={data} lang={lang} />
        </VieetjkChrome>
      );
    }
    const svc = getService(path[0]);
    if (svc && path.length === 1) {
      return (
        <VieetjkChrome bookingToken={data.bookingToken} logoUrl={data.logoUrl} active={svc.slug} lang={lang} theme={theme}>
          <VieetjkService service={svc} data={data} lang={lang} />
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

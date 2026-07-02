import "server-only";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

/**
 * Display name of the studio that owns an album — used to personalise the share
 * title. Prefers the owner's own profile name so a shared album shows the
 * creator's studio, not whichever account happens to power the global site.
 * Falls back to the global site title only when the owner has no name set.
 */
export async function albumOwnerName(ownerId?: string | null): Promise<string> {
  const db = createAdminClient();
  try {
    if (ownerId) {
      const { data } = await db
        .from("profiles")
        .select("full_name, studio_brand_name")
        .eq("id", ownerId)
        .maybeSingle();
      const name = (data?.studio_brand_name || data?.full_name)?.trim();
      if (name) return name;
    }
    const { data: site } = await db
      .from("site_settings")
      .select("site_title, profile_name")
      .eq("id", 1)
      .maybeSingle();
    return site?.site_title || site?.profile_name || "mstudo";
  } catch {
    return "mstudo";
  }
}

/**
 * Build share-friendly metadata (Open Graph + Twitter card) for a public album
 * or gallery. The card title is personalised with the studio name and the
 * thumbnail uses the album cover so links look good on Messenger / Zalo / FB.
 *
 * `host` is the public host the page is served from (e.g. album.mstudo.com),
 * used to make the cover URL absolute so crawlers can fetch it.
 */
export async function buildAlbumMetadata({
  title,
  description,
  coverUrl,
  host,
  path,
  ownerId,
}: {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  host: string;
  path: string;
  ownerId?: string | null;
}): Promise<Metadata> {
  const studio = await albumOwnerName(ownerId);
  const fullTitle = `${title} · ${studio}`;

  // Studio's own logo as the browser-tab favicon (white-label).
  let logoUrl: string | null = null;
  if (ownerId) {
    try {
      const db = createAdminClient();
      const { data } = await db.from("profiles").select("studio_logo_url, pl_logo_url").eq("id", ownerId).maybeSingle();
      logoUrl = data?.studio_logo_url || data?.pl_logo_url || null;
    } catch { /* keep default favicon */ }
  }
  const desc =
    description?.trim() ||
    `Album ảnh từ ${studio}. Xem, chọn và tải những khung hình bạn yêu thích.`;

  const base = host ? `https://${host}` : "";
  const images = coverUrl
    ? [{ url: coverUrl.startsWith("http") ? coverUrl : `${base}${coverUrl}`, alt: title }]
    : undefined;
  const pageUrl = base ? `${base}${path}` : undefined;

  return {
    title: fullTitle,
    description: desc,
    ...(logoUrl ? { icons: { icon: logoUrl, shortcut: logoUrl, apple: logoUrl } } : {}),
    openGraph: {
      type: "website",
      title: fullTitle,
      description: desc,
      siteName: studio,
      ...(pageUrl ? { url: pageUrl } : {}),
      ...(images ? { images } : {}),
    },
    twitter: {
      card: images ? "summary_large_image" : "summary",
      title: fullTitle,
      description: desc,
      ...(images ? { images: images.map((i) => i.url) } : {}),
    },
  };
}

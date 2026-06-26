import "server-only";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";

/** The studio's display name, used to personalise album share titles. */
export async function studioName(): Promise<string> {
  try {
    const db = createAdminClient();
    const { data } = await db
      .from("site_settings")
      .select("site_title, profile_name")
      .eq("id", 1)
      .maybeSingle();
    return data?.site_title || data?.profile_name || "Vieetjk";
  } catch {
    return "Vieetjk";
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
}: {
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  host: string;
  path: string;
}): Promise<Metadata> {
  const studio = await studioName();
  const fullTitle = `${title} · ${studio}`;
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

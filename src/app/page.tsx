import { createAdminClient } from "@/lib/supabase/admin";
import ProfileHome from "./ProfileHome";
import type { SiteSettings } from "@/lib/types";

export const dynamic = "force-dynamic";

const DEFAULT_SETTINGS: SiteSettings = {
  id: 1,
  profile_name: "Vieetjk",
  profile_role: "Nhiếp ảnh gia cưới & chân dung · Studio",
  profile_location: "Hà Nội · Việt Nam",
  profile_bio:
    "Mình là Vieetjk — kể chuyện qua từng khung hình cưới và chân dung. Mỗi buổi chụp được lưu thành một album riêng, nơi bạn thong thả xem lại, đánh dấu những tấm ưng ý nhất.",
  profile_avatar_url: null,
  profile_cover_url: null,
  stat_years: 8,
  contact_phone: "0987 654 321",
  contact_email: "hello@vieetjk.studio",
  contact_instagram: "@vieetjk.studio",
  contact_address: "12 Nhà Thờ, Hoàn Kiếm, Hà Nội",
  contact_hours: "Thứ 2 – Chủ nhật · 8:00–20:00",
  updated_at: new Date().toISOString(),
};

export default async function HomePage() {
  const db = createAdminClient();

  const [settingsRes, showcaseRes, albumCountRes, photoCountRes] = await Promise.all([
    db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
    db
      .from("albums")
      .select("id, slug, title, kind, cover_url, is_pinned, photos(count)")
      .eq("status", "published")
      .eq("is_showcase", true)
      .order("is_pinned", { ascending: false })
      .order("updated_at", { ascending: false }),
    db.from("albums").select("id", { count: "exact", head: true }).eq("status", "published"),
    db.from("photos").select("id", { count: "exact", head: true }),
  ]);

  const settings = (settingsRes.data as SiteSettings | null) ?? DEFAULT_SETTINGS;

  const showcase = (showcaseRes.data ?? []).map((a) => ({
    slug: a.slug,
    title: a.title,
    kind: (a.kind as string | null) ?? "Album",
    cover_url: a.cover_url as string | null,
    pinned: a.is_pinned as boolean,
    count: (a.photos as { count: number }[] | null)?.[0]?.count ?? 0,
  }));

  // Featured photos: a handful from the showcase albums.
  let featured: { fileId: string; slug: string }[] = [];
  if (showcase.length > 0) {
    const slugs = showcase.map((s) => s.slug);
    const { data: ids } = await db
      .from("albums")
      .select("id, slug")
      .in("slug", slugs);
    const idToSlug = new Map((ids ?? []).map((r) => [r.id, r.slug]));
    const { data: photos } = await db
      .from("photos")
      .select("drive_file_id, album_id, position")
      .in("album_id", [...idToSlug.keys()])
      .order("position")
      .limit(12);
    featured = (photos ?? []).map((p) => ({
      fileId: p.drive_file_id,
      slug: idToSlug.get(p.album_id) ?? "",
    }));
  }

  return (
    <ProfileHome
      settings={settings}
      showcase={showcase}
      featured={featured}
      stats={{
        albums: albumCountRes.count ?? 0,
        photos: photoCountRes.count ?? 0,
        years: settings.stat_years,
      }}
    />
  );
}

import { createAdminClient } from "@/lib/supabase/admin";
import { thumbnailUrl } from "@/lib/drive";
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
  contact_facebook: null,
  contact_tiktok: null,
  contact_youtube: null,
  contact_address: "12 Nhà Thờ, Hoàn Kiếm, Hà Nội",
  contact_hours: "Thứ 2 – Chủ nhật · 8:00–20:00",
  featured_images: [],
  basic_discount_percent: 0,
  price_basic_month: 50000,
  price_basic_year: 500000,
  price_studio_month: 300000,
  price_studio_year: 3000000,
  studio_promo_percent: 50,
  updated_at: new Date().toISOString(),
};

export default async function HomePage() {
  let settings: SiteSettings = DEFAULT_SETTINGS;
  let albumCount = 0;
  let photoCount = 0;
  type GalleryCard = { slug: string; title: string; cover_url: string | null; event_date: string | null };
  let pinnedPhotoGalleries: GalleryCard[] = [];
  let pinnedVideoGalleries: GalleryCard[] = [];
  let feedback: { id: string; client_name: string | null; rating: number | null; content: string }[] = [];

  // The homepage must never 500 just because Supabase isn't configured/seeded
  // yet — degrade gracefully to defaults if anything goes wrong.
  try {
    const db = createAdminClient();

    const [settingsRes, albumCountRes, photoCountRes, galRes, fbRes] = await Promise.all([
      db.from("site_settings").select("*").eq("id", 1).maybeSingle(),
      db.from("albums").select("id", { count: "exact", head: true }).eq("status", "published"),
      db.from("photos").select("id", { count: "exact", head: true }),
      db
        .from("albums")
        .select("slug, title, cover_url, event_date, category, photos(drive_file_id)")
        .eq("is_gallery", true)
        .eq("status", "published")
        .eq("gallery_pinned", true)
        .order("event_date", { ascending: false, nullsFirst: false })
        .limit(24),
      db
        .from("feedback")
        .select("id, client_name, rating, content")
        .eq("approved", true)
        .order("created_at", { ascending: false })
        .limit(9),
    ]);

    settings = (settingsRes.data as SiteSettings | null) ?? DEFAULT_SETTINGS;
    albumCount = albumCountRes.count ?? 0;
    photoCount = photoCountRes.count ?? 0;

    for (const g of galRes.data ?? []) {
      const ph = (g.photos as { drive_file_id: string }[] | null)?.[0]?.drive_file_id;
      const card = {
        slug: g.slug,
        title: g.title,
        cover_url: (g.cover_url as string | null) || (ph ? thumbnailUrl(ph, 800) : null),
        event_date: g.event_date as string | null,
      };
      if (g.category === "video") pinnedVideoGalleries.push(card);
      else pinnedPhotoGalleries.push(card);
    }
    feedback = (fbRes.data ?? []) as typeof feedback;
  } catch (e) {
    console.error("[home] failed to load data, using defaults:", e);
  }

  return (
    <ProfileHome
      settings={settings}
      featuredImages={settings.featured_images ?? []}
      stats={{ albums: albumCount, photos: photoCount, years: settings.stat_years }}
      photoGalleries={pinnedPhotoGalleries.slice(0, 8)}
      videoGalleries={pinnedVideoGalleries.slice(0, 8)}
      feedback={feedback}
    />
  );
}

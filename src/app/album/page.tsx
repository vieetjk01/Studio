import { createAdminClient } from "@/lib/supabase/admin";
import AlbumBrowse, { type GalleryCard } from "./AlbumBrowse";

export const dynamic = "force-dynamic";

export const metadata = { title: "Album khách hàng · Vieetjk" };

export default async function AlbumDirectoryPage() {
  const db = createAdminClient();
  // Public homepage lists ONLY albums the studio explicitly pinned ("Hiện ở
  // trang chủ"). Anything else — old galleries, private client deliveries —
  // stays off the homepage.
  const { data } = await db
    .from("albums")
    .select("slug, title, client_name, event_date, category, category_label, cover_url, gallery_pinned")
    .eq("gallery_pinned", true)
    .eq("status", "published")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return <AlbumBrowse galleries={(data ?? []) as GalleryCard[]} />;
}

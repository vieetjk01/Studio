import { createAdminClient } from "@/lib/supabase/admin";
import AlbumBrowse, { type GalleryCard } from "./AlbumBrowse";

export const dynamic = "force-dynamic";

export const metadata = { title: "Album khách hàng · Vieetjk" };

export default async function AlbumDirectoryPage() {
  const db = createAdminClient();
  // Legacy galleries (is_gallery) keep their existing listing behaviour. Unified
  // delivery projects only appear here when explicitly pinned to the homepage,
  // so private client deliveries are never publicly listed.
  const { data } = await db
    .from("albums")
    .select("slug, title, client_name, event_date, category, category_label, cover_url, gallery_pinned")
    .or("is_gallery.eq.true,and(phase.eq.delivery,gallery_pinned.eq.true)")
    .eq("status", "published")
    .order("event_date", { ascending: false, nullsFirst: false })
    .order("created_at", { ascending: false });

  return <AlbumBrowse galleries={(data ?? []) as GalleryCard[]} />;
}

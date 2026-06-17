import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPhotos } from "@/lib/photos";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GalleryView from "./GalleryView";
import type { Feedback } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data } = await createAdminClient().from("albums").select("title").eq("slug", params.slug).maybeSingle();
  return { title: data?.title ? `${data.title} · Vieetjk` : "Vieetjk" };
}

export default async function GalleryPage({ params }: { params: { slug: string } }) {
  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("id, slug, title, status, is_gallery, password_hash, gallery_pinned, event_date, cover_url, category, category_label, client_name")
    .eq("slug", params.slug)
    .single();

  if (!album || !album.is_gallery || album.status !== "published") {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Brand />
          <LanguageSwitcher />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p style={{ color: "var(--text2)" }}>Album không khả dụng.</p>
        </div>
      </main>
    );
  }

  const hasPassword = !album.gallery_pinned && !!album.password_hash;

  let photos = null;
  let sources = null;
  if (!hasPassword) {
    photos = await fetchAllPhotos(admin, album.id, "id, drive_file_id, name, source_id, position");
    const { data: s } = await admin.from("album_sources").select("id, name, position").eq("album_id", album.id).order("position");
    sources = s ?? [];
  }

  const { data: feedback } = await admin
    .from("feedback")
    .select("*")
    .eq("album_id", album.id)
    .eq("approved", true)
    .order("created_at", { ascending: false });

  return (
    <GalleryView
      gallery={{
        id: album.id,
        slug: album.slug,
        title: album.title,
        event_date: album.event_date,
        cover_url: album.cover_url,
        hasPassword,
      }}
      initialPhotos={photos}
      initialSources={sources}
      feedback={(feedback ?? []) as Feedback[]}
    />
  );
}

import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPhotos } from "@/lib/photos";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import GalleryView from "./GalleryView";
import { buildAlbumMetadata } from "@/lib/album-meta";
import { MAIN_HOST } from "@/lib/hosts";
import type { Feedback } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data } = await createAdminClient()
    .from("albums")
    .select("title, description, cover_url, owner_id")
    .eq("slug", params.slug)
    .maybeSingle();
  if (!data?.title) return { title: "mstudo" };
  return buildAlbumMetadata({
    title: data.title,
    description: data.description,
    coverUrl: data.cover_url,
    host: MAIN_HOST,
    path: `/album/${params.slug}`,
    ownerId: data.owner_id,
  });
}

export default async function GalleryPage({ params, searchParams }: { params: { slug: string }; searchParams?: { share?: string; s?: string } }) {
  const admin = createAdminClient();
  let shareIds: string[] | null = searchParams?.share ? searchParams.share.split(",").filter(Boolean) : null;
  if (!shareIds && searchParams?.s) {
    const { data: sh } = await admin
      .from("album_shares")
      .select("photo_ids")
      .eq("token", searchParams.s)
      .maybeSingle();
    if (sh?.photo_ids?.length) shareIds = sh.photo_ids as string[];
  }
  const { data: album } = await admin
    .from("albums")
    .select("id, slug, title, status, is_gallery, password_hash, gallery_pinned, event_date, cover_url, category, category_label, client_name, download_enabled")
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
    photos = await fetchAllPhotos(admin, album.id, "id, drive_file_id, name, source_id, position, is_video");
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
        allowDownload: album.download_enabled !== false,
      }}
      initialPhotos={photos}
      initialSources={sources}
      feedback={(feedback ?? []) as Feedback[]}
      shareIds={shareIds}
    />
  );
}

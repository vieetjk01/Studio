import { createAdminClient } from "@/lib/supabase/admin";
import CustomerAlbum from "./CustomerAlbum";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import Brand from "@/components/Brand";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { slug: string } }) {
  const { data } = await createAdminClient()
    .from("albums")
    .select("title")
    .eq("slug", params.slug)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · Vieetjk` : "Vieetjk" };
}

export default async function PublicAlbumPage({
  params,
}: {
  params: { slug: string };
}) {
  const admin = createAdminClient();

  const { data: album } = await admin
    .from("albums")
    .select(
      "id, owner_id, slug, title, description, status, password_hash, selection_limit, watermark_enabled, watermark_text"
    )
    .eq("slug", params.slug)
    .single();

  if (!album || album.status !== "published") {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Brand />
          <LanguageSwitcher />
        </header>
        <div className="flex flex-1 items-center justify-center px-6 text-center">
          <p className="text-accent-muted">This album is not available.</p>
        </div>
      </main>
    );
  }

  const hasPassword = !!album.password_hash;

  // Owner permissions gate customer download (ZIP) and notes.
  const { data: owner } = await admin
    .from("profiles")
    .select("role, can_zip, can_notes")
    .eq("id", album.owner_id)
    .maybeSingle();
  const isAdminOwner = owner?.role === "admin";
  const allowZip = isAdminOwner || !!owner?.can_zip;
  const allowNotes = isAdminOwner || !!owner?.can_notes;

  let photos = null;
  let sources = null;
  let selected: string[] = [];
  let notes: Record<string, string> = {};
  if (!hasPassword) {
    const [{ data: p }, { data: s }, { data: sel }] = await Promise.all([
      admin
        .from("photos")
        .select("id, drive_file_id, name, source_id, position")
        .eq("album_id", album.id)
        .order("position"),
      admin
        .from("album_sources")
        .select("id, name, position")
        .eq("album_id", album.id)
        .order("position"),
      admin
        .from("selections")
        .select("photo_id, client_note")
        .eq("album_id", album.id),
    ]);
    photos = p ?? [];
    sources = s ?? [];
    selected = (sel ?? []).map((r) => r.photo_id);
    for (const r of sel ?? []) if (r.client_note) notes[r.photo_id] = r.client_note;
  }

  return (
    <CustomerAlbum
      album={{
        id: album.id,
        slug: album.slug,
        title: album.title,
        description: album.description,
        selection_limit: album.selection_limit,
        watermark_enabled: album.watermark_enabled,
        watermark_text: album.watermark_text,
        hasPassword,
        allowZip,
        allowNotes,
      }}
      initialPhotos={photos}
      initialSources={sources}
      initialSelected={selected}
      initialNotes={notes}
    />
  );
}

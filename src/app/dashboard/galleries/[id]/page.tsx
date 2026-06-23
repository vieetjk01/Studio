import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPhotos } from "@/lib/photos";
import GalleryEditor from "./GalleryEditor";
import type { Album, AlbumSource, Photo, Feedback } from "@/lib/types";


export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data } = await createClient().from("albums").select("title").eq("id", params.id).maybeSingle();
  return { title: data?.title ? `${data.title} · Vieetjk` : "Vieetjk" };
}

export default async function GalleryEditPage({ params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: album } = await supabase.from("albums").select("*").eq("id", params.id).single();
  if (!album || !album.is_gallery) notFound();

  const [{ data: sources }, photos, { data: feedback }] = await Promise.all([
    supabase.from("album_sources").select("*").eq("album_id", params.id).order("position"),
    fetchAllPhotos(supabase, params.id, "*"),
    supabase.from("feedback").select("*").eq("album_id", params.id).order("created_at", { ascending: false }),
  ]);

  return (
    <GalleryEditor
      album={album as Album}
      initialSources={(sources ?? []) as AlbumSource[]}
      initialPhotos={photos as Photo[]}
      feedback={(feedback ?? []) as Feedback[]}
    />
  );
}

import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import AlbumEditor from "./AlbumEditor";
import type { Album, AlbumSource, Photo } from "@/lib/types";

export const dynamic = "force-dynamic";

export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data } = await createClient()
    .from("albums")
    .select("title")
    .eq("id", params.id)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · Vieetjk` : "Vieetjk" };
}

export default async function AlbumEditPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: album } = await supabase
    .from("albums")
    .select("*")
    .eq("id", params.id)
    .single();

  if (!album) notFound();

  const [{ data: sources }, { data: photos }] = await Promise.all([
    supabase
      .from("album_sources")
      .select("*")
      .eq("album_id", params.id)
      .order("position"),
    supabase
      .from("photos")
      .select("*")
      .eq("album_id", params.id)
      .order("position"),
  ]);

  return (
    <AlbumEditor
      album={album as Album}
      initialSources={(sources ?? []) as AlbumSource[]}
      initialPhotos={(photos ?? []) as Photo[]}
    />
  );
}

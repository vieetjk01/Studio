import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPhotos } from "@/lib/photos";
import { effectivePlan, planAllowsDelivery, planAllowsPublicGallery } from "@/lib/plans";
import AlbumEditor from "./AlbumEditor";
import type { Album, AlbumSource, Photo } from "@/lib/types";


export async function generateMetadata({ params }: { params: { id: string } }) {
  const { data } = await createClient()
    .from("albums")
    .select("title")
    .eq("id", params.id)
    .maybeSingle();
  return { title: data?.title ? `${data.title} · mstudo` : "mstudo" };
}

export default async function AlbumEditPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createClient();

  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: album }, { data: sources }, photos, { data: profile }] = await Promise.all([
    supabase.from("albums").select("*").eq("id", params.id).single(),
    supabase.from("album_sources").select("*").eq("album_id", params.id).order("position"),
    fetchAllPhotos(supabase, params.id, "*"),
    user ? supabase.from("profiles").select("plan, plan_expires_at, role, full_name").eq("id", user.id).maybeSingle() : Promise.resolve({ data: null }),
  ]);

  if (!album) notFound();

  const isAdmin = profile?.role === "admin";
  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const studioName = (profile?.full_name ?? "").trim() || "Studio";

  return (
    <AlbumEditor
      album={album as Album}
      initialSources={(sources ?? []) as AlbumSource[]}
      initialPhotos={(photos ?? []) as Photo[]}
      canDelivery={planAllowsDelivery(plan, isAdmin)}
      canPinHome={planAllowsPublicGallery(plan, isAdmin)}
      studioName={studioName}
    />
  );
}

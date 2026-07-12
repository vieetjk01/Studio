import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { fetchAllPhotos } from "@/lib/photos";
import { getStudioHost } from "@/lib/studio-site";
import { effectivePlan, planAllowsDelivery, planAllowsPublicGallery } from "@/lib/plans";
import AlbumEditor from "./AlbumEditor";
import { categoryLabel } from "@/lib/category";
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
  const studioHost = user ? await getStudioHost(supabase, user.id) : null;

  // Loại album do CHÍNH studio này đã dùng (mỗi studio có bộ phân loại riêng).
  const { data: catRows } = await supabase
    .from("albums")
    .select("category, category_label")
    .eq("owner_id", (album as Album).owner_id)
    .not("category", "is", null);
  const seenCat = new Set<string>();
  const studioCats: { slug: string; label: string }[] = [];
  for (const r of catRows ?? []) {
    const slug = ((r.category as string | null) ?? "").trim();
    if (slug && !seenCat.has(slug)) {
      seenCat.add(slug);
      studioCats.push({ slug, label: categoryLabel(slug, r.category_label as string | null) });
    }
  }

  return (
    <AlbumEditor
      album={album as Album}
      initialSources={(sources ?? []) as AlbumSource[]}
      initialPhotos={(photos ?? []) as Photo[]}
      canDelivery={planAllowsDelivery(plan, isAdmin)}
      canPinHome={planAllowsPublicGallery(plan, isAdmin)}
      studioName={studioName}
      studioHost={studioHost}
      studioCats={studioCats}
    />
  );
}

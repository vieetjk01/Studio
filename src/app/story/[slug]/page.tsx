import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/admin";
import { resolveSource } from "@/lib/drive-server";
import { isFolderLink } from "@/lib/drive";
import type { StoryConfig, StoryPage } from "@/lib/types";
import StoryRenderer, { type StoryPhoto, type StoryWish } from "./StoryRenderer";

export const dynamic = "force-dynamic";

async function load(slug: string): Promise<StoryPage | null> {
  const db = createAdminClient();
  const { data } = await db
    .from("story_pages")
    .select("id, owner_id, contract_id, slug, edit_token, config, published, created_at, updated_at")
    .eq("slug", slug.toLowerCase())
    .maybeSingle();
  if (!data || !data.published) return null;
  return data as StoryPage;
}

export async function generateMetadata({ params }: { params: { slug: string } }): Promise<Metadata> {
  const s = await load(params.slug);
  if (!s) return { title: "Không tìm thấy trang" };
  const c = s.config as StoryConfig;
  const couple = [c.groom_name, c.bride_name].filter(Boolean).join(" ❤ ") || "Love Story";
  return { title: `Love Story · ${couple}`, description: c.tagline || `Câu chuyện của ${couple}.`, openGraph: { images: c.cover_url ? [c.cover_url] : undefined } };
}

export default async function StoryPageView({ params }: { params: { slug: string } }) {
  const story = await load(params.slug);
  if (!story) notFound();
  const c = story.config as StoryConfig;
  const db = createAdminClient();

  // Media comes from the couple's own Drive folder (read-only).
  let photos: StoryPhoto[] = [];
  const folder = c.drive_folder?.trim();
  if (folder && process.env.GOOGLE_API_KEY) {
    try {
      const { files } = await resolveSource(folder, isFolderLink(folder) ? "folder" : "file");
      photos = files.map((f) => ({ id: f.id, url: `/api/img?id=${f.id}&w=1600`, thumb: `/api/img?id=${f.id}&w=600` }));
    } catch { photos = []; }
  }

  const { data: wishRows } = await db
    .from("story_wishes")
    .select("guest_name, wish, created_at")
    .eq("story_id", story.id)
    .order("created_at", { ascending: false })
    .limit(200);

  return <StoryRenderer story={story} photos={photos} wishes={(wishRows ?? []) as StoryWish[]} />;
}

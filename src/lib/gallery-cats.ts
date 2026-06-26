import { createClient } from "@/lib/supabase/client";

/**
 * The distinct gallery categories this user has used before, newest first.
 * Categories are free-text — every value a studio types when saving a gallery
 * becomes a reusable suggestion here, so classification "saves per user".
 */
export async function fetchMyGalleryCategories(): Promise<string[]> {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return [];
  const { data } = await supabase
    .from("albums")
    .select("category, created_at")
    .eq("owner_id", user.id)
    .eq("is_gallery", true)
    .not("category", "is", null)
    .order("created_at", { ascending: false });
  const seen = new Set<string>();
  const out: string[] = [];
  for (const r of data ?? []) {
    const c = (r.category as string | null)?.trim();
    if (c && !seen.has(c.toLowerCase())) {
      seen.add(c.toLowerCase());
      out.push(c);
    }
  }
  return out;
}

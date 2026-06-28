import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public gallery search by album name OR client phone (phone is matched
 * server-side and never returned to the client).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ galleries: [] });

  const db = createAdminClient();
  const like = `%${q}%`;

  // H-3: Search by title only for public endpoint — phone/name search leaks PII.
  // Phone-based lookup is done server-side to find matching slugs, then results
  // only return safe fields (slug, title, cover_url, category).
  const { data: byPhone } = await db
    .from("albums")
    .select("slug")
    .eq("is_gallery", true)
    .eq("status", "published")
    .ilike("client_phone", like);
  const phoneMatchSlugs = (byPhone ?? []).map((r) => r.slug);

  const { data } = await db
    .from("albums")
    .select("slug, title, category, category_label, cover_url, gallery_pinned")
    .eq("is_gallery", true)
    .eq("status", "published")
    .or(
      phoneMatchSlugs.length > 0
        ? `title.ilike.${like},slug.in.(${phoneMatchSlugs.map((s) => `"${s}"`).join(",")})`
        : `title.ilike.${like}`
    )
    .order("created_at", { ascending: false })
    .limit(60);

  return NextResponse.json({ galleries: data ?? [] });
}

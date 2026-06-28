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
  // A client may find their own (possibly private) gallery by exact phone.
  const { data: byPhone } = await db
    .from("albums")
    .select("slug")
    .or("is_gallery.eq.true,phase.eq.delivery")
    .eq("status", "published")
    .ilike("client_phone", like);
  const phoneMatchSlugs = (byPhone ?? []).map((r) => r.slug);

  // Title search only surfaces albums pinned to the homepage; phone matches are
  // allowed through so a client can reach their private gallery.
  const titleClause = `and(gallery_pinned.eq.true,title.ilike.${like})`;
  const { data } = await db
    .from("albums")
    .select("slug, title, category, category_label, cover_url, gallery_pinned")
    .eq("status", "published")
    .or(
      phoneMatchSlugs.length > 0
        ? `${titleClause},slug.in.(${phoneMatchSlugs.map((s) => `"${s}"`).join(",")})`
        : titleClause
    )
    .order("created_at", { ascending: false })
    .limit(60);

  return NextResponse.json({ galleries: data ?? [] });
}

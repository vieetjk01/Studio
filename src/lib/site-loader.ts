import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Site, SiteBlock } from "@/lib/types";

export type SiteData = {
  site: Site;
  blocks: SiteBlock[];
  owner: { full_name: string | null; pl_phone: string | null; pl_facebook: string | null; booking_token: string | null } | null;
  albums: { id: string; slug: string; title: string; cover_url: string | null }[];
  pricelist: { id: string; name: string; price: number; unit: string | null; category: string | null; description: string | null; list_key: string | null }[];
  feedback: { id: string; client_name: string | null; rating: number | null; content: string }[];
};

/**
 * Load everything a tenant site needs to render: owner contact, ordered blocks,
 * and the reused data (published albums, active price list, approved feedback).
 * Pass onlyVisible=false for the owner's live preview (shows hidden blocks too).
 */
export async function loadSiteBundle(db: SupabaseClient, site: Site, onlyVisible = true): Promise<SiteData> {
  const ownerId = site.owner_id;
  let blocksQ = db.from("site_blocks").select("*").eq("site_id", site.id);
  if (onlyVisible) blocksQ = blocksQ.eq("visible", true);

  const [{ data: owner }, { data: blocks }, { data: albums }, { data: pricelist }] = await Promise.all([
    db.from("profiles").select("full_name, pl_phone, pl_facebook, booking_token").eq("id", ownerId).maybeSingle(),
    blocksQ.order("position"),
    db.from("albums").select("id, slug, title, cover_url").eq("owner_id", ownerId).eq("status", "published").order("created_at", { ascending: false }).limit(24),
    db.from("studio_pricelist").select("id, name, price, unit, category, description, list_key").eq("owner_id", ownerId).eq("active", true).gt("price", 0).order("position"),
  ]);

  const albumList = (albums ?? []) as SiteData["albums"];
  let feedback: SiteData["feedback"] = [];
  if (albumList.length) {
    const { data: fb } = await db
      .from("feedback")
      .select("id, client_name, rating, content")
      .in("album_id", albumList.map((a) => a.id))
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(12);
    feedback = (fb ?? []) as SiteData["feedback"];
  }

  return {
    site,
    blocks: (blocks ?? []) as SiteBlock[],
    owner: (owner ?? null) as SiteData["owner"],
    albums: albumList,
    pricelist: (pricelist ?? []) as SiteData["pricelist"],
    feedback,
  };
}

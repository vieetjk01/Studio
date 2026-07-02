import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * The studio's published site subdomain, or null. Only returns a subdomain when
 * the site is PUBLISHED — so customer links stay on mstudo.com until the studio
 * has actually launched its own website, then switch to <sub>.mstudo.com.
 */
export async function getStudioSubdomain(db: SupabaseClient, ownerId: string): Promise<string | null> {
  const { data } = await db
    .from("sites")
    .select("subdomain, published")
    .eq("owner_id", ownerId)
    .maybeSingle();
  return data?.published && data.subdomain ? (data.subdomain as string) : null;
}

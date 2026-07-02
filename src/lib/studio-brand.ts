import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

export type StudioBrandInfo = { name: string; logoUrl: string | null };

/**
 * The white-label brand (name + logo) a studio shows to its customers.
 * Falls back: studio_brand_name → full_name → "Studio"; studio_logo_url →
 * pl_logo_url (the price-list logo many studios already uploaded) → null.
 */
export async function getStudioBrand(db: SupabaseClient, ownerId: string): Promise<StudioBrandInfo> {
  const { data } = await db
    .from("profiles")
    .select("full_name, studio_brand_name, studio_logo_url, pl_logo_url")
    .eq("id", ownerId)
    .maybeSingle();
  return brandFrom(data);
}

/** Build a brand from an already-fetched profile row (avoids an extra query). */
export function brandFrom(p: { full_name?: string | null; studio_brand_name?: string | null; studio_logo_url?: string | null; pl_logo_url?: string | null } | null): StudioBrandInfo {
  return {
    name: (p?.studio_brand_name || p?.full_name || "").trim() || "Studio",
    logoUrl: p?.studio_logo_url || p?.pl_logo_url || null,
  };
}

import "server-only";
import { cache } from "react";
import { createAdminClient } from "@/lib/supabase/admin";

export type FeatureFlags = Record<string, string>;

/**
 * Global feature flags controlled by the admin in Settings (site_settings.feature_flags).
 * Cached per-request. Falls back to {} if the column/row is missing.
 */
export const getFeatureFlags = cache(async (): Promise<FeatureFlags> => {
  try {
    const { data } = await createAdminClient().from("site_settings").select("feature_flags").eq("id", 1).maybeSingle();
    const f = (data as { feature_flags?: FeatureFlags } | null)?.feature_flags;
    return f && typeof f === "object" ? f : {};
  } catch {
    return {};
  }
});

/** Love Story is marked "Sắp ra mắt" (coming soon) — locked for non-admins. */
export function storyComingSoon(flags: FeatureFlags): boolean {
  return flags?.story === "coming_soon";
}

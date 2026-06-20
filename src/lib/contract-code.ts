import type { SupabaseClient } from "@supabase/supabase-js";

/** Default post-production checklist seeded onto new contracts. */
export const DEFAULT_TASKS = ["Chọn ảnh", "Chỉnh sửa ảnh", "Duyệt cùng khách", "Giao sản phẩm"];

/**
 * Next contract code for a studio: HD-{MM}-{YYYY}-{NNN}, sequence per month.
 * e.g. the 1st contract in June 2026 → "HD-06-2026-001".
 */
export async function nextContractCode(supabase: SupabaseClient, ownerId: string): Promise<string> {
  const now = new Date();
  const mm = String(now.getMonth() + 1).padStart(2, "0");
  const yyyy = now.getFullYear();
  const prefix = `HD-${mm}-${yyyy}-`;
  const { count } = await supabase
    .from("studio_contracts")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ownerId)
    .like("code", `${prefix}%`);
  return `${prefix}${String((count || 0) + 1).padStart(3, "0")}`;
}

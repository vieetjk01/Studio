import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

export type StudioOwner = {
  id: string;
  full_name: string | null;
  booking_token: string | null;
  pl_phone: string | null;
  pl_facebook: string | null;
  pl_bank_holder: string | null;
  pl_bank_account: string | null;
  pl_bank_name: string | null;
};

/**
 * Resolve the public "main studio" account whose pricelist powers BOTH the
 * homepage and /banggia. Among active admin accounts we deterministically pick
 * the one that actually has pricelist rows, so whatever account the studio owner
 * edits under always surfaces on the public pages. Falls back to the oldest
 * admin when none have a pricelist yet.
 *
 * (Previously each page ran `order(created_at).limit(1)` independently, which
 * has no tiebreaker — with >1 admin account the two pages could land on
 * different accounts, making edits appear on one page but not the other.)
 */
export async function resolveStudioOwner(): Promise<StudioOwner | null> {
  const db = createAdminClient();
  const { data: admins } = await db
    .from("profiles")
    .select(
      "id, full_name, booking_token, pl_phone, pl_facebook, pl_bank_holder, pl_bank_account, pl_bank_name, created_at"
    )
    .eq("role", "admin")
    .eq("is_active", true)
    .order("created_at")
    .order("id");

  if (!admins || admins.length === 0) return null;
  if (admins.length === 1) return admins[0] as unknown as StudioOwner;

  // Multiple admin accounts: prefer the one with the most active pricelist rows
  // (deterministic — same result on every page render).
  const ids = admins.map((a) => a.id as string);
  const { data: rows } = await db
    .from("studio_pricelist")
    .select("owner_id")
    .in("owner_id", ids)
    .eq("active", true);

  const count = new Map<string, number>();
  for (const r of rows ?? []) {
    const oid = (r as { owner_id: string }).owner_id;
    count.set(oid, (count.get(oid) || 0) + 1);
  }

  let best = admins[0];
  let bestN = count.get(best.id as string) || 0;
  for (const a of admins) {
    const n = count.get(a.id as string) || 0;
    if (n > bestN) {
      best = a;
      bestN = n;
    }
  }
  return best as unknown as StudioOwner;
}

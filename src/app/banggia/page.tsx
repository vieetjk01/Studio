import { createAdminClient } from "@/lib/supabase/admin";
import { PRICE_LISTS } from "@/lib/pricelist-seeds";
import { resolveStudioOwner } from "@/lib/studio-owner";
import PricelistPoster from "@/components/PricelistPoster";
import type { PricelistItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const fetchCache = "force-no-store";

// Public price list for the main studio (admin account) at a clean URL.
export default async function BangGiaPage({ searchParams }: { searchParams?: { list?: string } }) {
  const db = createAdminClient();
  const owner = await resolveStudioOwner();

  if (!owner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Chưa có bảng giá</h1>
        </div>
      </div>
    );
  }

  const { data } = await db
    .from("studio_pricelist")
    .select("*")
    .eq("owner_id", owner.id)
    .eq("active", true)
    .order("position");
  const allItems = (data ?? []) as PricelistItem[];

  const available = PRICE_LISTS.filter((l) => allItems.some((i) => (i.list_key || "cuoi") === l.key));
  const lists = available.length ? available : PRICE_LISTS.slice(0, 1);
  const selected = (searchParams?.list && lists.find((l) => l.key === searchParams.list)?.key) || lists[0].key;
  const items = allItems.filter((i) => (i.list_key || "cuoi") === selected);
  const token = (owner as { booking_token: string | null }).booking_token || "";

  return (
    <PricelistPoster
      contact={owner as never}
      items={items}
      lists={lists}
      selected={selected}
      tabBase="/banggia"
      bookHref={token ? `/book/${token}` : "#"}
    />
  );
}

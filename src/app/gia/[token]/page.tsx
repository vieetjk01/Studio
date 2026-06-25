import { createAdminClient } from "@/lib/supabase/admin";
import { PRICE_LISTS } from "@/lib/pricelist-seeds";
import PricelistPoster from "@/components/PricelistPoster";
import type { PricelistItem } from "@/lib/types";

export const dynamic = "force-dynamic";
export const revalidate = 0;

function buildLists(allItems: PricelistItem[]) {
  const builtIn = PRICE_LISTS.filter((l) => allItems.some((i) => (i.list_key || "cuoi") === l.key));
  const builtInKeys = new Set(PRICE_LISTS.map((l) => l.key));
  const customKeys = [...new Set(allItems.map((i) => i.list_key || "cuoi"))].filter((k) => !builtInKeys.has(k));
  const custom = customKeys.map((k) => ({ key: k, label: k, title: `Bảng giá ${k}` }));
  const combined = [...builtIn, ...custom];
  return combined.length ? combined : PRICE_LISTS.slice(0, 1);
}

export default async function PublicPricelist({ params, searchParams }: { params: { token: string }; searchParams?: { list?: string } }) {
  const db = createAdminClient();
  const { data: owner } = await db
    .from("profiles")
    .select("id, full_name, pl_phone, pl_facebook, pl_bank_holder, pl_bank_account, pl_bank_name")
    .eq("booking_token", params.token)
    .maybeSingle();

  if (!owner) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6 text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Không tìm thấy</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>Link bảng giá không hợp lệ.</p>
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

  const lists = buildLists(allItems);
  const selected = (searchParams?.list && lists.find((l) => l.key === searchParams.list)?.key) || lists[0].key;
  const items = allItems.filter((i) => (i.list_key || "cuoi") === selected);

  let theme: { bg?: string | null; text?: string | null; accent?: string | null; logo?: string | null } | undefined;
  const { data: th } = await db
    .from("profiles")
    .select("pl_bg, pl_text, pl_accent, pl_logo_url")
    .eq("id", owner.id)
    .maybeSingle();
  if (th) theme = { bg: th.pl_bg, text: th.pl_text, accent: th.pl_accent, logo: th.pl_logo_url };

  return (
    <PricelistPoster
      contact={owner as never}
      items={items}
      lists={lists}
      selected={selected}
      tabBase={`/gia/${params.token}`}
      bookHref={`/book/${params.token}`}
      theme={theme}
    />
  );
}

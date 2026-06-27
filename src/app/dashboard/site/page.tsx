import { createClient } from "@/lib/supabase/server";
import { effectivePlan } from "@/lib/plans";
import { PRICE_LISTS } from "@/lib/pricelist-seeds";
import CanvasBuilder, { type PriceItem } from "./builder/CanvasBuilder";
import type { Site, SiteBlock } from "@/lib/types";

export const dynamic = "force-dynamic";

// Trang tạo website giờ dùng trình tạo kéo-thả (canvas + inline edit + inspector).
// Dùng chung bảng sites/site_blocks với SiteRenderer nên dữ liệu & xuất bản tương thích.
export default async function SiteBuilderPage() {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null; // middleware redirects unauthenticated users

  const { data: profile } = await supabase.from("profiles").select("*").eq("id", user.id).maybeSingle();
  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const isAdmin = profile?.role === "admin";
  const canPublish = isAdmin || plan === "photographer" || plan === "studio";

  let { data: site } = await supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle();
  if (!site) {
    const { data: created } = await supabase.from("sites").insert({ owner_id: user.id }).select("*").single();
    site = created;
  }
  const [{ data: blocks }, { data: albums }, { data: pricelist }] = await Promise.all([
    supabase.from("site_blocks").select("*").eq("site_id", (site as Site).id).order("position"),
    supabase.from("albums").select("id, slug, title, cover_url").eq("owner_id", user.id).eq("status", "published").order("created_at", { ascending: false }).limit(48),
    supabase.from("studio_pricelist").select("id, name, price, unit, category, description, list_key").eq("owner_id", user.id).eq("active", true).gt("price", 0).order("position"),
  ]);

  // Price-list options (loại bảng giá) for the pricing block selector.
  const labels = (profile?.pl_list_labels as Record<string, string> | null) ?? {};
  const plItems = (pricelist ?? []) as PriceItem[];
  const priceLists = [...new Set(plItems.map((p) => p.list_key || "cuoi"))].map((key) => ({
    key,
    label: labels[key] || PRICE_LISTS.find((l) => l.key === key)?.label || key,
  }));

  return (
    <CanvasBuilder
      site={site as Site}
      initialBlocks={(blocks ?? []) as SiteBlock[]}
      albums={(albums ?? []) as { id: string; slug: string; title: string; cover_url: string | null }[]}
      pricelist={plItems}
      priceLists={priceLists}
      canPublish={canPublish}
      mainHost={process.env.NEXT_PUBLIC_MAIN_HOST || ""}
    />
  );
}

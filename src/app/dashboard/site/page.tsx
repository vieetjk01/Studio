import { createClient } from "@/lib/supabase/server";
import { effectivePlan, planAllowsCustomDomain } from "@/lib/plans";
import { availableLists } from "@/lib/site-pricing";
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

  // profile và site đều tra theo user.id, độc lập nhau → chạy song song (bớt 1 round-trip).
  const [{ data: profile }, { data: existingSite }] = await Promise.all([
    supabase.from("profiles").select("*").eq("id", user.id).maybeSingle(),
    supabase.from("sites").select("*").eq("owner_id", user.id).maybeSingle(),
  ]);
  const plan = profile ? effectivePlan(profile.plan, profile.plan_expires_at) : "free";
  const isAdmin = profile?.role === "admin";
  const canPublish = isAdmin || plan === "photographer" || plan === "photographer_plus" || plan === "studio";
  // Tên miền riêng: Photographer Plus & Studio.
  const canCustomDomain = planAllowsCustomDomain(plan, isAdmin);

  let site = existingSite;
  if (!site) {
    const { data: created } = await supabase.from("sites").insert({ owner_id: user.id }).select("*").single();
    site = created;
  }
  const [{ data: blocks }, { data: albums }, { data: pricelist }] = await Promise.all([
    supabase.from("site_blocks").select("*").eq("site_id", (site as Site).id).order("position"),
    supabase.from("albums").select("id, slug, title, cover_url").eq("owner_id", user.id).eq("status", "published").order("created_at", { ascending: false }).limit(48),
    // Lấy cả dòng 0đ (ghi chú "Phát sinh thêm", "Lưu ý"…) — khối bảng giá xếp
    // chúng xuống phần ghi chú, giống trang bảng giá công khai.
    supabase.from("studio_pricelist").select("id, name, price, unit, category, description, list_key").eq("owner_id", user.id).eq("active", true).order("position"),
  ]);

  // Các loại bảng giá (list_key) để studio chọn loại nào hiện trên website.
  const priceLabels = (profile?.pl_list_labels as Record<string, string> | null) ?? {};
  const plItems = (pricelist ?? []) as PriceItem[];
  const priceLists = availableLists(plItems, priceLabels);

  return (
    <CanvasBuilder
      site={site as Site}
      initialBlocks={(blocks ?? []) as SiteBlock[]}
      albums={(albums ?? []) as { id: string; slug: string; title: string; cover_url: string | null }[]}
      pricelist={plItems}
      priceLists={priceLists}
      priceLabels={priceLabels}
      canPublish={canPublish}
      canCustomDomain={canCustomDomain}
      mainHost={process.env.NEXT_PUBLIC_MAIN_HOST || ""}
    />
  );
}

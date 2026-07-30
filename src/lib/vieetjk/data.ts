import type { SupabaseClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { WEDDING_SEED, ENGAGEMENT_SEED, type SeedItem } from "@/lib/pricelist-seeds";
import { brandFrom } from "@/lib/studio-brand";
import { BRAND } from "./content";

export type VjkAlbum = {
  id: string;
  slug: string;
  title: string;
  cover_url: string | null;
  category: string | null;
  category_label: string | null;
};

export type VjkPriceItem = {
  name: string;
  price: number;
  unit: string | null;
  category: string; // nhóm trong bảng giá (vd "Gói chụp cơ bản")
  description: string | null;
  list_key: string; // cuoi | dinh-hon | ...
};

export type VjkFeedback = { id: string; client_name: string | null; rating: number | null; content: string };

export type VjkData = {
  /** Chủ studio (để lấy link đặt lịch, tên hiển thị). */
  ownerId: string | null;
  bookingToken: string | null;
  /** Logo studio đã upload trong dashboard (studio_logo_url → pl_logo_url). */
  logoUrl: string | null;
  /** Đánh giá khách hàng (đã duyệt) để hiện ở trang chủ. */
  feedback: VjkFeedback[];
  /** Album showcase công khai (đã lọc trạng thái published + is_showcase). */
  albums: VjkAlbum[];
  /** Bảng giá studio, gom theo list_key (cuoi / dinh-hon...). */
  priceByList: Record<string, VjkPriceItem[]>;
};

/** Link đặt lịch cho khách. Có thể kèm list_key để lọc đúng bảng giá dịch vụ. */
export function bookingHref(token: string | null, listKey?: string): string | null {
  if (!token) return null;
  return listKey ? `/book/${token}?list=${encodeURIComponent(listKey)}` : `/book/${token}`;
}

/** Danh sách gói của 1 list_key: ưu tiên dữ liệu studio, fallback bảng giá mẫu. */
export function itemsForList(priceByList: Record<string, VjkPriceItem[]>, key: string): VjkPriceItem[] {
  if (priceByList[key]?.length) return priceByList[key];
  const seeds: SeedItem[] = key === "cuoi" ? WEDDING_SEED : key === "dinh-hon" ? ENGAGEMENT_SEED : [];
  return seeds.map((s) => ({
    name: s.name,
    price: s.price,
    unit: s.unit || null,
    category: s.category,
    description: s.description || null,
    list_key: s.list_key,
  }));
}

/** Gói (tên + giá + mô tả) khớp một trong các từ khoá — để hiện chi tiết & chọn khi đặt lịch. */
export function itemForMatches(items: VjkPriceItem[], matches: string[]): VjkPriceItem | null {
  const low = matches.map((m) => m.toLowerCase());
  for (const it of items) {
    const n = (it.name || "").toLowerCase();
    if (it.price > 0 && low.some((m) => n.includes(m))) return it;
  }
  return null;
}

/** Album thuộc một dịch vụ (khớp theo danh sách category). */
export function albumsForCategories(albums: VjkAlbum[], categories: string[]): VjkAlbum[] {
  const set = new Set(categories.map((c) => c.toLowerCase()));
  return albums.filter((a) => a.category && set.has(a.category.toLowerCase()));
}

async function resolveOwner(
  db: SupabaseClient,
): Promise<{ ownerId: string | null; bookingToken: string | null; logoUrl: string | null }> {
  // 1) Ưu tiên site có custom_domain = vieetjk.com.
  const { data: byDomain } = await db
    .from("sites")
    .select("owner_id")
    .eq("custom_domain", BRAND.domain)
    .maybeSingle();
  let ownerId = (byDomain?.owner_id as string | undefined) ?? null;

  // 2) Dự phòng: site có subdomain 'vieetjk'.
  if (!ownerId) {
    const { data: bySub } = await db
      .from("sites")
      .select("owner_id")
      .eq("subdomain", "vieetjk")
      .maybeSingle();
    ownerId = (bySub?.owner_id as string | undefined) ?? null;
  }

  let bookingToken: string | null = null;
  let logoUrl: string | null = null;
  if (ownerId) {
    const { data: prof } = await db
      .from("profiles")
      .select("booking_token, full_name, studio_brand_name, studio_logo_url, pl_logo_url")
      .eq("id", ownerId)
      .maybeSingle();
    bookingToken = (prof?.booking_token as string | undefined) ?? null;
    logoUrl = brandFrom(prof).logoUrl;
  }
  return { ownerId, bookingToken, logoUrl };
}

/**
 * Chủ studio của site vieetjk + SĐT/tên (để lưu lead và báo Zalo cho chủ).
 * Dùng bởi API lead — nhẹ hơn loadVieetjkData (không nạp album/bảng giá).
 */
export async function resolveVieetjkOwner(): Promise<{
  ownerId: string | null;
  phone: string | null;
  name: string | null;
}> {
  const db = createAdminClient();
  const { ownerId } = await resolveOwner(db);
  if (!ownerId) return { ownerId: null, phone: null, name: null };
  const { data: prof } = await db
    .from("profiles")
    .select("pl_phone, full_name, studio_brand_name")
    .eq("id", ownerId)
    .maybeSingle();
  const phone = (prof?.pl_phone as string | undefined) || null;
  const name =
    (prof?.studio_brand_name as string | undefined) ||
    (prof?.full_name as string | undefined) ||
    null;
  return { ownerId, phone, name };
}

export async function loadVieetjkData(): Promise<VjkData> {
  const db = createAdminClient();
  const { ownerId, bookingToken, logoUrl } = await resolveOwner(db);

  const empty: VjkData = { ownerId, bookingToken, logoUrl, feedback: [], albums: [], priceByList: {} };
  if (!ownerId) return empty;

  const [{ data: albums }, { data: pl }] = await Promise.all([
    // Album công khai của studio: đã "Hiện ở trang chủ" (gallery_pinned) nên
    // khách xem không cần mật khẩu — đúng nguồn dùng cho portfolio.
    db
      .from("albums")
      .select("id, slug, title, cover_url, category, category_label")
      .eq("owner_id", ownerId)
      .eq("status", "published")
      .eq("phase", "delivery")
      .eq("gallery_pinned", true)
      .order("created_at", { ascending: false })
      .limit(60),
    db
      .from("studio_pricelist")
      .select("name, price, unit, category, description, list_key")
      .eq("owner_id", ownerId)
      .eq("active", true)
      .order("position"),
  ]);

  const priceByList: Record<string, VjkPriceItem[]> = {};
  for (const row of (pl ?? []) as VjkPriceItem[]) {
    (priceByList[row.list_key] ??= []).push(row);
  }

  // Đánh giá khách hàng đã duyệt (trên các album của studio).
  let feedback: VjkFeedback[] = [];
  const { data: allAlbums } = await db
    .from("albums")
    .select("id")
    .eq("owner_id", ownerId)
    .eq("status", "published");
  const albumIds = (allAlbums ?? []).map((a) => a.id as string);
  if (albumIds.length) {
    const { data: fb } = await db
      .from("feedback")
      .select("id, client_name, rating, content")
      .in("album_id", albumIds)
      .eq("approved", true)
      .order("created_at", { ascending: false })
      .limit(9);
    feedback = (fb ?? []) as VjkFeedback[];
  }

  return {
    ownerId,
    bookingToken,
    logoUrl,
    feedback,
    albums: (albums ?? []) as VjkAlbum[],
    priceByList,
  };
}

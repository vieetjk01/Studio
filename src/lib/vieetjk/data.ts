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

export type VjkData = {
  /** Chủ studio (để lấy link đặt lịch, tên hiển thị). */
  ownerId: string | null;
  bookingToken: string | null;
  /** Logo studio đã upload trong dashboard (studio_logo_url → pl_logo_url). */
  logoUrl: string | null;
  /** Album showcase công khai (đã lọc trạng thái published + is_showcase). */
  albums: VjkAlbum[];
  /** Bảng giá studio, gom theo list_key (cuoi / dinh-hon...). */
  priceByList: Record<string, VjkPriceItem[]>;
};

/** Link đặt lịch cho khách. */
export function bookingHref(token: string | null): string | null {
  return token ? `/book/${token}` : null;
}

/** Album thuộc một dịch vụ (khớp theo danh sách category). */
export function albumsForCategories(albums: VjkAlbum[], categories: string[]): VjkAlbum[] {
  const set = new Set(categories.map((c) => c.toLowerCase()));
  return albums.filter((a) => a.category && set.has(a.category.toLowerCase()));
}

/**
 * Bảng giá cho một dịch vụ. Ưu tiên dữ liệu thật từ studio_pricelist; nếu
 * studio chưa nhập bảng giá nào thì dùng mẫu mặc định (seed) để trang không trống.
 */
export function priceItemsForLists(
  priceByList: Record<string, VjkPriceItem[]>,
  listKeys: string[],
): VjkPriceItem[] {
  const out: VjkPriceItem[] = [];
  for (const key of listKeys) {
    const items = priceByList[key];
    if (items && items.length) {
      out.push(...items);
    } else {
      // Fallback: dùng bảng giá mẫu của mstudo cho list này.
      const seeds: SeedItem[] = key === "cuoi" ? WEDDING_SEED : key === "dinh-hon" ? ENGAGEMENT_SEED : [];
      out.push(
        ...seeds.map((s) => ({
          name: s.name,
          price: s.price,
          unit: s.unit || null,
          category: s.category,
          description: s.description || null,
          list_key: s.list_key,
        })),
      );
    }
  }
  return out;
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

export async function loadVieetjkData(): Promise<VjkData> {
  const db = createAdminClient();
  const { ownerId, bookingToken, logoUrl } = await resolveOwner(db);

  const empty: VjkData = { ownerId, bookingToken, logoUrl, albums: [], priceByList: {} };
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

  return {
    ownerId,
    bookingToken,
    logoUrl,
    albums: (albums ?? []) as VjkAlbum[],
    priceByList,
  };
}

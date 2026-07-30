import { PRICE_LISTS } from "@/lib/pricelist-seeds";

/* ─────────────────────────────────────────────────────────────────────────────
   Bảng giá cho website studio (khối "pricing").

   Studio nhập giá ở /dashboard/studio/pricing, mỗi dòng thuộc MỘT loại bảng giá
   (list_key: cưới, đính hôn, sự kiện…) và MỘT nhóm (category: gói chụp, gói
   quay…). Khối bảng giá trên website chỉ cần chọn loại nào được hiện, phần chia
   nhóm/sắp xếp do các hàm ở đây lo — dùng chung cho trang đã xuất bản
   (SiteRenderer) và khung soạn (CanvasBuilder) nên hai bên luôn giống nhau.
   ───────────────────────────────────────────────────────────────────────────── */

export type SitePriceItem = {
  id: string;
  name: string;
  price: number;
  unit: string | null;
  category: string | null;
  description: string | null;
  list_key: string | null;
};

export type PriceGroup = { name: string; items: SitePriceItem[] };

export type PriceListView = {
  key: string;
  label: string;
  /** Nhóm có gói tính tiền (hiện dạng thẻ/bảng). */
  groups: PriceGroup[];
  /** Nhóm chỉ có ghi chú (giá 0đ: "Phát sinh thêm", "Lưu ý"…). */
  notes: PriceGroup[];
  count: number;
};

/** Cách trình bày các gói trong một loại bảng giá. */
export type PricingLayout = "card" | "compact" | "table";
/** Cách trình bày nhiều loại bảng giá cùng lúc. */
export type PricingGrouping = "tabs" | "stack";

export const DEFAULT_LIST_KEY = "cuoi";
const NOTE_GROUP_FALLBACK = "Ghi chú";

export const bullets = (d: string | null | undefined) =>
  String(d ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

/** Loại bảng giá của một dòng giá (dòng cũ chưa có list_key coi như "cuoi"). */
export const itemListKey = (p: SitePriceItem) => p.list_key || DEFAULT_LIST_KEY;

/** Tên hiển thị của một loại bảng giá: nhãn studio tự đặt → mẫu sẵn → key. */
export function listLabel(key: string, labels: Record<string, string> = {}): string {
  return labels[key] || PRICE_LISTS.find((l) => l.key === key)?.label || key;
}

/** Mọi loại bảng giá đang có dòng giá, theo thứ tự mẫu sẵn trước, tự đặt sau. */
export function availableLists(
  items: SitePriceItem[],
  labels: Record<string, string> = {},
): { key: string; label: string; count: number }[] {
  const keys = [...new Set(items.map(itemListKey))];
  const seedOrder = PRICE_LISTS.map((l) => l.key);
  keys.sort((a, b) => {
    const ia = seedOrder.indexOf(a), ib = seedOrder.indexOf(b);
    if (ia !== ib) return (ia < 0 ? 99 : ia) - (ib < 0 ? 99 : ib);
    return a.localeCompare(b, "vi");
  });
  return keys.map((key) => ({
    key,
    label: listLabel(key, labels),
    count: items.filter((p) => itemListKey(p) === key).length,
  }));
}

/**
 * Loại bảng giá được chọn hiện trên website.
 * `list_keys` (mảng) là cấu hình mới; `list_key` (chuỗi) là cấu hình cũ — vẫn
 * đọc được để trang đã xuất bản trước đây không bị đổi nội dung. Không chọn gì
 * = hiện tất cả.
 */
export function selectedListKeys(config: Record<string, unknown> | null | undefined): string[] {
  const raw = config?.list_keys;
  if (Array.isArray(raw)) {
    const keys = raw.filter((k): k is string => typeof k === "string" && !!k.trim());
    if (keys.length) return keys;
    // Mảng rỗng = người dùng chủ động bỏ chọn hết → tôn trọng (không hiện gì).
    return [];
  }
  const legacy = config?.list_key;
  if (typeof legacy === "string" && legacy.trim()) return [legacy.trim()];
  return [];
}

/** Có chọn lọc loại bảng giá hay không (phân biệt "chưa chọn" vs "bỏ hết"). */
export function hasListSelection(config: Record<string, unknown> | null | undefined): boolean {
  const raw = config?.list_keys;
  if (Array.isArray(raw)) return true;
  return typeof config?.list_key === "string" && !!config.list_key.trim();
}

/**
 * Dựng dữ liệu bảng giá đã chia theo loại → nhóm, tách riêng phần ghi chú.
 * Giữ nguyên thứ tự `position` mà studio đã sắp ở trang Bảng giá.
 */
export function buildPriceView(
  items: SitePriceItem[],
  config: Record<string, unknown> | null | undefined,
  labels: Record<string, string> = {},
): PriceListView[] {
  const picked = selectedListKeys(config);
  const selection = hasListSelection(config);
  const keep = selection
    ? items.filter((p) => picked.includes(itemListKey(p)))
    : items;

  const order = picked.length ? picked : availableLists(keep, labels).map((l) => l.key);
  const views: PriceListView[] = [];

  for (const key of order) {
    const listItems = keep.filter((p) => itemListKey(p) === key);
    if (!listItems.length) continue;
    const groups: PriceGroup[] = [];
    for (const it of listItems) {
      const name = it.category?.trim() || (it.price > 0 ? "Gói dịch vụ" : NOTE_GROUP_FALLBACK);
      let g = groups.find((x) => x.name === name);
      if (!g) { g = { name, items: [] }; groups.push(g); }
      g.items.push(it);
    }
    views.push({
      key,
      label: listLabel(key, labels),
      groups: groups.filter((g) => g.items.some((i) => i.price > 0)),
      notes: groups.filter((g) => g.items.every((i) => i.price <= 0)),
      count: listItems.length,
    });
  }
  return views;
}

/** Đọc kiểu trình bày từ config khối (có giá trị mặc định an toàn). */
export function pricingLayout(config: Record<string, unknown> | null | undefined): PricingLayout {
  const v = config?.layout;
  return v === "compact" || v === "table" ? v : "card";
}

export function pricingGrouping(config: Record<string, unknown> | null | undefined): PricingGrouping {
  return config?.grouping === "stack" ? "stack" : "tabs";
}

/** Link đặt lịch kèm loại bảng giá + tên gói để form điền sẵn. */
export function packageBookHref(
  bookingHref: string | null | undefined,
  listKey: string,
  pkgName: string,
): string | null {
  if (!bookingHref) return null;
  const sep = bookingHref.includes("?") ? "&" : "?";
  return `${bookingHref}${sep}list=${encodeURIComponent(listKey)}&pkg=${encodeURIComponent(pkgName)}`;
}

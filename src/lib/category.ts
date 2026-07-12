// Phân loại album (loại album do studio tự đặt).
//   category       = "slug" máy đọc (vd "cuoi", "su-kien") — dùng để lọc/nhóm.
//   category_label = nhãn hiển thị do studio đặt (vd "Cưới", "Sự kiện").
// Người dùng nhập nhãn tự do; slug được suy ra tự động từ nhãn (bỏ dấu).

/** Bỏ dấu tiếng Việt → slug an toàn (a-z, 0-9, gạch nối). */
export function slugifyVi(input: string): string {
  return (input || "")
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "D")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

/** Các loại album gợi ý sẵn (studio vẫn có thể nhập loại riêng). */
export const CATEGORY_PRESETS: { slug: string; label: string }[] = [
  { slug: "cuoi", label: "Cưới" },
  { slug: "dinh-hon", label: "Đính hôn" },
  { slug: "su-kien", label: "Sự kiện" },
  { slug: "doanh-nghiep", label: "Doanh nghiệp" },
  { slug: "ky-yeu", label: "Kỷ yếu" },
  { slug: "gia-dinh", label: "Gia đình" },
  { slug: "chan-dung", label: "Chân dung" },
  { slug: "san-pham", label: "Sản phẩm" },
  { slug: "video", label: "Video" },
];

const PRESET_BY_SLUG = new Map(CATEGORY_PRESETS.map((c) => [c.slug, c.label]));

/** Nhãn hiển thị cho một loại album (ưu tiên nhãn tự đặt, rồi preset, rồi slug). */
export function categoryLabel(slug: string | null, custom: string | null): string {
  const c = (custom || "").trim();
  if (c) return c;
  const s = (slug || "").trim();
  return PRESET_BY_SLUG.get(s) || s || "Khác";
}

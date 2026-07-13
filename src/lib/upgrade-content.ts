import { PLAN_LABEL, PLAN_FEATURES, type Plan } from "@/lib/plans";

// ── Editable content of the upgrade page ────────────────────────────────────
// Stored in site_settings.upgrade_content (jsonb), edited by admins. Anything
// left empty falls back to the defaults below.

/** One comparison-table row: a section header, or a feature with 4 cell values.
 * Cell convention: "✓" = included, "✗" or "" = not included, anything else = text. */
export type CompareRow =
  | { section: string }
  | { label: string; free: string; basic: string; photographer: string; studio: string };

export type PlanContent = { label: string; features: string[]; promo?: string };

export type UpgradeContent = {
  headline: string;
  subheadline: string;
  plans: Record<Plan, PlanContent>;
  compare: CompareRow[];
  comingSoon: string[];
};

const Y = "✓";
const N = "✗";

export const UPGRADE_DEFAULTS: UpgradeContent = {
  headline: "Nâng cấp gói",
  subheadline:
    "Mở khoá thêm album, cho khách tải ảnh & ghi chú, watermark logo, nén/lọc ảnh không giới hạn.",
  plans: {
    free: { label: PLAN_LABEL.free, features: PLAN_FEATURES.free },
    basic: { label: PLAN_LABEL.basic, features: PLAN_FEATURES.basic },
    photographer: { label: PLAN_LABEL.photographer, features: PLAN_FEATURES.photographer },
    photographer_plus: {
      label: PLAN_LABEL.photographer_plus,
      features: PLAN_FEATURES.photographer_plus,
      promo: "Có tên miền riêng + quản lý hợp đồng — chỉ 129k/tháng.",
    },
    studio: {
      label: PLAN_LABEL.studio,
      features: PLAN_FEATURES.studio,
      promo: "Đăng ký trong thời gian này: ưu đãi 50%/năm vĩnh viễn + nhận mọi tính năng nâng cấp sau này.",
    },
  },
  compare: [
    { section: "Album & ảnh" },
    { label: "Album / tháng", free: "5", basic: "15", photographer: "50", studio: "∞" },
    { label: "Khách chọn ảnh (QR + link)", free: Y, basic: Y, photographer: Y, studio: Y },
    { label: "Cho khách tải ảnh (ZIP)", free: N, basic: Y, photographer: Y, studio: Y },
    { label: "Ghi chú trên ảnh", free: N, basic: Y, photographer: Y, studio: Y },
    { label: "Gallery bàn giao khách", free: N, basic: N, photographer: Y, studio: Y },

    { section: "Watermark & xử lý ảnh" },
    { label: "Watermark chữ", free: Y, basic: Y, photographer: Y, studio: Y },
    { label: "Watermark logo + nén kèm", free: N, basic: Y, photographer: Y, studio: Y },
    { label: "Lọc ảnh AI", free: "10 / tháng", basic: "∞", photographer: "∞", studio: "∞" },
    { label: "Nén ảnh (máy + link Drive)", free: "5 / tháng", basic: "∞", photographer: "∞", studio: "∞" },
    { label: "Nén qua Google Drive (Picker)", free: "1 lần", basic: "5 / tháng", photographer: "15 / tháng", studio: "∞" },

    { section: "Website" },
    { label: "Trình tạo website portfolio", free: "Xem trước", basic: "Xem trước", photographer: Y, studio: Y },
    { label: "Xuất bản website", free: N, basic: N, photographer: Y, studio: Y },
    { label: "Tùy chỉnh giao diện & nội dung", free: N, basic: N, photographer: Y, studio: Y },
    { label: "Tên miền cá nhân .com", free: N, basic: N, photographer: "Sắp ra mắt", studio: "Sắp ra mắt" },

    { section: "Quản lý studio" },
    { label: "Nhận đặt lịch online (link + QR)", free: N, basic: N, photographer: Y, studio: Y },
    { label: "Bảng giá dịch vụ", free: N, basic: N, photographer: Y, studio: Y },
    { label: "Danh bạ khách hàng", free: N, basic: N, photographer: Y, studio: Y },
    { label: "Lịch chụp theo tuần + nhắc lịch", free: N, basic: N, photographer: Y, studio: Y },
    { label: "Quản lý hợp đồng & báo giá", free: N, basic: N, photographer: N, studio: Y },
    { label: "Hợp đồng online (ký & chỉnh sửa)", free: N, basic: N, photographer: N, studio: Y },
    { label: "Tài chính — thu chi · công nợ · lương", free: N, basic: N, photographer: N, studio: Y },
    { label: "Quản lý đội ngũ & xếp hạng", free: N, basic: N, photographer: N, studio: Y },
    { label: "Thiết bị & tiến độ sản xuất", free: N, basic: N, photographer: N, studio: Y },
    { label: "Báo cáo doanh thu & tỉ lệ chốt", free: N, basic: N, photographer: N, studio: Y },

    { section: "Hỗ trợ & nâng cấp" },
    { label: "Trải nghiệm Studio 1 ngày miễn phí", free: Y, basic: Y, photographer: Y, studio: N },
    { label: "Hỗ trợ riêng qua Zalo / email", free: N, basic: N, photographer: N, studio: Y },
    { label: "Nhận miễn phí tính năng nâng cấp", free: N, basic: N, photographer: N, studio: Y },
  ],
  comingSoon: [
    "Tên miền cá nhân (.com riêng)",
    "Cổng thanh toán & hóa đơn tự động",
    "Upload ảnh trực tiếp lên website portfolio",
    "App di động cho studio (iOS & Android)",
    "Tích hợp Google Calendar / iCal",
  ],
};

const PLAN_KEYS: Plan[] = ["free", "basic", "photographer", "photographer_plus", "studio"];

/** Merge stored (partial) content over the defaults so the page always renders. */
export function mergeUpgradeContent(raw: unknown): UpgradeContent {
  const r = (raw && typeof raw === "object" ? raw : {}) as Partial<UpgradeContent>;
  const plans = {} as Record<Plan, PlanContent>;
  for (const k of PLAN_KEYS) {
    const p = r.plans?.[k];
    plans[k] = {
      label: p?.label?.trim() || UPGRADE_DEFAULTS.plans[k].label,
      features: Array.isArray(p?.features) && p!.features.length ? p!.features.filter((f) => typeof f === "string") : UPGRADE_DEFAULTS.plans[k].features,
      // Respect an explicitly-saved promo (incl. cleared = ""); else fall back.
      promo: p && typeof p.promo === "string" ? (p.promo.trim() || undefined) : UPGRADE_DEFAULTS.plans[k].promo,
    };
  }
  return {
    headline: r.headline?.trim() || UPGRADE_DEFAULTS.headline,
    subheadline: r.subheadline?.trim() || UPGRADE_DEFAULTS.subheadline,
    plans,
    compare: Array.isArray(r.compare) && r.compare.length ? (r.compare as CompareRow[]) : UPGRADE_DEFAULTS.compare,
    comingSoon: Array.isArray(r.comingSoon) ? r.comingSoon.filter((s) => typeof s === "string") : UPGRADE_DEFAULTS.comingSoon,
  };
}

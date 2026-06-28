/**
 * Subscription plans (temporary, manual upgrade — no payment gateway yet).
 * The `plan` column on profiles is the source of truth for the new monthly
 * quotas (compress, picker, filter). When an admin assigns a plan, the legacy
 * columns (monthly_album_limit, can_zip, can_notes, can_galleries,
 * can_watermark_pro) are synced from here so existing enforcement keeps working.
 */

export type Plan = "free" | "basic" | "photographer" | "studio";

export interface PlanLimits {
  albumsPerMonth: number | null; // null = unlimited
  canZip: boolean;
  canNotes: boolean;
  canGalleries: boolean;
  watermarkPro: boolean; // image/logo watermark + compression in the watermark tab
  filterPerMonth: number | null; // null = unlimited
  compressPerMonth: number | null; // basic compress (local + Drive link)
  pickerLimit: number | null; // null = unlimited
  pickerWindow: "lifetime" | "month";
}

export const PLAN_LIMITS: Record<Plan, PlanLimits> = {
  free: {
    albumsPerMonth: 5,
    canZip: false,
    canNotes: false,
    canGalleries: false,
    watermarkPro: false,
    filterPerMonth: 10,
    compressPerMonth: 5,
    pickerLimit: 1,
    pickerWindow: "lifetime",
  },
  basic: {
    albumsPerMonth: 15,
    canZip: true,
    canNotes: true,
    canGalleries: false,
    watermarkPro: true,
    filterPerMonth: null,
    compressPerMonth: null,
    pickerLimit: 5,
    pickerWindow: "month",
  },
  photographer: {
    albumsPerMonth: 50,
    canZip: true,
    canNotes: true,
    canGalleries: true,
    watermarkPro: true,
    filterPerMonth: null,
    compressPerMonth: null,
    pickerLimit: 15,
    pickerWindow: "month",
  },
  studio: {
    albumsPerMonth: null,
    canZip: true,
    canNotes: true,
    canGalleries: true,
    watermarkPro: true,
    filterPerMonth: null,
    compressPerMonth: null,
    pickerLimit: null,
    pickerWindow: "month",
  },
};

/** Admins are unlimited regardless of their stored plan. */
export const ADMIN_LIMITS: PlanLimits = PLAN_LIMITS.studio;

/**
 * Studio-module access level a plan unlocks:
 *   none    — no access to studio.mstudo.com
 *   booking — đặt lịch, bảng giá, lịch chụp, khách hàng (gói Photographer)
 *   full    — booking + hợp đồng, tài chính, đội ngũ (gói Studio / admin)
 */
export type StudioTier = "none" | "booking" | "full";

export const STUDIO_TIER_RANK: Record<StudioTier, number> = { none: 0, booking: 1, full: 2 };

export function studioTier(plan: Plan, isAdmin = false): StudioTier {
  if (isAdmin || plan === "studio") return "full";
  if (plan === "photographer") return "booking";
  return "none";
}

export function limitsFor(plan: Plan, isAdmin: boolean): PlanLimits {
  return isAdmin ? ADMIN_LIMITS : PLAN_LIMITS[plan];
}

/** Album delivery phase (giao khách): every paid plan except free. */
export function planAllowsDelivery(plan: Plan, isAdmin = false): boolean {
  return isAdmin || plan !== "free";
}

/** Publishing a delivery album to the public homepage (no-password gallery):
 * Photographer & Studio only (reuses the canGalleries capability). */
export function planAllowsPublicGallery(plan: Plan, isAdmin = false): boolean {
  return isAdmin || PLAN_LIMITS[plan].canGalleries;
}

/** A paid plan whose expiry has passed is treated as 'free'. */
export function effectivePlan(plan: Plan | null | undefined, expiresAt: string | null | undefined): Plan {
  const p = (plan ?? "free") as Plan;
  if (p !== "free" && expiresAt && new Date(expiresAt).getTime() < Date.now()) return "free";
  return p;
}

/** Columns synced onto profiles when a plan is assigned (legacy enforcement). */
export function planProfilePatch(plan: Plan) {
  const l = PLAN_LIMITS[plan];
  return {
    plan,
    monthly_album_limit: l.albumsPerMonth,
    can_zip: l.canZip,
    can_notes: l.canNotes,
    can_galleries: l.canGalleries,
    can_watermark_pro: l.watermarkPro,
  };
}

export interface PlanPricing {
  month: number; // VND
  year: number; // VND
}

export const PLAN_PRICING: Record<"basic" | "photographer" | "studio", PlanPricing> = {
  basic: { month: 50_000, year: 500_000 },
  photographer: { month: 100_000, year: 999_000 },
  studio: { month: 300_000, year: 3_000_000 },
};

export const PLAN_LABEL: Record<Plan, string> = {
  free: "Miễn phí",
  basic: "Basic",
  photographer: "Photographer",
  studio: "Studio",
};

export function formatVnd(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(n % 1_000_000 === 0 ? 0 : 1)}tr`;
  if (n >= 1_000) return `${Math.round(n / 1_000)}k`;
  return `${n}đ`;
}

/** Human-readable feature bullets per plan (for the upgrade page). */
export const PLAN_FEATURES: Record<Plan, string[]> = {
  free: [
    "5 album / tháng",
    "Khách chọn ảnh & gửi lại studio (QR + link)",
    "Cho khách tải ảnh: chưa có",
    "Ghi chú trên ảnh: chưa có",
    "Watermark: chỉ chữ (không logo, không nén kèm)",
    "Lọc ảnh AI: 10 lần / tháng",
    "Nén ảnh (máy + link Drive): 5 lần / tháng",
    "Nén qua Google Drive (Picker): 1 lần dùng thử",
    "Xem trước trình tạo website (không xuất bản)",
    "Trải nghiệm Studio miễn phí 1 ngày",
  ],
  basic: [
    "15 album / tháng",
    "Cho khách tải ảnh (ZIP + từng ảnh)",
    "Cho khách ghi chú trên ảnh",
    "Watermark đầy đủ (logo + nén kèm)",
    "Lọc ảnh AI: không giới hạn",
    "Nén ảnh (máy + link Drive): không giới hạn",
    "Nén qua Google Drive (Picker): 5 lần / tháng",
    "Xem trước trình tạo website (không xuất bản)",
    "Trải nghiệm Studio miễn phí 1 ngày",
  ],
  photographer: [
    "50 album / tháng",
    "Tất cả tính năng gói Basic",
    "Nén qua Google Drive (Picker): 15 lần / tháng",
    "Trang quản lý lịch chụp (mstudo.com/dashboard/studio)",
    "Nhận đặt lịch online — link + QR chia sẻ cho khách",
    "Bảng giá dịch vụ, danh bạ khách hàng",
    "Lịch chụp theo tuần + nhắc lịch Zalo",
    "Website portfolio cá nhân (xuất bản & tùy chỉnh)",
    "Trải nghiệm Studio miễn phí 1 ngày",
    "Tên miền cá nhân .com (sắp ra mắt)",
  ],
  studio: [
    "Album không giới hạn · Picker Drive không giới hạn",
    "Tất cả tính năng gói Photographer",
    "Quản lý hợp đồng + báo giá hạng mục chi tiết",
    "Khách xem & ký hợp đồng online, yêu cầu chỉnh sửa",
    "Quản lý tài chính — thu chi, công nợ, bảng lương",
    "Quản lý đội ngũ (photographer, cameraman) theo hợp đồng",
    "Báo cáo doanh thu theo tháng, tỉ lệ chốt hợp đồng",
    "Thiết bị & xử lý hình ảnh (tiến độ sản xuất)",
    "Hỗ trợ riêng · nhận miễn phí mọi tính năng nâng cấp sau này",
  ],
};

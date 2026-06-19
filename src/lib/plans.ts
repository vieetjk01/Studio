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

export function limitsFor(plan: Plan, isAdmin: boolean): PlanLimits {
  return isAdmin ? ADMIN_LIMITS : PLAN_LIMITS[plan];
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
    "5 album mỗi tháng",
    "Khách chọn ảnh & gửi lại studio (QR + link)",
    "Tải ảnh cho khách: tắt",
    "Ghi chú trên ảnh: tắt",
    "Lọc ảnh: 10 lần / tháng",
    "Nén ảnh (máy tính + link Drive): 5 lần / tháng",
    "Nén qua Google Drive (Picker): dùng thử 1 lần",
    "Watermark: chỉ chữ (không logo, không nén kèm)",
  ],
  basic: [
    "15 album mỗi tháng",
    "Cho khách tải ảnh (ZIP / từng ảnh)",
    "Cho khách ghi chú trên ảnh",
    "Watermark đầy đủ (logo + nén kèm)",
    "Lọc ảnh: không giới hạn (máy tính + link Drive)",
    "Nén ảnh (máy tính + link Drive): không giới hạn",
    "Nén qua Google Drive (Picker): 5 lần / tháng",
  ],
  photographer: [
    "50 album mỗi tháng",
    "Đầy đủ tính năng gói Basic + full quyền khách hàng",
    "Nén qua Google Drive (Picker): 15 lần / tháng",
    "Website cá nhân riêng (đang xây dựng)",
    "Trang album ảnh riêng (đang xây dựng)",
    "Đổi logo website cá nhân (đang xây dựng)",
    "Tên miền cá nhân (đang xây dựng)",
    "Quản lý lịch chụp cá nhân (đang xây dựng)",
  ],
  studio: [
    "Tất cả tính năng gói Photographer — không giới hạn",
    "Album & nén qua Drive không giới hạn",
    "Quản lý lịch chụp (đang xây dựng)",
    "Quản lý hợp đồng khách hàng (đang xây dựng)",
    "Quản lý photographer cho từng hợp đồng (đang xây dựng)",
    "Hỗ trợ riêng",
    "Nhận mọi tính năng nâng cấp sau này",
  ],
};

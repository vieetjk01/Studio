/**
 * Chuyển phiên bản giao diện webapp (1.0 ↔ 2.0).
 *
 * Giao diện 2.0 đang được thiết kế nên MẶC ĐỊNH chưa ai chạy được: người dùng
 * chỉ thấy một NÚT THÔNG BÁO "sắp có phiên bản mới". Khi thiết kế + kiểm thử
 * xong, admin chỉ cần đổi cờ `webapp_v2` trong Cài đặt hệ thống là bật:
 *
 *   coming_soon (mặc định) → chỉ hiện nút thông báo, không ai chuyển được
 *   beta                   → admin tự chuyển sang 2.0 để kiểm thử thật
 *   live                   → mọi studio đều chuyển được (vẫn quay lại 1.0 được)
 *
 * File này KHÔNG import "server-only" (cả server layout lẫn client component
 * đều dùng) và không đọc DB — cờ được truyền vào từ `getFeatureFlags()`.
 */

/** Nhãn phiên bản mới, dùng trong nút/thông báo. */
export const WEBAPP_V2_LABEL = "2.0";

/** Cookie ghi lựa chọn giao diện của phiên đăng nhập ("v2" = dùng giao diện mới). */
export const WEBAPP_UI_COOKIE = "mstudo_ui";

/** Giữ lựa chọn 1 năm (đổi lại bất cứ lúc nào bằng chính nút chuyển). */
export const WEBAPP_UI_COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/** localStorage: đã xem thông báo 2.0 chưa (để tắt chấm đỏ trên nút). */
export const WEBAPP_V2_SEEN_KEY = "mstudo_v2_teaser_seen";

export type WebappUi = "v1" | "v2";
export type WebappV2Stage = "coming_soon" | "beta" | "live";

/** Trạng thái phát hành của giao diện 2.0 theo cờ tính năng của admin. */
export function webappV2Stage(flags: Record<string, string> | null | undefined): WebappV2Stage {
  const v = flags?.webapp_v2;
  return v === "live" ? "live" : v === "beta" ? "beta" : "coming_soon";
}

/**
 * Ai được BẬT giao diện 2.0 ngay lúc này.
 * - coming_soon: không ai (kể cả admin) — 2.0 chưa chạy, chỉ có nút thông báo.
 * - beta: chỉ admin (đang kiểm thử).
 * - live: mọi người.
 */
export function canSwitchWebappV2(stage: WebappV2Stage, role: string | null | undefined): boolean {
  if (stage === "live") return true;
  if (stage === "beta") return role === "admin";
  return false;
}

/**
 * Giao diện THỰC SỰ áp dụng cho request này. Cookie chỉ được tôn trọng khi
 * người dùng còn quyền dùng 2.0 — nếu admin hạ cờ về "coming_soon", mọi phiên
 * đang ở 2.0 tự trở lại 1.0 mà không cần xoá cookie.
 */
export function resolveWebappUi(
  cookieValue: string | null | undefined,
  stage: WebappV2Stage,
  role: string | null | undefined
): WebappUi {
  return cookieValue === "v2" && canSwitchWebappV2(stage, role) ? "v2" : "v1";
}

/** Nội dung nút/bảng thông báo (sửa ở đây là đổi mọi nơi hiển thị). */
export const WEBAPP_V2_HEADLINE = `Giao diện mstudo ${WEBAPP_V2_LABEL} sắp ra mắt`;

export const WEBAPP_V2_HIGHLIGHTS: string[] = [
  "Bố cục mới gọn gàng hơn, dễ dùng trên cả điện thoại và máy tính",
  "Thao tác nhanh hơn: tìm kiếm, tạo hợp đồng, xem lịch ngay trên thanh trên",
  "Bảng biểu & báo cáo đọc rõ hơn ở cả giao diện sáng và tối",
  "Dữ liệu giữ nguyên — chỉ đổi lớp giao diện, quay lại 1.0 được bất cứ lúc nào",
];

/** Ghi chú dưới bảng thông báo, theo từng trạng thái phát hành. */
export function webappV2Note(stage: WebappV2Stage): string {
  if (stage === "live") return "Bạn có thể chuyển qua lại giữa hai giao diện bất cứ lúc nào.";
  if (stage === "beta") return "Bản thử nghiệm nội bộ: đang kiểm thử trước khi mở cho toàn bộ studio.";
  return "Đang hoàn thiện & kiểm thử. Chúng tôi sẽ mở nút chuyển ngay khi bản 2.0 sẵn sàng.";
}

/** Nhãn ngắn hiển thị cạnh tiêu đề bảng thông báo. */
export function webappV2StageLabel(stage: WebappV2Stage): string {
  if (stage === "live") return "Đã phát hành";
  if (stage === "beta") return "Bản thử nghiệm";
  return "Sắp ra mắt";
}

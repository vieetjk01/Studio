export type Role = "admin" | "photographer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  max_albums: number | null;
  monthly_album_limit: number | null;
  can_zip: boolean;
  can_notes: boolean;
  can_galleries: boolean;
  compress_daily_limit: number | null;
  compress_picker_limit: number | null;
  can_watermark_pro: boolean;
  plan: "free" | "basic" | "photographer" | "studio";
  plan_cycle: string | null;
  plan_expires_at: string | null;
  is_active: boolean;
  created_at: string;
}

export type AlbumStatus = "draft" | "published";

export interface Album {
  id: string;
  owner_id: string;
  slug: string;
  title: string;
  description: string | null;
  cover_url: string | null;
  password_hash: string | null;
  selection_limit: number | null;
  watermark_enabled: boolean;
  watermark_text: string | null;
  download_enabled: boolean;
  status: AlbumStatus;
  is_showcase: boolean;
  is_pinned: boolean;
  kind: string | null;
  // Delivery-gallery fields (is_gallery = true)
  is_gallery: boolean;
  client_name: string | null;
  client_phone: string | null;
  event_date: string | null;
  category: string | null;
  category_label: string | null;
  gallery_pinned: boolean;
  created_at: string;
  updated_at: string;
}

export const GALLERY_CATEGORIES = [
  { value: "cuoi-hoi", label: "Cưới hỏi" },
  { value: "su-kien", label: "Sự kiện" },
  { value: "gia-dinh", label: "Gia đình" },
  { value: "video", label: "Video" },
  { value: "khac", label: "Khác" },
] as const;

export interface Feedback {
  id: string;
  album_id: string | null;
  client_name: string | null;
  rating: number | null;
  content: string;
  approved: boolean;
  created_at: string;
}

export interface SiteSettings {
  id: number;
  profile_name: string;
  profile_role: string;
  profile_location: string;
  profile_bio: string;
  profile_avatar_url: string | null;
  profile_cover_url: string | null;
  stat_years: number;
  contact_phone: string;
  contact_email: string;
  contact_instagram: string;
  contact_facebook: string | null;
  contact_tiktok: string | null;
  contact_youtube: string | null;
  contact_address: string;
  contact_hours: string;
  featured_images: string[] | null;
  basic_discount_percent: number;
  price_basic_month: number;
  price_basic_year: number;
  price_studio_month: number;
  price_studio_year: number;
  price_photographer_month: number;
  price_photographer_year: number;
  studio_promo_percent: number;
  studio_discount_percent: number;
  photographer_discount_percent: number;
  updated_at: string;
}

export interface DiscountCode {
  id: string;
  code: string;
  percent: number;
  plan: string | null;
  active: boolean;
  max_uses: number | null;
  used_count: number;
  expires_at: string | null;
  cycle: string | null;
  created_at: string;
}

export type BookingService = "wedding" | "event" | "sports" | "other";

export interface Booking {
  id: string;
  service: BookingService;
  name: string;
  phone: string;
  date: string | null;
  note: string | null;
  handled: boolean;
  created_at: string;
}

export interface UpgradeRequest {
  id: string;
  user_id: string | null;
  email: string | null;
  note: string | null;
  plan: string | null;
  cycle: string | null;
  discount_code: string | null;
  phone: string | null;
  amount: number | null;
  handled: boolean;
  created_at: string;
}

export type SourceKind = "file" | "folder";

export interface AlbumSource {
  id: string;
  album_id: string;
  name: string;
  drive_url: string;
  kind: SourceKind;
  position: number;
  created_at: string;
}

export interface Photo {
  id: string;
  album_id: string;
  source_id: string | null;
  drive_file_id: string;
  name: string;
  position: number;
  is_video: boolean;
  created_at: string;
}

export interface Selection {
  id: string;
  album_id: string;
  photo_id: string;
  photo_name: string;
  session_id: string;
  client_name: string | null;
  client_note: string | null;
  photographer_note: string | null;
  created_at: string;
}

// ── Studio module (studio.vieetjk.com) ──────────────────────────────────────

export type ShootType = "photo" | "video" | "both";
export type ContractStatus =
  | "draft"
  | "sent"
  | "approved"
  | "in_progress"
  | "completed"
  | "cancelled";
export type CrewRole = "photographer" | "cameraman" | "assistant" | "editor" | "other";
export type CrewStatus = "pending" | "accepted" | "declined";

export interface StudioContract {
  id: string;
  owner_id: string;
  code: string | null;
  title: string;
  client_name: string | null;
  client_phone: string | null;
  client_email: string | null;
  shoot_type: ShootType;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  status: ContractStatus;
  deposit: number;
  note: string | null;
  client_token: string;
  client_signed_name: string | null;
  client_signature: string | null;
  client_signed_at: string | null;
  studio_signed_name: string | null;
  studio_signature: string | null;
  studio_signed_at: string | null;
  gallery_album_id: string | null;
  client_viewed_at: string | null;
  delivery_due: string | null;
  client_messenger: string | null;
  selection_album_id: string | null;
  source: string | null;
  brief_concept: string | null;
  brief_outfit: string | null;
  brief_refs: string | null;
  brief_note: string | null;
  brief_submitted_at: string | null;
  chosen_quote_option_id: string | null;
  chosen_quote_at: string | null;
  created_at: string;
  updated_at: string;
}

export const LEAD_SOURCE_LABEL: Record<string, string> = {
  facebook: "Facebook",
  referral: "Giới thiệu",
  google: "Google / Tìm kiếm",
  walk_in: "Khách vãng lai",
  returning: "Khách cũ",
  other: "Khác",
};

export type NotificationKind =
  | "signed"
  | "edit_request"
  | "crew_accepted"
  | "crew_declined"
  | "review"
  | "payment"
  | "info";

export interface StudioNotification {
  id: string;
  owner_id: string;
  contract_id: string | null;
  kind: NotificationKind;
  message: string;
  read: boolean;
  created_at: string;
}

export interface ContractTask {
  id: string;
  contract_id: string;
  label: string;
  done: boolean;
  position: number;
  created_at: string;
}

export interface ContractTemplate {
  id: string;
  owner_id: string;
  name: string;
  shoot_type: ShootType;
  note: string | null;
  created_at: string;
}

export interface ContractTemplateItem {
  id: string;
  template_id: string;
  name: string;
  qty: number;
  unit_price: number;
  position: number;
}

export interface ContractItem {
  id: string;
  contract_id: string;
  name: string;
  qty: number;
  unit_price: number;
  position: number;
  created_at: string;
}

export interface ContractCrew {
  id: string;
  contract_id: string;
  name: string;
  phone: string | null;
  role: CrewRole;
  salary: number;
  status: CrewStatus;
  note: string | null;
  responded_at: string | null;
  paid: boolean;
  paid_at: string | null;
  position: number;
  created_at: string;
}

export type PaymentKind = "deposit" | "installment" | "final" | "other";

export interface ContractPayment {
  id: string;
  contract_id: string;
  amount: number;
  method: string | null;
  kind: PaymentKind;
  note: string | null;
  paid_at: string;
  created_at: string;
}

export interface StudioPackage {
  id: string;
  owner_id: string;
  client_name: string;
  client_phone: string | null;
  name: string;
  total_sessions: number;
  used_sessions: number;
  price: number;
  paid: boolean;
  note: string | null;
  created_at: string;
}

export interface MessageTemplate {
  id: string;
  owner_id: string;
  title: string;
  body: string;
  created_at: string;
}

export interface StudioBooking {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  service: string | null;
  preferred_date: string | null;
  note: string | null;
  status: "new" | "handled" | "archived";
  created_at: string;
}

export interface StudioEquipment {
  id: string;
  owner_id: string;
  name: string;
  category: string | null;
  note: string | null;
  active: boolean;
  created_at: string;
}

export interface ContractEquipment {
  id: string;
  contract_id: string;
  equipment_id: string | null;
  name: string;
  created_at: string;
}

export interface ContractQuoteOption {
  id: string;
  contract_id: string;
  name: string;
  price: number;
  description: string | null;
  position: number;
  created_at: string;
}

export type ProductStatus = "ordered" | "in_progress" | "done";
export const PRODUCT_STATUS_LABEL: Record<ProductStatus, string> = {
  ordered: "Đã đặt",
  in_progress: "Đang làm",
  done: "Đã giao",
};
export interface ContractProduct {
  id: string;
  contract_id: string;
  name: string;
  qty: number;
  cost: number;
  status: ProductStatus;
  note: string | null;
  position: number;
  created_at: string;
}

export interface ContractPaymentPlan {
  id: string;
  contract_id: string;
  label: string;
  amount: number;
  due_date: string | null;
  paid: boolean;
  paid_at: string | null;
  position: number;
  created_at: string;
}

export interface StudioExpense {
  id: string;
  owner_id: string;
  contract_id: string | null;
  title: string;
  amount: number;
  category: string | null;
  note: string | null;
  spent_at: string;
  created_at: string;
}

export interface ContractEditRequest {
  id: string;
  contract_id: string;
  message: string;
  status: "open" | "resolved";
  created_at: string;
  resolved_at: string | null;
}

export interface StudioCrew {
  id: string;
  owner_id: string;
  name: string;
  phone: string;
  role: CrewRole;
  note: string | null;
  created_at: string;
}

export interface StudioEvent {
  id: string;
  owner_id: string;
  contract_id: string | null;
  title: string;
  event_date: string;
  event_time: string | null;
  note: string | null;
  remind: boolean;
  created_at: string;
}

export const SHOOT_TYPE_LABEL: Record<ShootType, string> = {
  photo: "Chụp ảnh",
  video: "Quay phim",
  both: "Chụp & Quay",
};

export const CONTRACT_STATUS_LABEL: Record<ContractStatus, string> = {
  draft: "Nháp",
  sent: "Đã gửi khách",
  approved: "Khách duyệt",
  in_progress: "Đang thực hiện",
  completed: "Hoàn thành",
  cancelled: "Đã huỷ",
};

export const CREW_ROLE_LABEL: Record<CrewRole, string> = {
  photographer: "Photographer",
  cameraman: "Cameraman",
  assistant: "Trợ lý",
  editor: "Sửa ảnh / Dựng phim",
  other: "Khác",
};

export const CREW_STATUS_LABEL: Record<CrewStatus, string> = {
  pending: "Chờ phản hồi",
  accepted: "Đã nhận",
  declined: "Từ chối",
};

export const PAYMENT_KIND_LABEL: Record<PaymentKind, string> = {
  deposit: "Đặt cọc",
  installment: "Thanh toán đợt",
  final: "Tất toán",
  other: "Khác",
};

export const EXPENSE_CATEGORY_LABEL: Record<string, string> = {
  equipment: "Thiết bị",
  rent: "Thuê mặt bằng / studio",
  props: "Đạo cụ / trang phục",
  travel: "Di chuyển",
  marketing: "Marketing",
  outsource: "Thuê ngoài",
  other: "Khác",
};

/** Sum of a list of payment amounts. */
export function sumAmounts(rows: { amount: number }[]): number {
  return rows.reduce((s, r) => s + (r.amount || 0), 0);
}

/** Total contract value = sum(qty × unit_price). */
export function contractTotal(items: { qty: number; unit_price: number }[]): number {
  return items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0);
}

/** Format a VND amount in full with thousands separators (e.g. 1.500.000đ). */
export function vnd(n: number | null | undefined): string {
  const v = Math.round(n || 0);
  return v.toLocaleString("vi-VN") + "đ";
}

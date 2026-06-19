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

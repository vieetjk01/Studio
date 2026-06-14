export type Role = "admin" | "photographer";

export interface Profile {
  id: string;
  email: string;
  full_name: string | null;
  role: Role;
  max_albums: number | null;
  can_zip: boolean;
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
  status: AlbumStatus;
  is_showcase: boolean;
  is_pinned: boolean;
  kind: string | null;
  created_at: string;
  updated_at: string;
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
  contact_address: string;
  contact_hours: string;
  updated_at: string;
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

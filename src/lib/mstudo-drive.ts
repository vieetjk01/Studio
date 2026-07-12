import "server-only";
import { Readable } from "stream";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

// Lưu NỘI DUNG NGƯỜI DÙNG (logo, ảnh…) vào Google Drive của ADMIN mstudo, trong
// một thư mục riêng — không dùng dung lượng Supabase. Tái dụng OAuth client của
// tính năng Story (scope drive.file → không cần Google review).

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
// Redirect riêng cho luồng kết nối Drive của admin (đăng ký trong Google Cloud).
const REDIRECT = process.env.GOOGLE_ADMIN_DRIVE_REDIRECT_URI || "";
const SCOPE = "https://www.googleapis.com/auth/drive.file";
const FOLDER_NAME = "mstudo · Nội dung người dùng";

export function adminDriveConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT);
}

function oauth() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
}

/** URL đưa admin sang Google để cấp quyền Drive. */
export function adminDriveAuthUrl(): string {
  return oauth().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [SCOPE], state: "admin" });
}

type Row = { drive_refresh_token: string | null; drive_folder_id: string | null };

async function loadSettings(): Promise<Row | null> {
  const db = createAdminClient();
  const { data } = await db.from("site_settings").select("drive_refresh_token, drive_folder_id").eq("id", 1).maybeSingle();
  return (data as Row) ?? null;
}

/** Đổi code lấy refresh_token và lưu vào site_settings (id=1). */
export async function connectAdminDrive(code: string): Promise<void> {
  const o = oauth();
  const { tokens } = await o.getToken(code);
  if (!tokens.refresh_token) throw new Error("no_refresh_token");
  const db = createAdminClient();
  await db.from("site_settings").update({ drive_refresh_token: tokens.refresh_token, drive_folder_id: null }).eq("id", 1);
}

/** Đã kết nối Drive admin chưa? */
export async function adminDriveConnected(): Promise<boolean> {
  const s = await loadSettings();
  return !!s?.drive_refresh_token;
}

/** Ngắt kết nối (xoá token). */
export async function disconnectAdminDrive(): Promise<void> {
  const db = createAdminClient();
  await db.from("site_settings").update({ drive_refresh_token: null, drive_folder_id: null }).eq("id", 1);
}

/** Client Drive đã xác thực + thư mục lưu (tạo 1 lần). */
async function driveCtx() {
  const s = await loadSettings();
  if (!s?.drive_refresh_token) return null;
  const o = oauth();
  o.setCredentials({ refresh_token: s.drive_refresh_token });
  const drive = google.drive({ version: "v3", auth: o });
  let folderId = s.drive_folder_id;
  if (!folderId) {
    const res = await drive.files.create({
      requestBody: { name: FOLDER_NAME, mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = res.data.id || null;
    if (folderId) {
      await createAdminClient().from("site_settings").update({ drive_folder_id: folderId }).eq("id", 1);
    }
  }
  return folderId ? { drive, folderId } : null;
}

/**
 * Upload file vào Drive admin, đặt công khai (anyone reader) để /api/img phục vụ.
 * Trả về file id, hoặc null nếu chưa kết nối / lỗi.
 */
export async function uploadToAdminDrive(buf: Buffer, name: string, mime: string): Promise<string | null> {
  const ctx = await driveCtx();
  if (!ctx) return null;
  const res = await ctx.drive.files.create({
    requestBody: { name: name || "upload", parents: [ctx.folderId] },
    media: { mimeType: mime || "application/octet-stream", body: Readable.from(buf) },
    fields: "id",
  });
  const id = res.data.id;
  if (!id) return null;
  await ctx.drive.permissions.create({ fileId: id, requestBody: { role: "reader", type: "anyone" } }).catch(() => {});
  return id;
}

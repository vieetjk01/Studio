import "server-only";
import crypto from "crypto";

/**
 * Mã hoá phiên đăng nhập Zalo cá nhân (cookie + imei + userAgent) trước khi lưu
 * vào `studio_zalo.personal_session`. Đây là thông tin đăng nhập SỐNG của tài
 * khoản Zalo cá nhân của studio — nếu lộ, kẻ khác có thể chiếm phiên. Bảng đã
 * REVOKE anon/authenticated (chỉ service-role đọc), nhưng vẫn mã hoá thêm một
 * lớp AES-256-GCM để phòng lộ dump DB / backup.
 *
 * Khoá suy ra từ ZALO_SESSION_SECRET (hoặc OAUTH_STATE_SECRET / service-role key
 * để không phải cấu hình thêm). Đọc lazy để `next build` không chết khi thiếu env.
 */
function key(): Buffer {
  const secret =
    process.env.ZALO_SESSION_SECRET ||
    process.env.OAUTH_STATE_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (secret) return crypto.createHash("sha256").update(secret).digest(); // 32 bytes
  if (process.env.NODE_ENV === "production") {
    throw new Error("ZALO_SESSION_SECRET (hoặc OAUTH_STATE_SECRET) là bắt buộc ở production");
  }
  return crypto.createHash("sha256").update("dev-insecure-zalo-session").digest();
}

/** Trả về chuỗi `iv.tag.ciphertext` (base64) — an toàn để lưu text. */
export function encryptJSON(obj: unknown): string {
  const iv = crypto.randomBytes(12);
  const cipher = crypto.createCipheriv("aes-256-gcm", key(), iv);
  const data = Buffer.concat([cipher.update(JSON.stringify(obj), "utf8"), cipher.final()]);
  const tag = cipher.getAuthTag();
  return `${iv.toString("base64")}.${tag.toString("base64")}.${data.toString("base64")}`;
}

/** Giải mã chuỗi do encryptJSON tạo; trả null nếu hỏng/sai khoá. */
export function decryptJSON<T = unknown>(blob: string | null | undefined): T | null {
  if (!blob) return null;
  const parts = blob.split(".");
  if (parts.length !== 3) return null;
  try {
    const iv = Buffer.from(parts[0], "base64");
    const tag = Buffer.from(parts[1], "base64");
    const data = Buffer.from(parts[2], "base64");
    const decipher = crypto.createDecipheriv("aes-256-gcm", key(), iv);
    decipher.setAuthTag(tag);
    const out = Buffer.concat([decipher.update(data), decipher.final()]);
    return JSON.parse(out.toString("utf8")) as T;
  } catch {
    return null;
  }
}

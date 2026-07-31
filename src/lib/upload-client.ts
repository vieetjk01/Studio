"use client";

import { createClient } from "@/lib/supabase/client";

/** Chuyển data URL → Blob. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

// Trần body của serverless trên Vercel là ~4.5MB. Trên mức này, POST tới
// /api/upload hỏng trước cả khi chạm route — nên phải đi đường hai bước. Chừa
// biên an toàn vì multipart còn cõng thêm header.
const DIRECT_MAX = 4 * 1024 * 1024;

/**
 * Tải ảnh LỚN: xin URL ký sẵn → đẩy thẳng lên Storage (không qua serverless,
 * không vướng trần body) → nhờ server chuyển sang Drive và xoá bản tạm.
 */
async function uploadLarge(blob: Blob, opts?: { bucket?: string; filename?: string; original?: boolean }): Promise<string> {
  const ext = (opts?.filename?.split(".").pop() || "jpg").toLowerCase();
  const r = await fetch("/api/upload/large", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ ext, bucket: opts?.bucket }),
  });
  if (!r.ok) throw new Error("sign_failed");
  const signed = (await r.json()) as { path: string; token: string; bucket: string };

  const { error } = await createClient()
    .storage.from(signed.bucket)
    .uploadToSignedUrl(signed.path, signed.token, blob, { contentType: blob.type || "image/jpeg" });
  if (error) throw new Error(error.message);

  const f = await fetch("/api/upload/finalize", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({ path: signed.path, bucket: signed.bucket, original: opts?.original }),
  });
  const data = await f.json().catch(() => ({}));
  if (!f.ok || !data.url) throw new Error(data.error || "finalize_failed");
  return data.url as string;
}

/**
 * Upload 1 ảnh (Blob/File) — ưu tiên Drive admin, fallback Supabase. Trả về URL
 * ảnh. Ném lỗi nếu thất bại (caller có thể tự fallback).
 *
 * Ảnh nhỏ đi thẳng qua /api/upload; ảnh lớn tự chuyển sang luồng hai bước để
 * không chết ở trần body của Vercel. Cả hai đường đều kết thúc trên Drive.
 */
export async function uploadImage(
  blob: Blob,
  opts?: { bucket?: string; filename?: string; original?: boolean },
): Promise<string> {
  if (blob.size > DIRECT_MAX) return uploadLarge(blob, opts);

  const fd = new FormData();
  fd.append("file", new File([blob], opts?.filename || "image.webp", { type: blob.type || "image/webp" }));
  if (opts?.bucket) fd.append("bucket", opts.bucket);
  if (opts?.original) fd.append("original", "1");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "upload_failed");
  return data.url as string;
}

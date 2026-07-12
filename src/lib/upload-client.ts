"use client";

/** Chuyển data URL → Blob. */
export async function dataUrlToBlob(dataUrl: string): Promise<Blob> {
  return (await fetch(dataUrl)).blob();
}

/**
 * Upload 1 ảnh (Blob/File) qua /api/upload — ưu tiên Drive admin, fallback
 * Supabase. Trả về URL ảnh. Ném lỗi nếu thất bại (caller có thể tự fallback).
 */
export async function uploadImage(
  blob: Blob,
  opts?: { bucket?: string; filename?: string; original?: boolean },
): Promise<string> {
  const fd = new FormData();
  fd.append("file", new File([blob], opts?.filename || "image.webp", { type: blob.type || "image/webp" }));
  if (opts?.bucket) fd.append("bucket", opts.bucket);
  if (opts?.original) fd.append("original", "1");
  const res = await fetch("/api/upload", { method: "POST", body: fd });
  const data = await res.json().catch(() => ({}));
  if (!res.ok || !data.url) throw new Error(data.error || "upload_failed");
  return data.url as string;
}

// Client-side image downscale + compression before storing on a site.
// Keeps uploads small: caps the longest edge and re-encodes as JPEG/WebP.
// Returns a data: URL (or the original data URL if anything fails).

// Largest original file we accept for an upload. Bigger files are rejected
// before processing (decoding a huge image can hang/crash the browser); the
// result is then downscaled + re-encoded so stored pages stay light.
export const MAX_IMAGE_UPLOAD_MB = 2;

/** True if a picked file is an acceptable image within the size limit. */
export function checkImageFile(file: File): { ok: true } | { ok: false; error: string } {
  if (!file.type.startsWith("image/")) return { ok: false, error: "Tệp không phải hình ảnh." };
  if (file.size > MAX_IMAGE_UPLOAD_MB * 1024 * 1024)
    return { ok: false, error: `Ảnh quá lớn (tối đa ${MAX_IMAGE_UPLOAD_MB}MB). Hãy chọn ảnh nhỏ hơn.` };
  return { ok: true };
}

export async function compressImage(
  file: File,
  { maxDim = 1600, quality = 0.82, mime = "image/webp" }: { maxDim?: number; quality?: number; mime?: string } = {}
): Promise<string> {
  const dataUrl = await new Promise<string>((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result));
    r.onerror = reject;
    r.readAsDataURL(file);
  });

  // SVG/GIF: don't rasterize (would lose animation/vectors) — return as-is.
  if (file.type === "image/svg+xml" || file.type === "image/gif") return dataUrl;

  try {
    const img = await new Promise<HTMLImageElement>((resolve, reject) => {
      const i = new Image();
      i.onload = () => resolve(i);
      i.onerror = reject;
      i.src = dataUrl;
    });
    const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
    const w = Math.max(1, Math.round(img.width * scale));
    const h = Math.max(1, Math.round(img.height * scale));
    const canvas = document.createElement("canvas");
    canvas.width = w;
    canvas.height = h;
    const ctx = canvas.getContext("2d");
    if (!ctx) return dataUrl;
    ctx.drawImage(img, 0, 0, w, h);
    const out = canvas.toDataURL(mime, quality);
    // Use whichever is smaller (re-encoding tiny images can grow them).
    return out.length < dataUrl.length ? out : dataUrl;
  } catch {
    return dataUrl;
  }
}

/** Kích thước byte thực của một data URL (bỏ phần header, base64 → byte). */
export function dataUrlBytes(u: string): number {
  const i = u.indexOf(",");
  const b64 = i >= 0 ? u.slice(i + 1) : u;
  return Math.ceil((b64.length * 3) / 4);
}

/** Ngưỡng mặc định cho ảnh sau khi nén (1MB). */
export const IMAGE_TARGET_BYTES = 1024 * 1024;

/**
 * Nén ảnh xuống DƯỚI `maxBytes` (mặc định 1MB): hạ dần chất lượng rồi hạ kích
 * thước cho tới khi đạt ngưỡng. Luôn trả về data URL (lần cuối nhỏ nhất).
 */
export async function compressToLimit(file: File, maxBytes = IMAGE_TARGET_BYTES): Promise<string> {
  // SVG/GIF không rasterize được — trả nguyên (đã qua checkImageFile ≤2MB).
  if (file.type === "image/svg+xml" || file.type === "image/gif") {
    return compressImage(file);
  }
  let dim = 1600;
  for (const quality of [0.82, 0.72, 0.62, 0.52, 0.44]) {
    const out = await compressImage(file, { maxDim: dim, quality, mime: "image/webp" });
    if (dataUrlBytes(out) <= maxBytes) return out;
    dim = Math.max(900, Math.round(dim * 0.85));
  }
  return compressImage(file, { maxDim: 900, quality: 0.4, mime: "image/webp" });
}

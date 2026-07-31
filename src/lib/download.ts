"use client";

function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = src;
  });
}

/** Draw a tiled, diagonal watermark over an image and return a JPEG blob. */
async function watermarkImage(img: HTMLImageElement, text: string): Promise<Blob> {
  const canvas = document.createElement("canvas");
  canvas.width = img.naturalWidth;
  canvas.height = img.naturalHeight;
  const ctx = canvas.getContext("2d")!;
  ctx.drawImage(img, 0, 0);

  const fontSize = Math.max(18, Math.round(canvas.width / 28));
  ctx.font = `600 ${fontSize}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,0.28)";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";

  const stepX = fontSize * 12;
  const stepY = fontSize * 6;
  ctx.save();
  ctx.translate(canvas.width / 2, canvas.height / 2);
  ctx.rotate((-30 * Math.PI) / 180);
  ctx.translate(-canvas.width / 2, -canvas.height / 2);
  for (let y = -canvas.height; y < canvas.height * 2; y += stepY) {
    for (let x = -canvas.width; x < canvas.width * 2; x += stepX) {
      ctx.fillText(text, x, y);
    }
  }
  ctx.restore();

  return new Promise((resolve) =>
    canvas.toBlob((b) => resolve(b!), "image/jpeg", 0.9)
  );
}

export interface ZipItem {
  fileId: string;
  name: string;
}

/**
 * Build a ZIP of the given Drive images (fetched through our proxy), applying
 * a watermark when requested. Calls onProgress(done, total) as it goes.
 */
export async function buildZip(
  items: ZipItem[],
  opts: {
    watermark?: string | null;
    width?: number;
    /** Fetch full-resolution originals from Drive (?orig=1) instead of a resized proxy. */
    original?: boolean;
    onProgress?: (d: number, t: number) => void;
  }
): Promise<Blob> {
  // Nạp JSZip (~95KB gzip) lười — chỉ khi người dùng thật sự bấm tải ZIP,
  // để nó không nằm trong first-load JS của các trang album công khai.
  const { default: JSZip } = await import("jszip");
  const zip = new JSZip();
  const width = opts.width ?? 2000;
  let done = 0;

  for (const item of items) {
    try {
      // Originals: pull the untouched file from Drive (no resize, no watermark).
      // These CANNOT go direct like downloadImage() does — a ZIP needs the bytes
      // inside JS, and Drive serves no CORS headers, so the fetch would fail.
      // The zero-bandwidth bulk path is the Drive FOLDER link (DriveDownload in
      // the gallery), which lets Google zip and serve the whole set itself.
      const url = opts.original
        ? `/api/img?id=${encodeURIComponent(item.fileId)}&orig=1`
        : `/api/img?id=${encodeURIComponent(item.fileId)}&w=${width}`;
      if (opts.watermark && !opts.original) {
        const img = await loadImage(url);
        const blob = await watermarkImage(img, opts.watermark);
        zip.file(ensureExt(item.name, "jpg"), blob);
      } else {
        const res = await fetch(url);
        const blob = await res.blob();
        zip.file(ensureExt(item.name, "jpg"), blob);
      }
    } catch {
      // skip files that fail to download
    }
    done += 1;
    opts.onProgress?.(done, items.length);
  }

  return zip.generateAsync({ type: "blob" });
}

function ensureExt(name: string, fallback: string): string {
  return /\.[a-z0-9]{2,4}$/i.test(name) ? name : `${name}.${fallback}`;
}

/**
 * Tải một ảnh Drive lẻ. Nếu có `watermark` → đóng watermark bằng canvas (ảnh
 * ~2560px) để ảnh tải về vẫn được bảo vệ; nếu không → tải THẲNG từ Drive.
 */
export async function downloadImage(fileId: string, name: string, watermark?: string | null): Promise<void> {
  if (watermark) {
    const img = await loadImage(`/api/img?id=${encodeURIComponent(fileId)}&w=2560`);
    const blob = await watermarkImage(img, watermark);
    triggerDownload(blob, ensureExt(name, "jpg"));
    return;
  }
  // Không watermark ⇒ khách nhận đúng file gốc, nên để Google phục vụ luôn.
  // /api/img?dl=1 chỉ 302 sang Drive: không byte nào đi qua Vercel/Supabase
  // (ảnh gốc trung bình ~11 MB — tải thẳng là khác biệt lớn nhất về băng thông).
  // Drive trả Content-Disposition: attachment nên trình duyệt tải xuống mà
  // không rời trang. Đánh đổi: tên file là tên trên Drive, vì thuộc tính
  // `download` không có hiệu lực sau khi chuyển hướng sang miền khác.
  const a = document.createElement("a");
  a.href = `/api/img?id=${encodeURIComponent(fileId)}&dl=1`;
  a.rel = "noopener";
  a.click();
}

export function triggerDownload(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}

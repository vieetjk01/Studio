"use client";

/**
 * Client-side image compression + watermarking. Everything runs in the browser
 * on a <canvas>; originals never leave the machine (local files) and Drive
 * images are fetched through our own /api/img proxy (same-origin, so the canvas
 * is never tainted and can be exported).
 */

export type OutputFormat = "image/jpeg" | "image/webp" | "image/png";

export type WmPosition =
  | "tile"
  | "center"
  | "bottom-right"
  | "bottom-left"
  | "top-right"
  | "top-left"
  | "bottom-center";

export interface WatermarkOptions {
  type: "text" | "image";
  position: WmPosition;
  opacity: number; // 0..1
  // text
  text?: string;
  color?: "white" | "black";
  textScale?: number; // font size as a fraction of the image width (e.g. 0.04)
  // image
  image?: HTMLImageElement | null;
  imageScale?: number; // watermark width as a fraction of the image width (e.g. 0.22)
}

export interface CompressOptions {
  quality: number; // 0..1 (JPEG / WebP)
  maxDim: number; // longest side cap in px; 0 = keep original size
  format: OutputFormat;
  watermark?: WatermarkOptions | null;
}

export interface CompressResult {
  blob: Blob;
  width: number;
  height: number;
}

/** Load an <img> from a URL (or object URL). */
export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("image_load_failed"));
    img.src = src;
  });
}

/** Load an <img> from a File / Blob (revokes the object URL afterwards). */
export function loadImageFromBlob(blob: Blob): Promise<HTMLImageElement> {
  const url = URL.createObjectURL(blob);
  return loadImage(url).finally(() => URL.revokeObjectURL(url)) as Promise<HTMLImageElement>;
}

function paddingFor(w: number, h: number): number {
  return Math.round(Math.min(w, h) * 0.03);
}

/** Draw the watermark onto an already-rendered canvas context. */
function drawWatermark(
  ctx: CanvasRenderingContext2D,
  cw: number,
  ch: number,
  wm: WatermarkOptions
) {
  ctx.save();
  ctx.globalAlpha = wm.opacity;

  if (wm.type === "text") {
    const text = (wm.text ?? "").trim();
    if (!text) {
      ctx.restore();
      return;
    }
    const fontSize = Math.max(14, Math.round(cw * (wm.textScale ?? 0.04)));
    ctx.font = `600 ${fontSize}px sans-serif`;
    ctx.fillStyle = wm.color === "black" ? "rgba(0,0,0,1)" : "rgba(255,255,255,1)";
    // Soft shadow so light text stays readable on bright photos.
    ctx.shadowColor = wm.color === "black" ? "rgba(255,255,255,0.35)" : "rgba(0,0,0,0.45)";
    ctx.shadowBlur = Math.max(2, Math.round(fontSize * 0.12));

    if (wm.position === "tile") {
      ctx.textAlign = "center";
      ctx.textBaseline = "middle";
      const stepX = fontSize * 12;
      const stepY = fontSize * 6;
      ctx.translate(cw / 2, ch / 2);
      ctx.rotate((-30 * Math.PI) / 180);
      ctx.translate(-cw / 2, -ch / 2);
      for (let y = -ch; y < ch * 2; y += stepY) {
        for (let x = -cw; x < cw * 2; x += stepX) {
          ctx.fillText(text, x, y);
        }
      }
    } else {
      const pad = paddingFor(cw, ch);
      const { x, align } = horizontal(wm.position, cw, pad);
      const { y, baseline } = vertical(wm.position, ch, pad);
      ctx.textAlign = align;
      ctx.textBaseline = baseline;
      ctx.fillText(text, x, y);
    }
  } else if (wm.type === "image" && wm.image) {
    const img = wm.image;
    const targetW = cw * (wm.imageScale ?? 0.22);
    const ratio = img.naturalHeight / img.naturalWidth || 1;
    const w = targetW;
    const h = targetW * ratio;
    const pad = paddingFor(cw, ch);

    let x = pad;
    let y = pad;
    if (wm.position === "center") {
      x = (cw - w) / 2;
      y = (ch - h) / 2;
    } else {
      if (wm.position.includes("right")) x = cw - w - pad;
      if (wm.position.startsWith("bottom")) y = ch - h - pad;
      if (wm.position === "bottom-center") x = (cw - w) / 2;
    }
    if (wm.position === "tile") {
      // Tile the logo across the image.
      const stepX = w * 1.8;
      const stepY = h * 2.4;
      for (let yy = 0; yy < ch; yy += stepY) {
        for (let xx = 0; xx < cw; xx += stepX) {
          ctx.drawImage(img, xx, yy, w, h);
        }
      }
    } else {
      ctx.drawImage(img, x, y, w, h);
    }
  }

  ctx.restore();
}

function horizontal(pos: WmPosition, cw: number, pad: number): { x: number; align: CanvasTextAlign } {
  if (pos === "center" || pos === "bottom-center") return { x: cw / 2, align: "center" };
  if (pos.includes("right")) return { x: cw - pad, align: "right" };
  return { x: pad, align: "left" };
}

function vertical(pos: WmPosition, ch: number, pad: number): { y: number; baseline: CanvasTextBaseline } {
  if (pos === "center") return { y: ch / 2, baseline: "middle" };
  if (pos.startsWith("top")) return { y: pad, baseline: "top" };
  return { y: ch - pad, baseline: "bottom" };
}

/**
 * Compress (and optionally watermark) a loaded image. Resizes down to maxDim on
 * the longest side when requested, then re-encodes at the chosen quality.
 */
export async function compressImage(
  img: HTMLImageElement,
  opts: CompressOptions
): Promise<CompressResult> {
  const ow = img.naturalWidth;
  const oh = img.naturalHeight;

  let w = ow;
  let h = oh;
  if (opts.maxDim > 0) {
    const longest = Math.max(ow, oh);
    if (longest > opts.maxDim) {
      const k = opts.maxDim / longest;
      w = Math.round(ow * k);
      h = Math.round(oh * k);
    }
  }

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d")!;
  ctx.imageSmoothingEnabled = true;
  ctx.imageSmoothingQuality = "high";
  ctx.drawImage(img, 0, 0, w, h);

  if (opts.watermark) drawWatermark(ctx, w, h, opts.watermark);

  const blob: Blob = await new Promise((resolve, reject) =>
    canvas.toBlob(
      (b) => (b ? resolve(b) : reject(new Error("encode_failed"))),
      opts.format,
      opts.quality
    )
  );

  return { blob, width: w, height: h };
}

/** File extension for an output format. */
export function formatExt(format: OutputFormat): string {
  if (format === "image/webp") return "webp";
  if (format === "image/png") return "png";
  return "jpg";
}

/** Swap a filename's extension to match the output format. */
export function outName(name: string, format: OutputFormat): string {
  const base = name.replace(/\.[^./\\]+$/, "");
  return `${base}.${formatExt(format)}`;
}

export function formatBytes(n: number): string {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / (1024 * 1024)).toFixed(2)} MB`;
}

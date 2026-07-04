import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

// Not force-dynamic: the response is content-addressed by (id, w) and cacheable.
// The runtime is still dynamic because we read query params, but dropping
// force-dynamic lets Vercel's CDN honour the Cache-Control below.
export const runtime = "nodejs";

// A real browser UA — some Google endpoints are picky about non-browser UAs.
const UA = "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0 Safari/537.36";

// A Drive file's image at a given width never changes, so cache hard. The
// s-maxage lets Vercel's edge/CDN serve repeats WITHOUT re-hitting this function
// — a CDN hit does not count against Fast Origin Transfer.
const CACHE_OK = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400, immutable";
const CACHE_ERR = "public, max-age=0, s-maxage=60"; // don't pin failures for long

// Optional durable offload: set DRIVE_IMG_CACHE_BUCKET to a PUBLIC Supabase
// Storage bucket. Cached images then 302-redirect straight to Supabase's CDN,
// so Vercel serves ~0 image bytes. Unset → plain proxy (still edge-cached).
const BUCKET = process.env.DRIVE_IMG_CACHE_BUCKET || "";
const SUPA_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || "";

function cacheKey(id: string, width: number) { return `${id}_w${width}.jpg`; }
function publicUrl(key: string) { return `${SUPA_URL}/storage/v1/object/public/${BUCKET}/${key}`; }

/** Fetch the image bytes from Google, trying several endpoints in turn. */
async function fetchFromGoogle(id: string, width: number): Promise<Response | null> {
  const thumb = `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  const lh3 = `https://lh3.googleusercontent.com/d/${id}=w${width}`;
  const dl = `https://drive.usercontent.google.com/download?id=${id}&export=view`;
  // Thumbnail endpoint renders both images and video posters; lh3 gives the
  // best quality for larger requests.
  const sources = width <= 1024 ? [thumb, lh3, dl] : [lh3, thumb, dl, `https://drive.google.com/uc?export=download&id=${id}`];

  for (const url of sources) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 7000);
      const res = await fetch(url, { cache: "no-store", redirect: "follow", headers: { "User-Agent": UA }, signal: ctrl.signal }).finally(() => clearTimeout(timer));
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && ct.startsWith("image/")) {
        const len = Number(res.headers.get("content-length") || "0");
        if (len && len < 100) continue; // tiny = placeholder, try next source
        return res;
      }
    } catch { /* try next source */ }
  }
  return null;
}

/**
 * Fetch the ORIGINAL full-resolution file (no downscale) — used by the album
 * designer's print export so quality is preserved. Longer timeout for big files.
 */
async function fetchOriginal(id: string): Promise<Response | null> {
  const sources = [
    `https://lh3.googleusercontent.com/d/${id}=s0`, // s0 = original size
    `https://drive.usercontent.google.com/download?id=${id}&export=download`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];
  for (const url of sources) {
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 25000);
      const res = await fetch(url, { cache: "no-store", redirect: "follow", headers: { "User-Agent": UA }, signal: ctrl.signal }).finally(() => clearTimeout(timer));
      const ct = res.headers.get("content-type") ?? "";
      if (res.ok && ct.startsWith("image/")) return res;
    } catch { /* try next */ }
  }
  return null;
}

/**
 * Proxy a Google Drive image so it embeds reliably (no hotlink/referrer issues)
 * and can be fetched cross-origin for ZIP download. Streams the bytes and lets
 * the CDN cache them; optionally offloads serving to Supabase Storage.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  // Original-quality mode (album export): stream the full-resolution file as-is,
  // no width clamp, no re-encode — preserves the original quality for print.
  if (searchParams.get("orig") === "1") {
    const res = await fetchOriginal(id);
    if (!res || !res.body) return NextResponse.json({ error: "fetch_failed" }, { status: 502, headers: { "Cache-Control": CACHE_ERR } });
    return new NextResponse(res.body, { headers: { "Content-Type": res.headers.get("content-type") || "image/jpeg", "Cache-Control": CACHE_OK } });
  }

  // Clamp width: never proxy anything huge (caps origin transfer per request).
  // 2560 keeps the "download original" path (w=2400) working.
  const width = Math.min(Math.max(Number(searchParams.get("w")) || 500, 16), 2560);

  // ── Durable offload path ────────────────────────────────────────────────
  if (BUCKET && SUPA_URL) {
    const key = cacheKey(id, width);
    const pub = publicUrl(key);
    try {
      // HEAD is bodyless → negligible transfer. Cache hit → bounce to the CDN.
      const head = await fetch(pub, { method: "HEAD" });
      if (head.ok) {
        return new NextResponse(null, { status: 302, headers: { Location: pub, "Cache-Control": CACHE_OK } });
      }
    } catch { /* fall through to proxy + cache */ }

    const res = await fetchFromGoogle(id, width);
    if (!res) return NextResponse.json({ error: "fetch_failed", hint: "Ảnh có thể chưa được chia sẻ công khai trên Drive." }, { status: 502, headers: { "Cache-Control": CACHE_ERR } });
    const ct = res.headers.get("content-type") || "image/jpeg";
    const buf = Buffer.from(await res.arrayBuffer());
    // Best-effort cache for next time (upsert so concurrent misses are fine).
    createAdminClient().storage.from(BUCKET).upload(key, buf, { contentType: ct, upsert: true, cacheControl: "31536000" }).catch(() => {});
    return new NextResponse(buf, { headers: { "Content-Type": ct, "Cache-Control": CACHE_OK } });
  }

  // ── Plain proxy path (edge-cached) ───────────────────────────────────────
  const res = await fetchFromGoogle(id, width);
  if (!res || !res.body) {
    return NextResponse.json({ error: "fetch_failed", hint: "Ảnh có thể chưa được chia sẻ công khai trên Drive." }, { status: 502, headers: { "Cache-Control": CACHE_ERR } });
  }
  // Stream the body straight through — no arrayBuffer() buffering in the function.
  return new NextResponse(res.body, {
    headers: { "Content-Type": res.headers.get("content-type") || "image/jpeg", "Cache-Control": CACHE_OK },
  });
}

import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

const UA = "Mozilla/5.0 (compatible; mstudoGallery/1.0)";

/**
 * Proxy a Google Drive image so it embeds reliably (no hotlink/referrer issues)
 * and can be fetched cross-origin for the ZIP download. Fetches the bytes
 * server-side, trying several Google endpoints in turn.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const w = searchParams.get("w") ?? "1600";

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const width = Number(w) || 1600;
  const thumb = `https://drive.google.com/thumbnail?id=${id}&sz=w${width}`;
  const lh3 = `https://lh3.googleusercontent.com/d/${id}=w${width}`;
  // For thumbnail sizes, Drive's thumbnail endpoint works for BOTH images and
  // videos (poster frame); lh3 doesn't render videos. For full-size requests
  // prefer lh3 (original quality).
  const sources =
    width <= 1024
      ? [thumb, lh3, `https://drive.usercontent.google.com/download?id=${id}&export=view`]
      : [lh3, thumb, `https://drive.usercontent.google.com/download?id=${id}&export=view`, `https://drive.google.com/uc?export=download&id=${id}`];

  let lastStatus = 0;
  for (const url of sources) {
    try {
      const res = await fetch(url, {
        cache: "no-store",
        redirect: "follow",
        headers: { "User-Agent": UA },
      });
      lastStatus = res.status;
      const contentType = res.headers.get("content-type") ?? "";
      if (res.ok && contentType.startsWith("image/")) {
        const buf = await res.arrayBuffer();
        if (buf.byteLength < 100) continue; // tiny = placeholder, try next
        return new NextResponse(buf, {
          headers: {
            "Content-Type": contentType,
            // A given (id,w) is immutable, so cache hard in the browser AND on
            // the Vercel CDN edge (s-maxage) — first view proxies from Drive,
            // every later view / preload is served instantly from cache.
            "Cache-Control": "public, max-age=31536000, s-maxage=31536000, stale-while-revalidate=604800, immutable",
          },
        });
      }
    } catch {
      // try next source
    }
  }

  return NextResponse.json(
    { error: "fetch_failed", hint: "Ảnh có thể chưa được chia sẻ công khai trên Drive.", lastStatus },
    { status: 502 }
  );
}

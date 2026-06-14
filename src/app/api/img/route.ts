import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Proxy a Google Drive image so it can be fetched cross-origin (for the ZIP
 * download / canvas watermarking). Streams the bytes through our origin.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  const w = searchParams.get("w") ?? "1600";

  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }

  const sources = [
    `https://lh3.googleusercontent.com/d/${id}=w${w}`,
    `https://drive.google.com/thumbnail?id=${id}&sz=w${w}`,
    `https://drive.google.com/uc?export=download&id=${id}`,
  ];

  for (const url of sources) {
    try {
      const res = await fetch(url, { cache: "no-store" });
      if (res.ok && res.body) {
        const contentType = res.headers.get("content-type") ?? "image/jpeg";
        if (!contentType.startsWith("image/")) continue;
        return new NextResponse(res.body, {
          headers: {
            "Content-Type": contentType,
            "Cache-Control": "public, max-age=3600",
          },
        });
      }
    } catch {
      // try next source
    }
  }

  return NextResponse.json({ error: "fetch_failed" }, { status: 502 });
}

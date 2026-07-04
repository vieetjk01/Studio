import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { resolveSource } from "@/lib/drive-server";
import { isFolderLink } from "@/lib/drive";

export const dynamic = "force-dynamic";

/**
 * List images in a Google Drive folder for the Album Designer library.
 * Studio-authenticated (not token-gated). Returns proxied thumb + a high-res
 * URL used for client-side page export.
 */
export async function GET(req: Request) {
  const profile = await requireStudio();
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.GOOGLE_API_KEY) return NextResponse.json({ error: "no_api_key", photos: [] }, { status: 200 });

  const folder = (new URL(req.url).searchParams.get("folder") || "").trim();
  if (!folder) return NextResponse.json({ error: "no_folder", photos: [] }, { status: 400 });

  try {
    const { files } = await resolveSource(folder, isFolderLink(folder) ? "folder" : "file");
    const photos = files.map((f) => ({
      id: f.id,
      name: f.name,
      thumb: `/api/img?id=${f.id}&w=400`,
      // Original-resolution source for print export (quality preserved).
      full: `/api/img?id=${f.id}&orig=1`,
      // True original pixel size (from Drive metadata) — powers the print DPI check.
      w: f.imageMediaMetadata?.width ?? null,
      h: f.imageMediaMetadata?.height ?? null,
    }));
    return NextResponse.json({ photos });
  } catch {
    return NextResponse.json({ error: "fetch_failed", photos: [] }, { status: 200 });
  }
}

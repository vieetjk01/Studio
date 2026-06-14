import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSource } from "@/lib/drive-server";
import type { AlbumSource } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Re-resolve every Drive source of an album and update the photo list.
 * RLS ensures only the album owner / admin can run this.
 */
export async function POST(
  _req: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "Unauthorized" }, { status: 401 });

  const albumId = params.id;

  const { data: sources, error: srcErr } = await supabase
    .from("album_sources")
    .select("*")
    .eq("album_id", albumId)
    .order("position");

  if (srcErr) {
    return NextResponse.json({ error: srcErr.message }, { status: 403 });
  }

  let total = 0;
  let added = 0;
  const errors: string[] = [];

  for (const source of (sources ?? []) as AlbumSource[]) {
    let files;
    try {
      files = await resolveSource(source.drive_url, source.kind);
    } catch (e) {
      errors.push(
        `${source.name}: ${e instanceof Error ? e.message : "unknown error"}`
      );
      continue;
    }

    const fileIds = files.map((f) => f.id);
    total += files.length;

    // Remove photos from this source that are no longer present.
    if (fileIds.length > 0) {
      await supabase
        .from("photos")
        .delete()
        .eq("source_id", source.id)
        .not("drive_file_id", "in", `(${fileIds.join(",")})`);
    } else {
      await supabase.from("photos").delete().eq("source_id", source.id);
    }

    // Upsert current files.
    const rows = files.map((f, i) => ({
      album_id: albumId,
      source_id: source.id,
      drive_file_id: f.id,
      name: f.name,
      position: source.position * 10000 + i,
    }));

    if (rows.length > 0) {
      const { error: upErr, count } = await supabase
        .from("photos")
        .upsert(rows, { onConflict: "album_id,drive_file_id", count: "exact" });
      if (upErr) errors.push(`${source.name}: ${upErr.message}`);
      else added += count ?? 0;
    }
  }

  return NextResponse.json({ total, added, errors });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { resolveSource, listSubFolders } from "@/lib/drive-server";
import { thumbnailUrl, extractFolderId } from "@/lib/drive";
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

  // Surface the most common misconfiguration explicitly.
  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json(
      { error: "GOOGLE_API_KEY chưa được cấu hình trên server (Vercel).", total: 0, added: 0, errors: ["GOOGLE_API_KEY missing"] },
      { status: 200 }
    );
  }

  const { data: album } = await supabase
    .from("albums")
    .select("cover_url")
    .eq("id", albumId)
    .maybeSingle();

  // ── Auto-expand: any folder source that contains sub-folders gets a separate
  // source (tab) per sub-folder, so pasting one parent link is enough. ────────
  {
    const { data: existing } = await supabase
      .from("album_sources")
      .select("*")
      .eq("album_id", albumId)
      .order("position");
    const existingUrls = new Set((existing ?? []).map((s) => s.drive_url));
    let maxPos = Math.max(0, ...(existing ?? []).map((s) => s.position));
    const newRows: {
      album_id: string;
      name: string;
      drive_url: string;
      kind: string;
      position: number;
    }[] = [];

    for (const src of (existing ?? []) as AlbumSource[]) {
      if (src.kind !== "folder") continue;
      const folderId = extractFolderId(src.drive_url);
      if (!folderId) continue;
      let subs: { id: string; name: string }[] = [];
      try {
        subs = await listSubFolders(folderId);
      } catch {
        subs = [];
      }
      for (const sub of subs) {
        const url = `https://drive.google.com/drive/folders/${sub.id}`;
        if (existingUrls.has(url)) continue;
        existingUrls.add(url);
        maxPos += 1;
        newRows.push({ album_id: albumId, name: sub.name, drive_url: url, kind: "folder", position: maxPos });
      }
    }
    if (newRows.length > 0) {
      await supabase.from("album_sources").insert(newRows);
    }
  }

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
    let folderName: string | null = null;
    try {
      const resolved = await resolveSource(source.drive_url, source.kind);
      files = resolved.files;
      folderName = resolved.folderName;
    } catch (e) {
      errors.push(
        `${source.name}: ${e instanceof Error ? e.message : "unknown error"}`
      );
      continue;
    }

    // Name the source after the Drive folder (unless renamed to something custom).
    if (folderName && /^(Folder|Nhóm|Untitled|File)\b/i.test(source.name)) {
      await supabase.from("album_sources").update({ name: folderName }).eq("id", source.id);
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

  // Set the album cover to the first photo if there's no cover yet, or if the
  // current cover points to a file that is no longer in the album.
  const { data: allPhotos } = await supabase
    .from("photos")
    .select("drive_file_id")
    .eq("album_id", albumId)
    .order("position");

  if (allPhotos && allPhotos.length > 0) {
    const ids = new Set(allPhotos.map((p) => p.drive_file_id));
    const coverId = album?.cover_url?.match(/id=([a-zA-Z0-9_-]+)/)?.[1];
    const coverValid = coverId ? ids.has(coverId) : false;
    if (!album?.cover_url || !coverValid) {
      await supabase
        .from("albums")
        .update({ cover_url: thumbnailUrl(allPhotos[0].drive_file_id, 800) })
        .eq("id", albumId);
    }
  }

  return NextResponse.json({ total, added, errors });
}

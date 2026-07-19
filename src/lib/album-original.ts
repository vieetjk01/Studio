import type { SupabaseClient } from "@supabase/supabase-js";

type SourceRow = {
  name: string | null;
  drive_url: string | null;
  kind: string | null;
  stage: string | null;
};

export type DriveFolderLink = { name: string; url: string };

/**
 * Link Drive "file gốc" của giai đoạn chọn ảnh (JPG Goc), hiển thị bên trong
 * album giai đoạn hoàn thiện (giao khách) để khách có thể lấy file gốc.
 *
 * Hai trường hợp:
 *  - Dự án hợp nhất (1 album, đổi phase): folder nguồn stage='selection' nằm
 *    ngay trên album hoàn thiện này.
 *  - Đồng bộ Drive (2 album riêng): tìm hợp đồng có gallery_album_id = album này,
 *    rồi lấy folder nguồn giai đoạn chọn ảnh của selection_album_id.
 */
export async function getOriginalFolders(
  admin: SupabaseClient,
  galleryAlbumId: string,
  ownSources: SourceRow[]
): Promise<DriveFolderLink[]> {
  const isFolder = (x: SourceRow) => x.kind === "folder" && !!x.drive_url;

  // (A) folder giai đoạn chọn ảnh nằm ngay trên album này.
  const own = ownSources.filter((x) => x.stage === "selection" && isFolder(x));
  if (own.length > 0) {
    return own.map((x) => ({ name: x.name || "File gốc", url: x.drive_url as string }));
  }

  // (B) album chọn ảnh riêng, liên kết qua hợp đồng.
  const { data: contract } = await admin
    .from("studio_contracts")
    .select("selection_album_id")
    .eq("gallery_album_id", galleryAlbumId)
    .maybeSingle();
  const selectionAlbumId = (contract as { selection_album_id?: string | null } | null)?.selection_album_id;
  if (!selectionAlbumId) return [];

  const { data: selSources } = await admin
    .from("album_sources")
    .select("name, drive_url, kind, stage")
    .eq("album_id", selectionAlbumId)
    .order("position");
  return ((selSources ?? []) as SourceRow[])
    .filter((x) => isFolder(x) && (x.stage === "selection" || x.stage == null))
    .map((x) => ({ name: x.name || "File gốc", url: x.drive_url as string }));
}

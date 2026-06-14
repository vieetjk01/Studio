import "server-only";
import { extractFileId, extractFolderId } from "@/lib/drive";

export interface DriveFile {
  id: string;
  name: string;
  mimeType: string;
}

const API = "https://www.googleapis.com/drive/v3";

function key() {
  const k = process.env.GOOGLE_API_KEY;
  if (!k) throw new Error("GOOGLE_API_KEY is not configured");
  return k;
}

/** Fetch metadata for a single shared file. */
export async function getFileMeta(fileId: string): Promise<DriveFile | null> {
  const url = `${API}/files/${fileId}?fields=id,name,mimeType&key=${key()}`;
  const res = await fetch(url, { cache: "no-store" });
  if (!res.ok) return null;
  return (await res.json()) as DriveFile;
}

/** List image files inside a publicly shared folder (handles pagination). */
export async function listFolderImages(folderId: string): Promise<DriveFile[]> {
  const out: DriveFile[] = [];
  let pageToken: string | undefined;

  do {
    const q = encodeURIComponent(
      `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`
    );
    const params = new URLSearchParams({
      q: `'${folderId}' in parents and mimeType contains 'image/' and trashed = false`,
      fields: "nextPageToken, files(id, name, mimeType)",
      pageSize: "1000",
      orderBy: "name_natural",
      key: key(),
    });
    if (pageToken) params.set("pageToken", pageToken);

    const res = await fetch(`${API}/files?${params.toString()}`, {
      cache: "no-store",
    });
    if (!res.ok) {
      const body = await res.text();
      throw new Error(`Drive API error (${res.status}): ${body.slice(0, 200)}`);
    }
    const data = (await res.json()) as {
      files?: DriveFile[];
      nextPageToken?: string;
    };
    if (data.files) out.push(...data.files);
    pageToken = data.nextPageToken;
    void q;
  } while (pageToken);

  return out;
}

const FOLDER_MIME = "application/vnd.google-apps.folder";

/** Resolve a Drive source (file or folder link) to a list of image files. */
export async function resolveSource(
  url: string,
  kind: "file" | "folder"
): Promise<DriveFile[]> {
  if (kind === "folder") {
    const folderId = extractFolderId(url);
    if (!folderId) return [];
    return listFolderImages(folderId);
  }

  // kind === "file" — but the link may actually point to a folder (e.g. an
  // "open?id=" link that doesn't contain "/folders/"). Detect via metadata.
  const fileId = extractFileId(url);
  if (!fileId) return [];

  const meta = await getFileMeta(fileId);
  if (meta) {
    if (meta.mimeType === FOLDER_MIME) {
      return listFolderImages(fileId); // it was a folder all along
    }
    if (meta.mimeType.startsWith("image/")) return [meta];
    return []; // not an image and not a folder -> nothing to show
  }

  // Metadata unavailable (e.g. restricted key): try listing as a folder first,
  // then fall back to treating it as a single image file.
  try {
    const asFolder = await listFolderImages(fileId);
    if (asFolder.length > 0) return asFolder;
  } catch {
    /* not a folder */
  }
  return [{ id: fileId, name: fileId, mimeType: "image/*" }];
}

/**
 * Helpers for turning Google Drive links into file IDs and image URLs.
 */

/** Extract a Drive file ID from common share-link formats. */
export function extractFileId(url: string): string | null {
  const trimmed = url.trim();
  if (!trimmed) return null;

  // https://drive.google.com/file/d/FILE_ID/view
  const fileMatch = trimmed.match(/\/file\/d\/([a-zA-Z0-9_-]+)/);
  if (fileMatch) return fileMatch[1];

  // https://drive.google.com/open?id=FILE_ID  or  ...&id=FILE_ID
  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  // https://drive.google.com/uc?export=view&id=FILE_ID handled above.
  // Bare ID
  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;

  return null;
}

/** Extract a Drive folder ID from a folder share link. */
export function extractFolderId(url: string): string | null {
  const trimmed = url.trim();
  // https://drive.google.com/drive/folders/FOLDER_ID
  const folderMatch = trimmed.match(/\/folders\/([a-zA-Z0-9_-]+)/);
  if (folderMatch) return folderMatch[1];

  const idMatch = trimmed.match(/[?&]id=([a-zA-Z0-9_-]+)/);
  if (idMatch) return idMatch[1];

  if (/^[a-zA-Z0-9_-]{20,}$/.test(trimmed)) return trimmed;
  return null;
}

/** Does this link look like a folder link? */
export function isFolderLink(url: string): boolean {
  return /\/folders\//.test(url) || /\/drive\/u\/\d+\/folders\//.test(url);
}

/** Thumbnail URL (sized) served through our proxy-friendly Google endpoint. */
export function thumbnailUrl(fileId: string, width = 600): string {
  return `https://drive.google.com/thumbnail?id=${fileId}&sz=w${width}`;
}

/** Larger preview / full image URL. */
export function fullImageUrl(fileId: string, width = 1600): string {
  return `https://lh3.googleusercontent.com/d/${fileId}=w${width}`;
}

/** Direct download URL for an original file. */
export function downloadUrl(fileId: string): string {
  return `https://drive.google.com/uc?export=download&id=${fileId}`;
}

/** Strip a file extension from a name (for "copy list without extension"). */
export function stripExtension(name: string): string {
  return name.replace(/\.[^./\\]+$/, "");
}

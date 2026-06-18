"use client";

/**
 * Write helpers for the Google Drive API, called directly from the browser with
 * a user OAuth access token (the Supabase session's `provider_token`, obtained
 * after signing in with the Drive scope). The token never touches our server.
 *
 * Requires the signed-in Google account to have edit rights on the files.
 */

export class DriveAuthError extends Error {
  constructor() {
    super("drive_unauthorized");
    this.name = "DriveAuthError";
  }
}

async function check(res: Response): Promise<Response> {
  if (res.status === 401 || res.status === 403) throw new DriveAuthError();
  if (!res.ok) throw new Error(`drive_error_${res.status}`);
  return res;
}

/** Replace a file's content IN PLACE (keeps the same file ID, name and link). */
export async function overwriteDriveFile(
  token: string,
  fileId: string,
  blob: Blob
): Promise<void> {
  await check(
    await fetch(
      `https://www.googleapis.com/upload/drive/v3/files/${fileId}?uploadType=media`,
      {
        method: "PATCH",
        headers: { Authorization: `Bearer ${token}`, "Content-Type": blob.type },
        body: blob,
      }
    )
  );
}

/** Get a file's parent folder ID (and name). */
export async function getDriveParent(
  token: string,
  fileId: string
): Promise<{ parentId: string | null; name: string }> {
  const res = await check(
    await fetch(
      `https://www.googleapis.com/drive/v3/files/${fileId}?fields=parents,name`,
      { headers: { Authorization: `Bearer ${token}` } }
    )
  );
  const data = await res.json();
  return { parentId: data.parents?.[0] ?? null, name: data.name };
}

/** Create a new file in a folder (multipart: metadata + bytes). Returns its ID. */
export async function createDriveFile(
  token: string,
  parentId: string,
  name: string,
  blob: Blob
): Promise<string> {
  const boundary = `vieetjk-${Date.now()}-${blob.size}`;
  const metadata = { name, parents: [parentId] };
  const body = new Blob([
    `--${boundary}\r\nContent-Type: application/json; charset=UTF-8\r\n\r\n`,
    JSON.stringify(metadata),
    `\r\n--${boundary}\r\nContent-Type: ${blob.type}\r\n\r\n`,
    blob,
    `\r\n--${boundary}--`,
  ]);
  const res = await check(
    await fetch(
      "https://www.googleapis.com/upload/drive/v3/files?uploadType=multipart&fields=id",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": `multipart/related; boundary=${boundary}`,
        },
        body,
      }
    )
  );
  const data = await res.json();
  return data.id as string;
}

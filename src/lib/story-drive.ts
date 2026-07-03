import "server-only";
import { Readable } from "stream";
import { google } from "googleapis";
import { createAdminClient } from "@/lib/supabase/admin";

const CLIENT_ID = process.env.NEXT_PUBLIC_GOOGLE_CLIENT_ID || "";
const CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || "";
// Dedicated redirect for the story-Drive connect flow (register in Google Cloud).
const REDIRECT = process.env.GOOGLE_STORY_REDIRECT_URI || "";
// drive.file = create/manage only the files the app creates → NO Google review.
const SCOPE = "https://www.googleapis.com/auth/drive.file";

export function storyDriveConfigured(): boolean {
  return !!(CLIENT_ID && CLIENT_SECRET && REDIRECT);
}

function oauth() {
  return new google.auth.OAuth2(CLIENT_ID, CLIENT_SECRET, REDIRECT);
}

/** Auth URL — state carries the story's edit_token so the callback can bind it. */
export function storyDriveAuthUrl(editToken: string): string {
  return oauth().generateAuthUrl({ access_type: "offline", prompt: "consent", scope: [SCOPE], state: editToken });
}

/** Exchange the code and persist the couple's Drive refresh token on the story. */
export async function connectStoryDrive(editToken: string, code: string): Promise<void> {
  const o = oauth();
  const { tokens } = await o.getToken(code);
  if (!tokens.refresh_token) throw new Error("no_refresh_token");
  const db = createAdminClient();
  await db.from("story_pages").update({ drive_refresh_token: tokens.refresh_token }).eq("edit_token", editToken);
}

type StoryDriveRow = { id: string; drive_refresh_token: string | null; drive_upload_folder: string | null };

/** Authenticated Drive client + the app-created upload folder (created once). */
async function driveFor(story: StoryDriveRow) {
  if (!story.drive_refresh_token) return null;
  const o = oauth();
  o.setCredentials({ refresh_token: story.drive_refresh_token });
  const drive = google.drive({ version: "v3", auth: o });
  let folderId = story.drive_upload_folder;
  if (!folderId) {
    const res = await drive.files.create({
      requestBody: { name: "mstudo · Story khách gửi", mimeType: "application/vnd.google-apps.folder" },
      fields: "id",
    });
    folderId = res.data.id || null;
    if (folderId) {
      const db = createAdminClient();
      await db.from("story_pages").update({ drive_upload_folder: folderId }).eq("id", story.id);
    }
  }
  return folderId ? { drive, folderId } : null;
}

/** Upload a guest file into the couple's Drive and share it (link-readable). */
export async function uploadGuestFile(story: StoryDriveRow, file: File, name: string): Promise<{ id: string; isVideo: boolean } | null> {
  const ctx = await driveFor(story);
  if (!ctx) return null;
  const buf = Buffer.from(await file.arrayBuffer());
  const isVideo = file.type.startsWith("video/");
  const res = await ctx.drive.files.create({
    requestBody: { name: name || file.name || "story", parents: [ctx.folderId] },
    media: { mimeType: file.type || "application/octet-stream", body: Readable.from(buf) },
    fields: "id",
  });
  const id = res.data.id;
  if (!id) return null;
  // Anyone-with-link reader so /api/img can proxy it.
  await ctx.drive.permissions.create({ fileId: id, requestBody: { role: "reader", type: "anyone" } }).catch(() => {});
  return { id, isVideo };
}

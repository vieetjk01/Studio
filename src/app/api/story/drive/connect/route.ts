import { NextResponse, type NextRequest } from "next/server";
import { storyDriveAuthUrl, storyDriveConfigured } from "@/lib/story-drive";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Redirect the couple (editor, token-gated) to Google to connect their Drive. */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") || "";
  if (!token) return NextResponse.json({ error: "missing_token" }, { status: 400 });
  if (!storyDriveConfigured()) {
    return NextResponse.json({ error: "not_configured", hint: "Máy chủ chưa cấu hình Google Drive OAuth (GOOGLE_STORY_REDIRECT_URI)." }, { status: 200 });
  }
  // Confirm the story exists before bouncing to Google.
  const db = createAdminClient();
  const { data } = await db.from("story_pages").select("id").eq("edit_token", token).maybeSingle();
  if (!data) return NextResponse.json({ error: "not_found" }, { status: 404 });
  return NextResponse.redirect(storyDriveAuthUrl(token));
}

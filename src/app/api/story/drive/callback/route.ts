import { NextResponse, type NextRequest } from "next/server";
import { connectStoryDrive } from "@/lib/story-drive";

export const dynamic = "force-dynamic";

/** Google OAuth callback for the story-Drive connect flow. state = edit_token. */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const token = searchParams.get("state");
  const error = searchParams.get("error");
  const back = (q: string) => NextResponse.redirect(new URL(`/story/sua/${token ?? ""}?${q}`, req.url));

  if (error || !code || !token) return back(`drive=error`);
  try {
    await connectStoryDrive(token, code);
    return back("drive=connected");
  } catch {
    return back("drive=error");
  }
}

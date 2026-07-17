import { NextResponse, type NextRequest } from "next/server";
import { connectStoryDrive, editTokenFromState } from "@/lib/story-drive";

export const dynamic = "force-dynamic";

/** Google OAuth callback for the story-Drive connect flow. state = ký(story:edit_token). */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const error = searchParams.get("error");
  const token = editTokenFromState(searchParams.get("state")); // xác minh chữ ký + hạn dùng
  const back = (q: string) => NextResponse.redirect(new URL(`/story/sua/${token ?? ""}?${q}`, req.url));

  if (error || !code || !token) return back(`drive=error`);
  try {
    await connectStoryDrive(token, code);
    return back("drive=connected");
  } catch {
    return back("drive=error");
  }
}

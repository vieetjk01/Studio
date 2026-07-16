import { NextResponse, type NextRequest } from "next/server";
import { connectStudioDrive, ownerFromState } from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

/** Google OAuth callback cho luồng kết nối Drive của studio. state = ký(ownerId). */
export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code = searchParams.get("code");
  const state = searchParams.get("state");
  const error = searchParams.get("error");
  const ownerId = ownerFromState(state);
  const back = (q: string) => NextResponse.redirect(new URL(`/dashboard/studio/desktop?${q}`, req.url));

  if (error || !code || !ownerId) return back("drive=error");
  try {
    await connectStudioDrive(ownerId, code);
    return back("drive=connected");
  } catch {
    return back("drive=error");
  }
}

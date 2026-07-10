import { NextResponse, type NextRequest } from "next/server";
import { connectGoogleCalendar } from "@/lib/gcal";
import { verifyOAuthState } from "@/lib/oauth-state";
import { mainUrl } from "@/lib/hosts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // signed userId (HMAC + expiry)
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(mainUrl(`/dashboard/connections?gcal=error&msg=${encodeURIComponent(error)}`));
  }
  if (!code || !state) {
    return NextResponse.redirect(mainUrl("/dashboard/connections?gcal=error&msg=missing_params"));
  }

  // H4: chỉ chấp nhận state do chính máy chủ ký → chống account-linking CSRF.
  const userId = verifyOAuthState(state);
  if (!userId) {
    return NextResponse.redirect(mainUrl("/dashboard/connections?gcal=error&msg=invalid_state"));
  }

  try {
    await connectGoogleCalendar(userId, code);
    return NextResponse.redirect(mainUrl("/dashboard/connections?gcal=connected"));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(mainUrl(`/dashboard/connections?gcal=error&msg=${encodeURIComponent(msg)}`));
  }
}

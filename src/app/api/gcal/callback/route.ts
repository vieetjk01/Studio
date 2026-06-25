import { NextResponse, type NextRequest } from "next/server";
import { connectGoogleCalendar } from "@/lib/gcal";
import { mainUrl } from "@/lib/hosts";

export const dynamic = "force-dynamic";

export async function GET(req: NextRequest) {
  const { searchParams } = req.nextUrl;
  const code  = searchParams.get("code");
  const state = searchParams.get("state"); // userId passed as state
  const error = searchParams.get("error");

  if (error) {
    return NextResponse.redirect(mainUrl(`/dashboard/settings?gcal=error&msg=${encodeURIComponent(error)}`));
  }
  if (!code || !state) {
    return NextResponse.redirect(mainUrl("/dashboard/settings?gcal=error&msg=missing_params"));
  }

  try {
    await connectGoogleCalendar(state, code);
    return NextResponse.redirect(mainUrl("/dashboard/settings?gcal=connected"));
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "unknown";
    return NextResponse.redirect(mainUrl(`/dashboard/settings?gcal=error&msg=${encodeURIComponent(msg)}`));
  }
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { getAuthUrl } from "@/lib/gcal";

export const dynamic = "force-dynamic";

export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const url = getAuthUrl(user.id);
  // Log redirect URI to help debug OAuth mismatches
  console.log("[gcal/connect] redirect_uri =", process.env.GOOGLE_CALENDAR_REDIRECT_URI);
  console.log("[gcal/connect] auth_url =", url);
  return NextResponse.redirect(url);
}

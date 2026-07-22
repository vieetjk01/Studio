import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { oaAuthUrl, oaConfigured } from "@/lib/zalo/oa";

export const dynamic = "force-dynamic";

/** Đưa chủ studio sang Zalo để cấp quyền Official Account. */
export async function GET() {
  const profile = await requireStudio("full");
  if (!profile || profile.isStaff || (profile.actingRole !== "owner" && profile.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!oaConfigured()) {
    return NextResponse.json(
      { error: "not_configured", hint: "Máy chủ chưa cấu hình ZALO_OA_APP_ID / ZALO_OA_APP_SECRET / ZALO_OA_REDIRECT_URI." },
      { status: 200 }
    );
  }
  return NextResponse.redirect(oaAuthUrl(profile.id));
}

import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { studioDriveAuthUrl, studioDriveConfigured } from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

/** Đưa CHỦ studio sang Google để kết nối Drive (đồng bộ ảnh/video hợp đồng). */
export async function GET() {
  const profile = await requireStudio("full");
  if (!profile || profile.isStaff || (profile.actingRole !== "owner" && profile.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!studioDriveConfigured()) {
    return NextResponse.json(
      { error: "not_configured", hint: "Máy chủ chưa cấu hình GOOGLE_STUDIO_DRIVE_REDIRECT_URI (…/api/studio/drive/callback)." },
      { status: 200 }
    );
  }
  return NextResponse.redirect(studioDriveAuthUrl(profile.id));
}

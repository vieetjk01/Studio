import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { filterDriveAuthUrl, filterDriveConfigured } from "@/lib/filter-drive";

export const dynamic = "force-dynamic";

/** Đưa CHỦ studio sang Google để kết nối Drive toàn quyền cho công cụ Lọc ảnh. */
export async function GET() {
  const profile = await requireStudio("full");
  if (!profile || profile.isStaff || (profile.actingRole !== "owner" && profile.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  if (!filterDriveConfigured()) {
    return NextResponse.json(
      { error: "not_configured", hint: "Máy chủ chưa cấu hình GOOGLE_FILTER_DRIVE_REDIRECT_URI (…/api/filter/drive/callback)." },
      { status: 200 }
    );
  }
  return NextResponse.redirect(filterDriveAuthUrl(profile.id));
}

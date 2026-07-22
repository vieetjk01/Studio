import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { saveZalo } from "@/lib/zalo/config";

export const dynamic = "force-dynamic";

/** Ngắt kết nối Zalo (xoá cả token OA lẫn phiên cá nhân). */
export async function POST() {
  const profile = await requireStudio("full");
  if (!profile || profile.isStaff || (profile.actingRole !== "owner" && profile.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  await saveZalo(profile.id, {
    status: "disconnected",
    oa_access_token: null,
    oa_refresh_token: null,
    oa_access_expires_at: null,
    personal_session: null,
    personal_self: null,
    last_error: null,
  });
  return NextResponse.json({ ok: true });
}

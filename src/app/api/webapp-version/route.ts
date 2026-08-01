import { NextResponse } from "next/server";
import { getSessionUser, getProfileById } from "@/lib/auth-guards";
import { getFeatureFlags } from "@/lib/feature-flags";
import {
  WEBAPP_UI_COOKIE,
  WEBAPP_UI_COOKIE_MAX_AGE,
  canSwitchWebappV2,
  webappV2Stage,
} from "@/lib/webapp-version";

export const dynamic = "force-dynamic";

/**
 * Ghi lựa chọn giao diện của người dùng vào cookie.
 *   body { ui: "v2" } → dùng giao diện 2.0   (chỉ khi cờ webapp_v2 cho phép)
 *   body { ui: "v1" } → trở về giao diện 1.0 (luôn được, kể cả khi cờ đã hạ)
 *
 * Quyền được KIỂM TRA LẠI Ở SERVER: cờ "coming_soon" (mặc định) → 403 cho mọi
 * người, "beta" → chỉ admin. Nút trên giao diện chỉ là lớp hiển thị.
 */
export async function POST(req: Request) {
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = (await req.json().catch(() => null)) as { ui?: unknown } | null;
  const ui = body?.ui === "v2" ? "v2" : body?.ui === "v1" ? "v1" : null;
  if (!ui) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  if (ui === "v2") {
    const profile = await getProfileById(user.id);
    const stage = webappV2Stage(await getFeatureFlags());
    if (!canSwitchWebappV2(stage, profile?.role)) {
      return NextResponse.json({ error: "not_available", stage }, { status: 403 });
    }
  }

  const res = NextResponse.json({ ok: true, ui });
  if (ui === "v2") {
    res.cookies.set(WEBAPP_UI_COOKIE, "v2", {
      path: "/",
      maxAge: WEBAPP_UI_COOKIE_MAX_AGE,
      sameSite: "lax",
      httpOnly: false, // chỉ là lựa chọn giao diện, không phải dữ liệu bí mật
      secure: process.env.NODE_ENV === "production",
    });
  } else {
    res.cookies.set(WEBAPP_UI_COOKIE, "", { path: "/", maxAge: 0 });
  }
  return res;
}

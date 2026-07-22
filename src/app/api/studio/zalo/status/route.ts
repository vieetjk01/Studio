import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { loadZalo, publicStatus } from "@/lib/zalo/config";
import { oaConfigured } from "@/lib/zalo/oa";
import { personalAvailable } from "@/lib/zalo/personal";

export const dynamic = "force-dynamic";

/** Trạng thái kết nối Zalo của studio (an toàn — không trả token/cookie). */
export async function GET() {
  const profile = await requireStudio("full");
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const row = await loadZalo(profile.id);
  const status = publicStatus(row);
  // Trong lúc đăng nhập cá nhân, personal_self tạm giữ ảnh QR để trình duyệt poll.
  const qr = !status.connected && row?.personal_self?.qr ? String(row.personal_self.qr) : null;

  return NextResponse.json({
    ...status,
    qr,
    oaConfigured: oaConfigured(),
    personalAvailable: await personalAvailable(),
  });
}

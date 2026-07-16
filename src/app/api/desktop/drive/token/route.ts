import { NextResponse } from "next/server";
import { requireDesktopOwner } from "@/lib/desktop/auth";
import { getStudioAccessToken } from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

/**
 * Cấp access token TẠM (scope drive.file) để client MStudo Desktop tải file THẲNG
 * lên Google Drive của studio — không truyền qua máy chủ (video lớn vẫn được).
 * Token sống ~1 giờ; client tự xin lại khi hết hạn.
 */
export async function GET(req: Request) {
  const auth = await requireDesktopOwner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const tok = await getStudioAccessToken(auth.ownerId);
  if (!tok) return NextResponse.json({ error: "not_connected" }, { status: 409 });
  return NextResponse.json(tok);
}

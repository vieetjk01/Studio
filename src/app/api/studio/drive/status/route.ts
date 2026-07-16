import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { studioDriveStatus, disconnectStudioDrive, setFolderTemplate } from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

async function owner() {
  const p = await requireStudio("full");
  if (!p || p.isStaff || (p.actingRole !== "owner" && p.actingRole !== "admin")) return null;
  return p;
}

/** Trạng thái kết nối Drive + mẫu thư mục hiện tại. */
export async function GET() {
  const p = await owner();
  if (!p) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json(await studioDriveStatus(p.id));
}

/** Lưu mẫu thư mục mặc định của studio. Body: { template: { photo:[], video:[] } }. */
export async function PUT(req: Request) {
  const p = await owner();
  if (!p) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  await setFolderTemplate(p.id, body.template ?? body);
  return NextResponse.json(await studioDriveStatus(p.id));
}

/** Ngắt kết nối Drive của studio. */
export async function DELETE() {
  const p = await owner();
  if (!p) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await disconnectStudioDrive(p.id);
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { adminDriveConfigured, adminDriveConnected, disconnectAdminDrive } from "@/lib/mstudo-drive";

export const dynamic = "force-dynamic";

/** Trạng thái kết nối Drive admin. */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  return NextResponse.json({ configured: adminDriveConfigured(), connected: await adminDriveConnected() });
}

/** Ngắt kết nối Drive admin. */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await disconnectAdminDrive();
  return NextResponse.json({ ok: true });
}

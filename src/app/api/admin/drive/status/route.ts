import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { adminDriveHealth, lastAdminDriveError, disconnectAdminDrive } from "@/lib/mstudo-drive";

export const dynamic = "force-dynamic";

/**
 * Trạng thái kết nối Drive admin — GỌI THẬT sang Google chứ không chỉ xem trong
 * DB có token hay không. Một token đã bị thu hồi, hoặc thư mục lưu trữ bị xoá,
 * vẫn cho "connected: true" trong khi mọi upload âm thầm rơi về Supabase; `ok`
 * mới là thứ nói lên file đang thực sự vào Drive.
 */
export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const health = await adminDriveHealth();
  return NextResponse.json({ ...health, lastUploadError: lastAdminDriveError() });
}

/** Ngắt kết nối Drive admin. */
export async function DELETE() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  await disconnectAdminDrive();
  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { BACKUP_TABLES } from "@/lib/admin/backup-tables";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

/**
 * Sao lưu TOÀN BỘ hệ thống: xuất mọi bảng dữ liệu ra một file JSON để tải về.
 * Chỉ admin. Dùng service-role client nên bỏ qua RLS, lấy đủ mọi studio.
 * Dữ liệu auth (mật khẩu) KHÔNG nằm ở đây — chỉ dữ liệu ứng dụng.
 */
const TABLES = BACKUP_TABLES;

const PAGE = 1000;

export async function GET() {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const db = createAdminClient();
  const data: Record<string, unknown[]> = {};
  const counts: Record<string, number> = {};

  for (const table of TABLES) {
    const rows: unknown[] = [];
    let from = 0;
    // Phân trang để không giới hạn ở 1000 dòng mặc định của Supabase.
    for (;;) {
      const { data: page, error } = await db
        .from(table)
        .select("*")
        .range(from, from + PAGE - 1);
      if (error) {
        // Bảng có thể chưa tồn tại ở một số môi trường — bỏ qua, không làm hỏng cả bản sao lưu.
        break;
      }
      const chunk = page ?? [];
      rows.push(...chunk);
      if (chunk.length < PAGE) break;
      from += PAGE;
    }
    data[table] = rows;
    counts[table] = rows.length;
  }

  const stamp = new Date().toISOString();
  const backup = {
    kind: "mstudo-full-backup",
    version: 1,
    generated_at: stamp,
    generated_by: admin.email,
    counts,
    data,
  };

  const fileStamp = stamp.slice(0, 19).replace(/[:T]/g, "-");
  return new NextResponse(JSON.stringify(backup), {
    status: 200,
    headers: {
      "Content-Type": "application/json; charset=utf-8",
      "Content-Disposition": `attachment; filename="mstudo-backup-${fileStamp}.json"`,
      "Cache-Control": "no-store",
    },
  });
}

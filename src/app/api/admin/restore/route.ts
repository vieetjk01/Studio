import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { BACKUP_TABLES } from "@/lib/admin/backup-tables";

export const dynamic = "force-dynamic";
export const maxDuration = 300;

const TABLE_SET = new Set<string>(BACKUP_TABLES);
const CHUNK = 500;

type TableResult = { table: string; rows: number; restored: number; error?: string };

/**
 * Khôi phục toàn hệ thống từ file JSON đã sao lưu (endpoint /api/admin/backup).
 * Chỉ admin. Dùng UPSERT theo khóa chính nên bản ghi cũ được cập nhật, bản ghi
 * thiếu được tạo lại — KHÔNG xóa dữ liệu hiện có không nằm trong bản sao lưu.
 * Chèn theo thứ tự bảng cha → con để tránh lỗi khóa ngoại.
 *
 * body: { data: {...}, apply?: boolean }
 *   apply=false (mặc định) → chỉ xem trước số dòng mỗi bảng, không ghi gì.
 *   apply=true            → thực sự khôi phục.
 */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "invalid_json" }, { status: 400 });
  }

  const payload = body as { kind?: unknown; data?: unknown; apply?: unknown };
  if (payload?.kind !== "mstudo-full-backup" || !payload.data || typeof payload.data !== "object") {
    return NextResponse.json({ error: "not_a_backup" }, { status: 400 });
  }
  const data = payload.data as Record<string, unknown>;
  const apply = payload.apply === true;

  // Chỉ giữ các bảng hợp lệ, đúng thứ tự phụ thuộc.
  const preview = BACKUP_TABLES
    .map((table) => ({ table, rows: Array.isArray(data[table]) ? (data[table] as unknown[]).length : 0 }))
    .filter((t) => t.rows > 0);

  if (!apply) {
    return NextResponse.json({ ok: true, apply: false, tables: preview });
  }

  const db = createAdminClient();
  const results: TableResult[] = [];

  for (const table of BACKUP_TABLES) {
    if (!TABLE_SET.has(table)) continue;
    const rows = Array.isArray(data[table]) ? (data[table] as Record<string, unknown>[]) : [];
    if (rows.length === 0) continue;

    let restored = 0;
    let tableError: string | undefined;
    for (let i = 0; i < rows.length; i += CHUNK) {
      const slice = rows.slice(i, i + CHUNK);
      const { error } = await db.from(table).upsert(slice, { ignoreDuplicates: false });
      if (error) {
        tableError = error.message;
        break; // dừng bảng này, tiếp tục bảng khác
      }
      restored += slice.length;
    }
    results.push({ table, rows: rows.length, restored, ...(tableError ? { error: tableError } : {}) });
  }

  const totalRestored = results.reduce((s, r) => s + r.restored, 0);
  const failed = results.filter((r) => r.error);
  return NextResponse.json({ ok: true, apply: true, totalRestored, tables: results, failed });
}

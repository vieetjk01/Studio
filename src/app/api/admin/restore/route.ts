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

  // Giới hạn kích thước để một file khổng lồ không làm cạn RAM/treo hàm.
  const MAX_BYTES = 80 * 1024 * 1024; // 80MB
  const len = Number(req.headers.get("content-length") || 0);
  if (len > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });

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

  // H6: một file backup bị giả mạo có thể chèn dòng profiles{role:'admin'} để
  // nâng quyền, hoặc đổi owner_id chiếm dữ liệu. Khi khôi phục, loại bỏ các cột
  // đặc quyền khỏi bảng profiles — chỉ phục hồi dữ liệu cấu hình, không đụng
  // quyền/gói/chủ sở hữu. Quản trị viên vẫn chỉnh các cột này qua trang Quản trị.
  const PROFILE_STRIP = new Set([
    "role", "is_active", "plan", "plan_cycle", "plan_expires_at", "trial_used_at",
    "studio_owner_id", "studio_role", "max_albums", "monthly_album_limit",
    "can_zip", "can_notes", "can_galleries", "can_watermark_pro",
    "compress_daily_limit", "compress_picker_limit", "google_refresh_token",
  ]);
  const sanitizeRows = (table: string, rows: Record<string, unknown>[]) =>
    table !== "profiles"
      ? rows
      : rows.map((r) => {
          const out: Record<string, unknown> = {};
          for (const k of Object.keys(r)) if (!PROFILE_STRIP.has(k)) out[k] = r[k];
          return out;
        });

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
    const safeRows = sanitizeRows(table, rows);
    for (let i = 0; i < safeRows.length; i += CHUNK) {
      const slice = safeRows.slice(i, i + CHUNK);
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

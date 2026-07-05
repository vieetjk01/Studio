import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDesktopOwner } from "@/lib/desktop/auth";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

/**
 * Khôi phục ngược từ file mstudo-backup JSON — gọi theo TỪNG BẢNG, TỪNG LÔ
 * (client cắt lô ≤ ~1MB để nằm trong giới hạn request của Vercel).
 *
 *   POST { mode: "preview", table, rows: [{id}...] }
 *     → { exists: string[] }  (id đã có trên hệ thống)
 *   POST { mode: "apply", table, rows, overwrite? }
 *     → { inserted, updated, skipped_existing, skipped_invalid, errors[] }
 *
 * An toàn: owner_id LUÔN bị ép về tài khoản đang đăng nhập; bảng con chỉ nhận
 * bản ghi có cha thuộc tài khoản này; không ghi đè trừ khi overwrite=true.
 */

type Row = Record<string, unknown>;

const OWNER_TABLES = new Set([
  "studio_contracts", "studio_quotes", "studio_expenses", "studio_bookings",
  "studio_events", "studio_crew", "studio_packages", "studio_pricelist", "studio_equipment",
]);
const CHILD_TABLES: Record<string, { parentCol: string; parentTable: string }> = {
  contract_items: { parentCol: "contract_id", parentTable: "studio_contracts" },
  contract_crew: { parentCol: "contract_id", parentTable: "studio_contracts" },
  contract_payments: { parentCol: "contract_id", parentTable: "studio_contracts" },
  contract_payment_plan: { parentCol: "contract_id", parentTable: "studio_contracts" },
  contract_products: { parentCol: "contract_id", parentTable: "studio_contracts" },
  contract_quote_options: { parentCol: "contract_id", parentTable: "studio_contracts" },
  contract_tasks: { parentCol: "contract_id", parentTable: "studio_contracts" },
  quote_items: { parentCol: "quote_id", parentTable: "studio_quotes" },
};

const S = (v: unknown) => (typeof v === "string" ? v : "");
const chunk = <T,>(arr: T[], n: number): T[][] => {
  const out: T[][] = [];
  for (let i = 0; i < arr.length; i += n) out.push(arr.slice(i, i + n));
  return out;
};

export async function POST(req: Request) {
  const auth = await requireDesktopOwner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const owner = auth.ownerId;
  const db = createAdminClient();

  const body = (await req.json().catch(() => null)) as { mode?: string; table?: string; rows?: Row[]; overwrite?: boolean } | null;
  const table = body?.table || "";
  const rows = Array.isArray(body?.rows) ? body!.rows! : [];
  if (!body || (!OWNER_TABLES.has(table) && !CHILD_TABLES[table])) {
    return NextResponse.json({ error: "bad_table" }, { status: 400 });
  }
  if (rows.length > 1000) return NextResponse.json({ error: "batch_too_large" }, { status: 413 });

  const ids = rows.map((r) => S(r.id)).filter(Boolean);

  // Những id đã tồn tại trên hệ thống.
  const existsSet = new Set<string>();
  for (const part of chunk(ids, 200)) {
    const { data } = await db.from(table).select("id").in("id", part).range(0, 999);
    (data ?? []).forEach((r: { id: string }) => existsSet.add(r.id));
  }

  if (body.mode === "preview") {
    return NextResponse.json({ exists: [...existsSet] });
  }
  if (body.mode !== "apply") return NextResponse.json({ error: "bad_mode" }, { status: 400 });

  // Làm sạch + xác định phạm vi sở hữu.
  let valid: Row[] = [];
  let skippedInvalid = 0;
  if (OWNER_TABLES.has(table)) {
    valid = rows.filter((r) => S(r.id)).map((r) => ({ ...r, owner_id: owner }));
    skippedInvalid = rows.length - valid.length;
  } else {
    const { parentCol, parentTable } = CHILD_TABLES[table];
    const parentIds = [...new Set(rows.map((r) => S(r[parentCol])).filter(Boolean))];
    const owned = new Set<string>();
    for (const part of chunk(parentIds, 200)) {
      const { data } = await db.from(parentTable).select("id").eq("owner_id", owner).in("id", part).range(0, 999);
      (data ?? []).forEach((r: { id: string }) => owned.add(r.id));
    }
    valid = rows.filter((r) => S(r.id) && owned.has(S(r[parentCol])));
    skippedInvalid = rows.length - valid.length;
  }

  const toInsert = valid.filter((r) => !existsSet.has(S(r.id)));
  const toUpdate = body.overwrite ? valid.filter((r) => existsSet.has(S(r.id))) : [];
  const skippedExisting = body.overwrite ? 0 : valid.length - toInsert.length;

  let inserted = 0, updated = 0;
  const errors: string[] = [];
  for (const part of chunk(toInsert, 100)) {
    const { error } = await db.from(table).insert(part);
    if (error) errors.push(`${table}: ${error.message}`);
    else inserted += part.length;
  }
  for (const part of chunk(toUpdate, 100)) {
    const { error } = await db.from(table).upsert(part, { onConflict: "id" });
    if (error) errors.push(`${table}: ${error.message}`);
    else updated += part.length;
  }

  return NextResponse.json({ inserted, updated, skipped_existing: skippedExisting, skipped_invalid: skippedInvalid, errors });
}

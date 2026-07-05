import { NextResponse } from "next/server";
import { randomBytes } from "crypto";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireStudio } from "@/lib/auth-guards";
import { DEVICE_LIMIT, hashDeviceToken } from "@/lib/desktop/auth";

export const dynamic = "force-dynamic";

/**
 * Quản lý thiết bị MStudo Desktop. Chỉ CHỦ studio (owner/admin, không phải
 * nhân viên) thao tác — đăng ký thiết bị dùng phiên đăng nhập web (trong app
 * desktop, người dùng đăng nhập rồi app gọi endpoint này để lấy token).
 */
async function guard() {
  const ctx = await requireStudio("full");
  if (!ctx || ctx.isStaff || (ctx.actingRole !== "owner" && ctx.actingRole !== "admin")) return null;
  return ctx;
}

export async function GET() {
  const ctx = await guard();
  if (!ctx) return NextResponse.json({ error: "owner_only" }, { status: 403 });
  const { data, error } = await createAdminClient()
    .from("desktop_devices")
    .select("id, name, app_version, last_sync_at, revoked_at, created_at")
    .eq("owner_id", ctx.id)
    .order("created_at", { ascending: false });
  // Bảng chưa migrate → trả rỗng kèm cờ để UI hướng dẫn chạy schema.
  if (error) return NextResponse.json({ devices: [], migrated: false });
  return NextResponse.json({ devices: data ?? [], migrated: true, limit: DEVICE_LIMIT });
}

export async function POST(req: Request) {
  const ctx = await guard();
  if (!ctx) return NextResponse.json({ error: "owner_only" }, { status: 403 });
  const body = (await req.json().catch(() => ({}))) as { name?: string; app_version?: string };
  const name = (body.name || "").trim().slice(0, 80) || "Máy tính Windows";
  const db = createAdminClient();
  const { count, error: cntErr } = await db
    .from("desktop_devices")
    .select("id", { count: "exact", head: true })
    .eq("owner_id", ctx.id)
    .is("revoked_at", null);
  if (cntErr) return NextResponse.json({ error: "not_migrated" }, { status: 500 });
  if ((count ?? 0) >= DEVICE_LIMIT) {
    return NextResponse.json({ error: "device_limit", limit: DEVICE_LIMIT }, { status: 409 });
  }
  // Token chỉ trả về MỘT lần — server chỉ giữ bản băm.
  const token = "msd_" + randomBytes(24).toString("hex");
  const { data, error } = await db
    .from("desktop_devices")
    .insert({ owner_id: ctx.id, name, app_version: body.app_version || null, token_hash: hashDeviceToken(token) })
    .select("id, name, created_at")
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ token, device: data });
}

export async function DELETE(req: Request) {
  const ctx = await guard();
  if (!ctx) return NextResponse.json({ error: "owner_only" }, { status: 403 });
  const id = new URL(req.url).searchParams.get("id") || "";
  if (!id) return NextResponse.json({ error: "bad_request" }, { status: 400 });
  const { error } = await createAdminClient()
    .from("desktop_devices")
    .update({ revoked_at: new Date().toISOString() })
    .eq("id", id)
    .eq("owner_id", ctx.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

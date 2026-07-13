import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";

export const dynamic = "force-dynamic";

/**
 * Danh sách hợp đồng cho web app (phiên đăng nhập) — để trang "Quản lý HĐ" tải
 * client-side + cache trên máy (stale-while-revalidate), hiển thị tức thì.
 * Cùng truy vấn với bản SSR cũ trong contracts/page.tsx.
 */
export async function GET() {
  const profile = await requireStudio("plus");
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });
  const supabase = createClient();
  let q = supabase
    .from("studio_contracts")
    .select("id, code, title, client_name, client_phone, event_date, status, shoot_type, contract_items(qty, unit_price), contract_payments(amount)")
    .eq("owner_id", profile.id);
  if (profile.actingRole === "staff") q = q.eq("assigned_to", profile.actingUserId);
  const { data, error } = await q.order("created_at", { ascending: false });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ list: data ?? [] });
}

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoCreateContractDeliveryOnComplete } from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

const VALID = new Set(["draft", "sent", "approved", "in_progress", "completed", "cancelled"]);

/**
 * Đổi trạng thái hợp đồng — điểm TẬP TRUNG cho mọi nơi trên web (ContractEditor,
 * bảng công việc, danh sách hợp đồng). Đặt ở server để:
 *   1. Luôn đóng dấu completed_at nhất quán (trước đây board & list bỏ sót).
 *   2. Khi chuyển sang "completed" thì TỰ TẠO album giao khách (phase delivery)
 *      — album chọn ảnh đã được tạo lúc khách ký.
 * Yêu cầu chủ hợp đồng (RLS-scoped: chỉ owner mới đổi được).
 */
export async function POST(req: Request) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { contractId, status } = (await req.json().catch(() => ({}))) as { contractId?: string; status?: string };
  if (!contractId || !status || !VALID.has(status)) {
    return NextResponse.json({ error: "bad_request" }, { status: 400 });
  }

  const db = createAdminClient();
  // Xác minh quyền sở hữu trước khi ghi bằng service role.
  const { data: contract } = await db
    .from("studio_contracts")
    .select("id, owner_id, status")
    .eq("id", contractId)
    .maybeSingle();
  if (!contract || contract.owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  const patch: { status: string; completed_at?: string | null } = { status };
  // Đóng dấu thời điểm hoàn thành (phục vụ auto-cleanup proof 1 tháng); rời khỏi
  // "completed" thì xoá dấu.
  if (status === "completed") patch.completed_at = new Date().toISOString();
  else patch.completed_at = null;

  const { error } = await db.from("studio_contracts").update(patch).eq("id", contractId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Chuyển SANG "completed" (từ trạng thái khác) → tạo album giao khách.
  let deliveryAlbum = false;
  if (status === "completed" && contract.status !== "completed") {
    try {
      deliveryAlbum = await autoCreateContractDeliveryOnComplete(user.id, contractId);
    } catch {
      // Studio chưa nối Drive / lỗi tạm — desktop sẽ tạo bù khi đồng bộ.
    }
  }

  return NextResponse.json({ ok: true, deliveryAlbum });
}

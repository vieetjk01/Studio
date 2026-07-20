import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { buildDeliveryGalleryFromLink, type ContractForDrive } from "@/lib/studio-drive";

export const dynamic = "force-dynamic";

/**
 * Dựng/cập nhật album GIAO KHÁCH từ link thư mục ảnh ĐÃ CHỈNH SỬA do studio dán
 * tay (studio KHÔNG dùng Đồng bộ Drive tự động). Yêu cầu chủ hợp đồng.
 *  - Có link  → tạo/cập nhật album giao khách + đồng bộ ảnh, trả về slug + số ảnh.
 *  - Link rỗng → xoá liên kết ảnh đã chỉnh sửa (KHÔNG xoá album đã tạo trước đó).
 */
export async function POST(req: Request, { params }: { params: { id: string } }) {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  if (!process.env.GOOGLE_API_KEY) {
    return NextResponse.json({ error: "GOOGLE_API_KEY chưa được cấu hình trên server." }, { status: 200 });
  }

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const link = (url ?? "").trim();

  const db = createAdminClient();
  // Xác minh quyền sở hữu trước khi ghi bằng service role.
  const { data: contract } = await db
    .from("studio_contracts")
    .select("id, owner_id, code, client_name, client_phone, event_date, gallery_album_id, edited_drive_url")
    .eq("id", params.id)
    .maybeSingle();
  if (!contract || (contract as { owner_id: string }).owner_id !== user.id) {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!link) {
    await db.from("studio_contracts").update({ edited_drive_url: null }).eq("id", params.id);
    return NextResponse.json({ ok: true, cleared: true });
  }

  try {
    const res = await buildDeliveryGalleryFromLink(user.id, contract as ContractForDrive, link);
    return NextResponse.json({ ok: true, ...res });
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "unknown_error" }, { status: 500 });
  }
}

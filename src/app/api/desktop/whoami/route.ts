import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireDesktopOwner } from "@/lib/desktop/auth";

export const dynamic = "force-dynamic";

/**
 * Máy này đang đồng bộ với TÀI KHOẢN NÀO, và server đang có BAO NHIÊU dữ liệu.
 *
 * Vì sao cần: khi số liệu trên web và trong app desktop lệch nhau, trước đây
 * không có cách nào biết vì sao — app không nói nó gắn với tài khoản nào, cũng
 * không nói server đang có bao nhiêu bản ghi. Hai khả năng (token thiết bị của
 * tài khoản khác / bản cache trên máy đã cũ) nhìn bề ngoài giống hệt nhau.
 *
 * Có endpoint này thì bảng điều khiển đối chiếu được ngay: khác tên tài khoản ⇒
 * đăng ký nhầm máy; trùng tài khoản nhưng lệch số đếm ⇒ cache cũ, cần tải lại.
 */
export async function GET(req: Request) {
  const auth = await requireDesktopOwner(req);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const db = createAdminClient();
  const owner = auth.ownerId;
  const count = async (table: string, ownerCol = "owner_id") => {
    const { count: n } = await db.from(table).select("id", { count: "exact", head: true }).eq(ownerCol, owner);
    return n ?? 0;
  };

  const [profile, contracts, events, quotes, expenses, crew] = await Promise.all([
    db.from("profiles").select("full_name, email, studio_brand_name, plan, plan_expires_at").eq("id", owner).maybeSingle(),
    count("studio_contracts"),
    count("studio_events"),
    count("studio_quotes"),
    count("studio_expenses"),
    count("studio_crew"),
  ]);

  return NextResponse.json({
    ownerId: owner,
    via: auth.via,
    account: {
      name: profile.data?.studio_brand_name || profile.data?.full_name || "",
      email: profile.data?.email || "",
      plan: profile.data?.plan || "",
      planExpiresAt: profile.data?.plan_expires_at || null,
    },
    counts: { contracts, events, quotes, expenses, crew },
    now: new Date().toISOString(),
  });
}

import { NextResponse, type NextRequest } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";
import { autoNotify } from "@/lib/zalo/notify";
import { depositConfirmMessage } from "@/lib/zalo/messages";
import { mainUrl } from "@/lib/hosts";
import { vnd } from "@/lib/types";

export const dynamic = "force-dynamic";
export const maxDuration = 30;

/**
 * Bắn tin Zalo theo MỐC do thao tác trên web (không qua cron). Hiện phục vụ
 * `deposit_confirm` — gọi từ ContractEditor sau khi studio đánh dấu đã nhận cọc.
 * autoNotify tự kiểm tra studio đã bật mốc + đã kết nối; nếu tắt thì bỏ qua.
 */
const ALLOWED = new Set(["deposit_confirm"]);

export async function POST(req: NextRequest) {
  const profile = await requireStudio("full");
  if (!profile) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const b = await req.json().catch(() => ({}));
  const contractId = typeof b.contractId === "string" ? b.contractId : "";
  const event = typeof b.event === "string" ? b.event : "";
  if (!contractId || !ALLOWED.has(event)) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data: c } = await db
    .from("studio_contracts")
    .select("id, owner_id, title, client_name, client_phone, client_token")
    .eq("id", contractId)
    .maybeSingle();
  if (!c || c.owner_id !== profile.id) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if (!c.client_phone) return NextResponse.json({ ok: false, skipped: true, error: "no_phone" });

  const link = c.client_token ? mainUrl(`/c/${c.client_token}`) : null;
  const amount = typeof b.amount === "number" && b.amount > 0 ? vnd(b.amount) : null;
  const studio = profile.full_name || "Studio";

  const body = depositConfirmMessage({ name: c.client_name, amount, title: c.title, link, studio });
  const res = await autoNotify({
    ownerId: c.owner_id,
    event: "deposit_confirm",
    audience: "client",
    toPhone: c.client_phone,
    toName: c.client_name,
    body,
    contractId: c.id,
  });
  return NextResponse.json(res);
}

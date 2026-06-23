import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public quote actions for a client viewing /q/[token].
 * No auth — the token is the access credential. RLS is bypassed via the
 * service role, but every write is constrained to the quote matching the token.
 *
 * Actions:
 *  - toggle  : flip selected on an optional item
 *  - adjust  : append a client adjustment message + bump status
 *  - accept  : lock the quote as 'accepted'
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = await req.json().catch(() => ({}));
  const action = body.action as string | undefined;
  if (!action) return NextResponse.json({ error: "missing action" }, { status: 400 });

  const db = createAdminClient();
  const { data: quote } = await db
    .from("studio_quotes")
    .select("id, status")
    .eq("client_token", params.token)
    .maybeSingle();
  if (!quote) return NextResponse.json({ error: "Báo giá không tồn tại." }, { status: 404 });

  if (quote.status === "accepted" || quote.status === "converted") {
    return NextResponse.json({ error: "Báo giá đã chốt, không thể thay đổi." }, { status: 409 });
  }
  if (quote.status === "cancelled" || quote.status === "expired") {
    return NextResponse.json({ error: "Báo giá đã đóng." }, { status: 409 });
  }

  if (action === "toggle") {
    const itemId = body.item_id as string | undefined;
    const selected = !!body.selected;
    if (!itemId) return NextResponse.json({ error: "missing item_id" }, { status: 400 });
    // Guard: only allow toggling items that belong to this quote and are optional.
    const { data: item } = await db
      .from("quote_items")
      .select("id, is_optional")
      .eq("id", itemId)
      .eq("quote_id", quote.id)
      .maybeSingle();
    if (!item) return NextResponse.json({ error: "item not found" }, { status: 404 });
    if (!item.is_optional) return NextResponse.json({ error: "Hạng mục bắt buộc." }, { status: 400 });
    await db.from("quote_items").update({ selected }).eq("id", itemId);
    return NextResponse.json({ ok: true });
  }

  if (action === "adjust") {
    const message = String(body.message || "").trim();
    if (!message) return NextResponse.json({ error: "Tin nhắn trống." }, { status: 400 });
    if (message.length > 2000) return NextResponse.json({ error: "Tin nhắn quá dài (tối đa 2000 ký tự)." }, { status: 400 });
    const { data: row, error } = await db
      .from("quote_adjustments")
      .insert({ quote_id: quote.id, author: "client", message })
      .select("*")
      .single();
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    await db.from("studio_quotes").update({ status: "adjust_requested" }).eq("id", quote.id);
    return NextResponse.json({ ok: true, adjustment: row });
  }

  if (action === "accept") {
    await db
      .from("studio_quotes")
      .update({ status: "accepted", accepted_at: new Date().toISOString() })
      .eq("id", quote.id);
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ error: "unknown action" }, { status: 400 });
}

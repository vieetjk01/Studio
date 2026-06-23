import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import { nextContractCode } from "@/lib/contract-code";
import { newShareToken } from "@/lib/contract-code";

export const dynamic = "force-dynamic";

/**
 * Convert an accepted quote into a studio_contracts row.
 * Only the studio owner (or admin) may call this. Copies the currently-selected
 * quote items into contract_items and links contract_id back on the quote.
 */
export async function POST(_req: Request, { params }: { params: { id: string } }) {
  const profile = await requireStudio();
  if (!profile) return NextResponse.json({ error: "Forbidden" }, { status: 403 });

  const supabase = createClient();
  const { data: quote } = await supabase
    .from("studio_quotes")
    .select("*")
    .eq("id", params.id)
    .eq("owner_id", profile.id)
    .maybeSingle();
  if (!quote) return NextResponse.json({ error: "Báo giá không tồn tại." }, { status: 404 });
  if (quote.status !== "accepted") {
    return NextResponse.json({ error: "Chỉ tạo hợp đồng từ báo giá khách đã đồng ý." }, { status: 409 });
  }
  if (quote.contract_id) {
    return NextResponse.json({ ok: true, contract_id: quote.contract_id });
  }

  const { data: items } = await supabase
    .from("quote_items")
    .select("name, qty, unit_price, is_optional, selected, position")
    .eq("quote_id", quote.id)
    .order("position");
  const chosen = (items ?? []).filter((it) => !it.is_optional || it.selected);
  if (chosen.length === 0) {
    return NextResponse.json({ error: "Không có hạng mục nào được chọn." }, { status: 400 });
  }

  const total = chosen.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  const deposit = Math.round((total * (quote.deposit_percent || 0)) / 100);

  const code = await nextContractCode(supabase, profile.id);
  const token = newShareToken();

  const { data: contract, error: cErr } = await supabase
    .from("studio_contracts")
    .insert({
      owner_id: profile.id,
      code,
      title: quote.title || "Hợp đồng",
      client_name: quote.client_name,
      client_phone: quote.client_phone,
      client_email: quote.client_email,
      event_date: quote.event_date,
      location: quote.location,
      deposit,
      status: "draft",
      client_token: token,
      note: quote.code ? `Tạo từ báo giá ${quote.code}` : null,
    })
    .select("id")
    .single();
  if (cErr || !contract) return NextResponse.json({ error: cErr?.message || "Tạo hợp đồng thất bại" }, { status: 500 });

  const contractItems = chosen.map((it, idx) => ({
    contract_id: contract.id,
    name: it.name,
    qty: it.qty,
    unit_price: it.unit_price,
    position: idx,
  }));
  const { error: iErr } = await supabase.from("contract_items").insert(contractItems);
  if (iErr) {
    // Roll back the contract row so we don't leave a half-built record.
    await supabase.from("studio_contracts").delete().eq("id", contract.id);
    return NextResponse.json({ error: iErr.message }, { status: 500 });
  }

  await supabase
    .from("studio_quotes")
    .update({ status: "converted", contract_id: contract.id })
    .eq("id", quote.id);

  return NextResponse.json({ ok: true, contract_id: contract.id });
}

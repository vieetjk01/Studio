import type { SupabaseClient } from "@supabase/supabase-js";
import { nextContractCode, newShareToken } from "@/lib/contract-code";
import { computeRoundedDeposit } from "@/lib/quote-deposit";

export type ConvertResult =
  | { ok: true; contract_id: string }
  | { ok: false; error: string };

/**
 * Spawn a studio_contracts row from an accepted quote, copying the selected
 * items into contract_items. Pure helper — caller decides who's allowed to
 * call (studio-owner explicit click, or anonymous client auto-accept).
 *
 * If the quote already has `contract_id`, returns that id (idempotent).
 */
export async function convertQuoteToContract(
  db: SupabaseClient,
  quoteId: string
): Promise<ConvertResult> {
  const { data: quote } = await db
    .from("studio_quotes")
    .select("*")
    .eq("id", quoteId)
    .maybeSingle();
  if (!quote) return { ok: false, error: "Báo giá không tồn tại." };
  if (quote.contract_id) return { ok: true, contract_id: quote.contract_id };

  const { data: items } = await db
    .from("quote_items")
    .select("name, qty, unit_price, is_optional, selected, position")
    .eq("quote_id", quote.id)
    .order("position");

  const chosen = (items ?? []).filter((it) => !it.is_optional || it.selected);
  if (chosen.length === 0) return { ok: false, error: "Không có hạng mục nào được chọn." };

  const total = chosen.reduce((s, it) => s + (it.qty || 0) * (it.unit_price || 0), 0);
  const deposit = computeRoundedDeposit(total);

  const code = await nextContractCode(db, quote.owner_id);
  const token = newShareToken();

  const { data: contract, error: cErr } = await db
    .from("studio_contracts")
    .insert({
      owner_id: quote.owner_id,
      code,
      title: quote.title || "Hợp đồng",
      client_name: quote.client_name,
      client_phone: quote.client_phone,
      client_email: quote.client_email,
      client_facebook: quote.client_facebook,
      event_date: quote.event_date,
      location: quote.location,
      deposit,
      status: "draft",
      client_token: token,
      note: quote.code ? `Tạo từ báo giá ${quote.code}` : null,
    })
    .select("id")
    .single();
  if (cErr || !contract) return { ok: false, error: cErr?.message || "Tạo hợp đồng thất bại" };

  const rows = chosen.map((it, idx) => ({
    contract_id: contract.id,
    name: it.name,
    qty: it.qty,
    unit_price: it.unit_price,
    position: idx,
  }));
  const { error: iErr } = await db.from("contract_items").insert(rows);
  if (iErr) {
    // Roll back the empty contract so we don't leave orphans.
    await db.from("studio_contracts").delete().eq("id", contract.id);
    return { ok: false, error: iErr.message };
  }

  await db
    .from("studio_quotes")
    .update({ status: "converted", contract_id: contract.id })
    .eq("id", quote.id);

  return { ok: true, contract_id: contract.id };
}

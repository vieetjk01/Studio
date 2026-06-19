import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const digits = (s: string | null | undefined) => (s ?? "").replace(/\D/g, "");

/**
 * Public client-contract endpoint (no login).
 *   POST { phone }                          -> verify + return the contract + items
 *   POST { action: "edit_request", phone, message } -> submit an amendment request
 * The client's phone (contract.client_phone) acts as the view password.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = (await req.json().catch(() => ({}))) as {
    phone?: string;
    message?: string;
    action?: string;
    name?: string;
    signature?: string;
  };
  const db = createAdminClient();

  const { data: contract } = await db
    .from("studio_contracts")
    .select(
      "id, code, title, client_name, client_phone, client_email, shoot_type, event_date, event_time, location, status, note, client_signed_name, client_signature, client_signed_at, updated_at, owner:profiles(full_name)"
    )
    .eq("client_token", params.token)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const studioName =
    (contract.owner as { full_name?: string } | null)?.full_name || "Studio";

  // Phone gate: if the studio set a client phone, it must match.
  if (contract.client_phone && digits(body.phone) !== digits(contract.client_phone)) {
    return NextResponse.json({ error: "wrong_phone" }, { status: 401 });
  }

  if (body.action === "edit_request") {
    const message = body.message?.trim();
    if (!message) return NextResponse.json({ error: "empty" }, { status: 400 });
    const { error } = await db
      .from("contract_edit_requests")
      .insert({ contract_id: contract.id, message });
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  if (body.action === "sign") {
    const name = body.name?.trim();
    const signature = body.signature?.trim();
    if (!name) return NextResponse.json({ error: "no_name" }, { status: 400 });
    // Guard against oversized data URLs (~200KB cap).
    if (signature && signature.length > 200_000) {
      return NextResponse.json({ error: "too_large" }, { status: 413 });
    }
    const { error } = await db
      .from("studio_contracts")
      .update({
        client_signed_name: name,
        client_signature: signature || null,
        client_signed_at: new Date().toISOString(),
        status: contract.status === "draft" || contract.status === "sent" ? "approved" : contract.status,
      })
      .eq("id", contract.id);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
    return NextResponse.json({ ok: true });
  }

  const [{ data: items }, { data: payments }] = await Promise.all([
    db.from("contract_items").select("id, name, qty, unit_price, position").eq("contract_id", contract.id).order("position"),
    db.from("contract_payments").select("id, amount, kind, paid_at").eq("contract_id", contract.id).order("paid_at", { ascending: false }),
  ]);

  // Never expose internal crew/salary to the client.
  return NextResponse.json({
    contract: { ...contract, client_phone: undefined, owner: undefined },
    studio_name: studioName,
    items: items ?? [],
    payments: payments ?? [],
  });
}

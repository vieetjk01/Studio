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
  };
  const db = createAdminClient();

  const { data: contract } = await db
    .from("studio_contracts")
    .select(
      "id, code, title, client_name, client_phone, shoot_type, event_date, event_time, location, status, deposit, note, updated_at"
    )
    .eq("client_token", params.token)
    .maybeSingle();

  if (!contract) return NextResponse.json({ error: "not_found" }, { status: 404 });

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

  const { data: items } = await db
    .from("contract_items")
    .select("id, name, qty, unit_price, position")
    .eq("contract_id", contract.id)
    .order("position");

  // Never expose internal crew/salary to the client.
  return NextResponse.json({
    contract: { ...contract, client_phone: undefined },
    items: items ?? [],
  });
}

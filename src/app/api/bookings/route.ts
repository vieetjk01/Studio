import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const SERVICES = ["wedding", "event", "sports", "other"];

/** Public endpoint — store a booking lead from the homepage form. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    service?: string;
    name?: string;
    phone?: string;
    date?: string;
    note?: string;
  };

  const name = body.name?.trim();
  const phone = body.phone?.trim();
  if (!name || !phone) {
    return NextResponse.json({ error: "missing_fields" }, { status: 400 });
  }

  const service = SERVICES.includes(body.service ?? "") ? body.service : "other";

  const db = createAdminClient();
  const { error } = await db.from("bookings").insert({
    service,
    name,
    phone,
    date: body.date?.trim() || null,
    note: body.note?.trim() || null,
  });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

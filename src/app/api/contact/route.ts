import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Public: submit a contact / feedback message from mstudo.com homepage. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    message?: string;
  };

  const name = body.name?.trim();
  const message = body.message?.trim();
  if (!name || !message) {
    return NextResponse.json({ error: "Vui lòng nhập tên và nội dung." }, { status: 400 });
  }

  const db = createAdminClient();
  const { error } = await db.from("feedbacks").insert({
    name,
    email: body.email?.trim() || null,
    message,
  });

  if (error) {
    // If the feedbacks table doesn't exist yet, return a soft error.
    if (error.code === "42P01") {
      return NextResponse.json({ error: "table_missing" }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true });
}

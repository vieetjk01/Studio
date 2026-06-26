import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { verifyTurnstile } from "@/lib/turnstile";

export const dynamic = "force-dynamic";

/** Public: submit a contact / feedback message from mstudo.com homepage. */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    name?: string;
    email?: string;
    message?: string;
    captcha?: string;
  };

  // Verify CAPTCHA before processing
  const captchaOk = await verifyTurnstile(body.captcha);
  if (!captchaOk) {
    return NextResponse.json({ error: "Xác minh captcha thất bại. Vui lòng thử lại." }, { status: 400 });
  }

  const name = body.name?.trim();
  const message = body.message?.trim().slice(0, 5000);
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

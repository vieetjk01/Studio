import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

function makeCode(email: string): string {
  const rand = Math.random().toString(36).slice(2, 6).toUpperCase();
  const prefix = email.split("@")[0].replace(/[^a-zA-Z0-9]/g, "").slice(0, 5).toUpperCase();
  return `${prefix}${rand}`;
}

/** GET — return or create the calling user's affiliate code */
export async function GET() {
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const db = createAdminClient();
  const { data: existing } = await db
    .from("affiliate_codes")
    .select("code, active, created_at")
    .eq("user_id", user.id)
    .maybeSingle();

  if (existing) return NextResponse.json({ code: existing.code, active: existing.active });

  // Generate a unique code
  let code = makeCode(user.email || "user");
  for (let i = 0; i < 5; i++) {
    const { data: clash } = await db.from("affiliate_codes").select("id").eq("code", code).maybeSingle();
    if (!clash) break;
    code = makeCode(user.email || "user");
  }

  await db.from("affiliate_codes").insert({ user_id: user.id, code });
  return NextResponse.json({ code, active: true });
}

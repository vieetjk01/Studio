import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Create a photographer account (active by default). Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const { email, password, full_name } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    full_name?: string;
  };

  if (!email || !password || password.length < 6) {
    return NextResponse.json({ error: "invalid_input" }, { status: 400 });
  }

  const db = createAdminClient();
  const { data, error } = await db.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name ?? email },
  });

  if (error || !data.user) {
    return NextResponse.json(
      { error: error?.message ?? "create_failed" },
      { status: 500 }
    );
  }

  // Activate the auto-created profile.
  await db
    .from("profiles")
    .update({ is_active: true, full_name: full_name ?? email, role: "photographer" })
    .eq("id", data.user.id);

  return NextResponse.json({ ok: true, id: data.user.id });
}

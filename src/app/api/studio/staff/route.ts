import { NextResponse } from "next/server";
import { requireStudio } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const ROLES = ["manager", "staff", "accountant"];

/** Studio owner creates a staff sub-account. */
export async function POST(req: Request) {
  const ctx = await requireStudio();
  if (!ctx || (ctx.actingRole !== "owner" && ctx.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { email, password, full_name, role } = (await req.json().catch(() => ({}))) as {
    email?: string;
    password?: string;
    full_name?: string;
    role?: string;
  };
  if (!email || !/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email) || !password || password.length < 6) {
    return NextResponse.json({ error: "bad_input" }, { status: 400 });
  }
  const studioRole = ROLES.includes(role || "") ? role : "staff";

  const db = createAdminClient();
  const { data: created, error } = await db.auth.admin.createUser({
    email: email.trim(),
    password,
    email_confirm: true,
    user_metadata: { full_name: full_name?.trim() || email },
  });
  if (error || !created.user) {
    return NextResponse.json({ error: error?.message || "create_failed" }, { status: 500 });
  }
  // Link the new profile to this studio (the handle_new_user trigger created it).
  const { error: upErr } = await db
    .from("profiles")
    .update({ studio_owner_id: ctx.id, studio_role: studioRole, full_name: full_name?.trim() || email, is_active: true })
    .eq("id", created.user.id);
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  return NextResponse.json({ ok: true });
}

/** Remove a staff sub-account (must belong to this studio). */
export async function DELETE(req: Request) {
  const ctx = await requireStudio();
  if (!ctx || (ctx.actingRole !== "owner" && ctx.actingRole !== "admin")) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const id = new URL(req.url).searchParams.get("id");
  if (!id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const db = createAdminClient();
  const { data: staff } = await db.from("profiles").select("studio_owner_id").eq("id", id).maybeSingle();
  if (!staff || staff.studio_owner_id !== ctx.id) {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }
  const { error } = await db.auth.admin.deleteUser(id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

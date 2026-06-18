import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/** Update a photographer's role / activation / limits. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json()) as {
    id: string;
    role?: "admin" | "photographer";
    is_active?: boolean;
    max_albums?: number | null;
    monthly_album_limit?: number | null;
    can_zip?: boolean;
    can_notes?: boolean;
    can_galleries?: boolean;
    compress_daily_limit?: number | null;
    compress_picker_limit?: number | null;
    full_name?: string;
  };

  if (!body.id) return NextResponse.json({ error: "missing_id" }, { status: 400 });

  const patch: Record<string, unknown> = {};
  for (const k of [
    "role",
    "is_active",
    "max_albums",
    "monthly_album_limit",
    "can_zip",
    "can_notes",
    "can_galleries",
    "compress_daily_limit",
    "compress_picker_limit",
    "full_name",
  ] as const) {
    if (body[k] !== undefined) patch[k] = body[k];
  }

  const db = createAdminClient();
  const { error } = await db.from("profiles").update(patch).eq("id", body.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

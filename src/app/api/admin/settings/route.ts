import { NextResponse } from "next/server";
import { requireAdmin } from "@/lib/auth-guards";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

const FIELDS = [
  "profile_name",
  "profile_role",
  "profile_location",
  "profile_bio",
  "profile_avatar_url",
  "profile_cover_url",
  "stat_years",
  "contact_phone",
  "contact_email",
  "contact_instagram",
  "contact_facebook",
  "contact_tiktok",
  "contact_youtube",
  "contact_address",
  "contact_hours",
] as const;

/** Update the studio profile / contact settings. Admin only. */
export async function POST(req: Request) {
  const admin = await requireAdmin();
  if (!admin) return NextResponse.json({ error: "forbidden" }, { status: 403 });

  const body = (await req.json()) as Record<string, unknown>;
  const patch: Record<string, unknown> = { updated_at: new Date().toISOString() };
  for (const f of FIELDS) {
    if (body[f] !== undefined) {
      patch[f] = f === "stat_years" ? Number(body[f]) || 0 : body[f] || null;
    }
  }

  const db = createAdminClient();
  const { error } = await db
    .from("site_settings")
    .upsert({ id: 1, ...patch }, { onConflict: "id" });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

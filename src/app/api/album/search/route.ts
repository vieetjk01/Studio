import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Public gallery search by album name OR client phone (phone is matched
 * server-side and never returned to the client).
 */
export async function GET(req: Request) {
  const q = new URL(req.url).searchParams.get("q")?.trim() ?? "";
  if (!q) return NextResponse.json({ galleries: [] });

  const db = createAdminClient();
  const like = `%${q}%`;
  const { data } = await db
    .from("albums")
    .select("slug, title, client_name, event_date, category, category_label, cover_url, gallery_pinned")
    .eq("is_gallery", true)
    .eq("status", "published")
    .or(`title.ilike.${like},client_name.ilike.${like},client_phone.ilike.${like}`)
    .order("event_date", { ascending: false, nullsFirst: false })
    .limit(60);

  return NextResponse.json({ galleries: data ?? [] });
}

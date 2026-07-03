import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import type { StoryConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/**
 * Token-gated Love Story editor endpoint (no login — edit_token is the key).
 *   GET                       -> the story + its guest wishes
 *   POST { config, published } -> save the couple's edits
 */
export async function GET(_req: Request, { params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: story } = await db
    .from("story_pages")
    .select("id, owner_id, slug, config, published, updated_at")
    .eq("edit_token", params.token)
    .maybeSingle();
  if (!story) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const { data: wishes } = await db
    .from("story_wishes")
    .select("id, guest_name, wish, created_at")
    .eq("story_id", story.id)
    .order("created_at", { ascending: false })
    .limit(500);

  return NextResponse.json({ story, wishes: wishes ?? [] });
}

export async function POST(req: Request, { params }: { params: { token: string } }) {
  const body = (await req.json().catch(() => ({}))) as { config?: StoryConfig; published?: boolean };
  if (JSON.stringify(body.config ?? {}).length > 256_000) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }
  const db = createAdminClient();
  const { data: story } = await db.from("story_pages").select("id").eq("edit_token", params.token).maybeSingle();
  if (!story) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const patch: Record<string, unknown> = {};
  if (body.config && typeof body.config === "object") patch.config = body.config;
  if (typeof body.published === "boolean") patch.published = body.published;
  if (Object.keys(patch).length === 0) return NextResponse.json({ ok: true });

  const { error } = await db.from("story_pages").update(patch).eq("id", story.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

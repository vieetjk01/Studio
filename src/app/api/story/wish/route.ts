import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToOwner } from "@/lib/push";
import { limitByIp } from "@/lib/rate-limit";
import type { StoryConfig } from "@/lib/types";

export const dynamic = "force-dynamic";

/** Public guest wish for a Love Story page (no login). Looked up by slug. */
export async function POST(req: Request) {
  const limited = limitByIp(req, "wish", 10, 60_000);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as { slug?: string; guest_name?: string; wish?: string };
  const slug = (body.slug ?? "").trim();
  const name = (body.guest_name ?? "").trim().slice(0, 120);
  const wish = (body.wish ?? "").trim().slice(0, 1000);
  if (!slug || !name || !wish) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data: story } = await db.from("story_pages").select("id, owner_id, contract_id, published, config").eq("slug", slug).maybeSingle();
  if (!story || !story.published) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((story.config as StoryConfig)?.wishes_enabled === false) return NextResponse.json({ error: "off" }, { status: 403 });

  const { error } = await db.from("story_wishes").insert({ story_id: story.id, guest_name: name, wish });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  await sendPushToOwner(story.owner_id, {
    title: "Love Story", body: `${name} gửi lời chúc`,
    url: story.contract_id ? `/dashboard/studio/contracts/${story.contract_id}` : "/dashboard/studio/story",
    tag: `story-${story.id}`,
  }).catch(() => {});
  return NextResponse.json({ ok: true });
}

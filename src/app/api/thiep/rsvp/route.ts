import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { sendPushToOwner } from "@/lib/push";

export const dynamic = "force-dynamic";

/**
 * Public guest RSVP for a wedding invitation (no login). Looks the invitation up
 * by slug, records the response, and pings the studio owner.
 */
export async function POST(req: Request) {
  const body = (await req.json().catch(() => ({}))) as {
    slug?: string;
    guest_name?: string;
    side?: string;
    attending?: boolean;
    num_guests?: number;
    wish?: string;
  };

  const slug = (body.slug ?? "").trim();
  const name = (body.guest_name ?? "").trim().slice(0, 120);
  if (!slug || !name) return NextResponse.json({ error: "bad_request" }, { status: 400 });

  const db = createAdminClient();
  const { data: inv } = await db
    .from("wedding_invitations")
    .select("id, owner_id, contract_id, published, config")
    .eq("slug", slug)
    .maybeSingle();
  if (!inv || !inv.published) return NextResponse.json({ error: "not_found" }, { status: 404 });
  if ((inv.config as { rsvp_enabled?: boolean })?.rsvp_enabled === false) {
    return NextResponse.json({ error: "rsvp_off" }, { status: 403 });
  }

  const side = ["groom", "bride", "both"].includes(body.side ?? "") ? body.side : "both";
  const attending = body.attending !== false;
  const num = Math.max(0, Math.min(50, Math.round(Number(body.num_guests) || 1)));

  const { error } = await db.from("wedding_rsvps").insert({
    invitation_id: inv.id,
    guest_name: name,
    side,
    attending,
    num_guests: num,
    wish: (body.wish ?? "").trim().slice(0, 1000) || null,
  });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const msg = attending
    ? `${name} xác nhận tham dự lễ cưới (${num} người)`
    : `${name} gửi lời chúc mừng cưới`;
  await db
    .from("studio_notifications")
    .insert({ owner_id: inv.owner_id, contract_id: inv.contract_id, kind: "info", message: msg })
    .then(() => {}, () => {});
  await sendPushToOwner(inv.owner_id, {
    title: "Thiệp cưới",
    body: msg,
    url: inv.contract_id ? `/dashboard/studio/contracts/${inv.contract_id}` : "/dashboard/studio",
    tag: `rsvp-${inv.id}`,
  }).catch(() => {});

  return NextResponse.json({ ok: true });
}

import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Persist a customer's selection for an album. Public endpoint (no login):
 * a selection belongs to a client-generated session id, so customers can
 * revisit and adjust their picks.
 */
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    clientName?: string;
    photoIds?: string[];
  };

  const sessionId = body.sessionId?.trim();
  const photoIds = Array.isArray(body.photoIds) ? body.photoIds : [];

  if (!sessionId) {
    return NextResponse.json({ error: "missing_session" }, { status: 400 });
  }

  const admin = createAdminClient();

  const { data: album } = await admin
    .from("albums")
    .select("id, status, selection_limit")
    .eq("slug", params.slug)
    .single();

  if (!album || album.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (album.selection_limit && photoIds.length > album.selection_limit) {
    return NextResponse.json({ error: "limit_exceeded" }, { status: 400 });
  }

  // Validate the photos belong to this album and grab their names.
  const { data: photos } = await admin
    .from("photos")
    .select("id, name")
    .eq("album_id", album.id)
    .in("id", photoIds.length ? photoIds : ["00000000-0000-0000-0000-000000000000"]);

  const valid = new Map((photos ?? []).map((p) => [p.id, p.name]));

  // Replace this session's selection atomically (delete then insert).
  await admin
    .from("selections")
    .delete()
    .eq("album_id", album.id)
    .eq("session_id", sessionId);

  const rows = photoIds
    .filter((id) => valid.has(id))
    .map((id) => ({
      album_id: album.id,
      photo_id: id,
      photo_name: valid.get(id) ?? "",
      session_id: sessionId,
      client_name: body.clientName?.trim() || null,
    }));

  if (rows.length > 0) {
    const { error } = await admin.from("selections").insert(rows);
    if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

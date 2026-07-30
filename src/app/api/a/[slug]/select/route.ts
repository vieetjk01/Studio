import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitByIp } from "@/lib/rate-limit";

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
  // Chặn spam/flood ghi bảng selections từ 1 IP.
  const limited = limitByIp(req, `album-select:${params.slug}`, 20, 60_000);
  if (limited) return limited;

  const body = (await req.json().catch(() => ({}))) as {
    sessionId?: string;
    clientName?: string;
    photoIds?: string[];
    notes?: Record<string, string>;
  };

  const sessionId = body.sessionId?.trim().slice(0, 100);
  // Giới hạn số ảnh mỗi lần ghi (chống payload khổng lồ khi album không đặt hạn mức).
  const photoIds = (Array.isArray(body.photoIds) ? body.photoIds : []).slice(0, 5000);
  const notes = body.notes && typeof body.notes === "object" ? body.notes : {};

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
      client_name: body.clientName?.trim().slice(0, 200) || null,
      client_note: notes[id]?.trim().slice(0, 2000) || null,
    }));

  if (rows.length > 0) {
    const { error } = await admin.from("selections").insert(rows);
    if (error) return NextResponse.json({ error: "server_error" }, { status: 500 });
  }

  return NextResponse.json({ ok: true, count: rows.length });
}

/**
 * Return the album's shared selection so any visitor can see what has already
 * been chosen (and avoid picking the same photos).
 */
export async function GET(
  _req: Request,
  { params }: { params: { slug: string } }
) {
  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("id, status")
    .eq("slug", params.slug)
    .single();

  if (!album || album.status !== "published") {
    return NextResponse.json({ selected: [], notes: {} });
  }

  const { data: sel } = await admin
    .from("selections")
    .select("photo_id, client_note")
    .eq("album_id", album.id);

  const selected = (sel ?? []).map((s) => s.photo_id);
  const notes: Record<string, string> = {};
  for (const s of sel ?? []) if (s.client_note) notes[s.photo_id] = s.client_note;
  return NextResponse.json({ selected, notes });
}

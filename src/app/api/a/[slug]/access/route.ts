import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

/**
 * Verify an album password (if any) and return the photo list.
 * Public endpoint — uses the service role to read a published album, but only
 * returns photos when the password check passes.
 */
export async function POST(
  req: Request,
  { params }: { params: { slug: string } }
) {
  const { password } = (await req.json().catch(() => ({}))) as {
    password?: string;
  };
  const admin = createAdminClient();

  const { data: album } = await admin
    .from("albums")
    .select("id, status, password_hash")
    .eq("slug", params.slug)
    .single();

  if (!album || album.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (album.password_hash) {
    const ok = password
      ? await bcrypt.compare(password, album.password_hash)
      : false;
    if (!ok) {
      return NextResponse.json({ error: "wrong_password" }, { status: 401 });
    }
  }

  const { data: photos } = await admin
    .from("photos")
    .select("id, drive_file_id, name, source_id, position")
    .eq("album_id", album.id)
    .order("position");

  const { data: sources } = await admin
    .from("album_sources")
    .select("id, name, position")
    .eq("album_id", album.id)
    .order("position");

  const { data: sel } = await admin
    .from("selections")
    .select("photo_id, client_note")
    .eq("album_id", album.id);
  const selected = (sel ?? []).map((s) => s.photo_id);
  const notes: Record<string, string> = {};
  for (const s of sel ?? []) if (s.client_note) notes[s.photo_id] = s.client_note;

  return NextResponse.json({
    photos: photos ?? [],
    sources: sources ?? [],
    selected,
    notes,
  });
}

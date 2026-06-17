import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPhotos } from "@/lib/photos";

export const dynamic = "force-dynamic";

/** Verify a gallery's phone password and return its photos + sources. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const admin = createAdminClient();

  const { data: album } = await admin
    .from("albums")
    .select("id, status, is_gallery, password_hash, gallery_pinned")
    .eq("slug", params.slug)
    .single();

  if (!album || !album.is_gallery || album.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!album.gallery_pinned && album.password_hash) {
    const ok = password ? await bcrypt.compare(password.trim(), album.password_hash) : false;
    if (!ok) return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const photos = await fetchAllPhotos(admin, album.id, "id, drive_file_id, name, source_id, position");
  const { data: sources } = await admin
    .from("album_sources")
    .select("id, name, position")
    .eq("album_id", album.id)
    .order("position");

  return NextResponse.json({ photos, sources: sources ?? [] });
}

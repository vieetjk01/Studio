import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPhotos } from "@/lib/photos";
import { limitByIpDurable } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/** Verify a gallery's phone password and return its photos + sources. */
export async function POST(req: Request, { params }: { params: { slug: string } }) {
  // H7: mật khẩu gallery thường là SỐ ĐIỆN THOẠI (entropy thấp) — chặn dò mật khẩu.
  const limited = await limitByIpDurable(req, `gallery-pw:${params.slug}`, 10, 60_000);
  if (limited) return limited;

  const { password } = (await req.json().catch(() => ({}))) as { password?: string };
  const admin = createAdminClient();

  const { data: album } = await admin
    .from("albums")
    .select("id, status, is_gallery, phase, password_hash, gallery_pinned")
    .eq("slug", params.slug)
    .single();

  // Accept legacy galleries and unified projects switched to the delivery phase.
  const isDelivery = album?.is_gallery || album?.phase === "delivery";
  if (!album || !isDelivery || album.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }

  if (!album.gallery_pinned && album.password_hash) {
    const ok = password ? await bcrypt.compare(password.trim(), album.password_hash) : false;
    if (!ok) return NextResponse.json({ error: "wrong_password" }, { status: 401 });
  }

  const allPhotos = await fetchAllPhotos(admin, album.id, "id, drive_file_id, name, source_id, position, is_video");
  const { data: allSources } = await admin
    .from("album_sources")
    .select("id, name, position, stage, drive_url, kind")
    .eq("album_id", album.id)
    .order("position");

  // Prefer delivery-stage photos; if none are tagged yet, fall back to showing
  // all the album's photos so the gallery is never unexpectedly empty.
  const delSources = (allSources ?? []).filter((x) => x.stage === "delivery");
  const useStages = delSources.length > 0;
  const delSourceIds = new Set(delSources.map((x) => x.id));
  const photos = (allPhotos ?? []).filter((ph) => !useStages || !ph.source_id || delSourceIds.has(ph.source_id));
  const shown = useStages ? delSources : (allSources ?? []);
  const sources = shown.map(({ id, name, position }) => ({ id, name, position }));
  // Folder Drive links of the shown sources → "Tải album" gives the customer a
  // Drive link (gated behind the password like the photos themselves).
  const driveFolders = shown
    .filter((x) => x.kind === "folder" && x.drive_url)
    .map(({ name, drive_url }) => ({ name, url: drive_url as string }));

  return NextResponse.json({ photos, sources, driveFolders });
}

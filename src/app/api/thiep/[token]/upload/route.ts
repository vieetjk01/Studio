import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Hard server caps (the client compresses images to WebP ≤~2MB; audio for the
// background music is allowed a bit more). The upload is token-gated.
const MAX_IMAGE_BYTES = 3 * 1024 * 1024;
const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

/**
 * Token-gated image upload for the wedding-invitation editor. The client sends
 * an already-compressed image as multipart form-data; we store it in the public
 * `wedding-photos` bucket via the service role and return its public URL.
 */
export async function POST(req: Request, { params }: { params: { token: string } }) {
  const db = createAdminClient();
  const { data: inv } = await db
    .from("wedding_invitations")
    .select("id, owner_id")
    .eq("edit_token", params.token)
    .maybeSingle();
  if (!inv) return NextResponse.json({ error: "not_found" }, { status: 404 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  const isAudio = file.type.startsWith("audio/");
  const isImage = file.type.startsWith("image/");
  if (!isImage && !isAudio) return NextResponse.json({ error: "bad_type" }, { status: 415 });
  if (file.size > (isAudio ? MAX_AUDIO_BYTES : MAX_IMAGE_BYTES)) {
    return NextResponse.json({ error: "too_large" }, { status: 413 });
  }

  const ext = file.type === "image/webp" ? "webp" : (file.type.split("/")[1] || (isAudio ? "mp3" : "jpg"));
  const path = `${inv.owner_id}/${inv.id}/${crypto.randomUUID?.() ?? Date.now()}.${ext}`;
  const { error } = await db.storage
    .from("wedding-photos")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = db.storage.from("wedding-photos").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
}

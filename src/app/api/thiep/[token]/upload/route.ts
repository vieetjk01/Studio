import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

// Hard server cap (the client already compresses to WebP ≤~2MB; this is a
// backstop against abuse since the upload is token-gated, not login-gated).
const MAX_BYTES = 3 * 1024 * 1024;

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
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 413 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 415 });

  const ext = file.type === "image/webp" ? "webp" : (file.type.split("/")[1] || "jpg");
  const path = `${inv.owner_id}/${inv.id}/${crypto.randomUUID?.() ?? Date.now()}.${ext}`;
  const { error } = await db.storage
    .from("wedding-photos")
    .upload(path, file, { upsert: false, contentType: file.type });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const url = db.storage.from("wedding-photos").getPublicUrl(path).data.publicUrl;
  return NextResponse.json({ url });
}

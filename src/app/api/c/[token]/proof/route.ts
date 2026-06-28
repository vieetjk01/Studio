import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";

export const dynamic = "force-dynamic";

export async function POST(req: NextRequest, { params }: { params: { token: string } }) {
  const db = createAdminClient();

  // Validate token
  const { data: contract } = await db
    .from("studio_contracts")
    .select("id, owner_id")
    .eq("client_token", params.token)
    .maybeSingle();
  if (!contract) return NextResponse.json({ error: "invalid_token" }, { status: 403 });

  const form = await req.formData();
  const file = form.get("file") as File | null;
  if (!file) return NextResponse.json({ error: "no_file" }, { status: 400 });

  // Validate image
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });
  // Backstop: the client compresses before upload, so anything this large is abuse.
  if (file.size > 3 * 1024 * 1024) return NextResponse.json({ error: "too_large" }, { status: 400 });

  // H-2: Derive extension from validated MIME type, not client-supplied filename
  const EXT_MAP: Record<string, string> = { "image/jpeg": "jpg", "image/png": "png", "image/webp": "webp", "image/gif": "gif", "image/heic": "heic" };
  const ext = EXT_MAP[file.type] ?? "jpg";
  const path = `client/${contract.id}/${Date.now()}.${ext}`;

  const { error: upErr } = await db.storage
    .from("payment-proofs")
    .upload(path, file, { contentType: file.type, upsert: false });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const { data: { publicUrl } } = db.storage.from("payment-proofs").getPublicUrl(path);

  const note = (form.get("note") as string | null) || null;
  const planId = (form.get("plan_id") as string | null) || null;
  await db.from("contract_client_proofs").insert({
    contract_id: contract.id,
    url: publicUrl,
    note,
    plan_id: planId,
  });

  // Notify owner
  await db.from("studio_notifications").insert({
    owner_id: contract.owner_id,
    contract_id: contract.id,
    kind: "payment",
    message: "Khách hàng đã gửi ảnh chuyển khoản.",
  });

  return NextResponse.json({ url: publicUrl });
}

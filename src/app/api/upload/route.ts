import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { uploadToAdminDrive } from "@/lib/mstudo-drive";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

const MAX_BYTES = 10 * 1024 * 1024; // 10 MB (giới hạn cứng phía server)

/**
 * Upload nội dung NGƯỜI DÙNG. Ưu tiên lưu vào Drive của admin mstudo (không tốn
 * dung lượng Supabase); nếu Drive chưa kết nối thì fallback về Supabase Storage.
 * Trả về { url } dùng trực tiếp làm src ảnh.
 */
export async function POST(req: Request) {
  // Chỉ người đã đăng nhập mới được upload.
  const supabase = createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return NextResponse.json({ error: "no_file" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "too_large" }, { status: 400 });
  if (!file.type.startsWith("image/")) return NextResponse.json({ error: "not_image" }, { status: 400 });

  const bucket = (form?.get("bucket") as string) || "logos";
  const original = form?.get("original") === "1"; // giữ nguyên gốc (logo PNG trong suốt)
  const buf = Buffer.from(await file.arrayBuffer());
  const ext = (file.name.split(".").pop() || "png").toLowerCase().replace(/[^a-z0-9]/g, "") || "png";

  // 1) Drive admin (nếu đã kết nối).
  try {
    const id = await uploadToAdminDrive(buf, `${user.id}-${Date.now()}.${ext}`, file.type);
    if (id) {
      const url = `/api/img?id=${id}${original ? "&orig=1" : "&w=800"}`;
      return NextResponse.json({ url, id, storage: "drive" });
    }
  } catch {
    /* rơi xuống fallback Supabase */
  }

  // 2) Fallback: Supabase Storage.
  const path = `${user.id}/${Date.now()}.${ext}`;
  const db = createAdminClient();
  const { error } = await db.storage.from(bucket).upload(path, buf, { contentType: file.type, upsert: true });
  if (error) {
    if (error.message.includes("not found") || error.message.includes("Bucket")) {
      return NextResponse.json({ error: "bucket_missing", bucket }, { status: 500 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  const { data } = db.storage.from(bucket).getPublicUrl(path);
  return NextResponse.json({ url: data.publicUrl, storage: "supabase" });
}

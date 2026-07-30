import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { fetchAllPhotos, filterDeliveryPhotos } from "@/lib/photos";

export const runtime = "nodejs";

// Danh sách ảnh của một gallery giao khách CÔNG KHAI (không mật khẩu), phân
// trang. Tách khỏi HTML SSR để trang chỉ gửi ~lô ảnh đầu; phần còn lại nạp qua
// đây. Đặt s-maxage để CDN phục vụ các lượt xem lặp (giảm Fast Origin Transfer).
const CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

export async function GET(req: Request, { params }: { params: { slug: string } }) {
  const { searchParams } = new URL(req.url);
  const offset = Math.max(0, Number(searchParams.get("offset")) || 0);
  const limit = Math.min(Math.max(Number(searchParams.get("limit")) || 500, 1), 2000);

  const admin = createAdminClient();
  const { data: album } = await admin
    .from("albums")
    .select("id, status, is_gallery, phase, password_hash, gallery_pinned")
    .eq("slug", params.slug)
    .single();

  const isDelivery = album?.is_gallery || album?.phase === "delivery";
  if (!album || !isDelivery || album.status !== "published") {
    return NextResponse.json({ error: "not_found" }, { status: 404 });
  }
  // Album có mật khẩu → chỉ trả ảnh qua POST /access sau khi xác thực, KHÔNG lộ ở đây.
  const hasPassword = !album.gallery_pinned && !!album.password_hash;
  if (hasPassword) {
    return NextResponse.json({ error: "password_required" }, { status: 403 });
  }

  const [{ data: sources }, allPhotos] = await Promise.all([
    admin.from("album_sources").select("id, stage").eq("album_id", album.id),
    fetchAllPhotos(admin, album.id, "id, drive_file_id, name, source_id, position, is_video"),
  ]);
  const filtered = filterDeliveryPhotos(allPhotos ?? [], sources ?? []);

  return NextResponse.json(
    { photos: filtered.slice(offset, offset + limit), total: filtered.length },
    { headers: { "Cache-Control": CACHE } }
  );
}

import { NextResponse } from "next/server";

export const runtime = "nodejs";

// Nội dung trên Drive được đánh địa chỉ theo file id và không đổi → cache cứng.
const CACHE_OK = "public, max-age=86400, s-maxage=31536000, stale-while-revalidate=86400, immutable";

/**
 * Phục vụ một file Drive BẤT KỲ (nhạc nền thiệp cưới…) bằng cách 302 thẳng sang
 * Google. Song sinh của /api/img nhưng không giới hạn ảnh và không resize.
 *
 * Chỉ chuyển hướng, không bao giờ đọc byte: Vercel và Supabase đều tốn 0 byte,
 * và vì trình duyệt nói chuyện trực tiếp với Google sau khi chuyển hướng nên
 * Range request vẫn hoạt động — thẻ <audio> tua được bình thường.
 */
export async function GET(req: Request) {
  const id = new URL(req.url).searchParams.get("id");
  if (!id || !/^[a-zA-Z0-9_-]+$/.test(id)) {
    return NextResponse.json({ error: "bad_id" }, { status: 400 });
  }
  return NextResponse.redirect(
    `https://drive.usercontent.google.com/download?id=${id}&export=download`,
    { status: 302, headers: { "Cache-Control": CACHE_OK } },
  );
}

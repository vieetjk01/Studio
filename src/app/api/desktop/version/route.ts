import { NextResponse } from "next/server";

export const dynamic = "force-dynamic";

/**
 * Phiên bản MStudo Desktop mới nhất — app kiểm tra khi mở + mỗi ngày và hiện
 * nút "Tải bản cập nhật" (mở trình duyệt). Cập nhật bằng cách đặt biến môi
 * trường trên Vercel, không cần deploy lại code:
 *   DESKTOP_LATEST_VERSION   ví dụ "0.2.0"
 *   NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL  link file -setup.exe
 *   DESKTOP_UPDATE_NOTE      (tùy chọn) mô tả ngắn bản mới
 */
export async function GET() {
  return NextResponse.json({
    version: process.env.DESKTOP_LATEST_VERSION || "0.1.0",
    url: process.env.NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL || null,
    note: process.env.DESKTOP_UPDATE_NOTE || null,
  });
}

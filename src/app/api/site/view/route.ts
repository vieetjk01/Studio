import { NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { limitByIp } from "@/lib/rate-limit";

export const dynamic = "force-dynamic";

/* Đếm lượt xem website studio. Trang công khai gọi một lần mỗi phiên (beacon).
   Không lưu IP, không đặt cookie — chỉ +1 vào bộ đếm theo ngày của site. */

const BOT = /bot|crawler|spider|crawling|facebookexternalhit|slurp|bingpreview|headless|lighthouse|preview/i;

export async function POST(req: Request) {
  // Chặn spam làm phồng số liệu (một IP tối đa 20 lượt/phút).
  const limited = limitByIp(req, "site-view", 20, 60_000);
  if (limited) return new NextResponse(null, { status: 204 });

  // Bot/trình thu thập không tính là khách xem trang.
  if (BOT.test(req.headers.get("user-agent") || "")) return new NextResponse(null, { status: 204 });

  const { site } = (await req.json().catch(() => ({}))) as { site?: string };
  const id = (site ?? "").trim();
  if (!/^[0-9a-f-]{32,36}$/i.test(id)) return new NextResponse(null, { status: 204 });

  // Bỏ qua lỗi: đếm lượt xem không được phép làm ảnh hưởng trang khách đang xem.
  await createAdminClient().rpc("bump_site_view", { p_site: id });
  return new NextResponse(null, { status: 204 });
}

import { NextResponse } from "next/server";
import { getSessionUser } from "@/lib/auth-guards";
import { limitByIp } from "@/lib/rate-limit";
import { isShortMapLink, mapEmbedSrc, parseMapInput } from "@/lib/site-map";

export const dynamic = "force-dynamic";

/* Link "Chia sẻ" của Google Maps trên điện thoại luôn ở dạng rút gọn
   (maps.app.goo.gl/…) và KHÔNG nhúng được vào iframe. Trình duyệt không đọc
   được đích của nó (CORS), nên trình tạo website gọi route này để server mở
   link ra URL đầy đủ rồi lấy toạ độ.

   Chỉ mở link trên đúng các host rút gọn của Google và chỉ đi theo chuyển hướng
   trong phạm vi host của Google → không dùng được như một cầu nối để dò mạng
   nội bộ (SSRF). */

const SHORT_OK = new Set(["maps.app.goo.gl", "goo.gl"]);
const HOP_OK = (host: string) =>
  SHORT_OK.has(host) || host === "google.com" || host.endsWith(".google.com") || host.endsWith(".goo.gl");
const MAX_HOPS = 5;

export async function POST(req: Request) {
  const limited = limitByIp(req, "maps-resolve", 30, 60_000);
  if (limited) return limited;

  // Chỉ người đã đăng nhập (studio đang soạn website) mới dùng được.
  const user = await getSessionUser();
  if (!user) return NextResponse.json({ error: "Chưa đăng nhập." }, { status: 401 });

  const { url } = (await req.json().catch(() => ({}))) as { url?: string };
  const input = (url ?? "").trim();
  if (!input || !isShortMapLink(input)) {
    return NextResponse.json({ error: "Không phải link Google Maps rút gọn." }, { status: 400 });
  }

  let current: URL;
  try {
    current = new URL(input);
  } catch {
    return NextResponse.json({ error: "Link không hợp lệ." }, { status: 400 });
  }
  if (current.protocol !== "https:" || !SHORT_OK.has(current.hostname.toLowerCase())) {
    return NextResponse.json({ error: "Link không được hỗ trợ." }, { status: 400 });
  }

  let last: Response | null = null;
  for (let hop = 0; hop < MAX_HOPS; hop++) {
    try {
      last = await fetch(current.href, {
        method: "GET",
        redirect: "manual",
        cache: "no-store",
        signal: AbortSignal.timeout(8000),
        // Google trả link đầy đủ cho trình duyệt thật; UA mặc định hay bị chặn.
        headers: { "User-Agent": "Mozilla/5.0 (compatible; mstudo-map-resolver)", "Accept-Language": "vi,en" },
      });
    } catch {
      return NextResponse.json({ error: "Không mở được link. Thử dán link đầy đủ từ máy tính." }, { status: 502 });
    }

    const next = last.headers.get("location");
    if (last.status >= 300 && last.status < 400 && next) {
      let target: URL;
      try {
        target = new URL(next, current);
      } catch {
        break;
      }
      if (target.protocol !== "https:" || !HOP_OK(target.hostname.toLowerCase())) break;
      current = target;
      // Đã tới URL đầy đủ của Google Maps → đủ dữ liệu, dừng.
      if (!SHORT_OK.has(current.hostname.toLowerCase())) break;
      continue;
    }
    break;
  }

  // Trang "đồng ý điều khoản" của Google chuyển tiếp link thật qua ?continue=…
  const cont = current.searchParams.get("continue");
  if (cont) {
    try {
      const cu = new URL(cont);
      if (cu.protocol === "https:" && HOP_OK(cu.hostname.toLowerCase())) current = cu;
    } catch { /* bỏ qua, dùng tiếp URL hiện tại */ }
  }

  // Thường sau chuyển hướng là đã có URL đầy đủ.
  let resolved = SHORT_OK.has(current.hostname.toLowerCase()) ? null : current.href;

  // Có lúc Google trả về trang HTML thay vì 3xx (tuỳ khu vực / thiết bị). Khi đó
  // link đầy đủ nằm trong thẻ meta/canonical của trang → bóc ra dùng.
  if ((!resolved || !mapEmbedSrc(resolved)) && last) {
    const type = last.headers.get("content-type") || "";
    if (type.includes("text/html")) {
      const body = (await last.text().catch(() => ""))?.slice(0, 200_000) ?? "";
      const found = (body.match(/https:\/\/(?:www\.)?google\.[a-z.]+\/maps\/[^"'<>\\ ]+/gi) ?? [])
        .map((m) => m.replace(/&amp;/g, "&"))
        .filter((m) => !!mapEmbedSrc(m));
      // Ưu tiên link có TOẠ ĐỘ (chính xác) hơn link chỉ có tên địa điểm.
      resolved = found.find((m) => parseMapInput(m)?.kind === "coords") ?? found[0] ?? resolved;
    }
  }

  const embed = resolved ? mapEmbedSrc(resolved) : null;
  if (!resolved || !embed) {
    return NextResponse.json(
      { error: "Chưa lấy được vị trí từ link này. Mở Google Maps trên máy tính rồi copy link trên thanh địa chỉ." },
      { status: 422 },
    );
  }
  return NextResponse.json({ url: resolved, embed });
}

import "server-only";
import type { PersonalSession } from "./config";

/* eslint-disable @typescript-eslint/no-explicit-any */

/**
 * Kênh Zalo CÁ NHÂN qua thư viện KHÔNG chính thức `zca-js` (mô phỏng Zalo Web).
 *
 * ⚠️ RỦI RO: tự động hoá tài khoản cá nhân VI PHẠM điều khoản Zalo và có thể bị
 *    KHOÁ tài khoản. UI phải cảnh báo studio trước khi bật. Chỉ nên dùng để nhắn
 *    cho người ĐÃ là bạn bè (khách/thợ đã kết bạn).
 *
 * ⚠️ HẠ TẦNG: Vercel serverless không giữ phiên websocket sống lâu. Việc *GỬI*
 *    tin chạy tốt (khôi phục phiên từ cookie đã lưu rồi gọi API — không cần
 *    websocket). Bước *ĐĂNG NHẬP QR* cần tiến trình sống trong lúc quét → route
 *    gọi nó phải đặt maxDuration cao; nếu Zalo đổi cơ chế, phần này cần chạy ở
 *    một worker riêng. Toàn bộ phụ thuộc zca-js được CÔ LẬP trong file này.
 *
 * zca-js là optionalDependency → dùng dynamic import có `webpackIgnore` để
 * `next build` không cố bundle (và không chết khi gói chưa được cài).
 */

async function loadZca(): Promise<any | null> {
  try {
    // webpackIgnore: giữ import ở runtime, không để bundler phân giải lúc build.
    const mod = await import(/* webpackIgnore: true */ "zca-js");
    return mod;
  } catch {
    return null;
  }
}

/** zca-js đã được cài trên máy chủ chưa? */
export async function personalAvailable(): Promise<boolean> {
  return (await loadZca()) !== null;
}

/** Trích phiên { cookie, imei, userAgent } từ instance api của zca-js. */
function extractSession(zalo: any, api: any): PersonalSession | null {
  const ctx = (api?.getContext && api.getContext()) || (zalo?.getContext && zalo.getContext()) || {};
  const cookie =
    (api?.getCookie && api.getCookie()) ??
    ctx.cookie ??
    (zalo?.getCookie && zalo.getCookie()) ??
    null;
  const imei = ctx.imei ?? api?.imei ?? zalo?.imei ?? "";
  const userAgent = ctx.userAgent ?? api?.userAgent ?? "";
  if (!cookie || !imei) return null;
  return { cookie, imei, userAgent };
}

async function selfInfo(api: any): Promise<{ id: string; name?: string; avatar?: string } | null> {
  try {
    const id = api?.getOwnId ? String(api.getOwnId()) : "";
    let name: string | undefined;
    let avatar: string | undefined;
    if (api?.fetchAccountInfo) {
      const info = await api.fetchAccountInfo();
      const p = info?.profile ?? info;
      name = p?.displayName ?? p?.zaloName ?? p?.username;
      avatar = p?.avatar;
    }
    return id ? { id, name, avatar } : null;
  } catch {
    return null;
  }
}

/**
 * Đăng nhập bằng QR. `onQR` được gọi với ảnh QR (base64 PNG, KHÔNG kèm tiền tố
 * data:) để hiển thị cho studio quét. Promise resolve khi quét xong.
 */
export async function loginPersonalQR(
  onQR: (imageBase64: string) => void
): Promise<{ session: PersonalSession; self: { id: string; name?: string; avatar?: string } | null }> {
  const mod = await loadZca();
  if (!mod) throw new Error("zca_js_not_installed");
  const Zalo = mod.Zalo || mod.default?.Zalo || mod.default;
  const zalo = new Zalo();

  const api = await zalo.loginQR(undefined, (ev: any) => {
    // Các phiên bản zca-js khác nhau: ảnh QR nằm ở ev.data.image hoặc ev.data.
    const img = ev?.data?.image ?? ev?.image ?? (typeof ev?.data === "string" ? ev.data : null);
    if (img) onQR(String(img));
  });

  const session = extractSession(zalo, api);
  if (!session) throw new Error("no_session_after_login");
  const self = await selfInfo(api);
  return { session, self };
}

/** Khôi phục instance api từ phiên đã lưu (dùng để gửi tin). */
async function apiFromSession(session: PersonalSession): Promise<any> {
  const mod = await loadZca();
  if (!mod) throw new Error("zca_js_not_installed");
  const Zalo = mod.Zalo || mod.default?.Zalo || mod.default;
  const zalo = new Zalo();
  return zalo.login({ cookie: session.cookie, imei: session.imei, userAgent: session.userAgent });
}

/** Phân giải SĐT → Zalo user id (uid) qua tài khoản đã đăng nhập. */
export async function resolveUidByPhone(session: PersonalSession, phone: string): Promise<string | null> {
  try {
    const api = await apiFromSession(session);
    const found = await api.findUser(phone);
    return String(found?.uid ?? found?.userId ?? found?.data?.uid ?? "") || null;
  } catch {
    return null;
  }
}

/**
 * Gửi tin văn bản tới một người. `target` là uid nếu biết, hoặc số điện thoại
 * (sẽ tự tìm uid — chỉ được nếu người đó đã là bạn bè / tìm thấy).
 */
export async function sendPersonalText(
  session: PersonalSession,
  target: { uid?: string | null; phone?: string | null },
  text: string
): Promise<{ ok: boolean; uid?: string; error?: string }> {
  try {
    const mod = await loadZca();
    if (!mod) return { ok: false, error: "zca_js_not_installed" };
    const Zalo = mod.Zalo || mod.default?.Zalo || mod.default;
    const ThreadType = mod.ThreadType ?? { User: 0 };
    const zalo = new Zalo();
    const api = await zalo.login({
      cookie: session.cookie,
      imei: session.imei,
      userAgent: session.userAgent,
    });

    let uid = target.uid || null;
    if (!uid && target.phone) {
      const found = await api.findUser(target.phone);
      uid = String(found?.uid ?? found?.userId ?? found?.data?.uid ?? "") || null;
    }
    if (!uid) return { ok: false, error: "recipient_not_found" };

    await api.sendMessage({ msg: text }, uid, ThreadType.User);
    return { ok: true, uid };
  } catch (e: any) {
    return { ok: false, error: e?.message || "personal_send_failed" };
  }
}

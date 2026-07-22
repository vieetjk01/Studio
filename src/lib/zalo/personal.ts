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
 * ⚠️ HẠ TẦNG: đăng nhập QR cần giữ tiến trình sống trong lúc quét (route đặt
 *    maxDuration cao). Việc GỬI thì khôi phục phiên từ cookie đã lưu rồi gọi API
 *    (không cần giữ websocket). Toàn bộ phụ thuộc zca-js CÔ LẬP trong file này.
 *
 * zca-js là optionalDependency + đánh dấu serverComponentsExternalPackages (không
 * bundle, trace vào serverless). API dùng theo zca-js v2 (đã đối chiếu type defs).
 */

async function loadZca(): Promise<any | null> {
  try {
    return await import("zca-js");
  } catch {
    return null;
  }
}

function makeZalo(mod: any): any {
  const Zalo = mod.Zalo || mod.default?.Zalo || mod.default;
  return new Zalo({ checkUpdate: false, logging: false });
}

/** zca-js đã được cài trên máy chủ chưa? */
export async function personalAvailable(): Promise<boolean> {
  return (await loadZca()) !== null;
}

/**
 * Đăng nhập bằng QR. `onQR` được gọi với chuỗi ảnh QR (data URL hoặc base64) để
 * hiển thị cho studio quét. `onScanned` (tuỳ chọn) báo khi khách đã quét. Promise
 * resolve khi đăng nhập hoàn tất (đã nhận thông tin phiên).
 */
export async function loginPersonalQR(
  onQR: (image: string) => void,
  onScanned?: (info: { display_name?: string; avatar?: string }) => void
): Promise<{ session: PersonalSession; self: { id: string; name?: string; avatar?: string } | null }> {
  const mod = await loadZca();
  if (!mod) throw new Error("zca_js_not_installed");
  const EventType = mod.LoginQRCallbackEventType ?? {
    QRCodeGenerated: 0,
    QRCodeExpired: 1,
    QRCodeScanned: 2,
    QRCodeDeclined: 3,
    GotLoginInfo: 4,
  };
  const zalo = makeZalo(mod);

  // Holder object: các trường được gán TRONG closure callback. Dùng object (thay
  // vì biến let) để TypeScript nới lại kiểu property sau await, không thu hẹp về null.
  const captured: {
    creds: PersonalSession | null;
    scanned: { display_name?: string; avatar?: string } | null;
  } = { creds: null, scanned: null };

  const api = await zalo.loginQR(undefined, (event: any) => {
    switch (event?.type) {
      case EventType.QRCodeGenerated:
        if (event.data?.image) onQR(String(event.data.image));
        break;
      case EventType.QRCodeScanned:
        captured.scanned = { display_name: event.data?.display_name, avatar: event.data?.avatar };
        onScanned?.(captured.scanned);
        break;
      case EventType.GotLoginInfo:
        if (event.data) {
          captured.creds = {
            cookie: event.data.cookie,
            imei: event.data.imei,
            userAgent: event.data.userAgent,
          };
        }
        break;
      default:
        break;
    }
  });

  if (!captured.creds) throw new Error("no_session_after_login");
  let id = "";
  try {
    id = api?.getOwnId ? String(api.getOwnId()) : "";
  } catch {
    /* bỏ qua */
  }
  const self = { id, name: captured.scanned?.display_name, avatar: captured.scanned?.avatar };
  return { session: captured.creds, self };
}

/** Khôi phục instance api từ phiên đã lưu. */
async function apiFromSession(session: PersonalSession): Promise<any> {
  const mod = await loadZca();
  if (!mod) throw new Error("zca_js_not_installed");
  const zalo = makeZalo(mod);
  const api = await zalo.login({
    cookie: session.cookie,
    imei: session.imei,
    userAgent: session.userAgent,
  });
  return { api, ThreadType: mod.ThreadType ?? { User: 0 } };
}

/** Phân giải SĐT → Zalo user id (uid). Chỉ được nếu tìm thấy (thường là bạn bè). */
export async function resolveUidByPhone(session: PersonalSession, phone: string): Promise<string | null> {
  try {
    const { api } = await apiFromSession(session);
    const found = await api.findUser(phone);
    return String(found?.uid ?? "") || null;
  } catch {
    return null;
  }
}

/**
 * Gửi tin văn bản tới một người. `target.uid` nếu biết, hoặc `target.phone`
 * (tự tìm uid — chỉ được nếu người đó tìm thấy/đã kết bạn).
 */
export async function sendPersonalText(
  session: PersonalSession,
  target: { uid?: string | null; phone?: string | null },
  text: string
): Promise<{ ok: boolean; uid?: string; error?: string }> {
  try {
    const { api, ThreadType } = await apiFromSession(session);

    let uid = target.uid || null;
    if (!uid && target.phone) {
      const found = await api.findUser(target.phone);
      uid = String(found?.uid ?? "") || null;
    }
    if (!uid) return { ok: false, error: "recipient_not_found" };

    await api.sendMessage({ msg: text }, uid, ThreadType.User);
    return { ok: true, uid };
  } catch (e: any) {
    return { ok: false, error: e?.message || "personal_send_failed" };
  }
}

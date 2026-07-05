import "server-only";
import webpush from "web-push";
import { createAdminClient } from "@/lib/supabase/admin";

// VAPID keys — set on Vercel. The public key is also exposed to the client as
// NEXT_PUBLIC_VAPID_PUBLIC_KEY for subscribing.
const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";
const VAPID_PRIVATE = process.env.VAPID_PRIVATE_KEY || "";
const VAPID_SUBJECT = process.env.VAPID_SUBJECT || "mailto:hello@mstudo.com";

let configured = false;
function ensureConfigured(): boolean {
  if (configured) return true;
  if (!VAPID_PUBLIC || !VAPID_PRIVATE) return false;
  webpush.setVapidDetails(VAPID_SUBJECT, VAPID_PUBLIC, VAPID_PRIVATE);
  configured = true;
  return true;
}

export type PushPayload = {
  title: string;
  body: string;
  url?: string;
  tag?: string;
  icon?: string;
};

type SubRow = { id: string; endpoint: string; p256dh: string; auth: string };

/** Gửi payload tới một danh sách subscription, tự dọn subscription đã chết. */
async function deliver(subs: SubRow[], payload: PushPayload): Promise<number> {
  if (subs.length === 0) return 0;
  const db = createAdminClient();
  const body = JSON.stringify(payload);
  let sent = 0;
  await Promise.all(
    subs.map(async (s) => {
      try {
        await webpush.sendNotification(
          { endpoint: s.endpoint, keys: { p256dh: s.p256dh, auth: s.auth } },
          body
        );
        sent++;
      } catch (err: unknown) {
        const code = (err as { statusCode?: number })?.statusCode;
        // 404/410 = subscription expired/unsubscribed → remove it.
        if (code === 404 || code === 410) {
          await db.from("push_subscriptions").delete().eq("id", s.id);
        }
      }
    })
  );
  return sent;
}

/**
 * Send a push notification to every registered device of a studio owner.
 * Silently no-ops if VAPID keys aren't configured, so notification creation
 * never fails just because push isn't set up yet. Dead subscriptions (410/404)
 * are pruned automatically.
 */
export async function sendPushToOwner(ownerId: string, payload: PushPayload): Promise<void> {
  if (!ensureConfigured()) return;

  const db = createAdminClient();
  const { data: subs } = await db
    .from("push_subscriptions")
    .select("id, endpoint, p256dh, auth")
    .eq("owner_id", ownerId);

  await deliver((subs ?? []) as SubRow[], payload);
}

/**
 * Gửi push tới NHIỀU chủ studio cùng lúc (dùng cho thông báo hệ thống). Lấy toàn
 * bộ subscription trong một truy vấn thay vì mỗi owner một truy vấn. Trả về số
 * thiết bị đã gửi thành công. No-op nếu chưa cấu hình VAPID.
 */
export async function sendPushToOwners(ownerIds: string[], payload: PushPayload): Promise<number> {
  if (!ensureConfigured() || ownerIds.length === 0) return 0;

  const db = createAdminClient();
  let total = 0;
  // Chia lô owner_id để câu IN không quá dài.
  const CHUNK = 200;
  for (let i = 0; i < ownerIds.length; i += CHUNK) {
    const ids = ownerIds.slice(i, i + CHUNK);
    const { data: subs } = await db
      .from("push_subscriptions")
      .select("id, endpoint, p256dh, auth")
      .in("owner_id", ids);
    total += await deliver((subs ?? []) as SubRow[], payload);
  }
  return total;
}

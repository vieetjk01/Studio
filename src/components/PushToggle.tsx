"use client";

import { useEffect, useState } from "react";
import { Bell, BellOff, BellRing } from "lucide-react";

const VAPID_PUBLIC = process.env.NEXT_PUBLIC_VAPID_PUBLIC_KEY || "";

// Convert the base64url VAPID public key to the Uint8Array the Push API needs.
function urlBase64ToUint8Array(base64String: string) {
  const padding = "=".repeat((4 - (base64String.length % 4)) % 4);
  const base64 = (base64String + padding).replace(/-/g, "+").replace(/_/g, "/");
  const raw = atob(base64);
  const out = new Uint8Array(raw.length);
  for (let i = 0; i < raw.length; i++) out[i] = raw.charCodeAt(i);
  return out;
}

type State = "unsupported" | "default" | "denied" | "subscribed" | "loading";

export default function PushToggle() {
  const [state, setState] = useState<State>("loading");
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (!("serviceWorker" in navigator) || !("PushManager" in window) || !VAPID_PUBLIC) {
      setState("unsupported");
      return;
    }
    if (Notification.permission === "denied") { setState("denied"); return; }

    // Check whether this device is already subscribed.
    // Use getRegistration() instead of .ready so we don't hang if no SW is registered yet.
    navigator.serviceWorker.getRegistration("/sw.js")
      .then(async (reg) => {
        if (!reg) { setState("default"); return; }
        const sub = await reg.pushManager.getSubscription();
        setState(sub ? "subscribed" : "default");
      })
      .catch(() => setState("default"));
  }, []);

  async function enable() {
    setErr(null);
    setState("loading");
    try {
      const permission = await Notification.requestPermission();
      if (permission !== "granted") {
        setState(permission === "denied" ? "denied" : "default");
        return;
      }

      const reg = await navigator.serviceWorker.register("/sw.js");
      await navigator.serviceWorker.ready;

      const sub = await reg.pushManager.subscribe({
        userVisibleOnly: true,
        applicationServerKey: urlBase64ToUint8Array(VAPID_PUBLIC),
      });

      const res = await fetch("/api/push/subscribe", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ subscription: sub }),
      });
      if (!res.ok) throw new Error("Lưu đăng ký thất bại");

      setState("subscribed");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Không bật được thông báo");
      setState("default");
    }
  }

  async function disable() {
    setState("loading");
    try {
      const reg = await navigator.serviceWorker.ready;
      const sub = await reg.pushManager.getSubscription();
      if (sub) {
        await fetch("/api/push/subscribe", {
          method: "DELETE",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ endpoint: sub.endpoint }),
        });
        await sub.unsubscribe();
      }
      setState("default");
    } catch {
      setState("subscribed");
    }
  }

  if (state === "unsupported") {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm" style={{ color: "var(--text3)" }}>
        <BellOff size={18} />
        Thiết bị/trình duyệt này chưa hỗ trợ thông báo đẩy. Trên iPhone, hãy &quot;Tạo Webapp&quot; (thêm ra màn hình chính) trước.
      </div>
    );
  }

  if (state === "denied") {
    return (
      <div className="card flex items-center gap-3 p-4 text-sm" style={{ color: "var(--text2)" }}>
        <BellOff size={18} style={{ color: "#e0746f" }} />
        Bạn đã chặn thông báo. Vào cài đặt trình duyệt/điện thoại để bật lại quyền cho mstudo.
      </div>
    );
  }

  return (
    <div className="card flex flex-wrap items-center gap-3 p-4">
      {state === "subscribed" ? (
        <BellRing size={20} style={{ color: "var(--accent)" }} />
      ) : (
        <Bell size={20} style={{ color: "var(--text2)" }} />
      )}
      <div className="min-w-0 flex-1">
        <p className="text-sm font-semibold">
          {state === "subscribed" ? "Thông báo đẩy đang bật" : "Bật thông báo đẩy"}
        </p>
        <p className="text-xs" style={{ color: "var(--text3)" }}>
          {state === "subscribed"
            ? "Bạn sẽ nhận thông báo trên thiết bị này khi có đặt lịch / hợp đồng mới."
            : "Nhận thông báo trên điện thoại kể cả khi không mở app."}
        </p>
        {err && <p className="mt-1 text-xs" style={{ color: "#e0746f" }}>{err}</p>}
      </div>
      {state === "subscribed" ? (
        <button onClick={disable} className="btn-ghost shrink-0 px-3 py-2 text-xs">Tắt</button>
      ) : (
        <button onClick={enable} disabled={state === "loading"} className="btn-primary shrink-0 px-3 py-2 text-xs">
          {state === "loading" ? "Đang xử lý…" : "Bật thông báo"}
        </button>
      )}
    </div>
  );
}

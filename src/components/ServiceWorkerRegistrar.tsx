"use client";

import { useEffect } from "react";

// Registers the service worker for everyone (not just users who enable push),
// so the offline fallback + static-asset cache are always active. register() is
// idempotent — if PushToggle already registered /sw.js, this resolves to the
// existing registration without creating a second one.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // When a NEW service worker replaces an old one, reload once so the user
    // ends up on the freshest build instead of a stale cached shell. On the very
    // first visit sw.js calls clients.claim() → controllerchange cũng bắn dù
    // chưa từng có SW nào — không được reload lúc đó (khách mới sẽ thấy trang
    // tự tải lại vô cớ). Chỉ reload khi TRƯỚC ĐÓ đã có controller.
    const hadController = !!navigator.serviceWorker.controller;
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing || !hadController) return;
      refreshing = true;
      window.location.reload();
    };
    navigator.serviceWorker.addEventListener("controllerchange", onControllerChange);

    const onLoad = () => {
      navigator.serviceWorker
        .register("/sw.js")
        .then((reg) => { reg.update().catch(() => {}); })
        .catch(() => {
          /* offline support is best-effort; ignore registration failures */
        });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => {
      window.removeEventListener("load", onLoad);
      navigator.serviceWorker.removeEventListener("controllerchange", onControllerChange);
    };
  }, []);

  return null;
}

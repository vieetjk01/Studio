"use client";

import { useEffect } from "react";

// Registers the service worker for everyone (not just users who enable push),
// so the offline fallback + static-asset cache are always active. register() is
// idempotent — if PushToggle already registered /sw.js, this resolves to the
// existing registration without creating a second one.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;

    // When a new service worker takes control, reload once so the user always
    // ends up on the freshest build instead of a stale cached shell.
    let refreshing = false;
    const onControllerChange = () => {
      if (refreshing) return;
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

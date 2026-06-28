"use client";

import { useEffect } from "react";

// Registers the service worker for everyone (not just users who enable push),
// so the offline fallback + static-asset cache are always active. register() is
// idempotent — if PushToggle already registered /sw.js, this resolves to the
// existing registration without creating a second one.
export default function ServiceWorkerRegistrar() {
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return;
    const onLoad = () => {
      navigator.serviceWorker.register("/sw.js").catch(() => {
        /* offline support is best-effort; ignore registration failures */
      });
    };
    if (document.readyState === "complete") onLoad();
    else window.addEventListener("load", onLoad, { once: true });
    return () => window.removeEventListener("load", onLoad);
  }, []);

  return null;
}

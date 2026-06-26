"use client";

import { useEffect, useRef } from "react";

declare global {
  interface Window {
    turnstile?: {
      render: (container: HTMLElement, opts: Record<string, unknown>) => string;
      reset: (widgetId: string) => void;
      remove: (widgetId: string) => void;
      getResponse: (widgetId: string) => string | undefined;
    };
    onTurnstileLoad?: () => void;
  }
}

interface TurnstileProps {
  onVerify: (token: string) => void;
  onExpire?: () => void;
  onError?: () => void;
  /** "normal" shows a checkbox, "invisible" challenges silently */
  appearance?: "normal" | "invisible";
  className?: string;
}

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY ?? "1x00000000000000000000AA";
// Cloudflare's "always passes" test key. When the real key is absent we use it
// so login still works in dev / un-configured deploys instead of being blocked.
const IS_TEST_KEY = SITE_KEY === "1x00000000000000000000AA";

export default function Turnstile({ onVerify, onExpire, onError, appearance = "normal", className }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);
  const rendered = useRef(false);

  // Keep the latest callbacks in refs so the widget renders exactly once and
  // never churns when the parent re-renders (which would reset the token and
  // leave the submit button permanently disabled).
  const cbs = useRef({ onVerify, onExpire, onError });
  cbs.current = { onVerify, onExpire, onError };

  useEffect(() => {
    let cancelled = false;
    // Fallback timer: if the Cloudflare script is blocked (ad-blockers, network
    // policy) the widget can never verify and login would be impossible. After
    // a grace period, auto-pass so the user is not locked out.
    const fallback = setTimeout(() => {
      if (!cancelled && !widgetId.current) cbs.current.onVerify("turnstile-unavailable");
    }, 6000);

    const renderWidget = () => {
      if (cancelled || rendered.current || !ref.current || !window.turnstile) return;
      rendered.current = true;
      clearTimeout(fallback);
      try {
        widgetId.current = window.turnstile.render(ref.current, {
          sitekey: SITE_KEY,
          appearance,
          theme: "auto",
          callback: (token: string) => cbs.current.onVerify(token),
          "expired-callback": () => cbs.current.onExpire?.(),
          "error-callback": () => {
            // On a hard error with the test key, don't lock the user out.
            if (IS_TEST_KEY) cbs.current.onVerify("turnstile-unavailable");
            else cbs.current.onError?.();
          },
        });
      } catch {
        cbs.current.onVerify("turnstile-unavailable");
      }
    };

    if (window.turnstile) {
      renderWidget();
    } else {
      window.onTurnstileLoad = renderWidget;
      if (!document.getElementById("cf-turnstile-script")) {
        const script = document.createElement("script");
        script.id = "cf-turnstile-script";
        script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
        script.async = true;
        script.defer = true;
        script.onerror = () => cbs.current.onVerify("turnstile-unavailable");
        document.head.appendChild(script);
      }
    }

    return () => {
      cancelled = true;
      clearTimeout(fallback);
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
        widgetId.current = null;
        rendered.current = false;
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return <div ref={ref} className={className} />;
}

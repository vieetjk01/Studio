"use client";

import { useEffect, useRef, useCallback } from "react";

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

export default function Turnstile({ onVerify, onExpire, onError, appearance = "normal", className }: TurnstileProps) {
  const ref = useRef<HTMLDivElement>(null);
  const widgetId = useRef<string | null>(null);

  const render = useCallback(() => {
    if (!ref.current || !window.turnstile) return;
    if (widgetId.current) {
      try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
    }
    widgetId.current = window.turnstile.render(ref.current, {
      sitekey: SITE_KEY,
      appearance,
      theme: "auto",
      callback: onVerify,
      "expired-callback": () => { widgetId.current = null; onExpire?.(); },
      "error-callback": () => { widgetId.current = null; onError?.(); },
    });
  }, [onVerify, onExpire, onError, appearance]);

  useEffect(() => {
    if (window.turnstile) {
      render();
      return;
    }
    window.onTurnstileLoad = render;
    if (!document.getElementById("cf-turnstile-script")) {
      const script = document.createElement("script");
      script.id = "cf-turnstile-script";
      script.src = "https://challenges.cloudflare.com/turnstile/v0/api.js?onload=onTurnstileLoad";
      script.async = true;
      script.defer = true;
      document.head.appendChild(script);
    }
    return () => {
      if (widgetId.current && window.turnstile) {
        try { window.turnstile.remove(widgetId.current); } catch { /* ignore */ }
      }
    };
  }, [render]);

  return <div ref={ref} className={className} />;
}

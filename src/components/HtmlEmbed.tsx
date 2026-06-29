"use client";

import { useCallback, useRef, useState } from "react";

/**
 * Renders user-authored HTML/embed inside a sandboxed, same-origin iframe so its
 * CSS (position:fixed, high z-index, full-bleed layout) and scripts are fully
 * isolated — they can't escape to cover the builder's topbar or the site's nav.
 * The iframe auto-resizes to its content height.
 */
export default function HtmlEmbed({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);

  const measure = useCallback(() => {
    const doc = ref.current?.contentDocument;
    if (!doc?.body) return;
    const h = Math.max(doc.documentElement.scrollHeight, doc.body.scrollHeight);
    if (h > 0) setHeight(h);
  }, []);

  const onLoad = useCallback(() => {
    measure();
    // Keep height in sync as embedded widgets/scripts render asynchronously.
    const doc = ref.current?.contentDocument;
    if (doc?.body && typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => measure());
      ro.observe(doc.body);
    }
  }, [measure]);

  // base target=_blank so links inside the embed don't navigate the iframe.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif}img,video,iframe{max-width:100%}</style></head><body>${html}</body></html>`;

  return (
    <iframe
      ref={ref}
      title="embed"
      srcDoc={srcDoc}
      onLoad={onLoad}
      sandbox="allow-scripts allow-same-origin allow-popups allow-forms allow-popups-to-escape-sandbox"
      className={className}
      style={{ width: "100%", border: 0, height, display: "block" }}
    />
  );
}

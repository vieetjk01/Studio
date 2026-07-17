"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Renders user-authored HTML/embed inside a SANDBOXED iframe. Scripts run in an
 * opaque (null) origin — WITHOUT `allow-same-origin` — so embedded scripts can
 * NOT reach the parent DOM, cookies, or localStorage (prevents session theft on
 * shared *.mstudo.com cookies). The iframe reports its own height via postMessage
 * so it can still auto-resize despite being cross-origin.
 */
export default function HtmlEmbed({ html, className }: { html: string; className?: string }) {
  const ref = useRef<HTMLIFrameElement>(null);
  const [height, setHeight] = useState(80);

  useEffect(() => {
    const onMsg = (e: MessageEvent) => {
      // Chỉ nhận từ đúng iframe này (so identity contentWindow — không phụ thuộc origin).
      if (!ref.current || e.source !== ref.current.contentWindow) return;
      const h = (e.data as { __embedHeight?: unknown })?.__embedHeight;
      if (typeof h === "number" && h > 0) setHeight(Math.ceil(h));
    };
    window.addEventListener("message", onMsg);
    return () => window.removeEventListener("message", onMsg);
  }, []);

  // Script đo chiều cao tự chèn: post scrollHeight về parent (load + ResizeObserver).
  const reporter =
    "<scr" +
    "ipt>(function(){function h(){var d=document,b=d.body;var v=Math.max(d.documentElement.scrollHeight,b?b.scrollHeight:0);parent.postMessage({__embedHeight:v},'*');}addEventListener('load',h);setTimeout(h,60);if(window.ResizeObserver&&document.body){new ResizeObserver(h).observe(document.body);}})();</scr" +
    "ipt>";

  // base target=_blank so links inside the embed don't navigate the iframe.
  const srcDoc = `<!doctype html><html><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><base target="_blank"><style>html,body{margin:0;padding:0}body{font-family:system-ui,-apple-system,sans-serif}img,video,iframe{max-width:100%}</style></head><body>${html}${reporter}</body></html>`;

  return (
    <iframe
      ref={ref}
      title="embed"
      srcDoc={srcDoc}
      sandbox="allow-scripts allow-popups allow-forms allow-popups-to-escape-sandbox"
      className={className}
      style={{ width: "100%", border: 0, height, display: "block" }}
    />
  );
}

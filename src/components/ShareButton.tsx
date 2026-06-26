"use client";

import { useEffect, useRef, useState } from "react";
import { Share2, Copy, Check, X, MessageCircle } from "lucide-react";

/**
 * Share an album/gallery link. Shows the full URL with a one-tap copy button and
 * direct share shortcuts (native share sheet → Messenger / Zalo on mobile, plus
 * explicit Messenger & Zalo links as a fallback).
 *
 * `path` may be absolute (https://…) or relative (/a/slug). Relative paths are
 * resolved against the current origin on the client.
 */
export default function ShareButton({
  path,
  title,
  label = "Chia sẻ",
  className = "btn-ghost",
}: {
  path: string;
  title?: string;
  label?: string;
  className?: string;
}) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [url, setUrl] = useState(path);
  const [canNativeShare, setCanNativeShare] = useState(false);
  const popRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const abs = /^https?:\/\//i.test(path)
      ? path
      : `${window.location.origin}${path.startsWith("/") ? "" : "/"}${path}`;
    setUrl(abs);
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, [path]);

  // Close on outside click / Escape.
  useEffect(() => {
    if (!open) return;
    function onDown(e: MouseEvent) {
      if (popRef.current && !popRef.current.contains(e.target as Node)) setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  async function copy() {
    try {
      await navigator.clipboard.writeText(url);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* clipboard blocked — user can select manually */
    }
  }

  async function nativeShare() {
    try {
      await navigator.share({ title: title || "Album ảnh", url });
    } catch {
      /* cancelled */
    }
  }

  const enc = encodeURIComponent(url);
  const messengerUrl = `https://www.facebook.com/sharer/sharer.php?u=${enc}`;
  const zaloUrl = `https://sp.zalo.me/plugins/share?u=${enc}`;

  return (
    <div className="relative inline-block">
      <button type="button" onClick={() => setOpen((v) => !v)} className={className}>
        <Share2 size={15} /> {label}
      </button>

      {open && (
        <div
          ref={popRef}
          className="absolute right-0 z-50 mt-2 w-[320px] rounded-xl p-4 shadow-xl animate-[vkPop_.25s_ease_both]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="mb-3 flex items-center justify-between">
            <span className="text-sm font-medium">Chia sẻ album</span>
            <button onClick={() => setOpen(false)} style={{ color: "var(--text3)" }}>
              <X size={16} />
            </button>
          </div>

          {/* Link + copy */}
          <div
            className="flex items-center gap-2 rounded-lg px-2.5 py-2"
            style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}
          >
            <input
              readOnly
              value={url}
              onFocus={(e) => e.currentTarget.select()}
              className="min-w-0 flex-1 bg-transparent text-[12.5px] outline-none"
              style={{ color: "var(--text2)" }}
            />
            <button
              onClick={copy}
              className="flex flex-shrink-0 items-center gap-1.5 rounded-md px-2.5 py-1.5 text-[12.5px] font-medium"
              style={{ background: "var(--accent)", color: "var(--accentInk)" }}
            >
              {copied ? <Check size={13} /> : <Copy size={13} />}
              {copied ? "Đã chép" : "Chép"}
            </button>
          </div>

          {/* Direct share shortcuts */}
          <div className="mt-3 grid grid-cols-2 gap-2">
            {canNativeShare && (
              <button
                onClick={nativeShare}
                className="col-span-2 flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium"
                style={{ background: "var(--accent)", color: "var(--accentInk)" }}
              >
                <Share2 size={15} /> Chia sẻ nhanh
              </button>
            )}
            <a
              href={messengerUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium"
              style={{ background: "#0866ff", color: "#fff" }}
            >
              <MessageCircle size={15} /> Messenger
            </a>
            <a
              href={zaloUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium"
              style={{ background: "#0068ff", color: "#fff" }}
            >
              Zalo
            </a>
          </div>
        </div>
      )}
    </div>
  );
}

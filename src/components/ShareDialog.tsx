"use client";

import { useEffect, useState } from "react";
import { Share2, Copy, Check, X } from "lucide-react";

/**
 * Centered modal that shows a share link with a copy button and a native
 * quick-share action. Used for "share N selected photos" (the URL is built
 * after a server round-trip, so it can't be a static ShareButton).
 */
export default function ShareDialog({
  url,
  title,
  subtitle,
  onClose,
}: {
  url: string | null;
  title?: string;
  subtitle?: string;
  onClose: () => void;
}) {
  const [copied, setCopied] = useState(false);
  const [canNativeShare, setCanNativeShare] = useState(false);

  useEffect(() => {
    setCanNativeShare(typeof navigator !== "undefined" && !!navigator.share);
  }, []);

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  if (!url) return null;

  async function copy() {
    try {
      await navigator.clipboard.writeText(url!);
      setCopied(true);
      setTimeout(() => setCopied(false), 1800);
    } catch {
      /* ignore */
    }
  }
  async function nativeShare() {
    try {
      await navigator.share({ title: title || "Ảnh chia sẻ", url: url! });
    } catch {
      /* cancelled */
    }
  }

  return (
    <div
      className="fixed inset-0 z-[120] flex items-center justify-center p-5 animate-[vkOverlay_.25s_ease_both]"
      style={{ background: "rgba(6,6,8,.6)", backdropFilter: "blur(4px)" }}
      onMouseDown={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-5 animate-[vkPop_.3s_ease_both]"
        style={{ background: "var(--surface)", border: "1px solid var(--border)", boxShadow: "0 30px 80px rgba(0,0,0,.5)" }}
      >
        <div className="mb-3 flex items-center justify-between">
          <span className="font-serif text-lg font-medium">{title || "Chia sẻ ảnh đã chọn"}</span>
          <button onClick={onClose} style={{ color: "var(--text3)" }}>
            <X size={18} />
          </button>
        </div>
        {subtitle && (
          <p className="mb-3 text-[13px]" style={{ color: "var(--text2)" }}>
            {subtitle}
          </p>
        )}

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

        {canNativeShare && (
          <button
            onClick={nativeShare}
            className="mt-3 flex w-full items-center justify-center gap-2 rounded-lg px-3 py-2.5 text-[13px] font-medium"
            style={{ background: "var(--accent)", color: "var(--accentInk)" }}
          >
            <Share2 size={15} /> Chia sẻ nhanh
          </button>
        )}
      </div>
    </div>
  );
}

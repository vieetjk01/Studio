"use client";

import { useState } from "react";
import { MessageSquare, Check } from "lucide-react";

/** Normalise a pasted Facebook/Messenger value into an openable URL. */
export function messengerUrl(link: string | null | undefined): string {
  const v = (link ?? "").trim();
  if (!v) return "";
  if (/^https?:\/\//i.test(v)) return v;
  if (/^(m\.me|fb\.com|facebook\.com|messenger\.com)\//i.test(v)) return `https://${v}`;
  // Bare username/handle → Messenger short link.
  if (/^[\w.]+$/.test(v)) return `https://m.me/${v}`;
  return `https://${v}`;
}

/**
 * One-tap Messenger contact: copies the prepared message + opens the chat.
 * (Messenger can't prefill text via URL, so we copy it for pasting.)
 */
export default function MessengerButton({
  link,
  message,
  label = "Nhắn Messenger",
  className = "btn-ghost px-2.5 py-1.5 text-xs",
}: {
  link: string | null | undefined;
  message: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const url = messengerUrl(link);
  if (!url) return null;

  return (
    <button
      type="button"
      onClick={async () => {
        try {
          await navigator.clipboard?.writeText(message);
        } catch {
          /* clipboard may be blocked; still open the chat */
        }
        setDone(true);
        setTimeout(() => setDone(false), 2000);
        window.open(url, "_blank", "noopener,noreferrer");
      }}
      className={className}
      title="Chép sẵn lời nhắn rồi mở Messenger"
    >
      {done ? <Check size={14} /> : <MessageSquare size={14} />} {done ? "Đã chép, mở…" : label}
    </button>
  );
}

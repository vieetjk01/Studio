"use client";

import { useState } from "react";
import { MessageSquare, Check } from "lucide-react";

/**
 * Normalise a pasted Facebook/Messenger value into an openable **Messenger** chat
 * URL — so a Facebook profile link still opens the chat, not the profile.
 */
export function messengerUrl(link: string | null | undefined): string {
  let v = (link ?? "").trim();
  if (!v) return "";
  v = v.replace(/^https?:\/\//i, "").replace(/^www\./i, "");

  // Already a Messenger link.
  if (/^(m\.me|messenger\.com)\//i.test(v)) return `https://${v}`;

  // Facebook profile link → derive the m.me chat link.
  const fb = v.match(/^(?:facebook\.com|fb\.com|fb\.me)\/(.+)$/i);
  if (fb) {
    const rest = fb[1];
    const byId = rest.match(/profile\.php\?id=(\d+)/i);
    if (byId) return `https://m.me/${byId[1]}`;
    const people = rest.match(/^people\/[^/]+\/(\d+)/i);
    if (people) return `https://m.me/${people[1]}`;
    const handle = rest.split(/[?#]/)[0].replace(/\/+$/, "").replace(/^\/+/, "");
    if (handle) return `https://m.me/${handle}`;
    return `https://${v}`;
  }

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

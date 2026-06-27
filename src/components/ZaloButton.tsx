"use client";

import { useState } from "react";
import { MessageCircle, Check } from "lucide-react";
import { zaloChatUrl } from "@/lib/zalo";

/**
 * One-tap Zalo reminder: copies the prepared message to the clipboard and opens
 * the person's Zalo chat so the studio can paste & send.
 */
export default function ZaloButton({
  phone,
  message,
  label = "Nhắc Zalo",
  className = "btn-ghost px-2.5 py-1.5 text-xs",
}: {
  phone: string | null | undefined;
  message: string;
  label?: string;
  className?: string;
}) {
  const [done, setDone] = useState(false);
  const url = zaloChatUrl(phone);
  if (!url) return null;

  // Real <a> keeps the click a user gesture so the Zalo app opens on mobile
  // (not the web/install page). Copy fires without blocking the navigation.
  return (
    <a
      href={url}
      target="_blank"
      rel="noopener noreferrer"
      onClick={() => {
        navigator.clipboard?.writeText(message).catch(() => {});
        setDone(true);
        setTimeout(() => setDone(false), 2000);
      }}
      className={className}
      title="Chép sẵn lời nhắc rồi mở Zalo để gửi"
    >
      {done ? <Check size={14} /> : <MessageCircle size={14} />} {done ? "Đã chép, mở Zalo…" : label}
    </a>
  );
}

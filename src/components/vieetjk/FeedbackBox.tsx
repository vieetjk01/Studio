"use client";

import { useState } from "react";
import { UI, tr, type Lang } from "@/lib/vieetjk/content";

/** Ô liên hệ / góp ý — gửi về studio qua /api/contact. */
export default function FeedbackBox({ lang }: { lang: Lang }) {
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");
  const [message, setMessage] = useState("");
  const [state, setState] = useState<"idle" | "sending" | "ok" | "err">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!name.trim() || !message.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Ghép SĐT/email vào nội dung để studio thấy đầy đủ; captcha bỏ qua an toàn.
        body: JSON.stringify({
          name: name.trim(),
          email: contact.trim(),
          message: contact.trim() ? `${message.trim()}\n\n— Liên hệ: ${contact.trim()}` : message.trim(),
          captcha: "turnstile-unavailable",
        }),
      });
      if (!res.ok) throw new Error("failed");
      setState("ok");
      setName("");
      setContact("");
      setMessage("");
    } catch {
      setState("err");
    }
  }

  return (
    <form className="vjk-fbox" onSubmit={submit}>
      <input
        type="text"
        placeholder={tr(lang, UI.fName)}
        value={name}
        onChange={(e) => setName(e.target.value)}
        required
      />
      <input
        type="text"
        placeholder={tr(lang, UI.fContact)}
        value={contact}
        onChange={(e) => setContact(e.target.value)}
      />
      <textarea
        className="full"
        placeholder={tr(lang, UI.fMessage)}
        value={message}
        onChange={(e) => setMessage(e.target.value)}
        required
      />
      <div className="full" style={{ display: "flex", alignItems: "center", gap: 16, flexWrap: "wrap" }}>
        <button type="submit" className="vjk-cta" disabled={state === "sending"}>
          {state === "sending" ? tr(lang, UI.fSending) : tr(lang, UI.fSend)}
        </button>
        {state === "ok" && <span className="vjk-fmsg ok">{tr(lang, UI.fSent)}</span>}
        {state === "err" && <span className="vjk-fmsg err">{tr(lang, UI.fError)}</span>}
      </div>
    </form>
  );
}

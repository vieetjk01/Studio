"use client";

import { useState, type CSSProperties } from "react";
import type { Lang } from "@/lib/i18n";

const CONTACT_TR = {
  vi: {
    eyebrow: "Liên hệ & góp ý", title: "Bạn có câu hỏi hoặc góp ý?",
    sub: "Chúng tôi luôn lắng nghe — hãy nhắn tin và chúng tôi sẽ phản hồi sớm nhất có thể.",
    done: "✓ Cảm ơn bạn! Chúng tôi sẽ phản hồi sớm.",
    name: "Tên *", namePh: "Nguyễn Văn A",
    email: "Email (tuỳ chọn)",
    message: "Nội dung *", messagePh: "Câu hỏi, góp ý, hoặc phản hồi của bạn…",
    error: "Gửi thất bại, vui lòng thử lại.",
    sending: "Đang gửi…", send: "Gửi góp ý",
  },
  en: {
    eyebrow: "Contact & feedback", title: "Have a question or feedback?",
    sub: "We're always listening — send us a message and we'll get back to you as soon as possible.",
    done: "✓ Thank you! We'll reply shortly.",
    name: "Name *", namePh: "Jane Smith",
    email: "Email (optional)",
    message: "Message *", messagePh: "Your question, suggestion or feedback…",
    error: "Failed to send, please try again.",
    sending: "Sending…", send: "Send message",
  },
} as const;

/** Form liên hệ trên landing — island client vì có state gửi form. */
export default function ContactSection({ lang }: { lang: Lang }) {
  const ct = CONTACT_TR[lang === "en" ? "en" : "vi"];
  const [form, setForm] = useState({ name: "", email: "", message: "" });
  const [state, setState] = useState<"idle" | "sending" | "done" | "error">("idle");

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!form.name.trim() || !form.message.trim()) return;
    setState("sending");
    try {
      const res = await fetch("/api/contact", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });
      setState(res.ok ? "done" : "error");
    } catch {
      setState("error");
    }
  }

  const wrap = { maxWidth: 1120, margin: "0 auto", padding: "0 24px" };
  const inp: CSSProperties = { width: "100%", padding: "11px 14px", borderRadius: 10, border: "1px solid var(--border)", background: "var(--surface)", color: "var(--fg)", fontFamily: "inherit", fontSize: 14.5, outline: "none", boxSizing: "border-box" as const };

  return (
    <section id="contact" style={{ padding: "80px 0", background: "var(--surface)" }}>
      <div style={{ ...wrap }}>
        <div style={{ maxWidth: 560, margin: "0 auto", textAlign: "center" }}>
          <p style={{ fontSize: 12, fontWeight: 700, letterSpacing: "0.18em", textTransform: "uppercase", color: "var(--accent-strong)", marginBottom: 12 }}>{ct.eyebrow}</p>
          <h2 style={{ fontSize: "clamp(26px,3.5vw,38px)", fontWeight: 800, lineHeight: 1.15, marginBottom: 12 }}>{ct.title}</h2>
          <p style={{ color: "var(--muted)", fontSize: 16, marginBottom: 36 }}>{ct.sub}</p>

          {state === "done" ? (
            <div style={{ padding: "28px 24px", borderRadius: 14, background: "color-mix(in srgb, var(--accent) 10%, transparent)", color: "var(--accent)", fontWeight: 600, fontSize: 15 }}>
              {ct.done}
            </div>
          ) : (
            <form onSubmit={submit} style={{ display: "flex", flexDirection: "column", gap: 14, textAlign: "left" }}>
              <div className="ms-contact-grid" style={{ display: "grid", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{ct.name}</label>
                  <input required style={inp} value={form.name} placeholder={ct.namePh} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{ct.email}</label>
                  <input type="email" style={inp} value={form.email} placeholder="email@example.com" onChange={(e) => setForm((f) => ({ ...f, email: e.target.value }))} />
                </div>
              </div>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 600, letterSpacing: "0.1em", textTransform: "uppercase", color: "var(--muted)", marginBottom: 6 }}>{ct.message}</label>
                <textarea required rows={4} style={{ ...inp, resize: "vertical", minHeight: 110 }} value={form.message} placeholder={ct.messagePh} onChange={(e) => setForm((f) => ({ ...f, message: e.target.value }))} />
              </div>
              {state === "error" && <p style={{ color: "var(--danger)", fontSize: 13 }}>{ct.error}</p>}
              <button type="submit" disabled={state === "sending"} style={{ height: 46, border: "none", background: "var(--accent)", color: "var(--accentFg)", borderRadius: 10, fontFamily: "inherit", fontWeight: 700, fontSize: 15, cursor: "pointer" }}>
                {state === "sending" ? ct.sending : ct.send}
              </button>
            </form>
          )}
        </div>
      </div>
    </section>
  );
}

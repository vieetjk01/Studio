"use client";

import { useEffect, useRef, useState } from "react";
import { BRAND, type Lang } from "@/lib/vieetjk/content";

/** Lời chào mở đầu trong khung chat (client-side — không phụ thuộc module server). */
function greeting(lang: Lang): string {
  return lang === "en"
    ? `Hi! I'm the ${BRAND.name} assistant. Ask me about our wedding, event or business photo & film services — or pricing. How can I help?`
    : `Xin chào! Mình là trợ lý của ${BRAND.name}. Bạn cần tư vấn về chụp/quay cưới, sự kiện, doanh nghiệp hay bảng giá? Cứ hỏi mình nhé!`;
}

/**
 * Bong bóng chat tư vấn tự động (AI) trên website vieetjk.com.
 * Gắn trong VieetjkChrome nên dùng lại được biến CSS của site (--red, --paper…).
 * Gọi /api/vieetjk/chat (streaming) và render chữ chạy dần.
 */

interface Msg {
  role: "user" | "assistant";
  content: string;
}

const CSS = `
.vjk-chat-fab{position:fixed;right:20px;bottom:20px;z-index:60;width:56px;height:56px;border-radius:999px;
  border:0;cursor:pointer;background:var(--red);color:#fff;display:flex;align-items:center;justify-content:center;
  box-shadow:0 10px 30px rgba(0,0,0,.35);transition:transform .18s,background .18s;}
.vjk-chat-fab:hover{background:var(--red-dark);transform:translateY(-2px);}
.vjk-chat-panel{position:fixed;right:20px;bottom:88px;z-index:60;width:min(380px,calc(100vw - 40px));
  height:min(560px,calc(100vh - 140px));display:flex;flex-direction:column;overflow:hidden;
  background:var(--paper2);border:1px solid var(--line);border-radius:18px;
  box-shadow:0 20px 50px rgba(0,0,0,.5);animation:vjkChatIn .18s ease both;}
@keyframes vjkChatIn{from{opacity:0;transform:translateY(10px);}to{opacity:1;transform:none;}}
.vjk-chat-head{display:flex;align-items:center;gap:10px;padding:14px 16px;border-bottom:1px solid var(--line);background:var(--paper3);}
.vjk-chat-dot{width:9px;height:9px;border-radius:999px;background:#22c55e;box-shadow:0 0 0 3px rgba(34,197,94,.18);}
.vjk-chat-title{font-weight:600;font-size:14px;}
.vjk-chat-sub{font-size:11px;color:var(--ink3);}
.vjk-chat-x{margin-left:auto;background:none;border:0;color:var(--ink2);cursor:pointer;padding:4px;line-height:0;}
.vjk-chat-x:hover{color:var(--ink);}
.vjk-chat-body{flex:1;overflow-y:auto;padding:16px;display:flex;flex-direction:column;gap:10px;}
.vjk-chat-row{display:flex;}
.vjk-chat-row.me{justify-content:flex-end;}
.vjk-chat-bubble{max-width:82%;padding:9px 13px;border-radius:14px;font-size:14px;line-height:1.55;white-space:pre-wrap;word-wrap:break-word;}
.vjk-chat-row.bot .vjk-chat-bubble{background:var(--paper3);color:var(--ink);border-bottom-left-radius:4px;}
.vjk-chat-row.me .vjk-chat-bubble{background:var(--red);color:#fff;border-bottom-right-radius:4px;}
.vjk-chat-typing{display:inline-flex;gap:4px;padding:4px 0;}
.vjk-chat-typing i{width:6px;height:6px;border-radius:999px;background:var(--ink3);animation:vjkBlink 1s infinite;}
.vjk-chat-typing i:nth-child(2){animation-delay:.2s;}
.vjk-chat-typing i:nth-child(3){animation-delay:.4s;}
@keyframes vjkBlink{0%,60%,100%{opacity:.25;}30%{opacity:1;}}
.vjk-chat-foot{display:flex;gap:8px;padding:12px;border-top:1px solid var(--line);background:var(--paper2);}
.vjk-chat-input{flex:1;background:var(--paper);border:1px solid var(--line);border-radius:12px;color:var(--ink);
  padding:10px 12px;font-size:14px;font-family:inherit;resize:none;max-height:96px;outline:none;}
.vjk-chat-input:focus{border-color:var(--ink3);}
.vjk-chat-send{background:var(--red);color:#fff;border:0;border-radius:12px;width:42px;cursor:pointer;
  display:flex;align-items:center;justify-content:center;transition:background .18s;flex-shrink:0;}
.vjk-chat-send:hover:not(:disabled){background:var(--red-dark);}
.vjk-chat-send:disabled{opacity:.45;cursor:default;}
`;

function IconChat() {
  return (
    <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.9" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z" />
    </svg>
  );
}

export default function ChatWidget({ lang }: { lang: Lang }) {
  const [open, setOpen] = useState(false);
  const [input, setInput] = useState("");
  const [busy, setBusy] = useState(false);
  const [msgs, setMsgs] = useState<Msg[]>([{ role: "assistant", content: greeting(lang) }]);
  const bodyRef = useRef<HTMLDivElement>(null);
  const taRef = useRef<HTMLTextAreaElement>(null);

  useEffect(() => {
    if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
  }, [msgs, busy, open]);

  useEffect(() => {
    if (open) taRef.current?.focus();
  }, [open]);

  async function send() {
    const text = input.trim();
    if (!text || busy) return;
    setInput("");
    const history: Msg[] = [...msgs, { role: "user", content: text }];
    // Thêm ô trả lời rỗng để stream vào.
    setMsgs([...history, { role: "assistant", content: "" }]);
    setBusy(true);
    try {
      const res = await fetch("/api/vieetjk/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          lang,
          messages: history.map((m) => ({ role: m.role, content: m.content })),
        }),
      });
      if (!res.ok || !res.body) {
        throw new Error("no_stream");
      }
      const reader = res.body.getReader();
      const decoder = new TextDecoder();
      let acc = "";
      for (;;) {
        const { done, value } = await reader.read();
        if (done) break;
        acc += decoder.decode(value, { stream: true });
        setMsgs((cur) => {
          const next = [...cur];
          next[next.length - 1] = { role: "assistant", content: acc };
          return next;
        });
      }
      if (!acc.trim()) throw new Error("empty");
    } catch {
      setMsgs((cur) => {
        const next = [...cur];
        next[next.length - 1] = {
          role: "assistant",
          content:
            lang === "en"
              ? "Sorry, I can't reply right now. Please contact us directly."
              : "Xin lỗi, mình chưa trả lời được lúc này. Bạn liên hệ trực tiếp giúp mình nhé.",
        };
        return next;
      });
    } finally {
      setBusy(false);
    }
  }

  function onKey(e: React.KeyboardEvent<HTMLTextAreaElement>) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      send();
    }
  }

  const lastBotEmpty = busy && msgs[msgs.length - 1]?.role === "assistant" && !msgs[msgs.length - 1].content;

  return (
    <>
      <style dangerouslySetInnerHTML={{ __html: CSS }} />
      {open && (
        <div className="vjk-chat-panel" role="dialog" aria-label={lang === "en" ? "Chat assistant" : "Trợ lý tư vấn"}>
          <div className="vjk-chat-head">
            <span className="vjk-chat-dot" />
            <div>
              <div className="vjk-chat-title">{lang === "en" ? "Assistant" : "Tư vấn viên"}</div>
              <div className="vjk-chat-sub">{lang === "en" ? "Usually replies instantly" : "Thường trả lời ngay"}</div>
            </div>
            <button className="vjk-chat-x" onClick={() => setOpen(false)} aria-label={lang === "en" ? "Close" : "Đóng"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
            </button>
          </div>
          <div className="vjk-chat-body" ref={bodyRef}>
            {msgs.map((m, i) => (
              <div key={i} className={`vjk-chat-row ${m.role === "user" ? "me" : "bot"}`}>
                {m.role === "assistant" && !m.content && i === msgs.length - 1 && lastBotEmpty ? (
                  <div className="vjk-chat-bubble">
                    <span className="vjk-chat-typing"><i /><i /><i /></span>
                  </div>
                ) : (
                  <div className="vjk-chat-bubble">{m.content}</div>
                )}
              </div>
            ))}
          </div>
          <div className="vjk-chat-foot">
            <textarea
              ref={taRef}
              className="vjk-chat-input"
              rows={1}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={onKey}
              placeholder={lang === "en" ? "Type a message…" : "Nhập tin nhắn…"}
            />
            <button className="vjk-chat-send" onClick={send} disabled={busy || !input.trim()} aria-label={lang === "en" ? "Send" : "Gửi"}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><path d="M22 2 11 13M22 2l-7 20-4-9-9-4z" /></svg>
            </button>
          </div>
        </div>
      )}
      <button
        className="vjk-chat-fab"
        onClick={() => setOpen((v) => !v)}
        aria-label={lang === "en" ? "Open chat" : "Mở khung tư vấn"}
      >
        {open ? (
          <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round"><path d="M6 6l12 12M18 6L6 18" /></svg>
        ) : (
          <IconChat />
        )}
      </button>
    </>
  );
}

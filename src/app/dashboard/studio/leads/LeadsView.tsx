"use client";

import { useState } from "react";
import { Phone, MessageCircle, ChevronDown, Check, RotateCcw, Inbox } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export interface Lead {
  id: string;
  name: string | null;
  phone: string | null;
  interest: string | null;
  transcript: { role: "user" | "assistant"; content: string }[] | null;
  status: "new" | "contacted" | "closed";
  created_at: string;
}

function fmt(ts: string): string {
  try {
    return new Date(ts).toLocaleString("vi-VN", {
      day: "2-digit", month: "2-digit", year: "numeric", hour: "2-digit", minute: "2-digit",
    });
  } catch {
    return ts;
  }
}

function zaloUrl(phone: string): string {
  return `https://zalo.me/${phone.replace(/\D/g, "")}`;
}

export default function LeadsView({ leads }: { leads: Lead[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<Lead[]>(leads);
  const [openId, setOpenId] = useState<string | null>(null);

  async function setStatus(id: string, status: Lead["status"]) {
    setRows((cur) => cur.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("website_leads").update({ status, updated_at: new Date().toISOString() }).eq("id", id);
  }

  const newCount = rows.filter((r) => r.status === "new").length;

  if (rows.length === 0) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-10">
          <Inbox size={34} className="mx-auto mb-3" style={{ color: "var(--text3)" }} />
          <h2 className="font-serif text-xl font-medium">Chưa có lead nào</h2>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Khi khách để lại số điện thoại qua chatbox trên website, thông tin sẽ hiện ở đây và
            bạn được báo qua Zalo.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Website</p>
        <h1 className="font-serif text-[clamp(26px,4vw,40px)] font-medium leading-none">
          Lead từ chatbox
          {newCount > 0 && (
            <span className="ml-3 rounded-full px-2.5 py-1 align-middle text-sm" style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>
              {newCount} mới
            </span>
          )}
        </h1>
        <p className="mt-3 text-[15px]" style={{ color: "var(--text2)" }}>
          Khách để lại số điện thoại khi chat trên website. Gọi hoặc nhắn Zalo lại, rồi đánh dấu đã liên hệ.
        </p>
      </div>

      <div className="grid gap-3">
        {rows.map((r) => {
          const open = openId === r.id;
          const done = r.status !== "new";
          return (
            <div key={r.id} className="card overflow-hidden">
              <div className="flex flex-wrap items-center gap-3 p-4">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <span className="font-medium">{r.name || "Khách (chưa cho tên)"}</span>
                    {r.status === "new" && (
                      <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "color-mix(in srgb, var(--gold) 18%, transparent)", color: "var(--gold)" }}>mới</span>
                    )}
                    {r.status === "contacted" && (
                      <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ background: "color-mix(in srgb, var(--accent) 16%, transparent)", color: "var(--accent)" }}>đã liên hệ</span>
                    )}
                  </div>
                  <div className="mt-0.5 text-[13px]" style={{ color: "var(--text3)" }}>
                    {fmt(r.created_at)}
                    {r.interest && <> · {r.interest.slice(0, 80)}</>}
                  </div>
                </div>

                {r.phone && (
                  <div className="flex items-center gap-2">
                    <a href={`tel:${r.phone}`} className="btn-ghost px-2.5 py-1.5 text-xs" title="Gọi">
                      <Phone size={14} /> {r.phone}
                    </a>
                    <a href={zaloUrl(r.phone)} target="_blank" rel="noopener noreferrer" className="btn-ghost px-2.5 py-1.5 text-xs" title="Nhắn Zalo">
                      <MessageCircle size={14} /> Zalo
                    </a>
                  </div>
                )}

                <button onClick={() => setOpenId(open ? null : r.id)} className="btn-ghost px-2.5 py-1.5 text-xs">
                  Hội thoại <ChevronDown size={14} className={open ? "rotate-180 transition-transform" : "transition-transform"} />
                </button>

                {r.status === "new" ? (
                  <button onClick={() => setStatus(r.id, "contacted")} className="btn-primary px-2.5 py-1.5 text-xs">
                    <Check size={14} /> Đã liên hệ
                  </button>
                ) : (
                  <button onClick={() => setStatus(r.id, "new")} className="btn-ghost px-2.5 py-1.5 text-xs" title="Đánh dấu lại là mới">
                    <RotateCcw size={14} />
                  </button>
                )}
              </div>

              {open && (
                <div className="border-t px-4 py-3" style={{ borderColor: "var(--border)", background: "var(--surface2)" }}>
                  {(r.transcript ?? []).length === 0 ? (
                    <p className="text-[13px]" style={{ color: "var(--text3)" }}>Không có nội dung hội thoại.</p>
                  ) : (
                    <div className="grid gap-2">
                      {(r.transcript ?? []).map((m, i) => (
                        <div key={i} className={`flex ${m.role === "user" ? "justify-end" : "justify-start"}`}>
                          <div
                            className="max-w-[80%] rounded-xl px-3 py-1.5 text-[13px] leading-relaxed"
                            style={
                              m.role === "user"
                                ? { background: "var(--accent)", color: "var(--accentInk)" }
                                : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }
                            }
                          >
                            {m.content}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Lock, Loader2, Users, Heart, Check, X } from "lucide-react";
import type { WeddingRsvp } from "@/lib/types";

type Data = { couple: { groom: string; bride: string }; rsvps: WeddingRsvp[] };

const SIDE: Record<string, string> = { groom: "Nhà trai", bride: "Nhà gái", both: "Hai họ" };

export default function GuestListView({ slug, couple, enabled }: { slug: string; couple: string; enabled: boolean }) {
  const [pw, setPw] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const [data, setData] = useState<Data | null>(null);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    if (!pw.trim() || busy) return;
    setBusy(true); setErr(null);
    try {
      const res = await fetch(`/api/thiep/guests/${slug}`, {
        method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ password: pw }),
      });
      if (!res.ok) {
        const j = (await res.json().catch(() => null)) as { error?: string } | null;
        const map: Record<string, string> = {
          wrong_password: "Mật khẩu chưa đúng, thử lại nhé.",
          disabled: "Cặp đôi chưa bật trang xem riêng.",
          not_found: "Không tìm thấy thiệp này.",
          rate_limited: "Thử lại quá nhiều lần, đợi một lát rồi thử lại.",
        };
        setErr(map[j?.error ?? ""] || "Không mở được, thử lại sau.");
        return;
      }
      setData((await res.json()) as Data);
    } catch {
      setErr("Mất kết nối, thử lại nhé.");
    } finally {
      setBusy(false);
    }
  }

  const wrap = "min-h-screen px-5 py-10" ;
  const bg = { background: "#fbf7f2", color: "#3a3530" } as const;

  if (!enabled) {
    return (
      <main className={wrap} style={bg}>
        <div className="mx-auto max-w-md text-center">
          <Lock className="mx-auto mb-3" style={{ color: "#b08968" }} />
          <h1 className="font-serif text-2xl" style={{ color: "#b08968" }}>Trang xem riêng chưa bật</h1>
          <p className="mt-3 text-sm" style={{ color: "rgba(58,53,48,.62)" }}>
            Cặp đôi chưa đặt mật khẩu cho trang danh sách khách & lời chúc.
          </p>
        </div>
      </main>
    );
  }

  // Chưa mở khoá → form nhập mật khẩu.
  if (!data) {
    return (
      <main className={`${wrap} grid place-items-center`} style={bg}>
        <form onSubmit={unlock} className="w-full max-w-sm text-center">
          <Lock className="mx-auto mb-3" style={{ color: "#b08968" }} />
          <h1 className="font-serif text-2xl" style={{ color: "#b08968" }}>Danh sách khách & lời chúc</h1>
          <p className="mx-auto mt-2 mb-6 max-w-xs text-sm" style={{ color: "rgba(58,53,48,.6)" }}>{couple}</p>
          <input
            type="password" value={pw} onChange={(e) => setPw(e.target.value)} autoFocus
            placeholder="Nhập mật khẩu" aria-label="Mật khẩu"
            className="w-full rounded-lg border border-stone-300 bg-white px-3 py-2.5 text-center text-sm outline-none focus:border-rose-400 focus:ring-2 focus:ring-rose-100"
          />
          {err && <p className="mt-3 text-sm text-red-600">{err}</p>}
          <button type="submit" disabled={busy || !pw.trim()} className="mt-4 inline-flex w-full items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2.5 text-sm font-medium text-white disabled:opacity-50">
            {busy ? <Loader2 size={15} className="animate-spin" /> : <Lock size={15} />} Xem danh sách
          </button>
        </form>
      </main>
    );
  }

  // Đã mở khoá → hiển thị.
  const rsvps = data.rsvps;
  const attending = rsvps.filter((r) => r.attending);
  const declined = rsvps.filter((r) => !r.attending);
  const totalHeads = attending.reduce((s, r) => s + (r.num_guests || 1), 0);
  const wishes = rsvps.filter((r) => r.wish && r.wish.trim());

  const Stat = ({ n, label }: { n: number; label: string }) => (
    <div className="rounded-xl border border-stone-200 bg-white px-4 py-3 text-center">
      <div className="font-serif text-3xl" style={{ color: "#b08968" }}>{n}</div>
      <div className="mt-0.5 text-xs" style={{ color: "rgba(58,53,48,.6)" }}>{label}</div>
    </div>
  );

  return (
    <main className={wrap} style={bg}>
      <div className="mx-auto max-w-2xl">
        <header className="text-center">
          <h1 className="font-serif text-3xl" style={{ color: "#b08968" }}>{data.couple.groom} &amp; {data.couple.bride}</h1>
          <p className="mt-1 text-sm" style={{ color: "rgba(58,53,48,.6)" }}>Danh sách phản hồi & lời chúc</p>
        </header>

        <div className="mt-6 grid grid-cols-3 gap-3">
          <Stat n={attending.length} label="Xác nhận đến" />
          <Stat n={totalHeads} label="Tổng số người" />
          <Stat n={declined.length} label="Báo bận" />
        </div>

        {/* Danh sách khách */}
        <section className="mt-8">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: "#6a6459" }}><Users size={16} /> Danh sách phản hồi ({rsvps.length})</h2>
          {rsvps.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(58,53,48,.6)" }}>Chưa có khách nào phản hồi.</p>
          ) : (
            <div className="overflow-hidden rounded-xl border border-stone-200 bg-white">
              {rsvps.map((r, i) => (
                <div key={r.id} className="flex items-center gap-3 px-4 py-3" style={{ borderTop: i ? "1px solid #eee7db" : "none" }}>
                  <span className="flex h-6 w-6 flex-none items-center justify-center rounded-full text-white" style={{ background: r.attending ? "#1f9d63" : "#c96b6b" }}>
                    {r.attending ? <Check size={14} /> : <X size={14} />}
                  </span>
                  <div className="min-w-0 flex-1">
                    <div className="truncate text-sm font-medium">{r.guest_name}</div>
                    <div className="text-xs" style={{ color: "rgba(58,53,48,.55)" }}>
                      {SIDE[r.side] || "Khách"}{r.attending ? ` · ${r.num_guests || 1} người` : " · báo bận"}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>

        {/* Lời chúc */}
        <section className="mt-8 pb-6">
          <h2 className="mb-3 flex items-center gap-2 text-sm font-bold" style={{ color: "#6a6459" }}><Heart size={16} /> Lời chúc ({wishes.length})</h2>
          {wishes.length === 0 ? (
            <p className="text-sm" style={{ color: "rgba(58,53,48,.6)" }}>Chưa có lời chúc nào.</p>
          ) : (
            <div className="flex flex-col gap-3">
              {wishes.map((r) => (
                <div key={r.id} className="rounded-xl border border-stone-200 bg-white p-4">
                  <p className="whitespace-pre-line text-sm leading-relaxed">{r.wish}</p>
                  <p className="mt-2 text-xs font-medium" style={{ color: "#b08968" }}>— {r.guest_name}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </main>
  );
}

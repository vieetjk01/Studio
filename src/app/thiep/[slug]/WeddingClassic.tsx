import type { CSSProperties } from "react";
import { Heart, MapPin, Calendar, Clock } from "lucide-react";
import type { WeddingBank, WeddingConfig, WeddingInvitation } from "@/lib/types";
import Countdown from "./Countdown";
import RsvpForm from "./RsvpForm";

const DEFAULT_ACCENT = "#b08968";

function fmtDate(iso?: string): string {
  if (!iso) return "";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return d.toLocaleDateString("vi-VN", { weekday: "long", day: "2-digit", month: "2-digit", year: "numeric" });
}

function vietqrUrl(bank?: WeddingBank): string | null {
  if (!bank?.bin || !bank?.account) return null;
  const acc = bank.account.replace(/\s/g, "");
  const params = new URLSearchParams();
  if (bank.holder) params.set("accountName", bank.holder);
  const qs = params.toString();
  return `https://img.vietqr.io/image/${bank.bin}-${acc}-compact2.png${qs ? `?${qs}` : ""}`;
}

function GiftCard({ title, bank, defaultName }: { title: string; bank?: WeddingBank; defaultName?: string }) {
  const url = vietqrUrl(bank);
  if (!url) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl bg-white/70 p-5 text-center shadow-sm">
      <p className="font-serif text-lg" style={{ color: "var(--wed-accent)" }}>{title}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`QR ${title}`} width={200} height={200} style={{ width: 200, height: "auto", borderRadius: 12, background: "#fff" }} />
      {(bank?.holder || defaultName) && <p className="text-sm font-medium">{bank?.holder || defaultName}</p>}
      <p className="text-xs opacity-60">
        {bank?.account?.replace(/\s/g, "")}{bank?.name ? ` · ${bank.name}` : ""}
      </p>
    </div>
  );
}

/** "Classic" elegant wedding-invitation template (the only MVP template). */
export default function WeddingClassic({ inv }: { inv: WeddingInvitation }) {
  const c = inv.config as WeddingConfig;
  const accent = c.accent || DEFAULT_ACCENT;
  const groom = c.groom_name || "Chú rể";
  const bride = c.bride_name || "Cô dâu";
  const events = (c.events ?? []).filter((e) => e.label || e.date || e.venue);
  const gallery = (c.gallery ?? []).filter(Boolean);

  const wrapStyle: CSSProperties & Record<string, string> = {
    "--wed-accent": accent,
    background: "#fbf7f2",
    color: "#3a3530",
    fontFamily: c.font === "sans" ? "var(--font-hanken)" : "var(--font-cormorant)",
  };

  return (
    <main style={wrapStyle} className="min-h-screen">
      {/* ── Cover ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
        {c.cover_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0 bg-black/35" />
          </>
        )}
        <div className={`relative z-10 ${c.cover_url ? "text-white" : ""}`}>
          <p className="mb-4 text-xs uppercase tracking-[0.3em] opacity-80">Save the date</p>
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-6xl">
            {groom} <span style={{ color: c.cover_url ? "#fff" : "var(--wed-accent)" }}>&amp;</span> {bride}
          </h1>
          {c.wedding_date && <p className="mt-4 font-serif text-xl sm:text-2xl">{fmtDate(c.wedding_date)}</p>}
          {c.cover_quote && <p className="mx-auto mt-5 max-w-md text-sm italic opacity-90 sm:text-base">“{c.cover_quote}”</p>}
        </div>
      </section>

      {/* ── Countdown ─────────────────────────────────────────── */}
      {c.wedding_date && (
        <section className="px-6 py-12 text-center">
          <p className="mb-6 font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>Đếm ngược ngày chung đôi</p>
          <Countdown date={c.wedding_date} />
        </section>
      )}

      {/* ── Story ─────────────────────────────────────────────── */}
      {c.story && (
        <section className="mx-auto max-w-2xl px-6 py-12 text-center">
          <Heart className="mx-auto mb-4" style={{ color: "var(--wed-accent)" }} />
          <p className="font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>Chuyện tình yêu</p>
          <p className="mt-5 whitespace-pre-line text-base leading-relaxed opacity-80">{c.story}</p>
        </section>
      )}

      {/* ── Events ────────────────────────────────────────────── */}
      {events.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-12">
          <p className="mb-8 text-center font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>Sự kiện cưới</p>
          <div className="grid gap-6 sm:grid-cols-2">
            {events.map((e, i) => (
              <div key={i} className="rounded-2xl bg-white/70 p-6 text-center shadow-sm">
                <p className="font-serif text-xl" style={{ color: "var(--wed-accent)" }}>{e.label || "Sự kiện"}</p>
                {(e.date || e.time) && (
                  <p className="mt-3 flex items-center justify-center gap-2 text-sm">
                    <Calendar size={14} /> {fmtDate(e.date)} {e.time && (<><Clock size={14} className="ml-1" /> {e.time}</>)}
                  </p>
                )}
                {e.venue && <p className="mt-2 text-sm font-medium">{e.venue}</p>}
                {e.address && <p className="text-sm opacity-70">{e.address}</p>}
                {e.map_url && (
                  <a href={e.map_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs underline" style={{ color: "var(--wed-accent)" }}>
                    <MapPin size={12} /> Xem bản đồ
                  </a>
                )}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Gallery ───────────────────────────────────────────── */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-4xl px-6 py-12">
          <p className="mb-8 text-center font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>Khoảnh khắc của chúng tôi</p>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
            {gallery.map((src, i) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={i} src={src} alt="" className="aspect-[3/4] w-full rounded-xl object-cover shadow-sm" loading="lazy" />
            ))}
          </div>
        </section>
      )}

      {/* ── Gift (mừng cưới) ──────────────────────────────────── */}
      {c.gift_enabled && (vietqrUrl(c.groom_bank) || vietqrUrl(c.bride_bank)) && (
        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <p className="font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>Hộp mừng cưới</p>
          {c.gift_note && <p className="mx-auto mt-3 max-w-md text-sm italic opacity-70">{c.gift_note}</p>}
          <div className="mt-6 flex flex-wrap items-stretch justify-center gap-5">
            <GiftCard title="Mừng cưới chú rể" bank={c.groom_bank} defaultName={groom} />
            <GiftCard title="Mừng cưới cô dâu" bank={c.bride_bank} defaultName={bride} />
          </div>
        </section>
      )}

      {/* ── RSVP ──────────────────────────────────────────────── */}
      {c.rsvp_enabled !== false && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <p className="font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>Xác nhận tham dự</p>
          <p className="mx-auto mb-7 mt-3 max-w-md text-sm opacity-70">
            Sự hiện diện của bạn là niềm vinh hạnh của chúng tôi.
          </p>
          <RsvpForm slug={inv.slug} note={c.rsvp_note} />
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="px-6 py-10 text-center">
        <p className="font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>{groom} &amp; {bride}</p>
        <p className="mt-2 flex items-center justify-center gap-1 text-xs opacity-50">
          Thiệp cưới online <Heart size={11} />
        </p>
      </footer>
    </main>
  );
}

import type { CSSProperties } from "react";
import { Heart, MapPin, Calendar, Clock, Quote } from "lucide-react";
import type { WeddingBank, WeddingConfig, WeddingInvitation } from "@/lib/types";
import { getSkin } from "./templates";
import Countdown from "./Countdown";
import RsvpForm from "./RsvpForm";
import MusicPlayer from "./MusicPlayer";

export type Wish = { guest_name: string; wish: string; created_at: string };

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

function Divider({ motif }: { motif: "floral" | "geo" | "none" }) {
  if (motif === "floral") return <p className="my-2 text-center text-2xl" style={{ color: "var(--wed-accent)" }}>❀ ❁ ❀</p>;
  if (motif === "geo") return <div className="mx-auto my-3 h-px w-24" style={{ background: "var(--wed-accent)" }} />;
  return <Heart className="mx-auto my-2" size={18} style={{ color: "var(--wed-accent)" }} />;
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <h2 className="font-serif text-2xl sm:text-3xl" style={{ color: "var(--wed-accent)" }}>{children}</h2>;
}

function GiftCard({ title, bank, defaultName }: { title: string; bank?: WeddingBank; defaultName?: string }) {
  const url = vietqrUrl(bank);
  if (!url) return null;
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl p-5 text-center shadow-sm" style={{ background: "var(--wed-surface)", border: "1px solid var(--wed-border)" }}>
      <p className="font-serif text-lg" style={{ color: "var(--wed-accent)" }}>{title}</p>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={url} alt={`QR ${title}`} width={200} height={200} style={{ width: 200, height: "auto", borderRadius: 12, background: "#fff" }} />
      {(bank?.holder || defaultName) && <p className="text-sm font-medium">{bank?.holder || defaultName}</p>}
      <p className="text-xs" style={{ color: "var(--wed-muted)" }}>
        {bank?.account?.replace(/\s/g, "")}{bank?.name ? ` · ${bank.name}` : ""}
      </p>
    </div>
  );
}

/** Skin-driven renderer powering every wedding-invitation template. */
export default function WeddingRenderer({ inv, wishes = [] }: { inv: WeddingInvitation; wishes?: Wish[] }) {
  const c = inv.config as WeddingConfig;
  const skin = getSkin(inv.template);
  const accent = c.accent || skin.accent;
  const font = c.font || skin.font;
  const groom = c.groom_name || "Chú rể";
  const bride = c.bride_name || "Cô dâu";
  const events = (c.events ?? []).filter((e) => e.label || e.date || e.venue);
  const gallery = (c.gallery ?? []).filter(Boolean);
  const coverLight = !!c.cover_url || skin.dark; // white cover text over photo or dark skin

  const wrapStyle: CSSProperties & Record<string, string> = {
    "--wed-accent": accent,
    "--wed-bg": skin.bg,
    "--wed-surface": skin.surface,
    "--wed-text": skin.text,
    "--wed-muted": skin.muted,
    "--wed-border": skin.border,
    background: "var(--wed-bg)",
    color: "var(--wed-text)",
    fontFamily: font === "sans" ? "var(--font-hanken)" : "var(--font-cormorant)",
  };

  return (
    <main style={wrapStyle} className="min-h-screen">
      {/* ── Cover ─────────────────────────────────────────────── */}
      <section className="relative flex min-h-[88vh] flex-col items-center justify-center overflow-hidden px-6 py-20 text-center">
        {c.cover_url && (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={c.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" />
            <div className="absolute inset-0" style={{ background: skin.hero === "framed" ? "rgba(0,0,0,0.25)" : "rgba(0,0,0,0.38)" }} />
          </>
        )}
        <div className={`relative z-10 ${coverLight ? "text-white" : ""}`} style={skin.hero === "framed" && c.cover_url ? { border: "1px solid rgba(255,255,255,0.6)", padding: "2.5rem 2rem", borderRadius: 4 } : undefined}>
          <p className="mb-4 text-xs uppercase tracking-[0.35em] opacity-80">Save the date</p>
          <h1 className="font-serif text-4xl font-medium leading-tight sm:text-6xl">
            {groom} <span style={{ color: coverLight ? "#fff" : accent }}>&amp;</span> {bride}
          </h1>
          {c.wedding_date && <p className="mt-4 font-serif text-xl sm:text-2xl">{fmtDate(c.wedding_date)}</p>}
          {c.cover_quote && <p className="mx-auto mt-5 max-w-md text-sm italic opacity-90 sm:text-base">“{c.cover_quote}”</p>}
        </div>
      </section>

      {/* ── Countdown ─────────────────────────────────────────── */}
      {c.wedding_date && (
        <section className="px-6 py-12 text-center">
          <SectionTitle>Đếm ngược ngày chung đôi</SectionTitle>
          <div className="mt-6"><Countdown date={c.wedding_date} /></div>
        </section>
      )}

      {/* ── Story ─────────────────────────────────────────────── */}
      {c.story && (
        <section className="mx-auto max-w-2xl px-6 py-12 text-center">
          <Divider motif={skin.motif} />
          <SectionTitle>Chuyện tình yêu</SectionTitle>
          <p className="mt-5 whitespace-pre-line text-base leading-relaxed" style={{ color: "var(--wed-muted)" }}>{c.story}</p>
        </section>
      )}

      {/* ── Events ────────────────────────────────────────────── */}
      {events.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <SectionTitle>Sự kiện cưới</SectionTitle>
          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            {events.map((e, i) => (
              <div key={i} className="rounded-2xl p-6 text-center shadow-sm" style={{ background: "var(--wed-surface)", border: "1px solid var(--wed-border)" }}>
                <p className="font-serif text-xl" style={{ color: "var(--wed-accent)" }}>{e.label || "Sự kiện"}</p>
                {(e.date || e.time) && (
                  <p className="mt-3 flex flex-wrap items-center justify-center gap-2 text-sm">
                    <Calendar size={14} /> {fmtDate(e.date)} {e.time && (<><Clock size={14} className="ml-1" /> {e.time}</>)}
                  </p>
                )}
                {e.venue && <p className="mt-2 text-sm font-medium">{e.venue}</p>}
                {e.address && <p className="text-sm" style={{ color: "var(--wed-muted)" }}>{e.address}</p>}
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
        <section className="mx-auto max-w-4xl px-6 py-12 text-center">
          <SectionTitle>Khoảnh khắc của chúng tôi</SectionTitle>
          <div className="mt-8 grid grid-cols-2 gap-3 sm:grid-cols-3">
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
          <SectionTitle>Hộp mừng cưới</SectionTitle>
          {c.gift_note && <p className="mx-auto mt-3 max-w-md text-sm italic" style={{ color: "var(--wed-muted)" }}>{c.gift_note}</p>}
          <div className="mt-6 flex flex-wrap items-stretch justify-center gap-5">
            <GiftCard title="Mừng cưới chú rể" bank={c.groom_bank} defaultName={groom} />
            <GiftCard title="Mừng cưới cô dâu" bank={c.bride_bank} defaultName={bride} />
          </div>
        </section>
      )}

      {/* ── RSVP ──────────────────────────────────────────────── */}
      {c.rsvp_enabled !== false && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <SectionTitle>Xác nhận tham dự</SectionTitle>
          <p className="mx-auto mb-7 mt-3 max-w-md text-sm" style={{ color: "var(--wed-muted)" }}>
            Sự hiện diện của bạn là niềm vinh hạnh của chúng tôi.
          </p>
          <RsvpForm slug={inv.slug} note={c.rsvp_note} />
        </section>
      )}

      {/* ── Guestbook (sổ lưu bút) ────────────────────────────── */}
      {c.guestbook_enabled !== false && wishes.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-12 text-center">
          <Divider motif={skin.motif} />
          <SectionTitle>Sổ lưu bút</SectionTitle>
          <div className="mt-8 columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
            {wishes.map((w, i) => (
              <div key={i} className="break-inside-avoid rounded-2xl p-4 text-left shadow-sm" style={{ background: "var(--wed-surface)", border: "1px solid var(--wed-border)" }}>
                <Quote size={16} style={{ color: "var(--wed-accent)" }} />
                <p className="mt-1 text-sm leading-relaxed">{w.wish}</p>
                <p className="mt-2 text-xs font-medium" style={{ color: "var(--wed-accent)" }}>— {w.guest_name}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer className="px-6 py-12 text-center">
        <Divider motif={skin.motif} />
        <p className="font-serif text-2xl" style={{ color: "var(--wed-accent)" }}>{groom} &amp; {bride}</p>
        <p className="mt-2 flex items-center justify-center gap-1 text-xs" style={{ color: "var(--wed-muted)" }}>
          Thiệp cưới online <Heart size={11} />
        </p>
      </footer>

      {c.music_url && <MusicPlayer url={c.music_url} autoplay={c.music_autoplay} />}
    </main>
  );
}

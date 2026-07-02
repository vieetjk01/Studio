import type { CSSProperties } from "react";
import { MapPin, Quote } from "lucide-react";
import Reveal from "../Reveal";
import Countdown from "../Countdown";
import RsvpForm from "../RsvpForm";
import MusicPlayer from "../MusicPlayer";
import { fmtDate, fmtShort, readConfig, GiftCard, type TemplateProps } from "../shared";

// Editorial: tạp chí, nền sáng, cam đất, số mục lớn, băng ảnh tự trôi (marquee).
const PAL = { bg: "#f4f1ec", surface: "#ffffff", text: "#241f21", muted: "#8f867f", border: "#e4ddd3", accent: "#b5624f" };

function Idx({ n, accent }: { n: string; accent: string }) {
  return <span className="block font-serif text-5xl leading-none sm:text-6xl" style={{ color: accent, opacity: 0.25 }}>{n}</span>;
}

export default function EditorialTemplate({ inv, wishes }: TemplateProps) {
  const { c, groom, bride, events, gallery, hasGift } = readConfig(inv);
  const accent = c.accent || PAL.accent;
  const wrap: CSSProperties & Record<string, string> = {
    "--wed-accent": accent, background: PAL.bg, color: PAL.text, fontFamily: c.font === "sans" ? "var(--font-hanken)" : "var(--font-cormorant)",
  };
  // Duplicate the gallery so the marquee scrolls seamlessly.
  const strip = gallery.length ? [...gallery, ...gallery] : [];

  return (
    <main style={wrap} className="min-h-screen overflow-x-hidden">
      <style>{`@keyframes edMarquee{from{transform:translateX(0)}to{transform:translateX(-50%)}}
        .ed-track{display:flex;gap:14px;width:max-content;animation:edMarquee 40s linear infinite}
        .ed-track:hover{animation-play-state:paused}`}</style>

      {/* Cover — editorial masthead */}
      <section className="mx-auto max-w-4xl px-6 pb-6 pt-14 text-center">
        <Reveal anim="up">
          <p className="text-[11px] uppercase tracking-[0.5em]" style={{ color: accent }}>The Wedding Journal</p>
          <div className="my-6 h-px w-full" style={{ background: PAL.border }} />
          <h1 className="font-serif leading-[0.95]" style={{ fontSize: "clamp(44px,9vw,88px)" }}>{groom}</h1>
          <p className="my-1 font-serif text-3xl italic" style={{ color: accent }}>and</p>
          <h1 className="font-serif leading-[0.95]" style={{ fontSize: "clamp(44px,9vw,88px)" }}>{bride}</h1>
          <div className="mx-auto my-6 h-px w-full" style={{ background: PAL.border }} />
          {c.wedding_date && <p className="text-sm uppercase tracking-[0.3em]" style={{ color: PAL.muted }}>{fmtDate(c.wedding_date)}</p>}
        </Reveal>
      </section>
      {c.cover_url && (
        <Reveal anim="zoom"><div className="mx-auto max-w-5xl px-6">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.cover_url} alt="" className="h-[52vh] w-full rounded-sm object-cover sm:h-[70vh]" />
          {c.cover_quote && <p className="mt-3 text-center text-sm italic" style={{ color: PAL.muted }}>“{c.cover_quote}”</p>}
        </div></Reveal>
      )}

      {c.wedding_date && (
        <Reveal anim="up"><section className="mx-auto max-w-3xl px-6 py-16">
          <Idx n="01" accent={accent} /><h2 className="-mt-4 font-serif text-3xl">Đếm ngược</h2>
          <div className="mt-6"><Countdown date={c.wedding_date} /></div>
        </section></Reveal>
      )}

      {c.story && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Reveal anim="up"><Idx n="02" accent={accent} /><h2 className="-mt-4 font-serif text-3xl">Chuyện tình yêu</h2>
          <p className="mt-6 max-w-2xl whitespace-pre-line text-lg leading-relaxed" style={{ color: PAL.muted }}>{c.story}</p></Reveal>
        </section>
      )}

      {events.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Reveal anim="up"><Idx n="03" accent={accent} /><h2 className="-mt-4 font-serif text-3xl">Sự kiện</h2></Reveal>
          <div className="mt-6 divide-y" style={{ borderColor: PAL.border }}>
            {events.map((e, i) => (
              <Reveal key={i} anim="up" delay={i * 70}>
                <div className="flex flex-wrap items-baseline justify-between gap-2 py-5">
                  <div>
                    <p className="font-serif text-xl" style={{ color: accent }}>{e.label || "Sự kiện"}</p>
                    {e.venue && <p className="text-sm" style={{ color: PAL.muted }}>{e.venue}{e.address ? ` · ${e.address}` : ""}</p>}
                  </div>
                  <div className="text-right text-sm">
                    <p className="font-mono">{fmtShort(e.date)}{e.time ? ` · ${e.time}` : ""}</p>
                    {e.map_url && <a href={e.map_url} target="_blank" rel="noopener noreferrer" className="inline-flex items-center gap-1 text-xs" style={{ color: accent }}><MapPin size={12} /> Bản đồ</a>}
                  </div>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {/* Gallery — auto-scrolling photo strip */}
      {gallery.length > 0 && (
        <section className="py-16">
          <Reveal anim="up"><div className="mx-auto max-w-3xl px-6"><Idx n="04" accent={accent} /><h2 className="-mt-4 font-serif text-3xl">Khoảnh khắc</h2></div></Reveal>
          <div className="mt-8 overflow-hidden">
            <div className="ed-track">
              {strip.map((src, i) => (
                // eslint-disable-next-line @next/next/no-img-element
                <img key={i} src={src} alt="" className="h-64 w-auto rounded-sm object-cover sm:h-80" loading="lazy" />
              ))}
            </div>
          </div>
        </section>
      )}

      {hasGift && (
        <Reveal anim="up"><section className="mx-auto max-w-3xl px-6 py-16">
          <Idx n="05" accent={accent} /><h2 className="-mt-4 font-serif text-3xl">Mừng cưới</h2>
          {c.gift_note && <p className="mt-2 text-sm italic" style={{ color: PAL.muted }}>{c.gift_note}</p>}
          <div className="mt-6 flex flex-wrap gap-5">
            <GiftCard title="chú rể" bank={c.groom_bank} defaultName={groom} pal={{ ...PAL, accent }} round={4} />
            <GiftCard title="cô dâu" bank={c.bride_bank} defaultName={bride} pal={{ ...PAL, accent }} round={4} />
          </div>
        </section></Reveal>
      )}

      {c.rsvp_enabled !== false && (
        <Reveal anim="up"><section className="mx-auto max-w-3xl px-6 py-16">
          <Idx n="06" accent={accent} /><h2 className="-mt-4 font-serif text-3xl">Xác nhận tham dự</h2>
          <p className="mb-7 mt-2 text-sm" style={{ color: PAL.muted }}>Phản hồi giúp chúng tôi chuẩn bị chu đáo hơn.</p>
          <RsvpForm slug={inv.slug} note={c.rsvp_note} />
        </section></Reveal>
      )}

      {c.guestbook_enabled !== false && wishes.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-16">
          <Reveal anim="up"><h2 className="font-serif text-3xl">Sổ lưu bút</h2></Reveal>
          <div className="mt-8 columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
            {wishes.map((w, i) => (
              <Reveal key={i} anim="up" delay={(i % 4) * 60}>
                <div className="break-inside-avoid rounded-sm p-4 text-left" style={{ background: PAL.surface, border: `1px solid ${PAL.border}` }}>
                  <Quote size={15} style={{ color: accent }} /><p className="mt-1 text-sm leading-relaxed">{w.wish}</p>
                  <p className="mt-2 text-xs font-semibold" style={{ color: accent }}>— {w.guest_name}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <footer className="px-6 py-16 text-center" style={{ borderTop: `1px solid ${PAL.border}` }}>
        <p className="font-serif text-4xl">{groom} &amp; {bride}</p>
        <p className="mt-3 text-xs uppercase tracking-[0.3em]" style={{ color: PAL.muted }}>Thiệp cưới online</p>
      </footer>

      {c.music_url && <MusicPlayer url={c.music_url} autoplay={c.music_autoplay} />}
    </main>
  );
}

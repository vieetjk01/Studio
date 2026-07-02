import type { CSSProperties } from "react";
import { MapPin, Calendar, Clock, Quote, Heart } from "lucide-react";
import Reveal from "../Reveal";
import Countdown from "../Countdown";
import RsvpForm from "../RsvpForm";
import MusicPlayer from "../MusicPlayer";
import { fmtDate, readConfig, GiftCard, type TemplateProps } from "../shared";

// Cinematic: nền tối điện ảnh, tên cô dâu chú rể viết tay (script) + vàng gold,
// ảnh bìa phủ gradient sâu, Ken Burns.
const PAL = { bg: "#171013", surface: "rgba(255,255,255,0.045)", text: "#f4e9df", muted: "rgba(244,233,223,0.62)", border: "rgba(230,195,156,0.28)", accent: "#d0687a", gold: "#e6c39c" };

export default function CinematicTemplate({ inv, wishes }: TemplateProps) {
  const { c, groom, bride, events, gallery, hasGift } = readConfig(inv);
  const accent = c.accent || PAL.gold;
  const wrap: CSSProperties & Record<string, string> = {
    "--wed-accent": accent, background: PAL.bg, color: PAL.text, fontFamily: "var(--font-cormorant)",
  };
  const rule = <div className="mx-auto my-6 flex items-center justify-center gap-3"><span className="h-px w-14" style={{ background: PAL.gold }} /><Heart size={13} style={{ color: PAL.accent }} /><span className="h-px w-14" style={{ background: PAL.gold }} /></div>;
  const title = (t: string) => <h2 className="font-serif text-4xl" style={{ color: PAL.gold }}>{t}</h2>;

  return (
    <main style={wrap} className="min-h-screen overflow-x-hidden">
      <style>{`@keyframes cnKen{from{transform:scale(1.02)}to{transform:scale(1.16)}}`}</style>

      {/* Cover */}
      <section className="relative flex min-h-screen flex-col items-center justify-end overflow-hidden px-6 pb-24 pt-20 text-center">
        {c.cover_url && (<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover" style={{ animation: "cnKen 16s ease-out forwards" }} />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg,rgba(23,16,19,.35) 0%,rgba(23,16,19,.2) 40%,rgba(23,16,19,.95) 100%)" }} />
        </>)}
        <Reveal anim="up" className="relative z-10">
          <p className="mb-4 text-[11px] uppercase tracking-[0.5em]" style={{ color: PAL.gold }}>Save the date</p>
          <h1 style={{ fontFamily: "var(--font-script)", color: "#fff", fontSize: "clamp(52px,13vw,110px)", lineHeight: 1 }}>{groom}</h1>
          <p className="my-1 text-2xl" style={{ fontFamily: "var(--font-script)", color: PAL.accent }}>&amp;</p>
          <h1 style={{ fontFamily: "var(--font-script)", color: "#fff", fontSize: "clamp(52px,13vw,110px)", lineHeight: 1 }}>{bride}</h1>
          {c.wedding_date && <p className="mt-6 text-sm uppercase tracking-[0.35em]" style={{ color: PAL.text }}>{fmtDate(c.wedding_date)}</p>}
          {c.cover_quote && <p className="mx-auto mt-4 max-w-md text-sm italic" style={{ color: PAL.muted }}>“{c.cover_quote}”</p>}
        </Reveal>
      </section>

      {c.wedding_date && (
        <Reveal anim="up"><section className="px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.4em]" style={{ color: PAL.gold }}>Đếm ngược</p>
          <div className="mt-7"><Countdown date={c.wedding_date} /></div>
        </section></Reveal>
      )}

      {c.story && (
        <section className="mx-auto max-w-2xl px-6 py-14 text-center">
          <Reveal anim="up">{rule}{title("Chuyện tình yêu")}
          <p className="mt-6 whitespace-pre-line text-lg leading-loose" style={{ color: PAL.muted }}>{c.story}</p></Reveal>
        </section>
      )}

      {events.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <Reveal anim="up">{title("Sự kiện cưới")}</Reveal>
          <div className="mt-10 grid gap-6 sm:grid-cols-2">
            {events.map((e, i) => (
              <Reveal key={i} anim="up" delay={i * 90}>
                <div className="rounded-2xl p-7 text-center" style={{ background: PAL.surface, border: `1px solid ${PAL.border}` }}>
                  <p className="text-2xl" style={{ fontFamily: "var(--font-script)", color: PAL.gold }}>{e.label || "Sự kiện"}</p>
                  <div className="mx-auto my-3 h-px w-10" style={{ background: PAL.gold }} />
                  {(e.date || e.time) && <p className="flex items-center justify-center gap-2 text-sm"><Calendar size={14} /> {fmtDate(e.date)} {e.time && (<><Clock size={14} /> {e.time}</>)}</p>}
                  {e.venue && <p className="mt-2 font-medium">{e.venue}</p>}
                  {e.address && <p className="text-sm" style={{ color: PAL.muted }}>{e.address}</p>}
                  {e.map_url && <a href={e.map_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs" style={{ color: PAL.gold }}><MapPin size={12} /> Bản đồ</a>}
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {gallery.length > 0 && (
        <section className="mx-auto max-w-5xl px-6 py-14 text-center">
          <Reveal anim="up">{title("Khoảnh khắc")}</Reveal>
          <div className="mt-9 columns-2 gap-3 sm:columns-3 [&>*]:mb-3">
            {gallery.map((src, i) => (
              <Reveal key={i} anim="zoom" delay={(i % 3) * 80}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={src} alt="" className="w-full rounded-lg object-cover" style={{ border: `1px solid ${PAL.border}` }} loading="lazy" />
              </Reveal>
            ))}
          </div>
        </section>
      )}

      {hasGift && (
        <Reveal anim="up"><section className="mx-auto max-w-3xl px-6 py-14 text-center">
          {title("Hộp mừng cưới")}
          {c.gift_note && <p className="mx-auto mt-3 max-w-md text-sm italic" style={{ color: PAL.muted }}>{c.gift_note}</p>}
          <div className="mt-7 flex flex-wrap justify-center gap-5">
            <GiftCard title="chú rể" bank={c.groom_bank} defaultName={groom} pal={{ ...PAL, accent: PAL.gold }} round={16} />
            <GiftCard title="cô dâu" bank={c.bride_bank} defaultName={bride} pal={{ ...PAL, accent: PAL.gold }} round={16} />
          </div>
        </section></Reveal>
      )}

      {c.rsvp_enabled !== false && (
        <Reveal anim="up"><section className="mx-auto max-w-3xl px-6 py-16 text-center">
          {rule}{title("Xác nhận tham dự")}
          <p className="mx-auto mb-7 mt-3 max-w-md text-sm" style={{ color: PAL.muted }}>Hân hạnh được đón tiếp bạn trong ngày trọng đại.</p>
          <RsvpForm slug={inv.slug} note={c.rsvp_note} />
        </section></Reveal>
      )}

      {c.guestbook_enabled !== false && wishes.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <Reveal anim="up">{title("Sổ lưu bút")}</Reveal>
          <div className="mt-8 columns-1 gap-4 sm:columns-2 [&>*]:mb-4">
            {wishes.map((w, i) => (
              <Reveal key={i} anim="up" delay={(i % 4) * 60}>
                <div className="break-inside-avoid rounded-2xl p-4 text-left" style={{ background: PAL.surface, border: `1px solid ${PAL.border}` }}>
                  <Quote size={15} style={{ color: PAL.gold }} /><p className="mt-1 text-sm leading-relaxed">{w.wish}</p>
                  <p className="mt-2 text-xs font-medium" style={{ color: PAL.gold }}>— {w.guest_name}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <footer className="px-6 py-16 text-center">
        {rule}<p style={{ fontFamily: "var(--font-script)", color: PAL.gold, fontSize: 44 }}>{groom} &amp; {bride}</p>
        <p className="mt-3 text-xs" style={{ color: PAL.muted }}>Thiệp cưới online</p>
      </footer>

      {c.music_url && <MusicPlayer url={c.music_url} autoplay={c.music_autoplay} />}
    </main>
  );
}

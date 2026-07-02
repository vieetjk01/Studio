import type { CSSProperties } from "react";
import { MapPin, Calendar, Clock, Quote, Heart } from "lucide-react";
import Reveal from "../Reveal";
import Countdown from "../Countdown";
import RsvpForm from "../RsvpForm";
import MusicPlayer from "../MusicPlayer";
import StoryGallery from "../StoryGallery";
import { fmtDate, readConfig, GiftCard, type TemplateProps } from "../shared";

// Story: nền rất tối, vàng gold, ảnh cưới trình chiếu kiểu "story" (IG).
const PAL = { bg: "#0d0a0b", surface: "rgba(255,255,255,0.05)", text: "#f0e6e2", muted: "rgba(240,230,226,0.6)", border: "rgba(232,201,168,0.26)", accent: "#e8c9a8" };

export default function StorySlideTemplate({ inv, wishes }: TemplateProps) {
  const { c, groom, bride, events, gallery, hasGift } = readConfig(inv);
  const accent = c.accent || PAL.accent;
  const wrap: CSSProperties & Record<string, string> = {
    "--wed-accent": accent, background: PAL.bg, color: PAL.text, fontFamily: "var(--font-cormorant)",
  };
  const title = (t: string) => <h2 className="font-serif text-3xl sm:text-4xl" style={{ color: accent }}>{t}</h2>;

  return (
    <main style={wrap} className="min-h-screen overflow-x-hidden">
      {/* Cover */}
      <section className="relative flex min-h-screen flex-col items-center justify-center overflow-hidden px-6 text-center">
        {c.cover_url && (<>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={c.cover_url} alt="" className="absolute inset-0 h-full w-full object-cover opacity-60" />
          <div className="absolute inset-0" style={{ background: "radial-gradient(60% 60% at 50% 45%, rgba(13,10,11,.25), rgba(13,10,11,.9))" }} />
        </>)}
        <Reveal anim="zoom" className="relative z-10">
          <p className="mb-5 text-[11px] uppercase tracking-[0.5em]" style={{ color: accent }}>The Wedding</p>
          <h1 className="font-serif leading-none" style={{ fontSize: "clamp(46px,11vw,92px)" }}>{groom}</h1>
          <p className="my-2 font-serif text-3xl italic" style={{ color: accent }}>&amp;</p>
          <h1 className="font-serif leading-none" style={{ fontSize: "clamp(46px,11vw,92px)" }}>{bride}</h1>
          {c.wedding_date && <p className="mt-6 text-sm uppercase tracking-[0.35em]" style={{ color: PAL.muted }}>{fmtDate(c.wedding_date)}</p>}
          {c.cover_quote && <p className="mx-auto mt-4 max-w-md text-sm italic" style={{ color: PAL.muted }}>“{c.cover_quote}”</p>}
        </Reveal>
      </section>

      {c.wedding_date && (
        <Reveal anim="up"><section className="px-6 py-16 text-center">
          <p className="text-xs uppercase tracking-[0.4em]" style={{ color: accent }}>Đếm ngược</p>
          <div className="mt-7"><Countdown date={c.wedding_date} /></div>
        </section></Reveal>
      )}

      {/* Story gallery — the hero of this template */}
      {gallery.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <Reveal anim="up">{title("Câu chuyện của chúng tôi")}
          <p className="mt-2 text-sm" style={{ color: PAL.muted }}>Chạm hai bên để xem tiếp ⟵ ⟶</p></Reveal>
          <Reveal anim="zoom" className="mt-8"><StoryGallery images={gallery} /></Reveal>
        </section>
      )}

      {c.story && (
        <section className="mx-auto max-w-2xl px-6 py-12 text-center">
          <Reveal anim="up"><Heart className="mx-auto mb-3" style={{ color: accent }} />
          <p className="whitespace-pre-line text-lg leading-loose" style={{ color: PAL.muted }}>{c.story}</p></Reveal>
        </section>
      )}

      {events.length > 0 && (
        <section className="mx-auto max-w-3xl px-6 py-14 text-center">
          <Reveal anim="up">{title("Sự kiện cưới")}</Reveal>
          <div className="mt-9 grid gap-6 sm:grid-cols-2">
            {events.map((e, i) => (
              <Reveal key={i} anim="up" delay={i * 80}>
                <div className="rounded-2xl p-6 text-center" style={{ background: PAL.surface, border: `1px solid ${PAL.border}` }}>
                  <p className="font-serif text-2xl" style={{ color: accent }}>{e.label || "Sự kiện"}</p>
                  {(e.date || e.time) && <p className="mt-2 flex items-center justify-center gap-2 text-sm"><Calendar size={14} /> {fmtDate(e.date)} {e.time && (<><Clock size={14} /> {e.time}</>)}</p>}
                  {e.venue && <p className="mt-2 font-medium">{e.venue}</p>}
                  {e.address && <p className="text-sm" style={{ color: PAL.muted }}>{e.address}</p>}
                  {e.map_url && <a href={e.map_url} target="_blank" rel="noopener noreferrer" className="mt-3 inline-flex items-center gap-1 text-xs" style={{ color: accent }}><MapPin size={12} /> Bản đồ</a>}
                </div>
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
            <GiftCard title="chú rể" bank={c.groom_bank} defaultName={groom} pal={{ ...PAL, accent }} round={16} />
            <GiftCard title="cô dâu" bank={c.bride_bank} defaultName={bride} pal={{ ...PAL, accent }} round={16} />
          </div>
        </section></Reveal>
      )}

      {c.rsvp_enabled !== false && (
        <Reveal anim="up"><section className="mx-auto max-w-3xl px-6 py-16 text-center">
          {title("Xác nhận tham dự")}
          <p className="mx-auto mb-7 mt-3 max-w-md text-sm" style={{ color: PAL.muted }}>Sự hiện diện của bạn là niềm vinh hạnh của chúng tôi.</p>
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
                  <Quote size={15} style={{ color: accent }} /><p className="mt-1 text-sm leading-relaxed">{w.wish}</p>
                  <p className="mt-2 text-xs font-medium" style={{ color: accent }}>— {w.guest_name}</p>
                </div>
              </Reveal>
            ))}
          </div>
        </section>
      )}

      <footer className="px-6 py-16 text-center">
        <p className="font-serif text-4xl" style={{ color: accent }}>{groom} &amp; {bride}</p>
        <p className="mt-3 text-xs" style={{ color: PAL.muted }}>Thiệp cưới online</p>
      </footer>

      {c.music_url && <MusicPlayer url={c.music_url} autoplay={c.music_autoplay} />}
    </main>
  );
}

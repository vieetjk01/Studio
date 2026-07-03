import type { CSSProperties } from "react";
import { Heart, Calendar, MapPin, Quote, PlayCircle, Play } from "lucide-react";
import type { StoryConfig, StoryPage } from "@/lib/types";
import WishForm from "./WishForm";
import ContributeForm from "./ContributeForm";

export type StoryPhoto = { id: string; url: string; thumb: string; isVideo?: boolean; guestName?: string };
export type StoryWish = { guest_name: string; wish: string; created_at: string };

const DEFAULT_ACCENT = "#d0687a";

function fmt(iso?: string) {
  if (!iso) return "";
  const d = new Date(iso);
  return Number.isNaN(d.getTime()) ? iso : d.toLocaleDateString("vi-VN", { day: "2-digit", month: "2-digit", year: "numeric" });
}
function ytEmbed(url?: string): string | null {
  if (!url) return null;
  const m = url.match(/(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([\w-]{6,})/i);
  return m ? `https://www.youtube.com/embed/${m[1]}` : null;
}

/** Instagram-style Love Story page. Media comes from the couple's Drive folder. */
export default function StoryRenderer({
  story,
  photos,
  guestPhotos = [],
  wishes,
  guestUploadEnabled = false,
}: {
  story: StoryPage;
  photos: StoryPhoto[];
  guestPhotos?: StoryPhoto[];
  wishes: StoryWish[];
  guestUploadEnabled?: boolean;
}) {
  const c = story.config as StoryConfig;
  const accent = c.accent || DEFAULT_ACCENT;
  const groom = c.groom_name || "Chú rể";
  const bride = c.bride_name || "Cô dâu";
  const handle = `${groom}.${bride}`.toLowerCase().replace(/\s+/g, "");
  const timeline = (c.timeline ?? []).filter((t) => t.title || t.text || t.date);
  const yt = ytEmbed(c.video_url);
  const totalPhotos = photos.length + guestPhotos.length;
  const wrap: CSSProperties & Record<string, string> = { "--acc": accent };

  return (
    <main style={wrap} className="min-h-screen bg-white text-neutral-800">
      {/* Profile header (IG style) */}
      <header className="mx-auto max-w-2xl px-5 pt-10">
        <div className="flex items-center gap-5 sm:gap-8">
          <div className="h-20 w-20 flex-shrink-0 overflow-hidden rounded-full p-[3px] sm:h-28 sm:w-28" style={{ background: `linear-gradient(45deg, ${accent}, #f6b98d)` }}>
            {c.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={c.cover_url} alt="" className="h-full w-full rounded-full border-2 border-white object-cover" />
            ) : <div className="grid h-full w-full place-items-center rounded-full bg-white"><Heart style={{ color: accent }} /></div>}
          </div>
          <div className="min-w-0">
            <p className="font-serif text-xl sm:text-2xl">{groom} &amp; {bride}</p>
            <p className="text-sm text-neutral-500">@{handle}</p>
            <div className="mt-2 flex gap-5 text-sm">
              <span><b>{totalPhotos}</b> ảnh</span>
              <span><b>{wishes.length}</b> lời chúc</span>
              {c.event_date && <span><b>{fmt(c.event_date)}</b></span>}
            </div>
          </div>
        </div>
        {c.tagline && <p className="mt-4 text-[15px]">{c.tagline}</p>}
        {c.story && <p className="mt-1 whitespace-pre-line text-sm leading-relaxed text-neutral-600">{c.story}</p>}
      </header>

      {/* Event card */}
      {(c.event_label || c.event_venue || c.event_date) && (
        <section className="mx-auto mt-6 max-w-2xl px-5">
          <div className="rounded-2xl p-4 text-center" style={{ background: "color-mix(in srgb, var(--acc) 8%, #fff)", border: `1px solid color-mix(in srgb, var(--acc) 30%, #fff)` }}>
            {c.event_label && <p className="font-serif text-xl" style={{ color: accent }}>{c.event_label}</p>}
            <p className="mt-1 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-sm text-neutral-600">
              {c.event_date && <span className="inline-flex items-center gap-1"><Calendar size={14} /> {fmt(c.event_date)}</span>}
              {c.event_venue && <span className="inline-flex items-center gap-1"><MapPin size={14} /> {c.event_venue}</span>}
            </p>
          </div>
        </section>
      )}

      {/* Timeline */}
      {timeline.length > 0 && (
        <section className="mx-auto mt-8 max-w-2xl px-5">
          <div className="relative pl-6">
            <span className="absolute left-1 top-1 bottom-1 w-px" style={{ background: accent }} />
            {timeline.map((t, i) => (
              <div key={i} className="relative mb-6">
                <span className="absolute -left-[19px] top-1.5 h-2.5 w-2.5 rounded-full" style={{ background: accent }} />
                {t.date && <p className="text-xs uppercase tracking-wide text-neutral-400">{fmt(t.date)}</p>}
                {t.title && <p className="font-serif text-lg" style={{ color: accent }}>{t.title}</p>}
                {t.text && <p className="text-sm text-neutral-600">{t.text}</p>}
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Video */}
      {yt && (
        <section className="mx-auto mt-8 max-w-2xl px-5">
          <div className="relative overflow-hidden rounded-2xl" style={{ aspectRatio: "16/9" }}>
            <iframe src={yt} title="video" allow="accelerometer; autoplay; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 h-full w-full" style={{ border: 0 }} />
          </div>
        </section>
      )}
      {!yt && c.video_url && (
        <section className="mx-auto mt-8 max-w-2xl px-5 text-center">
          <a href={c.video_url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 text-sm" style={{ color: accent }}><PlayCircle size={18} /> Xem video</a>
        </section>
      )}

      {/* Photo feed (IG grid) */}
      {photos.length > 0 && (
        <section className="mx-auto mt-8 max-w-2xl px-1 pb-2">
          <div className="grid grid-cols-3 gap-1">
            {photos.map((p) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={p.id} src={p.thumb} alt="" className="aspect-square w-full object-cover" loading="lazy" />
            ))}
          </div>
        </section>
      )}
      {photos.length === 0 && !guestUploadEnabled && guestPhotos.length === 0 && (
        <p className="mx-auto mt-8 max-w-2xl px-5 text-center text-sm text-neutral-400">
          Chưa có ảnh — hãy dán link folder Google Drive (chia sẻ công khai) trong trình sửa.
        </p>
      )}

      {/* Guest contributions */}
      {(guestUploadEnabled || guestPhotos.length > 0) && (
        <section className="mx-auto mt-10 max-w-2xl px-5">
          <h2 className="mb-4 text-center font-serif text-2xl" style={{ color: accent }}>Khoảnh khắc từ mọi người</h2>
          {guestUploadEnabled && <ContributeForm slug={story.slug} accent={accent} />}
          {guestPhotos.length > 0 && (
            <div className="mt-5 grid grid-cols-3 gap-1">
              {guestPhotos.map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden bg-neutral-100">
                  {p.isVideo ? (
                    <a href={`https://drive.google.com/file/d/${p.id}/view`} target="_blank" rel="noreferrer" className="grid h-full w-full place-items-center text-white" style={{ background: `color-mix(in srgb, ${accent} 55%, #000)` }}>
                      <Play size={26} />
                    </a>
                  ) : (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.thumb} alt="" className="h-full w-full object-cover" loading="lazy" />
                  )}
                  {p.guestName && <span className="pointer-events-none absolute inset-x-0 bottom-0 truncate bg-gradient-to-t from-black/60 to-transparent px-1.5 py-1 text-[10px] text-white">{p.guestName}</span>}
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      {/* Wishes */}
      {c.wishes_enabled !== false && (
        <section className="mx-auto mt-10 max-w-2xl px-5 pb-16">
          <h2 className="mb-5 text-center font-serif text-2xl" style={{ color: accent }}>Sổ lời chúc</h2>
          <WishForm slug={story.slug} accent={accent} />
          {wishes.length > 0 && (
            <div className="mt-8 space-y-3">
              {wishes.map((w, i) => (
                <div key={i} className="rounded-2xl border border-neutral-100 bg-neutral-50 p-3">
                  <Quote size={14} style={{ color: accent }} />
                  <p className="mt-1 text-sm">{w.wish}</p>
                  <p className="mt-1 text-xs font-medium" style={{ color: accent }}>— {w.guest_name}</p>
                </div>
              ))}
            </div>
          )}
        </section>
      )}

      <footer className="px-5 py-10 text-center">
        <p className="font-serif text-2xl" style={{ color: accent }}>{groom} &amp; {bride}</p>
        <p className="mt-1 flex items-center justify-center gap-1 text-xs text-neutral-400">Love Story <Heart size={11} /></p>
      </footer>
    </main>
  );
}

"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  MessageSquare,
  Send,
  Check,
  Phone,
  Mail,
  Instagram,
  Clock,
  Heart,
  Calendar,
  Zap,
  MoreHorizontal,
  Facebook,
  Youtube,
  Music2,
  Star,
  Play,
  Sun,
  Moon,
} from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl } from "@/lib/drive";
import { PRICE_LISTS } from "@/lib/pricelist-seeds";
import PackageCompare from "@/components/PackageCompare";
import type { SiteSettings, BookingService } from "@/lib/types";

type PriceRow = { id: string; list_key: string; name: string; price: number; unit: string | null; category: string | null; description: string | null; show_on_home?: boolean };


const SERVICES: {
  k: BookingService;
  labelKey: "svcWedding" | "svcEvent" | "svcSports" | "svcOther";
  descKey: "svcWeddingDesc" | "svcEventDesc" | "svcSportsDesc" | "svcOtherDesc";
  Icon: typeof Heart;
}[] = [
  { k: "wedding", labelKey: "svcWedding", descKey: "svcWeddingDesc", Icon: Heart },
  { k: "event", labelKey: "svcEvent", descKey: "svcEventDesc", Icon: Calendar },
  { k: "sports", labelKey: "svcSports", descKey: "svcSportsDesc", Icon: Zap },
  { k: "other", labelKey: "svcOther", descKey: "svcOtherDesc", Icon: MoreHorizontal },
];

interface GalleryCard {
  slug: string;
  title: string;
  cover_url: string | null;
  event_date: string | null;
}

function featuredSrc(url: string): string {
  const m = url.match(/[-\w]{25,}/); // Drive file id
  if (/drive\.google\.com|googleusercontent/.test(url) && m) return thumbnailUrl(m[0], 600);
  return url;
}

export default function ProfileHome({
  settings,
  featuredImages = [],
  stats,
  photoGalleries = [],
  videoGalleries = [],
  feedback = [],
  pricelist = [],
  bookingToken = "",
}: {
  settings: SiteSettings;
  featuredImages?: string[];
  stats: { albums: number; photos: number; years: number };
  photoGalleries?: GalleryCard[];
  videoGalleries?: GalleryCard[];
  feedback?: { id: string; client_name: string | null; rating: number | null; content: string }[];
  pricelist?: PriceRow[];
  pricelistUrl?: string;
  bookingToken?: string;
}) {
  const { t } = useLang();
  const contactRef = useRef<HTMLDivElement>(null);

  // Light/dark theme for the public homepage (persisted per visitor).
  const [theme, setTheme] = useState<"dark" | "light">("dark");
  useEffect(() => {
    const stored = window.localStorage.getItem("vk_home_theme");
    const next = stored === "light" ? "light" : "dark";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    // Other routes are dark-only — restore dark when leaving the homepage.
    return () => {
      document.documentElement.dataset.theme = "dark";
    };
  }, []);
  function toggleTheme() {
    const next = theme === "dark" ? "light" : "dark";
    setTheme(next);
    window.localStorage.setItem("vk_home_theme", next);
    document.documentElement.dataset.theme = next;
  }

  // Priced packages grouped by list (Cưới / Đính hôn) — all packages compared as columns.
  const priced = pricelist.filter((p) => p.price > 0);
  const priceLists = PRICE_LISTS
    .map((l) => ({ ...l, items: priced.filter((p) => (p.list_key || "cuoi") === l.key) }))
    .filter((l) => l.items.length > 0);

  const [booking, setBooking] = useState({
    service: "wedding" as BookingService,
    name: "",
    phone: "",
    date: "",
    note: "",
  });
  const [bookingDone, setBookingDone] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  function scrollTo(ref: React.RefObject<HTMLElement>) {
    const el = ref.current;
    if (!el) return;
    window.scrollTo({ top: el.getBoundingClientRect().top + window.scrollY - 72, behavior: "smooth" });
  }

  async function submitBooking() {
    if (!booking.name.trim() || !booking.phone.trim()) return;
    setSubmitting(true);
    const res = await fetch("/api/bookings", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(booking),
    });
    setSubmitting(false);
    if (res.ok) {
      setBookingDone(true);
      setBooking({ service: "wedding", name: "", phone: "", date: "", note: "" });
    }
  }

  const cover = settings.profile_cover_url;
  const avatar = settings.profile_avatar_url;

  return (
    <main className="pb-24">
      {/* Header */}
      <header
        className="sticky top-0 z-40 flex flex-wrap items-center gap-3 px-6 py-3.5 md:px-10"
        style={{
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Brand />
        <nav className="mx-auto hidden items-center gap-1 md:flex">
          <button onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })} className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text)" }}>
            {t("navHome")}
          </button>
          <Link href="/album" className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            {t("navAlbum")}
          </Link>
          <Link href="/banggia" className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            {t("navPricing")}
          </Link>
          <button onClick={() => scrollTo(contactRef)} className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            {t("navContact")}
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <button
            onClick={toggleTheme}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ border: "1px solid var(--border2)", color: "var(--text2)" }}
            title={theme === "dark" ? t("themeLight") : t("themeDark")}
            aria-label={theme === "dark" ? t("themeLight") : t("themeDark")}
          >
            {theme === "dark" ? <Sun size={15} /> : <Moon size={15} />}
          </button>
          <LanguageSwitcher />
          <button onClick={() => scrollTo(contactRef)} className="hidden text-sm font-medium sm:block" style={{ color: "var(--text2)" }}>
            {t("book")}
          </button>
        </div>
      </header>

      {/* Cover + profile */}
      <section className="relative animate-[vkFade_.6s_ease_both]">
        <div className="relative h-[clamp(190px,28vw,330px)] overflow-hidden">
          {cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} alt="" className="absolute inset-0 h-full w-full object-cover" />
          ) : (
            <div className="absolute inset-0" style={{ background: "linear-gradient(120deg, #16161a, #0f0f12)" }} />
          )}
          <div className="absolute inset-0" style={{ background: "linear-gradient(to top, var(--bg) 1%, rgba(10,10,12,.15) 55%, rgba(10,10,12,.5))" }} />
        </div>
        <div className="relative z-10 mx-auto max-w-[1180px] px-6 md:px-10">
          <div className="-mt-[clamp(48px,7vw,72px)] flex flex-wrap items-end gap-[clamp(16px,3vw,28px)]">
            <div
              className="h-[clamp(106px,15vw,150px)] w-[clamp(106px,15vw,150px)] flex-shrink-0 overflow-hidden rounded-full"
              style={{ border: "4px solid var(--bg)", boxShadow: "0 20px 50px rgba(0,0,0,.5)", background: "var(--surface)" }}
            >
              {avatar && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={avatar} alt={settings.profile_name} className="h-full w-full object-cover" />
              )}
            </div>
            <div className="min-w-0 flex-1 basis-60 pb-1.5">
              <h1 className="mb-1.5 font-serif text-[clamp(34px,5vw,54px)] font-semibold leading-none">
                {settings.profile_name}
              </h1>
              <p className="mb-2 text-[clamp(14px,1.6vw,17px)]">{settings.profile_role}</p>
              <div className="flex items-center gap-1.5 text-[13.5px]" style={{ color: "var(--text2)" }}>
                <MapPin size={14} /> {settings.profile_location}
              </div>
            </div>
            <div className="flex flex-wrap items-center gap-2.5 pb-2.5">
              <button onClick={() => scrollTo(contactRef)} className="btn-ghost px-4 py-2.5 text-[13.5px]">
                <MessageSquare size={15} /> {t("contact")}
              </button>
              <button onClick={() => scrollTo(contactRef)} className="btn-primary px-5 py-2.5 text-[13.5px]" style={{ boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
                <Calendar size={15} /> {t("bookShoot")}
              </button>
            </div>
          </div>

          <div className="mt-[clamp(24px,3vw,34px)] grid items-center gap-[clamp(20px,3vw,44px)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            <p className="max-w-[44em] text-[clamp(14.5px,1.5vw,16.5px)] leading-relaxed" style={{ color: "var(--text2)" }}>
              {settings.profile_bio}
            </p>
            <div className="flex gap-2.5">
              {[
                { v: stats.albums, l: t("statAlbums") },
                { v: stats.photos, l: t("statPhotos") },
                { v: stats.years, l: t("statYears") },
              ].map((s) => (
                <div key={s.l} className="card flex-1 p-4 text-center">
                  <div className="font-serif text-3xl font-semibold leading-none">{s.v}</div>
                  <div className="mt-1.5 text-[11px] uppercase tracking-[0.12em]" style={{ color: "var(--text3)" }}>
                    {s.l}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Featured photos (curated by the admin) */}
      {featuredImages.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5 flex items-end justify-between gap-3.5">
            <div>
              <p className="eyebrow mb-1.5">{t("ebFeatured")}</p>
              <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">{t("hFeatured")}</h2>
            </div>
            <Link href="/album" className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--text2)" }}>
              {t("viewAll")} <ArrowRight size={15} />
            </Link>
          </div>
          <div style={{ columns: "230px", columnGap: "14px" }}>
            {featuredImages.map((url, i) => (
              <div key={i} className="mb-3.5 overflow-hidden rounded-xl animate-[vkPop_.45s_ease_both]" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={featuredSrc(url)} alt="ảnh nổi bật" loading="lazy" className="block w-full" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Pinned photo galleries */}
      {photoGalleries.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5 flex items-end justify-between gap-3.5">
            <div>
              <p className="eyebrow mb-1.5">{t("ebPhotoAlbum")}</p>
              <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">{t("hPhotoAlbum")}</h2>
            </div>
            <Link href="/album" className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--text2)" }}>
              {t("viewAll")} <ArrowRight size={15} />
            </Link>
          </div>
          <GalleryGrid items={photoGalleries} />
        </section>
      )}

      {/* Pinned videos */}
      {videoGalleries.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5">
            <p className="eyebrow mb-1.5">{t("ebVideo")}</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">{t("hVideo")}</h2>
          </div>
          <GalleryGrid items={videoGalleries} video />
        </section>
      )}

      {/* Price list — condensed (name + short note, no price); details on /banggia */}
      {priceLists.length > 0 && (
        <section id="bang-gia" className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] scroll-mt-20 px-6 md:px-10">
          <div className="mb-5">
            <p className="eyebrow mb-1.5">{t("ebPricing")}</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">{t("hPricing")}</h2>
          </div>

          <div className="space-y-10">
            {priceLists.map((l) => (
              <div key={l.key}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <h3 className="font-serif text-2xl font-medium" style={{ color: "var(--accent)" }}>{t("navPricing")} {l.label}</h3>
                  <Link href={`/banggia?list=${l.key}`} className="text-sm" style={{ color: "var(--accent)" }}>{t("pricingDetail")}</Link>
                </div>
                <PackageCompare items={l.items} bookingToken={bookingToken} listKey={l.key} listLabel={l.label} />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feedback */}
      {feedback.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5">
            <p className="eyebrow mb-1.5">{t("ebFeedback")}</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">{t("hFeedback")}</h2>
          </div>
          <div className="grid gap-4 [grid-template-columns:repeat(auto-fill,minmax(280px,1fr))]">
            {feedback.map((f) => (
              <div key={f.id} className="card p-5">
                {f.rating ? (
                  <div className="mb-2 flex items-center gap-0.5" style={{ color: "var(--gold)" }}>
                    {Array.from({ length: f.rating }).map((_, i) => (
                      <Star key={i} size={14} fill="currentColor" strokeWidth={0} />
                    ))}
                  </div>
                ) : null}
                <p className="text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>“{f.content}”</p>
                <p className="mt-3 text-[13px] font-medium">{f.client_name || "Khách hàng"}</p>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Booking + contact */}
      <section id="dat-lich" ref={contactRef} className="mx-auto mt-[clamp(44px,6vw,76px)] max-w-[1180px] scroll-mt-20 px-6 md:px-10">
        <div className="grid items-start gap-[clamp(16px,2.5vw,26px)] [grid-template-columns:repeat(auto-fit,minmax(300px,1fr))]">
          {/* Booking form */}
          <div className="card p-[clamp(22px,3vw,34px)] animate-[vkFade_.5s_ease_both]">
            <p className="eyebrow mb-1.5">{t("ebBooking")}</p>
            <h2 className="mb-1.5 font-serif text-[clamp(27px,3.4vw,40px)] font-medium leading-none">{t("hBooking")}</h2>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              {t("bookingIntro")}
            </p>

            <label className="label">{t("serviceType")}</label>
            <div className="mb-5 grid gap-2.5 [grid-template-columns:repeat(auto-fit,minmax(170px,1fr))]">
              {SERVICES.map((sv) => {
                const active = booking.service === sv.k;
                return (
                  <button
                    key={sv.k}
                    onClick={() => {
                      setBooking((b) => ({ ...b, service: sv.k }));
                      setBookingDone(false);
                    }}
                    className="flex items-start gap-2.5 rounded-2xl p-3 text-left transition-all"
                    style={
                      active
                        ? { background: "color-mix(in srgb, var(--gold) 14%, transparent)", border: "1px solid var(--gold)" }
                        : { background: "var(--surface2)", border: "1px solid var(--border)" }
                    }
                  >
                    <span
                      className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-lg"
                      style={active ? { background: "var(--gold)", color: "#1a1205" } : { background: "var(--surface)", color: "var(--text2)" }}
                    >
                      <sv.Icon size={17} />
                    </span>
                    <span className="flex min-w-0 flex-col gap-0.5">
                      <span className="text-[13.5px] font-semibold">{t(sv.labelKey)}</span>
                      <span className="text-[11.5px]" style={{ color: "var(--text3)" }}>{t(sv.descKey)}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">{t("fullNameLabel")}</label>
                <input value={booking.name} onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))} placeholder={t("yourNamePlaceholder")} className="input" />
              </div>
              <div>
                <label className="label">{t("phoneLabel")}</label>
                <input value={booking.phone} onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))} placeholder="09xx xxx xxx" className="input" />
              </div>
            </div>
            <label className="label mt-4">{t("expectedDate")}</label>
            <input value={booking.date} onChange={(e) => setBooking((b) => ({ ...b, date: e.target.value }))} placeholder="VD: 20/12/2025" className="input" />
            <label className="label mt-4">{t("contentLabel")}</label>
            <textarea
              value={booking.note}
              onChange={(e) => setBooking((b) => ({ ...b, note: e.target.value }))}
              placeholder={t("bookingNotePlaceholder")}
              className="input min-h-[92px] resize-y"
            />

            <button onClick={submitBooking} disabled={submitting} className="btn-primary mt-5 w-full rounded-xl py-3.5 text-[15px]">
              {submitting ? t("sendingBooking") : t("sendBooking")}
              <Send size={16} />
            </button>
            {bookingDone && (
              <div className="mt-3.5 flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: "color-mix(in srgb,#3fbf7f 14%,transparent)", border: "1px solid color-mix(in srgb,#3fbf7f 40%,transparent)" }}>
                <Check size={17} style={{ color: "#5fd29a" }} />
                <span className="text-[13.5px]">{t("bookingReceived")}</span>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="card p-[clamp(22px,3vw,34px)] animate-[vkFade_.5s_ease_.05s_both]">
            <p className="eyebrow mb-1.5">{t("navContact")}</p>
            <h2 className="mb-1.5 font-serif text-[clamp(27px,3.4vw,40px)] font-medium leading-none">{t("hContact")}</h2>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              {t("contactIntro")}
            </p>
            <div className="flex flex-col">
              {(() => {
                const rows: { Icon: typeof Phone; label: string; value: string; href?: string }[] = [
                  { Icon: Phone, label: t("cPhone"), value: settings.contact_phone, href: `tel:${settings.contact_phone.replace(/\s/g, "")}` },
                  { Icon: Mail, label: t("cEmail"), value: settings.contact_email, href: `mailto:${settings.contact_email}` },
                  { Icon: Instagram, label: t("cInstagram"), value: settings.contact_instagram },
                ];
                if (settings.contact_facebook) rows.push({ Icon: Facebook, label: t("cFacebook"), value: settings.contact_facebook });
                if (settings.contact_tiktok) rows.push({ Icon: Music2, label: t("cTiktok"), value: settings.contact_tiktok });
                if (settings.contact_youtube) rows.push({ Icon: Youtube, label: t("cYoutube"), value: settings.contact_youtube });
                rows.push({ Icon: MapPin, label: t("cAddress"), value: settings.contact_address });
                rows.push({ Icon: Clock, label: t("cHours"), value: settings.contact_hours });
                return rows.map((r, i) => (
                  <ContactRow key={r.label} Icon={r.Icon} label={r.label} value={r.value} href={r.href} last={i === rows.length - 1} />
                ));
              })()}
            </div>
          </div>
        </div>
      </section>

      <footer className="mt-16 px-6 text-center text-xs" style={{ color: "var(--text3)" }}>
        © {new Date().getFullYear()} Vieetjk — {t("tagline")}
      </footer>
    </main>
  );
}

function GalleryGrid({ items, video }: { items: GalleryCard[]; video?: boolean }) {
  return (
    <div className="grid gap-[clamp(14px,2vw,20px)] [grid-template-columns:repeat(auto-fill,minmax(220px,1fr))]">
      {items.map((g) => (
        <Link
          key={g.slug}
          href={`/album/${g.slug}`}
          className="group relative overflow-hidden rounded-xl"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <div className="relative aspect-[4/5] overflow-hidden">
            {g.cover_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={g.cover_url} alt={g.title} loading="lazy" className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
            ) : (
              <div className="absolute inset-0" style={{ background: "var(--surface2)" }} />
            )}
            <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.82) 0%, rgba(0,0,0,0) 55%)" }} />
            {video && (
              <span className="absolute left-1/2 top-1/2 flex h-12 w-12 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full" style={{ background: "rgba(10,10,12,.5)", color: "#fff", backdropFilter: "blur(6px)" }}>
                <Play size={20} fill="currentColor" strokeWidth={0} />
              </span>
            )}
            <div className="absolute inset-x-3 bottom-3">
              <h3 className="font-serif text-xl font-medium leading-tight text-white">{g.title}</h3>
              {g.event_date && (
                <p className="mt-0.5 flex items-center gap-1 text-[11.5px]" style={{ color: "rgba(255,255,255,.7)" }}>
                  <Calendar size={11} /> {new Date(g.event_date).toLocaleDateString("vi-VN")}
                </p>
              )}
            </div>
          </div>
        </Link>
      ))}
    </div>
  );
}

function ContactRow({
  Icon,
  label,
  value,
  href,
  last,
}: {
  Icon: typeof Phone;
  label: string;
  value: string;
  href?: string;
  last?: boolean;
}) {
  const inner = (
    <>
      <span className="flex h-[38px] w-[38px] flex-shrink-0 items-center justify-center rounded-xl" style={{ background: "var(--surface2)", border: "1px solid var(--border)", color: "var(--gold)" }}>
        <Icon size={17} />
      </span>
      <span className="flex flex-col gap-px">
        <span className="text-[11px] uppercase tracking-[0.1em]" style={{ color: "var(--text3)" }}>{label}</span>
        <span className="text-[15px] font-medium">{value}</span>
      </span>
    </>
  );
  const cls = "flex items-center gap-3.5 py-3.5";
  const style = { borderBottom: last ? "none" : "1px solid var(--border)" };
  return href ? (
    <a href={href} className={cls} style={{ ...style, textDecoration: "none", color: "inherit" }}>
      {inner}
    </a>
  ) : (
    <div className={cls} style={style}>
      {inner}
    </div>
  );
}

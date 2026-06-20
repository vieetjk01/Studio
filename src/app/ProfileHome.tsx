"use client";

import { useRef, useState } from "react";
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
} from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl } from "@/lib/drive";
import { PRICE_LISTS } from "@/lib/pricelist-seeds";
import PackageCompare from "@/components/PackageCompare";
import type { SiteSettings, BookingService } from "@/lib/types";

type PriceRow = { id: string; list_key: string; name: string; price: number; unit: string | null; category: string | null; description: string | null };


const SERVICES: {
  k: BookingService;
  label: string;
  desc: string;
  Icon: typeof Heart;
}[] = [
  { k: "wedding", label: "Quay chụp đám cưới", desc: "Phóng sự & phim cưới", Icon: Heart },
  { k: "event", label: "Quay chụp sự kiện", desc: "Gala · hội nghị · khai trương", Icon: Calendar },
  { k: "sports", label: "Quay chụp thể thao", desc: "Giải đấu · vận động viên", Icon: Zap },
  { k: "other", label: "Nội dung khác", desc: "TVC · sản phẩm · gia đình", Icon: MoreHorizontal },
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

  // Priced packages grouped by list (Cưới / Đính hôn) → category, for comparison.
  const priced = pricelist.filter((p) => p.price > 0);
  const priceLists = PRICE_LISTS.map((l) => {
    const listItems = priced.filter((p) => (p.list_key || "cuoi") === l.key);
    const cats: { name: string; items: typeof listItems }[] = [];
    for (const it of listItems) {
      const cat = it.category?.trim() || "Gói dịch vụ";
      let g = cats.find((x) => x.name === cat);
      if (!g) { g = { name: cat, items: [] }; cats.push(g); }
      g.items.push(it);
    }
    return { ...l, cats };
  }).filter((l) => l.cats.length > 0);

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
            Trang chủ
          </button>
          <Link href="/album" className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            Album
          </Link>
          <Link href="/banggia" className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            Bảng giá
          </Link>
          <button onClick={() => scrollTo(contactRef)} className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            Liên hệ
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <button onClick={() => scrollTo(contactRef)} className="hidden text-sm font-medium sm:block" style={{ color: "var(--text2)" }}>
            Đặt lịch
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
                <MessageSquare size={15} /> Liên hệ
              </button>
              <button onClick={() => scrollTo(contactRef)} className="btn-primary px-5 py-2.5 text-[13.5px]" style={{ boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
                <Calendar size={15} /> Đặt lịch chụp
              </button>
            </div>
          </div>

          <div className="mt-[clamp(24px,3vw,34px)] grid items-center gap-[clamp(20px,3vw,44px)] [grid-template-columns:repeat(auto-fit,minmax(260px,1fr))]">
            <p className="max-w-[44em] text-[clamp(14.5px,1.5vw,16.5px)] leading-relaxed" style={{ color: "var(--text2)" }}>
              {settings.profile_bio}
            </p>
            <div className="flex gap-2.5">
              {[
                { v: stats.albums, l: "Album" },
                { v: stats.photos, l: "Ảnh" },
                { v: stats.years, l: "Năm nghề" },
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
              <p className="eyebrow mb-1.5">Tuyển chọn</p>
              <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Hình ảnh nổi bật</h2>
            </div>
            <Link href="/album" className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--text2)" }}>
              Xem tất cả <ArrowRight size={15} />
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
              <p className="eyebrow mb-1.5">Album ảnh</p>
              <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Bộ ảnh nổi bật</h2>
            </div>
            <Link href="/album" className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--text2)" }}>
              Xem tất cả <ArrowRight size={15} />
            </Link>
          </div>
          <GalleryGrid items={photoGalleries} />
        </section>
      )}

      {/* Pinned videos */}
      {videoGalleries.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5">
            <p className="eyebrow mb-1.5">Video</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Phim & video</h2>
          </div>
          <GalleryGrid items={videoGalleries} video />
        </section>
      )}

      {/* Price list — condensed (name + short note, no price); details on /banggia */}
      {priceLists.length > 0 && (
        <section id="bang-gia" className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] scroll-mt-20 px-6 md:px-10">
          <div className="mb-5 flex flex-wrap items-end justify-between gap-3">
            <div>
              <p className="eyebrow mb-1.5">Bảng giá</p>
              <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Gói dịch vụ</h2>
            </div>
            <Link href="/banggia" className="text-sm" style={{ color: "var(--accent)" }}>Xem bảng giá chi tiết →</Link>
          </div>

          <div className="space-y-12">
            {priceLists.map((l) => (
              <div key={l.key}>
                <div className="mb-4 flex flex-wrap items-end justify-between gap-2">
                  <h3 className="font-serif text-2xl font-medium" style={{ color: "var(--accent)" }}>Bảng giá {l.label}</h3>
                  <Link href={`/banggia?list=${l.key}`} className="text-sm" style={{ color: "var(--accent)" }}>Xem chi tiết &amp; lưu ý →</Link>
                </div>
                <div className="space-y-8">
                  {l.cats.map((cat) => (
                    <div key={cat.name}>
                      <p className="eyebrow mb-3">{cat.name}</p>
                      <PackageCompare items={cat.items} bookingToken={bookingToken} listKey={l.key} listLabel={l.label} />
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Feedback */}
      {feedback.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5">
            <p className="eyebrow mb-1.5">Cảm nhận</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Khách hàng nói gì</h2>
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
            <p className="eyebrow mb-1.5">Đặt lịch</p>
            <h2 className="mb-1.5 font-serif text-[clamp(27px,3.4vw,40px)] font-medium leading-none">Đặt lịch quay chụp</h2>
            <p className="mb-5 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              Chọn loại dịch vụ và để lại thông tin — Vieetjk sẽ liên hệ trong vòng 24 giờ.
            </p>

            <label className="label">Loại dịch vụ</label>
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
                      <span className="text-[13.5px] font-semibold">{sv.label}</span>
                      <span className="text-[11.5px]" style={{ color: "var(--text3)" }}>{sv.desc}</span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="label">Họ tên</label>
                <input value={booking.name} onChange={(e) => setBooking((b) => ({ ...b, name: e.target.value }))} placeholder="Tên của bạn" className="input" />
              </div>
              <div>
                <label className="label">Số điện thoại</label>
                <input value={booking.phone} onChange={(e) => setBooking((b) => ({ ...b, phone: e.target.value }))} placeholder="09xx xxx xxx" className="input" />
              </div>
            </div>
            <label className="label mt-4">Ngày dự kiến</label>
            <input value={booking.date} onChange={(e) => setBooking((b) => ({ ...b, date: e.target.value }))} placeholder="VD: 20/12/2025" className="input" />
            <label className="label mt-4">Nội dung</label>
            <textarea
              value={booking.note}
              onChange={(e) => setBooking((b) => ({ ...b, note: e.target.value }))}
              placeholder="Mô tả ngắn về buổi chụp, địa điểm, ý tưởng…"
              className="input min-h-[92px] resize-y"
            />

            <button onClick={submitBooking} disabled={submitting} className="btn-primary mt-5 w-full rounded-xl py-3.5 text-[15px]">
              {submitting ? "Đang gửi…" : "Gửi yêu cầu đặt lịch"}
              <Send size={16} />
            </button>
            {bookingDone && (
              <div className="mt-3.5 flex items-center gap-2.5 rounded-xl px-3.5 py-3" style={{ background: "color-mix(in srgb,#3fbf7f 14%,transparent)", border: "1px solid color-mix(in srgb,#3fbf7f 40%,transparent)" }}>
                <Check size={17} style={{ color: "#5fd29a" }} />
                <span className="text-[13.5px]">Đã nhận yêu cầu! Vieetjk sẽ liên hệ sớm với bạn.</span>
              </div>
            )}
          </div>

          {/* Contact info */}
          <div className="card p-[clamp(22px,3vw,34px)] animate-[vkFade_.5s_ease_.05s_both]">
            <p className="eyebrow mb-1.5">Liên hệ</p>
            <h2 className="mb-1.5 font-serif text-[clamp(27px,3.4vw,40px)] font-medium leading-none">Thông tin liên hệ</h2>
            <p className="mb-6 text-sm leading-relaxed" style={{ color: "var(--text2)" }}>
              Liên hệ trực tiếp qua các kênh dưới đây — phản hồi nhanh trong giờ làm việc.
            </p>
            <div className="flex flex-col">
              {(() => {
                const rows: { Icon: typeof Phone; label: string; value: string; href?: string }[] = [
                  { Icon: Phone, label: "Điện thoại", value: settings.contact_phone, href: `tel:${settings.contact_phone.replace(/\s/g, "")}` },
                  { Icon: Mail, label: "Email", value: settings.contact_email, href: `mailto:${settings.contact_email}` },
                  { Icon: Instagram, label: "Instagram", value: settings.contact_instagram },
                ];
                if (settings.contact_facebook) rows.push({ Icon: Facebook, label: "Facebook", value: settings.contact_facebook });
                if (settings.contact_tiktok) rows.push({ Icon: Music2, label: "TikTok", value: settings.contact_tiktok });
                if (settings.contact_youtube) rows.push({ Icon: Youtube, label: "YouTube", value: settings.contact_youtube });
                rows.push({ Icon: MapPin, label: "Địa chỉ studio", value: settings.contact_address });
                rows.push({ Icon: Clock, label: "Giờ làm việc", value: settings.contact_hours });
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

"use client";

import { useRef, useState } from "react";
import Link from "next/link";
import {
  ArrowRight,
  MapPin,
  MessageSquare,
  Plus,
  Eye,
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
} from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl } from "@/lib/drive";
import type { SiteSettings, BookingService } from "@/lib/types";

interface ShowcaseAlbum {
  slug: string;
  title: string;
  kind: string;
  cover_url: string | null;
  pinned: boolean;
  count: number;
}

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

export default function ProfileHome({
  settings,
  showcase,
  featured,
  stats,
}: {
  settings: SiteSettings;
  showcase: ShowcaseAlbum[];
  featured: { fileId: string; slug: string }[];
  stats: { albums: number; photos: number; years: number };
}) {
  const { t } = useLang();
  const libRef = useRef<HTMLDivElement>(null);
  const contactRef = useRef<HTMLDivElement>(null);

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
          <button onClick={() => scrollTo(libRef)} className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            Album
          </button>
          <button onClick={() => scrollTo(contactRef)} className="rounded-full px-4 py-2 text-sm font-medium" style={{ color: "var(--text2)" }}>
            Liên hệ
          </button>
        </nav>
        <div className="ml-auto flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="text-sm font-medium" style={{ color: "var(--text2)" }}>
            {t("login")}
          </Link>
          <Link href="/dashboard/create" className="btn-primary px-4 py-2 text-[13.5px]">
            {t("newAlbum")}
          </Link>
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
        <div className="mx-auto max-w-[1180px] px-6 md:px-10">
          <div className="-mt-[clamp(58px,7vw,78px)] flex flex-wrap items-end gap-[clamp(16px,3vw,28px)]">
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
              <Link href="/dashboard/create" className="btn-primary px-5 py-2.5 text-[13.5px]" style={{ boxShadow: "0 10px 30px rgba(0,0,0,.4)" }}>
                <Plus size={15} /> Tạo trang chọn ảnh
              </Link>
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

      {/* Featured photos */}
      {featured.length > 0 && (
        <section className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] px-6 md:px-10">
          <div className="mb-5 flex items-end justify-between gap-3.5">
            <div>
              <p className="eyebrow mb-1.5">Tuyển chọn</p>
              <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Ảnh nổi bật</h2>
            </div>
            <button onClick={() => scrollTo(libRef)} className="flex items-center gap-1.5 text-[13.5px] font-medium" style={{ color: "var(--text2)" }}>
              Xem tất cả <ArrowRight size={15} />
            </button>
          </div>
          <div style={{ columns: "230px", columnGap: "14px" }}>
            {featured.map((f, i) => (
              <Link
                key={i}
                href={`/showcase/${f.slug}`}
                className="mb-3.5 block overflow-hidden rounded-xl animate-[vkPop_.45s_ease_both]"
                style={{ breakInside: "avoid", background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={thumbnailUrl(f.fileId, 500)} alt="ảnh nổi bật" className="block w-full transition-transform duration-700 hover:scale-[1.04]" />
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* Showcase albums */}
      <section ref={libRef} className="mx-auto mt-[clamp(40px,5vw,64px)] max-w-[1180px] scroll-mt-20 px-6 md:px-10">
        <div className="mb-5 flex items-end justify-between gap-3.5">
          <div>
            <p className="eyebrow mb-1.5">Bộ sưu tập</p>
            <h2 className="font-serif text-[clamp(28px,4vw,44px)] font-medium leading-none">Album tham khảo</h2>
          </div>
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: "var(--text3)" }}>
            <Eye size={14} /> Ảnh mẫu — chỉ để xem
          </span>
        </div>
        {showcase.length === 0 ? (
          <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>
            Chưa có album tham khảo. Bật “Hiển thị ngoài trang chủ” khi sửa album.
          </div>
        ) : (
          <div className="grid gap-[clamp(14px,2vw,20px)] [grid-template-columns:repeat(auto-fill,minmax(230px,1fr))]">
            {showcase.map((a) => (
              <Link
                key={a.slug}
                href={`/showcase/${a.slug}`}
                className="group relative overflow-hidden rounded-xl animate-[vkFade_.5s_ease_both]"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                <div className="relative aspect-[4/5] overflow-hidden">
                  {a.cover_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={a.cover_url} alt={a.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-700 group-hover:scale-105" />
                  ) : (
                    <div className="absolute inset-0" style={{ background: "var(--surface2)" }} />
                  )}
                  <div className="absolute inset-0" style={{ background: "linear-gradient(to top, rgba(0,0,0,.78) 0%, rgba(0,0,0,0) 50%)" }} />
                  {a.pinned && (
                    <div className="absolute right-2.5 top-2.5 flex h-[26px] w-[26px] items-center justify-center rounded-full" style={{ background: "rgba(10,10,12,.6)", backdropFilter: "blur(6px)" }}>
                      <svg width="12" height="12" viewBox="0 0 24 24" fill="var(--logo)"><path d="M9 4h6l-1 7 4 3v2h-5v6l-1 1-1-1v-6H6v-2l4-3z" /></svg>
                    </div>
                  )}
                  <div className="absolute inset-x-3.5 bottom-3.5">
                    <h3 className="mb-0.5 font-serif text-xl font-medium leading-tight text-white">{a.title}</h3>
                    <p className="text-[11.5px]" style={{ color: "rgba(255,255,255,.66)" }}>
                      {a.kind} · {a.count} ảnh
                    </p>
                  </div>
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>

      {/* Booking + contact */}
      <section ref={contactRef} className="mx-auto mt-[clamp(44px,6vw,76px)] max-w-[1180px] scroll-mt-20 px-6 md:px-10">
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
              <ContactRow Icon={Phone} label="Điện thoại" value={settings.contact_phone} href={`tel:${settings.contact_phone.replace(/\s/g, "")}`} />
              <ContactRow Icon={Mail} label="Email" value={settings.contact_email} href={`mailto:${settings.contact_email}`} />
              <ContactRow Icon={Instagram} label="Instagram" value={settings.contact_instagram} />
              <ContactRow Icon={MapPin} label="Địa chỉ studio" value={settings.contact_address} />
              <ContactRow Icon={Clock} label="Giờ làm việc" value={settings.contact_hours} last />
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

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  FileText,
  CalendarCheck,
  Users,
  Wallet,
  ImageDown,
  Stamp,
  Images,
  CalendarClock,
  Check,
  Crown,
  Sparkles,
  Camera,
  Zap,
  ArrowRight,
  ShieldCheck,
} from "lucide-react";
import { PLAN_FEATURES, PLAN_LABEL, formatVnd, type Plan } from "@/lib/plans";
import { appUrl } from "@/lib/hosts";

export interface LandingPrices {
  basicMonth: number;
  basicYear: number;
  photographerMonth: number;
  photographerYear: number;
  studioMonth: number;
  studioYear: number;
  basicDiscount: number;
  photographerDiscount: number;
  studioDiscount: number;
  studioPromo: number;
}

type Cycle = "month" | "year";

// Standout features of the full Studio plan — the headline selling points.
const STUDIO_FEATURES: { icon: typeof FileText; title: string; desc: string }[] = [
  { icon: FileText, title: "Hợp đồng & báo giá", desc: "Soạn hợp đồng, báo giá hạng mục cho khách. Khách xem online & yêu cầu chỉnh sửa ngay trên link." },
  { icon: CalendarCheck, title: "Đặt lịch online", desc: "Nhận đặt lịch qua link + QR. Khách tự chọn ngày, gói chụp — vào thẳng lịch của studio." },
  { icon: CalendarClock, title: "Lịch chụp & nhắc lịch", desc: "Quản lý toàn bộ buổi chụp trên một lịch, tự động nhắc lịch để không bỏ sót khách." },
  { icon: Users, title: "Quản lý đội ngũ", desc: "Phân công photographer / cameramen theo từng hợp đồng, theo dõi lịch của cả team." },
  { icon: Wallet, title: "Tài chính & lương", desc: "Theo dõi doanh thu, chi phí, lợi nhuận và tính lương đội ngũ theo từng hợp đồng." },
  { icon: Images, title: "Gallery giao khách", desc: "Giao ảnh cho khách qua gallery riêng — khách chọn ảnh, ghi chú, tải về (ZIP / từng ảnh)." },
  { icon: ImageDown, title: "Nén ảnh không giới hạn", desc: "Nén ảnh trên máy, qua link Drive hoặc Google Picker — giữ nguyên chất lượng, nhẹ dung lượng." },
  { icon: Stamp, title: "Watermark đầy đủ", desc: "Đóng dấu logo + chữ lên ảnh, nén kèm watermark để bảo vệ tác quyền khi giao khách." },
];

// Basic getting-started guide.
const STEPS: { n: string; title: string; desc: string }[] = [
  { n: "01", title: "Tạo tài khoản", desc: "Đăng ký miễn phí bằng email hoặc Google — bắt đầu ngay với gói miễn phí, không cần thẻ." },
  { n: "02", title: "Tạo album / gallery", desc: "Tải ảnh từ máy hoặc Google Drive, đặt mật khẩu, gửi link + QR cho khách." },
  { n: "03", title: "Khách chọn ảnh", desc: "Khách xem album, đánh dấu ảnh ưng ý, ghi chú và gửi lại studio — tất cả online." },
  { n: "04", title: "Quản lý studio", desc: "Nâng cấp lên gói Studio để quản lý hợp đồng, lịch chụp, đội ngũ và tài chính ở một nơi." },
];

export default function LandingPage({ prices }: { prices: LandingPrices }) {
  const [cycle, setCycle] = useState<Cycle>("month");

  function discountFor(plan: Plan): number {
    if (plan === "basic") return prices.basicDiscount;
    if (plan === "photographer") return prices.photographerDiscount;
    if (plan === "studio") return Math.max(prices.studioDiscount, cycle === "year" ? prices.studioPromo : 0);
    return 0;
  }
  function priceOf(plan: "basic" | "photographer" | "studio"): number {
    if (plan === "basic") return cycle === "month" ? prices.basicMonth : prices.basicYear;
    if (plan === "photographer") return cycle === "month" ? prices.photographerMonth : prices.photographerYear;
    return cycle === "month" ? prices.studioMonth : prices.studioYear;
  }

  const loginUrl = appUrl("/login");
  const startUrl = appUrl("/start");

  const cards: { plan: Plan; icon: typeof Sparkles; accent: boolean; tagline: string }[] = [
    { plan: "free", icon: Sparkles, accent: false, tagline: "Bắt đầu thử nghiệm" },
    { plan: "basic", icon: Zap, accent: false, tagline: "Cho nhiếp ảnh cá nhân" },
    { plan: "photographer", icon: Camera, accent: true, tagline: "Studio đang phát triển" },
    { plan: "studio", icon: Crown, accent: true, tagline: "Trọn bộ quản lý studio" },
  ];

  function priceBlock(plan: "basic" | "photographer" | "studio") {
    const full = priceOf(plan);
    const disc = discountFor(plan);
    const now = Math.round(full * (1 - disc / 100));
    return (
      <div className="flex flex-wrap items-baseline gap-2">
        {disc > 0 && (
          <span className="text-[15px] line-through" style={{ color: "var(--text3)" }}>
            {formatVnd(full)}
          </span>
        )}
        <span className="font-serif text-3xl font-medium">{formatVnd(now)}</span>
        <span className="text-[13px]" style={{ color: "var(--text2)" }}>
          /{cycle === "month" ? "tháng" : "năm"}
        </span>
        {disc > 0 && (
          <span className="rounded-full px-2 py-0.5 text-[11px] font-semibold" style={{ background: "var(--gold)", color: "#1a1205" }}>
            -{disc}%
          </span>
        )}
      </div>
    );
  }

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Nav ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4">
          <span className="font-serif text-2xl font-medium tracking-tight">mstudo</span>
          <div className="hidden items-center gap-7 text-[14px] sm:flex" style={{ color: "var(--text2)" }}>
            <a href="#features" className="transition-colors hover:text-[var(--text)]">Tính năng</a>
            <a href="#guide" className="transition-colors hover:text-[var(--text)]">Hướng dẫn</a>
            <a href="#pricing" className="transition-colors hover:text-[var(--text)]">Bảng giá</a>
          </div>
          <div className="flex items-center gap-2.5">
            <Link href={loginUrl} className="btn-ghost text-[13px]">Đăng nhập</Link>
            <Link href={startUrl} className="btn-primary text-[13px]">Dùng thử miễn phí</Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[480px] w-[680px] -translate-x-1/2 rounded-full opacity-25 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }}
        />
        <div className="mx-auto max-w-4xl px-5 pt-20 pb-16 text-center animate-[vkFade_.6s_ease_both]">
          <p className="eyebrow mb-4">Nền tảng quản lý studio ảnh</p>
          <h1 className="font-serif text-[clamp(34px,6vw,60px)] font-medium leading-[1.05]">
            Quản lý cả studio ảnh<br />trong một nơi duy nhất
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed" style={{ color: "var(--text2)" }}>
            Từ giao ảnh cho khách chọn, hợp đồng & báo giá, đặt lịch, đến quản lý đội ngũ và tài chính —
            mstudo gom toàn bộ quy trình của studio vào một công cụ gọn nhẹ.
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={startUrl} className="btn-primary rounded-xl px-6 py-3 text-[15px]">
              Bắt đầu miễn phí <ArrowRight size={16} />
            </Link>
            <a href="#pricing" className="btn-ghost rounded-xl px-6 py-3 text-[15px]">Xem bảng giá</a>
          </div>
          <p className="mt-4 text-[13px]" style={{ color: "var(--text3)" }}>
            Miễn phí 5 album mỗi tháng · Không cần thẻ thanh toán
          </p>
        </div>
      </section>

      {/* ── Studio features ───────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl px-5 py-16 scroll-mt-20">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-2">Tính năng nổi bật · gói Studio</p>
          <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">Mọi thứ một studio cần</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px]" style={{ color: "var(--text2)" }}>
            Gói Studio mở khoá toàn bộ công cụ vận hành chuyên nghiệp — không giới hạn.
          </p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {STUDIO_FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title} className="card p-6 transition-colors hover:border-[var(--border2)]">
              <span
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--gold) 14%, transparent)", color: "var(--gold)" }}
              >
                <Icon size={20} />
              </span>
              <h3 className="mb-1.5 text-[15px] font-semibold">{title}</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text2)" }}>{desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Basic guide ───────────────────────────────────────── */}
      <section id="guide" className="scroll-mt-20" style={{ background: "var(--bg2)", borderBlock: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-10 text-center">
            <p className="eyebrow mb-2">Hướng dẫn cơ bản</p>
            <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">Bắt đầu trong 4 bước</h2>
          </div>
          <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map((s) => (
              <div key={s.n} className="relative">
                <span className="font-serif text-5xl font-medium" style={{ color: "color-mix(in srgb, var(--gold) 55%, transparent)" }}>
                  {s.n}
                </span>
                <h3 className="mt-2 text-[16px] font-semibold">{s.title}</h3>
                <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--text2)" }}>{s.desc}</p>
              </div>
            ))}
          </div>
          <div className="mt-10 text-center">
            <Link href={startUrl} className="btn-primary rounded-xl px-6 py-3 text-[15px]">
              Tạo album đầu tiên <ArrowRight size={16} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Pricing ───────────────────────────────────────────── */}
      <section id="pricing" className="mx-auto max-w-6xl px-5 py-16 scroll-mt-20">
        <div className="mb-8 text-center">
          <p className="eyebrow mb-2">Bảng giá</p>
          <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">Chọn gói phù hợp</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px]" style={{ color: "var(--text2)" }}>
            Nâng cấp bất cứ lúc nào. Gói Studio đang ưu đãi {prices.studioPromo}% khi đăng ký theo năm.
          </p>
        </div>

        {/* Billing cycle toggle */}
        <div className="mb-8 flex justify-center">
          <div className="inline-flex overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
            {(["month", "year"] as Cycle[]).map((c) => (
              <button
                key={c}
                onClick={() => setCycle(c)}
                className="px-5 py-2 text-[13px] font-medium transition-colors"
                style={cycle === c ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface2)", color: "var(--text2)" }}
              >
                {c === "month" ? "Theo tháng" : "Theo năm"}
              </button>
            ))}
          </div>
        </div>

        <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {cards.map(({ plan, icon: Icon, accent, tagline }) => (
            <div
              key={plan}
              className="card relative flex flex-col p-7"
              style={accent ? { borderColor: "var(--gold)" } : undefined}
            >
              {plan === "studio" && (
                <span
                  className="absolute -top-3 left-1/2 -translate-x-1/2 rounded-full px-3 py-1 text-[11px] font-semibold"
                  style={{ background: "var(--gold)", color: "#1a1205" }}
                >
                  Phổ biến nhất
                </span>
              )}
              <div className="mb-4 flex items-center gap-2.5">
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ background: accent ? "var(--gold)" : "var(--surface2)", color: accent ? "#1a1205" : "var(--text2)" }}
                >
                  <Icon size={18} />
                </span>
                <div>
                  <h3 className="font-serif text-2xl font-medium">{PLAN_LABEL[plan]}</h3>
                  <p className="text-[12px]" style={{ color: "var(--text3)" }}>{tagline}</p>
                </div>
              </div>

              <div className="mb-5">
                {plan === "free" ? (
                  <span className="font-serif text-3xl font-medium">Miễn phí</span>
                ) : (
                  priceBlock(plan)
                )}
              </div>

              <ul className="mb-6 space-y-2.5">
                {PLAN_FEATURES[plan].map((f) => (
                  <li key={f} className="flex items-start gap-2.5 text-[13px]" style={{ color: "var(--text2)" }}>
                    <Check size={15} className="mt-0.5 flex-shrink-0" style={{ color: accent ? "var(--gold)" : "var(--text3)" }} />
                    {f}
                  </li>
                ))}
              </ul>

              <div className="mt-auto">
                <Link
                  href={plan === "free" ? startUrl : appUrl("/dashboard/upgrade")}
                  className={`${accent ? "btn-primary" : "btn-ghost"} w-full rounded-xl py-3 text-[14px]`}
                >
                  {plan === "free" ? "Dùng miễn phí" : `Chọn ${PLAN_LABEL[plan]}`}
                </Link>
              </div>
            </div>
          ))}
        </div>

        <p className="mt-6 flex items-center justify-center gap-2 text-center text-[12.5px]" style={{ color: "var(--text3)" }}>
          <ShieldCheck size={14} /> Thanh toán & kích hoạt được hỗ trợ thủ công — gửi yêu cầu, quản trị viên liên hệ ngay.
        </p>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 pb-20">
        <div className="card overflow-hidden p-10 text-center" style={{ background: "var(--surface)" }}>
          <h2 className="font-serif text-[clamp(24px,4vw,36px)] font-medium">Sẵn sàng quản lý studio chuyên nghiệp?</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px]" style={{ color: "var(--text2)" }}>
            Tạo tài khoản miễn phí hôm nay — nâng cấp khi studio của bạn lớn lên.
          </p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={startUrl} className="btn-primary rounded-xl px-6 py-3 text-[15px]">
              Bắt đầu miễn phí <ArrowRight size={16} />
            </Link>
            <Link href={loginUrl} className="btn-ghost rounded-xl px-6 py-3 text-[15px]">Đăng nhập</Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[13px]" style={{ color: "var(--text3)" }}>
          <span className="font-serif text-lg font-medium" style={{ color: "var(--text2)" }}>mstudo</span>
          <div className="flex items-center gap-5">
            <a href="#features" className="transition-colors hover:text-[var(--text)]">Tính năng</a>
            <a href="#guide" className="transition-colors hover:text-[var(--text)]">Hướng dẫn</a>
            <a href="#pricing" className="transition-colors hover:text-[var(--text)]">Bảng giá</a>
            <Link href={loginUrl} className="transition-colors hover:text-[var(--text)]">Đăng nhập</Link>
          </div>
          <span>© {new Date().getFullYear()} mstudo</span>
        </div>
      </footer>
    </div>
  );
}

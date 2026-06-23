"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import {
  FileText,
  CalendarCheck,
  CalendarClock,
  Users,
  Wallet,
  Package,
  BarChart3,
  Boxes,
  ArrowRight,
  Check,
  ChevronDown,
  Sun,
  Moon,
  Mail,
  Building2,
  Globe,
  ShieldCheck,
  Languages,
  UserPlus,
  Settings2,
  Send,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { studioUrl } from "@/lib/hosts";

type V = { vi: string; en: string };
const tx = (lang: "vi" | "en", v: V) => v[lang];

// ── Studio-management features (no img / album-delivery features) ──────────
const FEATURES: { icon: typeof FileText; title: V; desc: V }[] = [
  {
    icon: FileText,
    title: { vi: "Hợp đồng & báo giá", en: "Contracts & quotes" },
    desc: {
      vi: "Soạn hợp đồng và báo giá hạng mục chuyên nghiệp. Khách xem online, ký & yêu cầu chỉnh sửa ngay trên link.",
      en: "Draft professional contracts and itemised quotes. Clients view, sign and request edits right from a link.",
    },
  },
  {
    icon: CalendarCheck,
    title: { vi: "Đặt lịch online", en: "Online booking" },
    desc: {
      vi: "Nhận đặt lịch qua link & QR. Khách tự chọn ngày và gói chụp, đổ thẳng vào lịch của studio.",
      en: "Take bookings via link & QR. Clients pick a date and package that flows straight into your calendar.",
    },
  },
  {
    icon: CalendarClock,
    title: { vi: "Lịch chụp & nhắc lịch", en: "Schedule & reminders" },
    desc: {
      vi: "Toàn bộ buổi chụp trên một lịch chung, tự động nhắc lịch để cả team không bỏ sót khách.",
      en: "Every shoot on one shared calendar with automatic reminders so the team never misses a client.",
    },
  },
  {
    icon: Users,
    title: { vi: "Quản lý khách hàng", en: "Client management" },
    desc: {
      vi: "Danh bạ khách hàng tập trung — lịch sử hợp đồng, buổi chụp và liên hệ ở cùng một nơi.",
      en: "A central client directory — contract history, shoots and contacts all in one place.",
    },
  },
  {
    icon: Boxes,
    title: { vi: "Quản lý đội ngũ", en: "Team management" },
    desc: {
      vi: "Phân công photographer, cameramen theo từng hợp đồng và theo dõi lịch của cả đội.",
      en: "Assign photographers and crew per contract and track the whole team's schedule.",
    },
  },
  {
    icon: Wallet,
    title: { vi: "Tài chính & lương", en: "Finance & payroll" },
    desc: {
      vi: "Theo dõi doanh thu, chi phí, lợi nhuận và tính lương đội ngũ theo từng hợp đồng.",
      en: "Track revenue, costs, profit and calculate team payroll per contract.",
    },
  },
  {
    icon: Package,
    title: { vi: "Gói dịch vụ & bảng giá", en: "Packages & pricing" },
    desc: {
      vi: "Dựng sẵn các gói dịch vụ, bảng giá hạng mục để báo giá và lên hợp đồng chỉ trong vài cú nhấp.",
      en: "Build service packages and price lists to quote and contract in just a few clicks.",
    },
  },
  {
    icon: BarChart3,
    title: { vi: "Báo cáo & thống kê", en: "Reports & analytics" },
    desc: {
      vi: "Tổng quan doanh thu, số buổi chụp và hiệu suất studio theo thời gian — nắm tình hình tức thì.",
      en: "Overview of revenue, shoots and studio performance over time — know your numbers instantly.",
    },
  },
];

// ── Visual usage guide ─────────────────────────────────────────────────────
const STEPS: { icon: typeof UserPlus; n: string; title: V; desc: V }[] = [
  {
    icon: UserPlus,
    n: "01",
    title: { vi: "Tạo tài khoản studio", en: "Create your studio" },
    desc: {
      vi: "Đăng nhập studio và thiết lập thông tin studio của bạn trong vài phút.",
      en: "Sign in to studio and set up your studio profile in a few minutes.",
    },
  },
  {
    icon: Settings2,
    n: "02",
    title: { vi: "Thiết lập gói & bảng giá", en: "Set up packages" },
    desc: {
      vi: "Tạo các gói dịch vụ, bảng giá hạng mục để dùng lại cho mọi hợp đồng.",
      en: "Create service packages and price lists to reuse across every contract.",
    },
  },
  {
    icon: CalendarCheck,
    n: "03",
    title: { vi: "Nhận lịch & lên hợp đồng", en: "Book & contract" },
    desc: {
      vi: "Khách đặt lịch qua link, bạn tạo hợp đồng và phân công đội ngũ ngay.",
      en: "Clients book via link, you create contracts and assign the crew right away.",
    },
  },
  {
    icon: BarChart3,
    n: "04",
    title: { vi: "Theo dõi & tổng kết", en: "Track & report" },
    desc: {
      vi: "Quản lý tài chính, lương đội ngũ và xem báo cáo doanh thu mọi lúc.",
      en: "Manage finances, team payroll and view revenue reports anytime.",
    },
  },
];

// ── FAQ ──────────────────────────────────────────────────────────────────
const FAQ: { q: V; a: V }[] = [
  {
    q: { vi: "mstudo là gì?", en: "What is mstudo?" },
    a: {
      vi: "mstudo là phần mềm quản lý studio ảnh toàn diện: hợp đồng, báo giá, đặt lịch, lịch chụp, đội ngũ và tài chính — tất cả trong một nơi.",
      en: "mstudo is all-in-one studio management software: contracts, quotes, booking, scheduling, team and finance — all in one place.",
    },
  },
  {
    q: { vi: "Tôi có cần cài đặt gì không?", en: "Do I need to install anything?" },
    a: {
      vi: "Không. mstudo chạy hoàn toàn trên trình duyệt — chỉ cần đăng nhập là dùng được trên máy tính hay điện thoại.",
      en: "No. mstudo runs entirely in the browser — just sign in and use it on desktop or mobile.",
    },
  },
  {
    q: { vi: "Bắt đầu có mất phí không?", en: "Is it free to start?" },
    a: {
      vi: "Bạn có thể bắt đầu miễn phí. Nâng cấp khi studio của bạn cần thêm tính năng quản lý chuyên sâu.",
      en: "You can start for free. Upgrade when your studio needs more advanced management features.",
    },
  },
  {
    q: { vi: "Khách hàng của tôi có cần tài khoản không?", en: "Do my clients need an account?" },
    a: {
      vi: "Không. Khách chỉ cần mở link bạn gửi để xem hợp đồng, báo giá hoặc đặt lịch — không phải đăng ký.",
      en: "No. Clients just open the link you send to view contracts, quotes or to book — no sign-up needed.",
    },
  },
  {
    q: { vi: "Dữ liệu của tôi có an toàn không?", en: "Is my data secure?" },
    a: {
      vi: "Dữ liệu được lưu trữ an toàn và chỉ bạn cùng đội ngũ được cấp quyền mới truy cập được.",
      en: "Your data is stored securely and only you and your authorised team can access it.",
    },
  },
];

const COPY = {
  navFeatures: { vi: "Tính năng", en: "Features" },
  navGuide: { vi: "Hướng dẫn", en: "How it works" },
  navFaq: { vi: "Câu hỏi", en: "FAQ" },
  navAbout: { vi: "Về chúng tôi", en: "About" },
  signIn: { vi: "Đăng nhập", en: "Sign in" },
  startFree: { vi: "Bắt đầu miễn phí", en: "Start free" },
  heroEyebrow: { vi: "Phần mềm quản lý studio ảnh", en: "Studio management software" },
  heroTitle: { vi: "Vận hành studio ảnh,\ngọn gàng trong một nơi", en: "Run your photo studio,\nall in one place" },
  heroSub: {
    vi: "mstudo gom hợp đồng, báo giá, đặt lịch, lịch chụp, đội ngũ và tài chính vào một công cụ duy nhất — để bạn tập trung vào việc chụp, không phải giấy tờ.",
    en: "mstudo brings contracts, quotes, booking, scheduling, team and finance into a single tool — so you focus on shooting, not paperwork.",
  },
  heroNote: { vi: "Bắt đầu miễn phí · Không cần thẻ thanh toán", en: "Start free · No credit card required" },
  featuresEyebrow: { vi: "Tính năng", en: "Features" },
  featuresTitle: { vi: "Mọi thứ để quản lý studio", en: "Everything to run a studio" },
  featuresSub: {
    vi: "Tập trung vào nghiệp vụ quản lý studio chuyên nghiệp.",
    en: "Focused on professional studio operations.",
  },
  guideEyebrow: { vi: "Hướng dẫn sử dụng", en: "How it works" },
  guideTitle: { vi: "Bắt đầu trong 4 bước", en: "Get started in 4 steps" },
  faqEyebrow: { vi: "Hỏi & đáp", en: "FAQ" },
  faqTitle: { vi: "Câu hỏi thường gặp", en: "Frequently asked questions" },
  aboutEyebrow: { vi: "Về sản phẩm", en: "About" },
  aboutTitle: { vi: "Sản phẩm & công ty", en: "Product & company" },
  aboutProduct: {
    vi: "mstudo là nền tảng quản lý studio ảnh được xây dựng cho các nhiếp ảnh gia và studio tại Việt Nam — đơn giản, hiện đại và dễ dùng.",
    en: "mstudo is a studio management platform built for photographers and studios in Vietnam — simple, modern and easy to use.",
  },
  aboutCompanyLabel: { vi: "Đơn vị phát triển", en: "Developed by" },
  aboutCompany: { vi: "Công ty mstudo", en: "mstudo Company" },
  aboutContactLabel: { vi: "Liên hệ", en: "Contact" },
  aboutWebsiteLabel: { vi: "Website", en: "Website" },
  ctaTitle: { vi: "Sẵn sàng quản lý studio chuyên nghiệp?", en: "Ready to run your studio professionally?" },
  ctaSub: {
    vi: "Đăng nhập studio và bắt đầu miễn phí ngay hôm nay.",
    en: "Sign in to studio and start for free today.",
  },
  rights: { vi: "Bảo lưu mọi quyền.", en: "All rights reserved." },
};

export default function LandingPage() {
  const { lang, setLang } = useLang();
  const L = (v: V) => tx(lang, v);

  // Homepage theme: LIGHT by default, toggle to dark (persisted per visitor).
  const [theme, setTheme] = useState<"light" | "dark">("light");
  useEffect(() => {
    const stored = window.localStorage.getItem("mstudo_theme");
    const next = stored === "dark" ? "dark" : "light";
    setTheme(next);
    document.documentElement.dataset.theme = next;
    // Other routes are dark-only — restore dark when leaving the homepage.
    return () => {
      document.documentElement.dataset.theme = "dark";
    };
  }, []);
  function toggleTheme() {
    const next = theme === "light" ? "dark" : "light";
    setTheme(next);
    window.localStorage.setItem("mstudo_theme", next);
    document.documentElement.dataset.theme = next;
  }

  const [openFaq, setOpenFaq] = useState<number | null>(0);
  const loginUrl = studioUrl("/login");

  return (
    <div className="min-h-screen" style={{ background: "var(--bg)" }}>
      {/* ── Nav ───────────────────────────────────────────────── */}
      <header
        className="sticky top-0 z-40 backdrop-blur"
        style={{ background: "color-mix(in srgb, var(--bg) 80%, transparent)", borderBottom: "1px solid var(--border)" }}
      >
        <nav className="mx-auto flex max-w-6xl items-center justify-between px-5 py-3.5">
          <span className="font-serif text-2xl font-medium tracking-tight">mstudo</span>
          <div className="hidden items-center gap-7 text-[14px] md:flex" style={{ color: "var(--text2)" }}>
            <a href="#features" className="transition-colors hover:text-[var(--text)]">{L(COPY.navFeatures)}</a>
            <a href="#guide" className="transition-colors hover:text-[var(--text)]">{L(COPY.navGuide)}</a>
            <a href="#faq" className="transition-colors hover:text-[var(--text)]">{L(COPY.navFaq)}</a>
            <a href="#about" className="transition-colors hover:text-[var(--text)]">{L(COPY.navAbout)}</a>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setLang(lang === "vi" ? "en" : "vi")}
              className="flex h-9 items-center gap-1.5 rounded-full px-3 text-[13px] font-medium transition-colors"
              style={{ border: "1px solid var(--border2)", color: "var(--text)" }}
              title={lang === "vi" ? "English" : "Tiếng Việt"}
            >
              <Languages size={15} /> {lang === "vi" ? "VI" : "EN"}
            </button>
            <button
              onClick={toggleTheme}
              className="flex h-9 w-9 items-center justify-center rounded-full transition-colors"
              style={{ border: "1px solid var(--border2)", color: "var(--text)" }}
              title={theme === "light" ? "Dark mode" : "Light mode"}
              aria-label="Toggle theme"
            >
              {theme === "light" ? <Moon size={15} /> : <Sun size={15} />}
            </button>
            <Link href={loginUrl} className="btn-ghost hidden text-[13px] sm:inline-flex">{L(COPY.signIn)}</Link>
            <Link href={loginUrl} className="btn-primary text-[13px]">{L(COPY.startFree)}</Link>
          </div>
        </nav>
      </header>

      {/* ── Hero ──────────────────────────────────────────────── */}
      <section className="relative overflow-hidden">
        <div
          className="pointer-events-none absolute -top-40 left-1/2 h-[460px] w-[680px] -translate-x-1/2 rounded-full opacity-20 blur-3xl"
          style={{ background: "radial-gradient(circle, var(--gold), transparent 70%)" }}
        />
        <div className="mx-auto max-w-4xl px-5 pt-20 pb-16 text-center animate-[vkFade_.6s_ease_both]">
          <p className="eyebrow mb-4">{L(COPY.heroEyebrow)}</p>
          <h1 className="whitespace-pre-line font-serif text-[clamp(34px,6vw,60px)] font-medium leading-[1.05]">
            {L(COPY.heroTitle)}
          </h1>
          <p className="mx-auto mt-5 max-w-xl text-[16px] leading-relaxed" style={{ color: "var(--text2)" }}>
            {L(COPY.heroSub)}
          </p>
          <div className="mt-8 flex flex-wrap items-center justify-center gap-3">
            <Link href={loginUrl} className="btn-primary rounded-xl px-6 py-3 text-[15px]">
              {L(COPY.startFree)} <ArrowRight size={16} />
            </Link>
            <a href="#guide" className="btn-ghost rounded-xl px-6 py-3 text-[15px]">{L(COPY.navGuide)}</a>
          </div>
          <p className="mt-4 text-[13px]" style={{ color: "var(--text3)" }}>{L(COPY.heroNote)}</p>
        </div>
      </section>

      {/* ── Features ──────────────────────────────────────────── */}
      <section id="features" className="mx-auto max-w-6xl scroll-mt-20 px-5 py-16">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-2">{L(COPY.featuresEyebrow)}</p>
          <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">{L(COPY.featuresTitle)}</h2>
          <p className="mx-auto mt-3 max-w-xl text-[15px]" style={{ color: "var(--text2)" }}>{L(COPY.featuresSub)}</p>
        </div>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {FEATURES.map(({ icon: Icon, title, desc }) => (
            <div key={title.en} className="card p-6 transition-colors hover:border-[var(--border2)]">
              <span
                className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl"
                style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}
              >
                <Icon size={20} />
              </span>
              <h3 className="mb-1.5 text-[15px] font-semibold">{L(title)}</h3>
              <p className="text-[13.5px] leading-relaxed" style={{ color: "var(--text2)" }}>{L(desc)}</p>
            </div>
          ))}
        </div>
      </section>

      {/* ── Visual guide ──────────────────────────────────────── */}
      <section id="guide" className="scroll-mt-20" style={{ background: "var(--bg2)", borderBlock: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-6xl px-5 py-16">
          <div className="mb-12 text-center">
            <p className="eyebrow mb-2">{L(COPY.guideEyebrow)}</p>
            <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">{L(COPY.guideTitle)}</h2>
          </div>
          <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
            {STEPS.map(({ icon: Icon, n, title, desc }, i) => (
              <div key={n} className="relative">
                <div className="card flex flex-col items-start p-6">
                  <div className="mb-4 flex w-full items-center justify-between">
                    <span
                      className="flex h-12 w-12 items-center justify-center rounded-xl"
                      style={{ background: "var(--gold)", color: "#1a1205" }}
                    >
                      <Icon size={22} />
                    </span>
                    <span className="font-serif text-4xl font-medium" style={{ color: "color-mix(in srgb, var(--text) 14%, transparent)" }}>
                      {n}
                    </span>
                  </div>
                  <h3 className="text-[16px] font-semibold">{L(title)}</h3>
                  <p className="mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--text2)" }}>{L(desc)}</p>
                </div>
                {i < STEPS.length - 1 && (
                  <ArrowRight
                    size={18}
                    className="absolute top-12 -right-[15px] hidden lg:block"
                    style={{ color: "var(--text3)" }}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* ── FAQ ───────────────────────────────────────────────── */}
      <section id="faq" className="mx-auto max-w-3xl scroll-mt-20 px-5 py-16">
        <div className="mb-10 text-center">
          <p className="eyebrow mb-2">{L(COPY.faqEyebrow)}</p>
          <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">{L(COPY.faqTitle)}</h2>
        </div>
        <div className="space-y-3">
          {FAQ.map((f, i) => {
            const open = openFaq === i;
            return (
              <div key={f.q.en} className="card overflow-hidden">
                <button
                  onClick={() => setOpenFaq(open ? null : i)}
                  className="flex w-full items-center justify-between gap-4 px-5 py-4 text-left"
                >
                  <span className="text-[15px] font-medium">{L(f.q)}</span>
                  <ChevronDown
                    size={18}
                    className="flex-shrink-0 transition-transform"
                    style={{ color: "var(--text2)", transform: open ? "rotate(180deg)" : "none" }}
                  />
                </button>
                {open && (
                  <p className="px-5 pb-4 text-[14px] leading-relaxed" style={{ color: "var(--text2)" }}>
                    {L(f.a)}
                  </p>
                )}
              </div>
            );
          })}
        </div>
      </section>

      {/* ── About / company ───────────────────────────────────── */}
      <section id="about" className="scroll-mt-20" style={{ background: "var(--bg2)", borderBlock: "1px solid var(--border)" }}>
        <div className="mx-auto max-w-5xl px-5 py-16">
          <div className="mb-8 text-center">
            <p className="eyebrow mb-2">{L(COPY.aboutEyebrow)}</p>
            <h2 className="font-serif text-[clamp(26px,4vw,40px)] font-medium">{L(COPY.aboutTitle)}</h2>
          </div>
          <div className="grid gap-5 md:grid-cols-2">
            <div className="card p-7">
              <span className="mb-4 flex h-11 w-11 items-center justify-center rounded-xl" style={{ background: "color-mix(in srgb, var(--gold) 16%, transparent)", color: "var(--gold)" }}>
                <ShieldCheck size={20} />
              </span>
              <p className="text-[15px] leading-relaxed" style={{ color: "var(--text2)" }}>{L(COPY.aboutProduct)}</p>
            </div>
            <div className="card flex flex-col gap-4 p-7">
              <div className="flex items-center gap-3">
                <Building2 size={18} style={{ color: "var(--gold)" }} />
                <div>
                  <p className="text-[12px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{L(COPY.aboutCompanyLabel)}</p>
                  <p className="text-[15px] font-medium">{L(COPY.aboutCompany)}</p>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Mail size={18} style={{ color: "var(--gold)" }} />
                <div>
                  <p className="text-[12px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{L(COPY.aboutContactLabel)}</p>
                  <a href="mailto:hello@mstudo.com" className="text-[15px] font-medium hover:underline">hello@mstudo.com</a>
                </div>
              </div>
              <div className="flex items-center gap-3">
                <Globe size={18} style={{ color: "var(--gold)" }} />
                <div>
                  <p className="text-[12px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{L(COPY.aboutWebsiteLabel)}</p>
                  <span className="text-[15px] font-medium">mstudo.com</span>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* ── Final CTA ─────────────────────────────────────────── */}
      <section className="mx-auto max-w-4xl px-5 py-20">
        <div className="card p-10 text-center">
          <h2 className="font-serif text-[clamp(24px,4vw,36px)] font-medium">{L(COPY.ctaTitle)}</h2>
          <p className="mx-auto mt-3 max-w-lg text-[15px]" style={{ color: "var(--text2)" }}>{L(COPY.ctaSub)}</p>
          <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
            <Link href={loginUrl} className="btn-primary rounded-xl px-6 py-3 text-[15px]">
              {L(COPY.startFree)} <Send size={15} />
            </Link>
          </div>
        </div>
      </section>

      {/* ── Footer ────────────────────────────────────────────── */}
      <footer style={{ borderTop: "1px solid var(--border)" }}>
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-3 px-5 py-8 text-[13px]" style={{ color: "var(--text3)" }}>
          <span className="font-serif text-lg font-medium" style={{ color: "var(--text2)" }}>mstudo</span>
          <div className="flex items-center gap-5">
            <a href="#features" className="transition-colors hover:text-[var(--text)]">{L(COPY.navFeatures)}</a>
            <a href="#guide" className="transition-colors hover:text-[var(--text)]">{L(COPY.navGuide)}</a>
            <a href="#faq" className="transition-colors hover:text-[var(--text)]">{L(COPY.navFaq)}</a>
            <a href="#about" className="transition-colors hover:text-[var(--text)]">{L(COPY.navAbout)}</a>
          </div>
          <span>© {new Date().getFullYear()} mstudo · {L(COPY.rights)}</span>
        </div>
      </footer>
    </div>
  );
}

"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";

export default function HomePage() {
  const { t, lang } = useLang();

  return (
    <main className="relative flex min-h-screen flex-col">
      <header
        className="sticky top-0 z-40 flex items-center justify-between px-6 py-3.5 md:px-10"
        style={{
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Brand />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="btn-ghost px-4 py-2 text-[13.5px]">
            {t("login")}
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 py-20 text-center">
        <div
          className="mb-7 inline-flex items-center gap-2.5 rounded-full px-3.5 py-1.5"
          style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
        >
          <span
            className="h-1.5 w-1.5 rounded-full"
            style={{ background: "var(--gold)", boxShadow: "0 0 10px var(--gold)" }}
          />
          <span className="text-[11px] uppercase tracking-[0.18em]" style={{ color: "var(--text2)" }}>
            {t("tagline")}
          </span>
        </div>

        <h1 className="max-w-3xl text-[clamp(40px,6.3vw,74px)] font-bold leading-[0.98] tracking-[-0.025em]">
          {lang === "vi" ? "Chọn ảnh đẹp nhất của bạn," : "Choose your finest photographs,"}
          <span className="block font-serif font-normal italic" style={{ color: "var(--gold)" }}>
            {lang === "vi" ? "một cách tinh tế" : "beautifully"}
            <span className="not-italic" style={{ color: "var(--text)" }}>
              .
            </span>
          </span>
        </h1>

        <p className="mt-7 max-w-xl text-[clamp(15px,1.5vw,17.5px)] leading-relaxed" style={{ color: "var(--text2)" }}>
          {lang === "vi"
            ? "Nền tảng để khách hàng xem và chọn ảnh từ album riêng — có watermark, giới hạn lượt chọn và bảo vệ bằng mật khẩu."
            : "A platform for clients to browse and select photos from private albums — watermarked, limit-aware and password protected."}
        </p>

        <div className="mt-10 flex items-center gap-4">
          <Link href="/login" className="btn-primary px-6 py-3 text-[15px]">
            {t("login")}
            <ArrowRight size={17} />
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs" style={{ color: "var(--text3)" }}>
        © {new Date().getFullYear()} Vieetjk — {t("tagline")}
      </footer>
    </main>
  );
}

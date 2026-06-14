"use client";

import Link from "next/link";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";

export default function HomePage() {
  const { t, lang } = useLang();

  return (
    <main className="relative flex min-h-screen flex-col">
      <header className="flex items-center justify-between px-6 py-5 md:px-10">
        <Brand />
        <div className="flex items-center gap-3">
          <LanguageSwitcher />
          <Link href="/login" className="btn-ghost">
            {t("login")}
          </Link>
        </div>
      </header>

      <section className="flex flex-1 flex-col items-center justify-center px-6 text-center">
        <p className="mb-4 text-xs uppercase tracking-[0.4em] text-accent-gold">
          {t("brand")}
        </p>
        <h1 className="max-w-3xl text-4xl font-light leading-tight tracking-tight text-accent md:text-6xl">
          {lang === "vi"
            ? "Chọn ảnh đẹp nhất của bạn, một cách tinh tế."
            : "Choose your finest photographs, beautifully."}
        </h1>
        <p className="mt-6 max-w-xl text-sm leading-relaxed text-accent-muted md:text-base">
          {lang === "vi"
            ? "Nền tảng để khách hàng xem và chọn ảnh từ album riêng, có watermark, giới hạn lượt chọn và bảo vệ bằng mật khẩu."
            : "A platform for clients to browse and select photos from private albums — watermarked, limit-aware and password protected."}
        </p>
        <div className="mt-10 flex items-center gap-4">
          <Link href="/login" className="btn-primary px-6 py-2.5">
            {t("login")}
          </Link>
        </div>
      </section>

      <footer className="px-6 py-6 text-center text-xs text-ink-600">
        © {new Date().getFullYear()} Vieetjk — {t("tagline")}
      </footer>
    </main>
  );
}

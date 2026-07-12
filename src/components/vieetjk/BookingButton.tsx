"use client";

import { useState } from "react";
import { SERVICES, UI, tr, type Lang } from "@/lib/vieetjk/content";

/**
 * Nút "Đặt lịch" mở menu chọn 1 trong 3 dịch vụ (hoặc dịch vụ khác) rồi dẫn
 * THẲNG tới trang đặt lịch /book?list=<key> (không qua trang riêng của dịch vụ).
 */
export default function BookingButton({
  token,
  lang,
  label,
  variant = "primary",
  align = "left",
}: {
  token: string | null;
  lang: Lang;
  label?: string;
  variant?: "primary" | "ghost";
  align?: "left" | "right";
}) {
  const [open, setOpen] = useState(false);
  const bookBase = token ? `/book/${token}` : null;
  const hrefFor = (listKey?: string) =>
    bookBase ? (listKey ? `${bookBase}?list=${encodeURIComponent(listKey)}` : bookBase) : "/#lien-he";

  return (
    <span className="vjk-bkwrap">
      <button
        type="button"
        className={`vjk-cta${variant === "ghost" ? " vjk-cta-ghost" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
      >
        {label || tr(lang, UI.bookNow)}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <span
            onClick={() => setOpen(false)}
            style={{ position: "fixed", inset: 0, zIndex: 55 }}
            aria-hidden="true"
          />
          <div className={`vjk-bkmenu${align === "right" ? " right" : ""}`} role="menu">
            <div className="mh">{tr(lang, UI.bookChoose)}</div>
            {SERVICES.map((s) => (
              <a key={s.slug} href={hrefFor(s.bookingListKey)} role="menuitem" onClick={() => setOpen(false)}>
                {tr(lang, s.navLabel)}
              </a>
            ))}
            <a href={hrefFor()} role="menuitem" onClick={() => setOpen(false)}>{tr(lang, UI.bookOther)}</a>
          </div>
        </>
      )}
    </span>
  );
}

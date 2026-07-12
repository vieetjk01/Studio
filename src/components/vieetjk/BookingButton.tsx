"use client";

import { useRef, useState } from "react";
import { SERVICES, UI, tr, type Lang } from "@/lib/vieetjk/content";

/**
 * Nút "Đặt lịch" mở menu chọn 1 trong 3 dịch vụ (hoặc dịch vụ khác) rồi dẫn
 * THẲNG tới trang đặt lịch /book?list=<key>. Menu dùng position:fixed để không
 * bị section khác che (thoát mọi overflow/stacking context).
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
  const btnRef = useRef<HTMLButtonElement>(null);
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState<{ top: number; left?: number; right?: number }>({ top: 0 });

  const bookBase = token ? `/book/${token}` : null;
  const hrefFor = (listKey?: string) =>
    bookBase ? (listKey ? `${bookBase}?list=${encodeURIComponent(listKey)}` : bookBase) : "/#lien-he";

  function toggle() {
    if (open) return setOpen(false);
    const r = btnRef.current?.getBoundingClientRect();
    if (r) {
      setPos(
        align === "right"
          ? { top: r.bottom + 8, right: Math.max(12, window.innerWidth - r.right) }
          : { top: r.bottom + 8, left: Math.max(12, r.left) },
      );
    }
    setOpen(true);
  }

  return (
    <span className="vjk-bkwrap">
      <button
        ref={btnRef}
        type="button"
        className={`vjk-cta${variant === "ghost" ? " vjk-cta-ghost" : ""}`}
        aria-haspopup="true"
        aria-expanded={open}
        onClick={toggle}
      >
        {label || tr(lang, UI.bookNow)}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" aria-hidden="true" style={{ transform: open ? "rotate(180deg)" : "none", transition: "transform .18s" }}>
          <path d="m6 9 6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <span onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, zIndex: 190 }} aria-hidden="true" />
          <div
            className="vjk-bkmenu"
            role="menu"
            style={{ position: "fixed", top: pos.top, left: pos.left, right: pos.right, zIndex: 200 }}
          >
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

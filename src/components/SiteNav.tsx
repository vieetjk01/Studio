"use client";

import { useState } from "react";
import { Menu, X } from "lucide-react";

type NavItem = { id: string; label: string };

/**
 * Header responsive cho website studio (SiteRenderer).
 *  - Desktop: logo · thanh link 1 hàng (cuộn ngang nếu dài) · nút Đặt lịch.
 *  - Mobile: logo · nút ☰ mở menu thả xuống gọn gàng (nền đặc, dễ đọc).
 */
export default function SiteNav({
  items, bookingHref, logo, name, bottom = false, fontVar,
}: {
  items: NavItem[];
  bookingHref?: string | null;
  logo?: string | null;
  name: string;
  bottom?: boolean;
  fontVar?: string;
}) {
  const [open, setOpen] = useState(false);
  // Nhiều mục (menu dài) → thu vào nút "Menu" thả xuống ở MỌI kích thước cho gọn.
  const collapse = items.length > 5;

  const brand = logo ? (
    // eslint-disable-next-line @next/next/no-img-element
    <img src={logo} alt={name} style={{ height: 34, width: "auto" }} />
  ) : (
    <span style={{ fontFamily: fontVar, fontSize: 20, letterSpacing: 1 }}>{name}</span>
  );

  return (
    <header className={`s-hdr${bottom ? " s-hdr--bottom" : ""}`}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, minWidth: 0 }}>{brand}</div>

      {!collapse && (
        <nav className="s-nav-desktop">
          {items.map((n) => (
            <a key={n.id} href={`#sec-${n.id}`} className="s-navlink">{n.label}</a>
          ))}
        </nav>
      )}

      <div className="s-hdr-right">
        {bookingHref && <a href={bookingHref} className="s-cta">Đặt lịch</a>}
        {items.length > 0 && (
          <button type="button" className={`s-burger${collapse ? " s-burger--always" : ""}`} aria-label="Menu" aria-expanded={open} onClick={() => setOpen((o) => !o)}>
            {open ? <X size={19} /> : <Menu size={19} />}
            {collapse && <span>Menu</span>}
          </button>
        )}
      </div>

      {open && (
        <div className={`s-mobile-menu${bottom ? " s-mobile-menu--up" : ""}`}>
          {items.map((n) => (
            <a key={n.id} href={`#sec-${n.id}`} className="s-navlink" onClick={() => setOpen(false)}>{n.label}</a>
          ))}
          {bookingHref && <a href={bookingHref} className="s-cta" onClick={() => setOpen(false)}>Đặt lịch</a>}
        </div>
      )}
    </header>
  );
}

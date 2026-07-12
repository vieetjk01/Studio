"use client";

import { useState } from "react";
import Logo from "./Logo";
import { VJK_CSS } from "./styles";
import { BRAND, CONTACT } from "@/lib/vieetjk/content";

const NAV = [
  { href: "/", label: "Trang chủ", slug: "" },
  { href: "/cuoi", label: "Cưới & Đính hôn", slug: "cuoi" },
  { href: "/su-kien", label: "Sự kiện", slug: "su-kien" },
  { href: "/doanh-nghiep", label: "Doanh nghiệp", slug: "doanh-nghiep" },
  { href: "/#lien-he", label: "Liên hệ", slug: "lien-he" },
];

function IconFacebook() {
  return (
    <svg width="17" height="17" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M13.5 21v-8h2.7l.4-3.1h-3.1V7.9c0-.9.25-1.5 1.53-1.5H17V3.6c-.28-.04-1.25-.12-2.37-.12-2.35 0-3.96 1.43-3.96 4.07v2.27H8v3.1h2.67V21h2.83Z" />
    </svg>
  );
}
function IconTiktok() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
      <path d="M16.6 5.82A4.28 4.28 0 0 1 15.5 3h-3v13.1a2.42 2.42 0 1 1-2.42-2.42c.17 0 .34.02.5.06v-3.05a5.47 5.47 0 1 0 4.92 5.44V9.9a7.3 7.3 0 0 0 4.5 1.52V8.4a4.28 4.28 0 0 1-2.4-.75 4.29 4.29 0 0 1-.5-1.83Z" />
    </svg>
  );
}
function IconMail() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.7" aria-hidden="true">
      <rect x="3" y="5" width="18" height="14" rx="2" /><path d="m3 7 9 6 9-6" />
    </svg>
  );
}

export default function VieetjkChrome({
  children,
  bookingHref,
  logoUrl = null,
  active = "",
}: {
  children: React.ReactNode;
  bookingHref: string | null;
  logoUrl?: string | null;
  active?: string;
}) {
  const [open, setOpen] = useState(false);
  const book = bookingHref || CONTACT.phoneHref;

  return (
    <div className="vjk-root">
      <style dangerouslySetInnerHTML={{ __html: VJK_CSS }} />

      <header className="vjk-header">
        <div className="vjk-wrap vjk-headin">
          <a href="/" aria-label={BRAND.name}>
            <Logo src={logoUrl} />
          </a>
          <nav className="vjk-nav">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} className={active && active === n.slug ? "active" : undefined}>
                {n.label}
              </a>
            ))}
          </nav>
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <a href={book} className="vjk-cta head">Đặt lịch</a>
            <button className="vjk-burger" aria-label="Menu" aria-expanded={open} onClick={() => setOpen((v) => !v)}>
              <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
                {open ? <path d="M6 6l12 12M18 6L6 18" /> : <><path d="M3 6h18" /><path d="M3 12h18" /><path d="M3 18h18" /></>}
              </svg>
            </button>
          </div>
        </div>
        {open && (
          <div className="vjk-mobnav">
            {NAV.map((n) => (
              <a key={n.href} href={n.href} onClick={() => setOpen(false)}>{n.label}</a>
            ))}
            <a href={book} className="vjk-cta" onClick={() => setOpen(false)}>Đặt lịch ngay</a>
          </div>
        )}
      </header>

      <main>{children}</main>

      <footer className="vjk-footer" id="lien-he">
        <div className="vjk-wrap">
          <div className="vjk-foot-grid">
            <div>
              <a href="/" aria-label={BRAND.name}><Logo src={logoUrl} height={34} /></a>
              <p style={{ marginTop: 16, maxWidth: "34ch" }}>{BRAND.tagline}. {BRAND.heroSub}</p>
              <div className="vjk-foot-social">
                <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer" aria-label="Facebook"><IconFacebook /></a>
                <a href={CONTACT.tiktok} target="_blank" rel="noopener noreferrer" aria-label="TikTok"><IconTiktok /></a>
                <a href={`mailto:${CONTACT.email}`} aria-label="Email"><IconMail /></a>
              </div>
            </div>
            <div>
              <h4>Dịch vụ</h4>
              <a href="/cuoi">Cưới & Đính hôn</a>
              <a href="/su-kien">Sự kiện</a>
              <a href="/doanh-nghiep">Doanh nghiệp</a>
              <a href={book}>Đặt lịch</a>
            </div>
            <div>
              <h4>Liên hệ</h4>
              <a href={CONTACT.phoneHref}>{CONTACT.phone}</a>
              <a href={`mailto:${CONTACT.email}`}>{CONTACT.email}</a>
              <a href={CONTACT.facebook} target="_blank" rel="noopener noreferrer">facebook.com/vieetjk</a>
              <p>{CONTACT.address}</p>
            </div>
          </div>
          <div className="vjk-foot-bottom">
            <span>© {BRAND.name} — {BRAND.tagline}</span>
            <span>Được xây dựng với ♥ tại Quảng Ngãi</span>
          </div>
        </div>
      </footer>
    </div>
  );
}

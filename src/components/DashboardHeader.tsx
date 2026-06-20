"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X, ChevronDown } from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import NotificationBell from "@/components/NotificationBell";
import StudioSearch from "@/components/StudioSearch";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { appUrl, imgUrl, studioUrl } from "@/lib/hosts";
import { effectivePlan } from "@/lib/plans";
import type { Profile } from "@/lib/types";

interface NavLink {
  href: string;
  label: string;
  external?: boolean;
}
interface NavGroup {
  label: string;
  children: NavLink[];
}
const isGroup = (x: NavLink | NavGroup): x is NavGroup => "children" in x;

export default function DashboardHeader({
  profile,
  kind = "app",
}: {
  profile: Profile;
  kind?: "app" | "img" | "studio";
}) {
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();
  const [menuOpen, setMenuOpen] = useState(false);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Studio access: admins, accounts on an active Studio plan, or staff members.
  const hasStudio =
    profile.role === "admin" ||
    effectivePlan(profile.plan, profile.plan_expires_at) === "studio" ||
    !!profile.studio_owner_id;

  // Effective studio role of the logged-in user (for menu gating).
  const studioRole = profile.studio_owner_id
    ? profile.studio_role || "staff"
    : profile.role === "admin"
    ? "admin"
    : "owner";

  // Studio nav grouped into dropdowns to keep the bar tidy.
  const studioNav: (NavLink | NavGroup)[] = [
    { href: "/dashboard/studio", label: "Tổng quan" },
    { href: "/dashboard/studio/board", label: "Bảng" },
    {
      label: "Hợp đồng",
      children: [
        { href: "/dashboard/studio/contracts", label: "Hợp đồng" },
        { href: "/dashboard/studio/bookings", label: "Đặt lịch" },
        { href: "/dashboard/studio/clients", label: "Khách hàng" },
        { href: "/dashboard/studio/packages", label: "Thẻ buổi" },
        { href: "/dashboard/studio/pricing", label: "Bảng giá" },
        { href: "/dashboard/studio/templates", label: "Mẫu HĐ" },
      ],
    },
    {
      label: "Lịch",
      children: [
        { href: "/dashboard/studio/calendar", label: "Lịch chụp" },
        { href: "/dashboard/studio/team", label: "Lịch đội" },
      ],
    },
    {
      label: "Tài chính",
      children: [
        { href: "/dashboard/studio/payroll", label: "Bảng lương" },
        { href: "/dashboard/studio/reports", label: "Thu chi" },
      ],
    },
    {
      label: "Đội ngũ",
      children: [
        { href: "/dashboard/studio/crew", label: "Sổ thợ" },
        { href: "/dashboard/studio/ranking", label: "Xếp hạng" },
        { href: "/dashboard/studio/equipment", label: "Thiết bị" },
        { href: "/dashboard/studio/messages", label: "Mẫu tin" },
        ...(studioRole === "owner" || studioRole === "admin"
          ? [{ href: "/dashboard/studio/staff", label: "Nhân viên" }]
          : []),
      ],
    },
    { href: appUrl("/dashboard"), label: t("myAlbums"), external: true },
  ];

  // Role-based visibility: accountant → overview + finance only; staff → hide finance.
  const studioVisible = studioNav.filter((item) => {
    const label = item.label;
    if (studioRole === "accountant") return label === "Tổng quan" || label === "Tài chính";
    if (studioRole === "staff") return label !== "Tài chính";
    return true;
  });

  // Build the link set for this host. Cross-host links use absolute URLs.
  const links: NavLink[] =
    kind === "img"
      ? [
          { href: "/dashboard/compress", label: t("compressPhotos") },
          { href: appUrl("/dashboard/create"), label: t("newAlbum"), external: true },
          { href: appUrl("/dashboard/filter"), label: t("filterPhotos"), external: true },
        ]
      : [
          { href: "/dashboard", label: t("myAlbums") },
          { href: "/dashboard/create", label: t("newAlbum") },
          ...(profile.role === "admin" || profile.can_galleries
            ? [{ href: "/dashboard/galleries", label: t("galleries") }]
            : []),
          { href: "/dashboard/filter", label: t("filterPhotos") },
          { href: imgUrl("/dashboard/compress"), label: t("compressPhotos"), external: true },
          ...(hasStudio ? [{ href: studioUrl("/dashboard/studio"), label: "Studio", external: true }] : []),
          ...(profile.role !== "admin" ? [{ href: "/dashboard/upgrade", label: t("upgrade") }] : []),
          ...(profile.role === "admin"
            ? [
                { href: "/dashboard/admin", label: t("admin") },
                { href: "/dashboard/settings", label: t("settings") },
              ]
            : []),
        ];

  function renderLink(l: NavLink, onClick?: () => void) {
    const active = !l.external && pathname === l.href;
    const cls = `text-sm transition-colors ${active ? "text-accent" : "text-accent-muted hover:text-accent"}`;
    if (l.external) {
      return (
        <a key={l.href} href={l.href} onClick={onClick} className={cls}>
          {l.label}
        </a>
      );
    }
    return (
      <Link key={l.href} href={l.href} onClick={onClick} className={cls}>
        {l.label}
      </Link>
    );
  }

  function renderGroup(g: NavGroup) {
    const active = g.children.some((c) => pathname === c.href);
    return (
      <div key={g.label} className="group relative">
        <button className={`flex items-center gap-1 text-sm transition-colors ${active ? "text-accent" : "text-accent-muted hover:text-accent"}`}>
          {g.label}
          <ChevronDown size={13} />
        </button>
        <div className="invisible absolute left-0 top-full z-30 pt-2 opacity-0 transition-opacity group-hover:visible group-hover:opacity-100">
          <div className="grid min-w-[170px] gap-1 rounded-xl p-2" style={{ background: "var(--surface)", border: "1px solid var(--border)" }}>
            {g.children.map((c) => (
              <Link
                key={c.href}
                href={c.href}
                className={`rounded-lg px-3 py-1.5 text-sm transition-colors ${pathname === c.href ? "text-accent" : "text-accent-muted hover:bg-[var(--surface2)] hover:text-accent"}`}
              >
                {c.label}
              </Link>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/80 px-6 py-4 backdrop-blur md:px-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Brand href={kind === "img" ? "/" : kind === "studio" ? "/dashboard/studio" : "/dashboard"} />
          <nav className="hidden items-center gap-x-5 gap-y-1.5 md:flex md:flex-wrap">
            {kind === "studio"
              ? studioVisible.map((item) => (isGroup(item) ? renderGroup(item) : renderLink(item)))
              : links.map((l) => renderLink(l))}
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
          {kind === "studio" && (
            <div className="hidden sm:block">
              <StudioSearch />
            </div>
          )}
          {kind === "studio" && <NotificationBell />}
          <span className="hidden text-xs text-accent-muted sm:inline">
            {profile.full_name || profile.email}
            {profile.role === "admin" && (
              <span className="ml-2 rounded bg-accent-gold/20 px-1.5 py-0.5 text-[10px] uppercase text-accent-gold">
                admin
              </span>
            )}
          </span>
          <LanguageSwitcher />
          <button onClick={signOut} className="btn-ghost px-3 py-1.5 text-xs">
            {t("logout")}
          </button>
          {/* Mobile menu toggle */}
          <button
            onClick={() => setMenuOpen((o) => !o)}
            className="btn-ghost p-1.5 md:hidden"
            aria-label="Menu"
          >
            {menuOpen ? <X size={18} /> : <Menu size={18} />}
          </button>
        </div>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <nav className="mt-3 grid gap-1 border-t border-ink-800 pt-3 md:hidden">
          {kind === "studio"
            ? studioVisible.map((item) =>
                isGroup(item) ? (
                  <div key={item.label} className="py-1.5">
                    <p className="mb-1 text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>{item.label}</p>
                    <div className="grid gap-1.5 pl-3">
                      {item.children.map((c) => renderLink(c, () => setMenuOpen(false)))}
                    </div>
                  </div>
                ) : (
                  <div key={item.href} className="py-1.5">{renderLink(item, () => setMenuOpen(false))}</div>
                )
              )
            : links.map((l) => (
                <div key={l.href} className="py-1.5">
                  {renderLink(l, () => setMenuOpen(false))}
                </div>
              ))}
        </nav>
      )}
    </header>
  );
}

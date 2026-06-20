"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { Menu, X } from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
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

  // Studio access: admins + accounts on an active Studio plan.
  const hasStudio =
    profile.role === "admin" ||
    effectivePlan(profile.plan, profile.plan_expires_at) === "studio";

  // Build the link set for this host. Cross-host links use absolute URLs.
  const links: NavLink[] =
    kind === "studio"
      ? [
          { href: "/dashboard/studio", label: "Tổng quan" },
          { href: "/dashboard/studio/board", label: "Bảng" },
          { href: "/dashboard/studio/contracts", label: "Hợp đồng" },
          { href: "/dashboard/studio/clients", label: "Khách hàng" },
          { href: "/dashboard/studio/templates", label: "Mẫu HĐ" },
          { href: "/dashboard/studio/calendar", label: "Lịch" },
          { href: "/dashboard/studio/team", label: "Lịch đội" },
          { href: "/dashboard/studio/payroll", label: "Bảng lương" },
          { href: "/dashboard/studio/reports", label: "Thu chi" },
          { href: "/dashboard/studio/crew", label: "Sổ thợ" },
          { href: appUrl("/dashboard"), label: t("myAlbums"), external: true },
        ]
      : kind === "img"
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

  return (
    <header className="sticky top-0 z-20 border-b border-ink-800 bg-ink-950/80 px-6 py-4 backdrop-blur md:px-10">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-8">
          <Brand href={kind === "img" ? "/" : kind === "studio" ? "/dashboard/studio" : "/dashboard"} />
          <nav className="hidden items-center gap-6 md:flex">
            {links.map((l) => renderLink(l))}
          </nav>
        </div>
        <div className="flex items-center gap-3 md:gap-4">
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
          {links.map((l) => (
            <div key={l.href} className="py-1.5">
              {renderLink(l, () => setMenuOpen(false))}
            </div>
          ))}
        </nav>
      )}
    </header>
  );
}

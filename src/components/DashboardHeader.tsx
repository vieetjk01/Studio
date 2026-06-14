"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import type { Profile } from "@/lib/types";

export default function DashboardHeader({ profile }: { profile: Profile }) {
  const { t } = useLang();
  const router = useRouter();
  const pathname = usePathname();

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  const link = (href: string, label: string) => (
    <Link
      href={href}
      className={`text-sm transition-colors ${
        pathname === href ? "text-accent" : "text-accent-muted hover:text-accent"
      }`}
    >
      {label}
    </Link>
  );

  return (
    <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-800 bg-ink-950/80 px-6 py-4 backdrop-blur md:px-10">
      <div className="flex items-center gap-8">
        <Brand href="/dashboard" />
        <nav className="hidden items-center gap-6 md:flex">
          {link("/dashboard", t("myAlbums"))}
          {link("/dashboard/create", t("newAlbum"))}
          {profile.role !== "admin" && link("/dashboard/upgrade", t("upgrade"))}
          {profile.role === "admin" && link("/dashboard/admin", t("admin"))}
          {profile.role === "admin" && link("/dashboard/settings", t("settings"))}
        </nav>
      </div>
      <div className="flex items-center gap-4">
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
      </div>
    </header>
  );
}

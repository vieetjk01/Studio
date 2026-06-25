"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  LayoutDashboard, CalendarDays, Clock, Users, Wallet, FileText, FileEdit,
  Package, Film, UserCog, Star, MessageSquare, Wrench, Image as ImageIcon,
  Plus, Receipt, ClipboardList, Sun, Moon, LogOut, Kanban, CalendarRange,
  Menu, X as XIcon, ShieldCheck, Settings, SlidersHorizontal, Archive, Globe,
} from "lucide-react";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { appUrl, imgUrl } from "@/lib/hosts";
import NotificationBell from "@/components/NotificationBell";
import StudioSearch from "@/components/StudioSearch";
import StudioFooterNav from "@/components/StudioFooterNav";
import InstallPwaButton from "@/components/InstallPwaButton";
import { createClient } from "@/lib/supabase/client";
import { useTheme } from "@/lib/theme";
import type { Profile } from "@/lib/types";

type StudioTier = "none" | "booking" | "full";
const TIER_RANK: Record<StudioTier, number> = { none: 0, booking: 1, full: 2 };

type Item = {
  href: string;
  label: string;
  icon: typeof LayoutDashboard;
  minTier: StudioTier;
  roles?: string[] | null;
  external?: boolean; // opens in new tab / uses <a> instead of Link
};
type Group = { label: string; items: Item[] };

// Grouped navigation mirroring the mstudo-app mockup, mapped onto the real
// studio routes. Booking-tier (Photographer) accounts only see booking items.
const GROUPS: Group[] = [
  {
    label: "Tổng quan",
    items: [{ href: "/dashboard/studio", label: "Tổng quan", icon: LayoutDashboard, minTier: "booking" }],
  },
  {
    label: "Lịch & Đặt chỗ",
    items: [
      { href: "/dashboard/studio/bookings", label: "Đặt lịch KH", icon: Clock, minTier: "booking" },
      { href: "/dashboard/studio/calendar", label: "Lịch chụp", icon: CalendarDays, minTier: "booking" },
      { href: "/dashboard/studio/team", label: "Lịch đội", icon: CalendarRange, minTier: "full" },
    ],
  },
  {
    label: "Bán hàng",
    items: [
      { href: "/dashboard/studio/pricing", label: "Bảng giá", icon: Package, minTier: "booking" },
      { href: "/dashboard/studio/quotes", label: "Báo giá", icon: FileEdit, minTier: "full" },
      { href: "/dashboard/studio/contracts/new", label: "Tạo hợp đồng", icon: Plus, minTier: "full" },
      { href: "/dashboard/studio/contracts", label: "Quản lý HĐ", icon: FileText, minTier: "full" },
      { href: "/dashboard/studio/templates", label: "Mẫu HĐ", icon: ClipboardList, minTier: "full" },
      { href: "/dashboard/studio/production", label: "Xử lý hình ảnh", icon: Film, minTier: "full" },
    ],
  },
  {
    label: "Khách hàng",
    items: [
      { href: "/dashboard/studio/clients", label: "Khách hàng", icon: Users, minTier: "booking" },
      { href: "/dashboard/galleries", label: "Gallery khách", icon: ImageIcon, minTier: "booking" },
      { href: "/dashboard/studio/board", label: "Bảng", icon: Kanban, minTier: "full" },
    ],
  },
  {
    label: "Tài chính",
    items: [
      { href: "/dashboard/studio/reports", label: "Thu chi", icon: Wallet, minTier: "full", roles: ["owner", "admin", "manager", "accountant"] },
      { href: "/dashboard/studio/payroll", label: "Bảng lương", icon: Receipt, minTier: "full", roles: ["owner", "admin", "manager", "accountant"] },
      { href: "/dashboard/studio/equipment", label: "Thiết bị", icon: Wrench, minTier: "full" },
    ],
  },
  {
    label: "Nhân sự",
    items: [
      { href: "/dashboard/studio/crew", label: "Sổ thợ", icon: UserCog, minTier: "full" },
      { href: "/dashboard/studio/staff", label: "Nhân viên", icon: Users, minTier: "full", roles: ["owner", "admin", "manager"] },
      { href: "/dashboard/studio/ranking", label: "Xếp hạng", icon: Star, minTier: "full" },
      { href: "/dashboard/studio/messages", label: "Mẫu tin", icon: MessageSquare, minTier: "full" },
    ],
  },
  {
    label: "Công cụ",
    items: [
      { href: appUrl("/dashboard"), label: "Thư viện album", icon: ImageIcon, minTier: "booking", external: true },
      { href: appUrl("/dashboard/create"), label: "Tạo album", icon: Plus, minTier: "booking", external: true },
      { href: appUrl("/dashboard/filter"), label: "Lọc ảnh", icon: SlidersHorizontal, minTier: "booking", external: true },
      { href: imgUrl("/dashboard/compress"), label: "Nén ảnh", icon: Archive, minTier: "booking", external: true },
      { href: "/dashboard/site", label: "Website riêng", icon: Globe, minTier: "booking" },
    ],
  },
];

// Page titles + subtitles keyed by route prefix (longest match wins).
const TITLES: [string, string, string][] = [
  ["/dashboard/studio/bookings", "Đặt lịch khách hàng", "Yêu cầu đặt lịch khách gửi"],
  ["/dashboard/studio/calendar", "Lịch chụp", "Lịch chụp theo tuần"],
  ["/dashboard/studio/team", "Lịch đội", "Lịch làm việc của đội ngũ"],
  ["/dashboard/studio/pricing", "Bảng giá", "Bảng giá dịch vụ"],
  ["/dashboard/studio/quotes", "Báo giá", "Danh sách báo giá"],
  ["/dashboard/studio/contracts/new", "Tạo hợp đồng", "Thông tin hợp đồng"],
  ["/dashboard/studio/contracts", "Quản lý hợp đồng", "Danh sách hợp đồng"],
  ["/dashboard/studio/templates", "Mẫu hợp đồng", "Mẫu hợp đồng & điều khoản"],
  ["/dashboard/studio/production", "Xử lý hình ảnh", "Tiến độ sản xuất"],
  ["/dashboard/studio/clients", "Khách hàng", "Danh bạ khách hàng"],
  ["/dashboard/galleries", "Gallery khách", "Album bàn giao khách hàng"],
  ["/dashboard/studio/board", "Bảng công việc", "Theo dõi công việc"],
  ["/dashboard/studio/reports", "Thu chi", "Báo cáo tài chính"],
  ["/dashboard/studio/payroll", "Bảng lương", "Bảng lương nhân viên"],
  ["/dashboard/studio/equipment", "Thiết bị", "Quản lý thiết bị"],
  ["/dashboard/studio/crew", "Sổ thợ", "Đội ngũ nhiếp ảnh"],
  ["/dashboard/studio/staff", "Nhân viên", "Danh sách nhân viên"],
  ["/dashboard/studio/ranking", "Xếp hạng", "Xếp hạng đội ngũ"],
  ["/dashboard/studio/messages", "Mẫu tin", "Mẫu tin nhắn"],
  ["/dashboard/studio", "Tổng quan", "Tổng quan hoạt động studio"],
  ["/dashboard/site", "Website riêng", "Trang web portfolio cá nhân"],
  ["/dashboard/upgrade", "Nâng cấp gói", "Gói dịch vụ & bảng giá"],
  ["/dashboard/settings", "Cài đặt", "Cài đặt hệ thống"],
];

export default function StudioShell({
  profile,
  tier,
  role,
  children,
}: {
  profile: Profile;
  tier: StudioTier;
  role: string;
  children: React.ReactNode;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const { theme, toggle: toggleTheme } = useTheme();
  const [drawerOpen, setDrawerOpen] = useState(false);

  // Close drawer on route change
  useEffect(() => { setDrawerOpen(false); }, [pathname]);

  async function signOut() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  // Filter nav by tier + studio role (matches DashboardHeader/footer rules).
  const visibleGroups = GROUPS.map((g) => ({
    ...g,
    items: g.items.filter((it) => {
      if (TIER_RANK[tier] < TIER_RANK[it.minTier]) return false;
      if (role === "accountant") return it.href === "/dashboard/studio" || it.href.startsWith("/dashboard/studio/reports") || it.href.startsWith("/dashboard/studio/payroll");
      if (it.roles && !it.roles.includes(role)) return false;
      if (role === "staff" && (it.href.includes("/reports") || it.href.includes("/payroll"))) return false;
      return true;
    }),
  })).filter((g) => g.items.length > 0);

  const isActive = (href: string) =>
    href === "/dashboard/studio" ? pathname === href : pathname === href || pathname.startsWith(href + "/");

  const [title, sub] =
    TITLES.find(([p]) => pathname === p || pathname.startsWith(p + "/") || pathname.startsWith(p))?.slice(1) ??
    ["Studio", ""];

  const initials = (profile.full_name || profile.email || "?")
    .split(/\s+/).map((w) => w[0]).slice(0, 2).join("").toUpperCase();

  return (
    <div className="studio-shell" data-theme={theme} style={{ background: "var(--bg)", color: "var(--text)" }}>
      <div className="min-h-screen lg:grid lg:grid-cols-[240px_1fr]">

        {/* ── Mobile drawer overlay ──────────────────────────────── */}
        {drawerOpen && (
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            onClick={() => setDrawerOpen(false)}
          />
        )}

        {/* ── Mobile slide-in drawer ─────────────────────────────── */}
        <div
          className="fixed inset-y-0 left-0 z-50 flex w-72 flex-col overflow-y-auto px-3 pb-8 pt-4 transition-transform duration-300 lg:hidden"
          style={{
            background: "var(--surface)",
            borderRight: "1px solid var(--border)",
            transform: drawerOpen ? "translateX(0)" : "translateX(-100%)",
          }}
        >
          {/* Drawer header */}
          <div className="mb-4 flex items-center gap-2.5 px-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme === "dark" ? "/logo-wordmark-dark.svg" : "/logo-wordmark.svg"} alt="mstudo" className="h-8 w-auto" />
            <span
              className="rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={{ color: "var(--brand)", background: "var(--brandSoft)" }}
            >
              {tier === "full" ? "STUDIO" : "PRO"}
            </span>
            <button
              onClick={() => setDrawerOpen(false)}
              className="ml-auto flex h-8 w-8 items-center justify-center rounded-lg"
              style={{ background: "var(--surface2)", color: "var(--text2)" }}
            >
              <XIcon size={16} />
            </button>
          </div>

          {/* User info strip */}
          <div
            className="mb-4 flex items-center gap-3 rounded-xl px-3 py-3"
            style={{ background: "var(--surface2)" }}
          >
            <span
              className="flex h-9 w-9 flex-none items-center justify-center rounded-full text-sm font-bold"
              style={{ background: "var(--brandSoft)", color: "var(--brand)" }}
            >
              {initials}
            </span>
            <div className="min-w-0">
              <p className="truncate text-sm font-semibold">{profile.full_name || profile.email}</p>
              <p className="truncate text-[11px]" style={{ color: "var(--text3)" }}>{profile.email}</p>
            </div>
          </div>

          {/* Nav groups */}
          {visibleGroups.map((g) => (
            <div key={g.label} className="mt-2">
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                {g.label}
              </p>
              {g.items.map((it) => {
                const active = isActive(it.href);
                const cls = "mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors";
                const style = { color: active ? "var(--brand)" : "var(--text)", background: active ? "var(--brandSoft)" : "transparent" };
                return it.external ? (
                  <a key={it.href} href={it.href} className={cls} style={style}>
                    <it.icon size={18} style={{ flex: "none" }} />
                    {it.label}
                  </a>
                ) : (
                  <Link key={it.href} href={it.href} className={cls} style={style}>
                    <it.icon size={18} style={{ flex: "none" }} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {role === "admin" && (
            <div className="mt-2">
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                Hệ thống
              </p>
              {[
                { href: "/dashboard/admin", label: "Quản trị", icon: ShieldCheck },
                { href: "/dashboard/settings", label: "Cài đặt", icon: Settings },
              ].map((it) => {
                const active = isActive(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="mb-0.5 flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
                    style={{
                      color: active ? "var(--brand)" : "var(--text)",
                      background: active ? "var(--brandSoft)" : "transparent",
                    }}
                  >
                    <it.icon size={18} style={{ flex: "none" }} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          )}

          {/* Drawer footer actions */}
          <div className="mt-auto pt-6 flex flex-col gap-2">
            <InstallPwaButton />
            <button
              onClick={toggleTheme}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "var(--surface2)", color: "var(--text2)" }}
            >
              {theme === "dark" ? <Sun size={18} /> : <Moon size={18} />}
              {theme === "dark" ? "Giao diện sáng" : "Giao diện tối"}
            </button>
            <button
              onClick={signOut}
              className="flex items-center gap-3 rounded-xl px-3 py-2.5 text-sm font-semibold transition-colors"
              style={{ background: "rgba(224,116,111,.1)", color: "#e0746f" }}
            >
              <LogOut size={18} />
              Đăng xuất
            </button>
          </div>
        </div>

        {/* ── Sidebar (desktop) ─────────────────────────────────── */}
        <aside
          className="sticky top-0 hidden h-screen flex-col gap-1 overflow-y-auto px-3 pb-24 pt-4 lg:flex"
          style={{ background: "var(--surface)", borderRight: "1px solid var(--border)" }}
        >
          <Link href="/dashboard/studio" className="mb-3 flex items-center gap-2.5 px-2 py-1">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={theme === "dark" ? "/logo-wordmark-dark.svg" : "/logo-wordmark.svg"} alt="mstudo" className="h-8 w-auto" />
            <span
              className="ml-auto rounded-md px-1.5 py-0.5 text-[10px] font-bold"
              style={{ color: "var(--brand)", background: "var(--brandSoft)" }}
            >
              {tier === "full" ? "STUDIO" : "PRO"}
            </span>
          </Link>

          {visibleGroups.map((g) => (
            <div key={g.label} className="mt-2.5">
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                {g.label}
              </p>
              {g.items.map((it) => {
                const active = isActive(it.href);
                const cls = "mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors";
                const style = { color: active ? "var(--brand)" : "var(--text)", background: active ? "var(--brandSoft)" : "transparent" };
                return it.external ? (
                  <a key={it.href} href={it.href} className={cls} style={style}>
                    <it.icon size={18} style={{ flex: "none" }} />
                    {it.label}
                  </a>
                ) : (
                  <Link key={it.href} href={it.href} className={cls} style={style}>
                    <it.icon size={18} style={{ flex: "none" }} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          ))}

          {role === "admin" && (
            <div className="mt-2.5">
              <p className="px-2.5 pb-1.5 pt-1 text-[11px] font-bold uppercase tracking-wider" style={{ color: "var(--text3)" }}>
                Hệ thống
              </p>
              {[
                { href: "/dashboard/admin", label: "Quản trị", icon: ShieldCheck },
                { href: "/dashboard/settings", label: "Cài đặt", icon: Settings },
              ].map((it) => {
                const active = isActive(it.href);
                return (
                  <Link
                    key={it.href}
                    href={it.href}
                    className="mb-0.5 flex items-center gap-2.5 rounded-lg px-2.5 py-2 text-sm font-semibold transition-colors"
                    style={{
                      color: active ? "var(--brand)" : "var(--text)",
                      background: active ? "var(--brandSoft)" : "transparent",
                    }}
                  >
                    <it.icon size={18} style={{ flex: "none" }} />
                    {it.label}
                  </Link>
                );
              })}
            </div>
          )}
          {/* Sidebar install button */}
          <div className="mt-auto pt-4">
            <InstallPwaButton />
          </div>
        </aside>

        {/* ── Main column ───────────────────────────────────────── */}
        <div className="flex min-w-0 flex-col">
          {/* Topbar */}
          <header
            className="sticky top-0 z-30 flex items-center gap-3 px-4 py-3 backdrop-blur sm:px-5"
            style={{ background: "color-mix(in srgb, var(--surface) 88%, transparent)", borderBottom: "1px solid var(--border)" }}
          >
            {/* Mobile: hamburger */}
            <button
              onClick={() => setDrawerOpen(true)}
              className="flex h-9 w-9 flex-none items-center justify-center rounded-lg lg:hidden"
              style={{ background: "var(--surface2)", color: "var(--text)" }}
              aria-label="Mở menu"
            >
              <Menu size={18} />
            </button>

            <div className="min-w-0 flex-1">
              <h1 className="truncate text-[17px] font-extrabold tracking-tight sm:text-[18px]">{title}</h1>
              {sub ? <p className="hidden truncate text-[12px] sm:block" style={{ color: "var(--text3)" }}>{sub}</p> : null}
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2">
              {/* Search: tablet+ */}
              <div className="hidden sm:block">
                <StudioSearch />
              </div>
              <NotificationBell />
              {/* Language + theme: desktop only (in drawer on mobile) */}
              <div className="hidden lg:flex lg:items-center lg:gap-1.5">
                <LanguageSwitcher />
                <button
                  onClick={toggleTheme}
                  aria-label="theme"
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
                >
                  {theme === "dark" ? <Sun size={16} /> : <Moon size={16} />}
                </button>
                <span
                  className="flex h-9 w-9 items-center justify-center rounded-full text-xs font-bold"
                  style={{ background: "var(--brandSoft)", color: "var(--brand)" }}
                  title={profile.full_name || profile.email || ""}
                >
                  {initials}
                </span>
                <button
                  onClick={signOut}
                  aria-label="Đăng xuất"
                  className="flex h-9 w-9 items-center justify-center rounded-lg"
                  style={{ border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)" }}
                >
                  <LogOut size={16} />
                </button>
              </div>
            </div>
          </header>

          {/* Page content */}
          <main className="px-4 pb-28 pt-5 sm:px-6 lg:pb-10">{children}</main>
        </div>
      </div>

      {/* Mobile bottom nav (sidebar is hidden below lg) */}
      <div className="lg:hidden">
        <StudioFooterNav tier={tier} role={role} />
      </div>
    </div>
  );
}

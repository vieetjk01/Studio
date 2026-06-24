"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, CalendarDays, Clock, Users, Wallet,
  UserCog, Star, Package, Wrench, Film, FileEdit, ClipboardList,
  ImageIcon, Kanban, CalendarRange, MessageSquare, MoreHorizontal, X,
} from "lucide-react";

type StudioTier = "none" | "booking" | "full";

interface Props {
  tier: StudioTier;
  role: string;
}

const ALL_ITEMS = [
  { href: "/dashboard/studio", icon: LayoutDashboard, label: "Tổng quan", minTier: "booking" as StudioTier, roles: null, primary: true },
  { href: "/dashboard/studio/bookings", icon: Clock, label: "Đặt lịch", minTier: "booking" as StudioTier, roles: null, primary: true },
  { href: "/dashboard/studio/calendar", icon: CalendarDays, label: "Lịch chụp", minTier: "booking" as StudioTier, roles: null, primary: true },
  { href: "/dashboard/studio/contracts", icon: FileText, label: "Hợp đồng", minTier: "full" as StudioTier, roles: null, primary: true },
  { href: "/dashboard/studio/clients", icon: Users, label: "Khách hàng", minTier: "booking" as StudioTier, roles: null, primary: true },
  { href: "/dashboard/studio/quotes", icon: FileEdit, label: "Báo giá", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/pricing", icon: Package, label: "Bảng giá", minTier: "booking" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/reports", icon: Wallet, label: "Thu chi", minTier: "full" as StudioTier, roles: ["owner", "admin", "manager", "accountant"], primary: false },
  { href: "/dashboard/studio/payroll", icon: Wallet, label: "Bảng lương", minTier: "full" as StudioTier, roles: ["owner", "admin", "manager", "accountant"], primary: false },
  { href: "/dashboard/studio/team", icon: CalendarRange, label: "Lịch đội", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/board", icon: Kanban, label: "Bảng", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/staff", icon: UserCog, label: "Nhân viên", minTier: "full" as StudioTier, roles: ["owner", "admin", "manager"], primary: false },
  { href: "/dashboard/studio/production", icon: Film, label: "Sản xuất", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/templates", icon: ClipboardList, label: "Mẫu HĐ", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/galleries", icon: ImageIcon, label: "Gallery", minTier: "booking" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/crew", icon: UserCog, label: "Sổ thợ", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/ranking", icon: Star, label: "Xếp hạng", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/messages", icon: MessageSquare, label: "Mẫu tin", minTier: "full" as StudioTier, roles: null, primary: false },
  { href: "/dashboard/studio/equipment", icon: Wrench, label: "Thiết bị", minTier: "full" as StudioTier, roles: null, primary: false },
];

const TIER_RANK: Record<StudioTier, number> = { none: 0, booking: 1, full: 2 };

export default function StudioFooterNav({ tier, role }: Props) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  const [sheetOpen, setSheetOpen] = useState(false);
  useEffect(() => { setPending(null); setSheetOpen(false); }, [pathname]);

  const allVisible = role === "accountant"
    ? ALL_ITEMS.filter((i) => i.href === "/dashboard/studio" || i.href === "/dashboard/studio/reports")
    : ALL_ITEMS.filter((i) => {
        if (TIER_RANK[tier] < TIER_RANK[i.minTier]) return false;
        if (i.roles && !i.roles.includes(role)) return false;
        return true;
      });

  // First 4 primary items + "More" as 5th slot
  const primary = allVisible.filter((i) => i.primary).slice(0, 4);
  const overflow = allVisible.filter((i) => !i.primary || !primary.includes(i));
  const isOverflowActive = overflow.some((i) =>
    i.href !== "/dashboard/studio" && (pathname === i.href || pathname.startsWith(i.href + "/"))
  );

  function isActive(href: string) {
    const onPath = pathname === href || (href !== "/dashboard/studio" && pathname.startsWith(href + "/"));
    return pending ? pending === href : onPath;
  }

  return (
    <>
      {/* Bottom sheet overlay */}
      {sheetOpen && (
        <div
          className="fixed inset-0 z-50 bg-black/50"
          onClick={() => setSheetOpen(false)}
        />
      )}

      {/* Bottom sheet panel */}
      <div
        className="fixed bottom-0 left-0 right-0 z-50 rounded-t-2xl transition-transform duration-300"
        style={{
          background: "var(--surface)",
          borderTop: "1px solid var(--border)",
          transform: sheetOpen ? "translateY(0)" : "translateY(100%)",
        }}
      >
        <div className="mx-auto mt-2 h-1 w-10 rounded-full" style={{ background: "var(--border2, var(--border))" }} />
        <div className="flex items-center justify-between px-5 pb-2 pt-3">
          <span className="text-sm font-bold">Tất cả chức năng</span>
          <button
            onClick={() => setSheetOpen(false)}
            className="flex h-8 w-8 items-center justify-center rounded-full"
            style={{ background: "var(--surface2)", color: "var(--text2)" }}
          >
            <X size={16} />
          </button>
        </div>
        <div className="grid grid-cols-4 gap-1 px-3 pb-8 pt-1">
          {allVisible.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => { setPending(item.href); setSheetOpen(false); }}
                className="flex flex-col items-center gap-1.5 rounded-xl px-2 py-3 text-center transition-colors"
                style={{
                  color: active ? "var(--gold)" : "var(--text2)",
                  background: active ? "var(--brandSoft, rgba(63,185,138,.14))" : "transparent",
                }}
              >
                <item.icon size={22} />
                <span className="text-[11px] font-medium leading-tight">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Fixed bottom nav bar */}
      <nav
        className="fixed bottom-0 left-0 right-0 z-40 border-t"
        style={{ background: "var(--surface)", borderColor: "var(--border)" }}
      >
        <div className="flex">
          {primary.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setPending(item.href)}
                className="flex flex-1 flex-col items-center gap-1 px-1 pb-3 pt-2.5 text-center transition-colors"
                style={{ color: active ? "var(--gold)" : "var(--text3)" }}
              >
                {/* Active indicator */}
                <span
                  className="mb-0.5 h-0.5 w-6 rounded-full transition-all"
                  style={{ background: active ? "var(--gold)" : "transparent" }}
                />
                <item.icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            );
          })}

          {/* More button */}
          {overflow.length > 0 && (
            <button
              onClick={() => setSheetOpen((o) => !o)}
              className="flex flex-1 flex-col items-center gap-1 px-1 pb-3 pt-2.5 text-center transition-colors"
              style={{ color: isOverflowActive || sheetOpen ? "var(--gold)" : "var(--text3)" }}
            >
              <span
                className="mb-0.5 h-0.5 w-6 rounded-full transition-all"
                style={{ background: isOverflowActive || sheetOpen ? "var(--gold)" : "transparent" }}
              />
              <MoreHorizontal size={22} strokeWidth={1.8} />
              <span className="text-[10px] font-semibold leading-none">Thêm</span>
            </button>
          )}
        </div>

        {/* Safe area spacer for iOS */}
        <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
      </nav>
    </>
  );
}

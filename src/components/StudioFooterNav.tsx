"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, CalendarDays, Clock, Users, Wallet,
  UserCog, MessageSquare, Star, Package, Wrench, Film, FileEdit,
} from "lucide-react";

type StudioTier = "none" | "booking" | "full";

interface Props {
  tier: StudioTier;
  role: string;
}

const ALL_ITEMS = [
  { href: "/dashboard/studio", icon: LayoutDashboard, label: "Tổng quan", minTier: "booking" as StudioTier, roles: null },
  { href: "/dashboard/studio/contracts", icon: FileText, label: "Hợp đồng", minTier: "full" as StudioTier, roles: null },
  { href: "/dashboard/studio/quotes", icon: FileEdit, label: "Báo giá", minTier: "full" as StudioTier, roles: null },
  { href: "/dashboard/studio/bookings", icon: Clock, label: "Đặt lịch", minTier: "booking" as StudioTier, roles: null },
  { href: "/dashboard/studio/calendar", icon: CalendarDays, label: "Lịch chụp", minTier: "booking" as StudioTier, roles: null },
  { href: "/dashboard/studio/pricing", icon: Package, label: "Bảng giá", minTier: "booking" as StudioTier, roles: null },
  { href: "/dashboard/studio/clients", icon: Users, label: "Khách hàng", minTier: "booking" as StudioTier, roles: null },
  { href: "/dashboard/studio/reports", icon: Wallet, label: "Tài chính", minTier: "full" as StudioTier, roles: ["owner", "admin", "manager", "accountant"] },
  { href: "/dashboard/studio/staff", icon: UserCog, label: "Nhân viên", minTier: "full" as StudioTier, roles: ["owner", "admin", "manager"] },
  { href: "/dashboard/studio/templates", icon: MessageSquare, label: "Mẫu tin", minTier: "full" as StudioTier, roles: null },
  { href: "/dashboard/studio/production", icon: Film, label: "Sản xuất", minTier: "full" as StudioTier, roles: null },
  { href: "/dashboard/studio/equipment", icon: Wrench, label: "Thiết bị", minTier: "full" as StudioTier, roles: null },
  { href: "/dashboard/studio/ranking", icon: Star, label: "Xếp hạng", minTier: "full" as StudioTier, roles: null },
];

const TIER_RANK: Record<StudioTier, number> = { none: 0, booking: 1, full: 2 };

export default function StudioFooterNav({ tier, role }: Props) {
  const pathname = usePathname();
  // Optimistic highlight: light up the tapped item instantly, before the
  // server round-trip finishes, so the footer feels responsive on slow nav.
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => setPending(null), [pathname]);

  // accountant sees only Tổng quan + Tài chính
  const items = role === "accountant"
    ? ALL_ITEMS.filter((i) => i.href === "/dashboard/studio" || i.href === "/dashboard/studio/reports")
    : ALL_ITEMS.filter((i) => {
        if (TIER_RANK[tier] < TIER_RANK[i.minTier]) return false;
        if (i.roles && !i.roles.includes(role)) return false;
        return true;
      });

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      <div className="flex overflow-x-auto scrollbar-none">
        {items.map((item) => {
          const onPath = pathname === item.href || (item.href !== "/dashboard/studio" && pathname.startsWith(item.href));
          const active = pending ? pending === item.href : onPath;
          return (
            <Link
              key={item.href}
              href={item.href}
              onClick={() => setPending(item.href)}
              className="flex min-w-[4.5rem] flex-col items-center gap-0.5 px-3 py-2.5 text-center transition-colors"
              style={{ color: active ? "var(--gold)" : "var(--text3)" }}
            >
              <item.icon size={20} />
              <span className="text-[10px] leading-tight">{item.label}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

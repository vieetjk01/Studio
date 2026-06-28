"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import {
  LayoutDashboard, FileText, CalendarDays, FileEdit,
  Film, ImageIcon, Users, Clock, UserCog,
} from "lucide-react";

interface Props {
  tier: string;
  role: string;
}

const NAV_ITEMS = [
  { href: "/dashboard/studio",             icon: LayoutDashboard, label: "Tổng quan" },
  { href: "/dashboard/studio/contracts",   icon: FileText,        label: "Hợp đồng" },
  { href: "/dashboard/studio/calendar",    icon: CalendarDays,    label: "Lịch chụp" },
  { href: "/dashboard/studio/quotes",      icon: FileEdit,        label: "Báo giá"   },
  { href: "/dashboard/studio/production",  icon: Film,            label: "Sản xuất"  },
  { href: "/dashboard/albums",             icon: ImageIcon,       label: "Album"     },
  { href: "/dashboard/studio/clients",     icon: Users,           label: "Khách hàng"},
  { href: "/dashboard/studio/bookings",    icon: Clock,           label: "Đặt lịch"  },
  { href: "/dashboard/studio/crew",        icon: UserCog,         label: "Sổ thợ"    },
];

export default function StudioFooterNav({ tier: _tier, role: _role }: Props) {
  const pathname = usePathname();
  const [pending, setPending] = useState<string | null>(null);
  useEffect(() => { setPending(null); }, [pathname]);

  function isActive(href: string) {
    const onPath = pathname === href || (href !== "/dashboard/studio" && pathname.startsWith(href + "/"));
    return pending ? pending === href : onPath;
  }

  return (
    <nav
      className="fixed bottom-0 left-0 right-0 z-40 border-t"
      style={{ background: "var(--surface)", borderColor: "var(--border)" }}
    >
      {/* Scrollable strip — centered on lg+ */}
      <div className="flex justify-center">
        <div
          className="flex w-full lg:w-auto overflow-x-auto"
          style={{ scrollbarWidth: "none", WebkitOverflowScrolling: "touch" } as React.CSSProperties}
        >
          {NAV_ITEMS.map((item) => {
            const active = isActive(item.href);
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setPending(item.href)}
                className="flex flex-col items-center gap-1 px-3 pb-3 pt-2.5 text-center transition-colors shrink-0"
                style={{
                  color: active ? "var(--gold)" : "var(--text3)",
                  minWidth: 64,
                }}
              >
                <span
                  className="mb-0.5 h-0.5 w-6 rounded-full transition-all"
                  style={{ background: active ? "var(--gold)" : "transparent" }}
                />
                <item.icon size={22} strokeWidth={active ? 2.2 : 1.8} />
                <span className="text-[10px] font-semibold leading-none">{item.label}</span>
              </Link>
            );
          })}
        </div>
      </div>

      {/* Safe area spacer for iOS */}
      <div style={{ height: "env(safe-area-inset-bottom, 0px)" }} />
    </nav>
  );
}

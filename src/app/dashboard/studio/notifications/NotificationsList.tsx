"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { PenLine, MessageSquare, UserCheck, UserX, Star, Wallet, Bell, FileCheck, CheckCheck, Megaphone, UserPlus, ArrowUpCircle, Mail } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import PushToggle from "@/components/PushToggle";
import type { StudioNotification, NotificationKind } from "@/lib/types";

const ICON: Record<NotificationKind, typeof Bell> = {
  signed: PenLine,
  edit_request: MessageSquare,
  crew_accepted: UserCheck,
  crew_declined: UserX,
  review: Star,
  payment: Wallet,
  quote_accepted: FileCheck,
  announcement: Megaphone,
  new_user: UserPlus,
  upgrade_request: ArrowUpCircle,
  contact: Mail,
  info: Bell,
};
const TONE: Record<NotificationKind, string> = {
  signed: "var(--s-green)",
  edit_request: "var(--s-amber)",
  crew_accepted: "var(--s-green)",
  crew_declined: "var(--s-red)",
  review: "var(--s-amber)",
  payment: "var(--s-blue)",
  quote_accepted: "var(--s-green)",
  announcement: "#c78bd1",
  new_user: "var(--s-blue)",
  upgrade_request: "var(--s-amber)",
  contact: "var(--s-green)",
  info: "var(--text3)",
};

/** Where a notification points to (its "content"). */
function targetHref(n: StudioNotification): string | null {
  if (n.contract_id) return `/dashboard/studio/contracts/${n.contract_id}`;
  if (n.kind === "quote_accepted") return "/dashboard/studio/quotes";
  if (n.kind === "review") return "/dashboard/studio/ranking";
  if (n.kind === "new_user") return "/dashboard/admin";
  if (n.kind === "upgrade_request") return "/dashboard/settings";
  if (n.kind === "contact") return "/dashboard/settings";
  return null;
}

export default function NotificationsList({ initial }: { initial: StudioNotification[] }) {
  const router = useRouter();
  const [items, setItems] = useState<StudioNotification[]>(initial);
  const unreadCount = useMemo(() => items.filter((n) => !n.read).length, [items]);

  async function markRead(ids: string[]) {
    if (ids.length === 0) return;
    setItems((p) => p.map((n) => (ids.includes(n.id) ? { ...n, read: true } : n)));
    const supabase = createClient();
    await supabase.from("studio_notifications").update({ read: true }).in("id", ids);
  }

  function openNotification(n: StudioNotification) {
    if (!n.read) markRead([n.id]); // fire-and-forget; UI updates optimistically
    const href = targetHref(n);
    if (href) router.push(href);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4 flex items-center gap-3">
        <h1 className="font-serif text-2xl font-medium">Thông báo</h1>
        {unreadCount > 0 && (
          <span className="rounded-full px-2 py-0.5 text-xs font-bold" style={{ background: "var(--s-red, #e0746f)", color: "#fff" }}>
            {unreadCount} mới
          </span>
        )}
        {unreadCount > 0 && (
          <button
            onClick={() => markRead(items.filter((n) => !n.read).map((n) => n.id))}
            className="btn-ghost ml-auto px-3 py-1.5 text-xs gap-1.5"
          >
            <CheckCheck size={14} /> Đánh dấu tất cả đã đọc
          </button>
        )}
      </div>

      <div className="mb-5">
        <PushToggle />
      </div>

      {items.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có thông báo nào.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICON[n.kind] ?? Bell;
            const href = targetHref(n);
            const clickable = !n.read || !!href;
            return (
              <div
                key={n.id}
                onClick={() => clickable && openNotification(n)}
                role={clickable ? "button" : undefined}
                tabIndex={clickable ? 0 : undefined}
                onKeyDown={(e) => { if (clickable && (e.key === "Enter" || e.key === " ")) { e.preventDefault(); openNotification(n); } }}
                className="card flex items-start gap-3 p-4 transition-colors"
                style={{
                  cursor: clickable ? "pointer" : "default",
                  // Unread: tinted background + accent left border + full opacity.
                  // Read: muted, no highlight.
                  background: n.read ? "var(--surface)" : "color-mix(in srgb, var(--brand, var(--accent)) 7%, var(--surface))",
                  borderLeft: n.read ? "3px solid transparent" : "3px solid var(--brand, var(--accent))",
                  opacity: n.read ? 0.72 : 1,
                }}
              >
                <Icon size={18} style={{ color: TONE[n.kind] ?? "var(--text3)" }} className="mt-0.5 shrink-0" />
                <div className="flex-1 min-w-0">
                  <p className="text-sm" style={{ fontWeight: n.read ? 400 : 600 }}>{n.message}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--text3)" }}>
                    {new Date(n.created_at).toLocaleString("vi-VN")}
                    {href && <span style={{ color: "var(--brand, var(--accent))" }}> · Xem chi tiết →</span>}
                  </p>
                </div>
                {!n.read && <span className="mt-1.5 h-2.5 w-2.5 shrink-0 rounded-full" style={{ background: "var(--brand, var(--accent))" }} />}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

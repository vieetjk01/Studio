"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { PenLine, MessageSquare, UserCheck, UserX, Star, Wallet, Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StudioNotification, NotificationKind } from "@/lib/types";

const ICON: Record<NotificationKind, typeof Bell> = {
  signed: PenLine,
  edit_request: MessageSquare,
  crew_accepted: UserCheck,
  crew_declined: UserX,
  review: Star,
  payment: Wallet,
  info: Bell,
};
const TONE: Record<NotificationKind, string> = {
  signed: "#7bb38a",
  edit_request: "#c7a76b",
  crew_accepted: "#7bb38a",
  crew_declined: "#c77b7b",
  review: "#e0b85c",
  payment: "#6ba3c7",
  info: "var(--text3)",
};

export default function NotificationsList({ initial }: { initial: StudioNotification[] }) {
  const [items, setItems] = useState<StudioNotification[]>(initial);

  // Mark everything read once the studio opens this page.
  useEffect(() => {
    const unreadIds = initial.filter((n) => !n.read).map((n) => n.id);
    if (unreadIds.length === 0) return;
    const supabase = createClient();
    supabase
      .from("studio_notifications")
      .update({ read: true })
      .in("id", unreadIds)
      .then(() => setItems((p) => p.map((n) => ({ ...n, read: true }))));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-medium">Thông báo</h1>
      </div>

      {items.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có thông báo nào.</div>
      ) : (
        <div className="space-y-2">
          {items.map((n) => {
            const Icon = ICON[n.kind] ?? Bell;
            const body = (
              <div className="card flex items-start gap-3 p-4" style={{ opacity: n.read ? 0.7 : 1 }}>
                <Icon size={18} style={{ color: TONE[n.kind] ?? "var(--text3)" }} className="mt-0.5 shrink-0" />
                <div className="flex-1">
                  <p className="text-sm">{n.message}</p>
                  <p className="mt-0.5 text-[11px]" style={{ color: "var(--text3)" }}>{new Date(n.created_at).toLocaleString("vi-VN")}</p>
                </div>
                {!n.read && <span className="mt-1 h-2 w-2 shrink-0 rounded-full" style={{ background: "var(--accent)" }} />}
              </div>
            );
            return n.contract_id ? (
              <Link key={n.id} href={`/dashboard/studio/contracts/${n.contract_id}`} className="block transition-colors">{body}</Link>
            ) : (
              <div key={n.id}>{body}</div>
            );
          })}
        </div>
      )}
    </div>
  );
}

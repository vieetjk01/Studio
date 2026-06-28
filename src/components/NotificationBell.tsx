"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Bell } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

/** Bell with an unread-notification badge (studio header). Updates in real-time. */
export default function NotificationBell() {
  const [count, setCount] = useState(0);

  useEffect(() => {
    const supabase = createClient();

    // Initial load
    supabase
      .from("studio_notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false)
      .then(({ count }) => setCount(count || 0));

    // Realtime — re-fetch count on any INSERT or UPDATE to studio_notifications
    const channel = supabase
      .channel("notif-bell")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "studio_notifications" },
        () => {
          supabase
            .from("studio_notifications")
            .select("id", { count: "exact", head: true })
            .eq("read", false)
            .then(({ count }) => setCount(count || 0));
        }
      )
      .subscribe();

    return () => { supabase.removeChannel(channel); };
  }, []);

  return (
    <Link href="/dashboard/studio/notifications" className="relative btn-ghost p-2" aria-label="Thông báo">
      <Bell size={16} />
      {count > 0 && (
        <span
          className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full px-1 text-[10px] font-semibold"
          style={{ background: "var(--s-red, #e0746f)", color: "#fff" }}
        >
          {count > 9 ? "9+" : count}
        </span>
      )}
    </Link>
  );
}

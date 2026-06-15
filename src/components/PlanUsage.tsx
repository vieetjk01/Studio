"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Sparkles, Crown } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

interface Usage {
  used: number;
  limit: number | null; // null = unlimited
  pro: boolean;
}

export default function PlanUsage({ showUpgrade = true }: { showUpgrade?: boolean }) {
  const [usage, setUsage] = useState<Usage | null>(null);

  useEffect(() => {
    (async () => {
      const supabase = createClient();
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;

      const { data: profile } = await supabase
        .from("profiles")
        .select("role, monthly_album_limit, can_zip, can_notes")
        .eq("id", user.id)
        .maybeSingle();

      const start = new Date();
      start.setDate(1);
      start.setHours(0, 0, 0, 0);
      const { count } = await supabase
        .from("album_creations")
        .select("id", { count: "exact", head: true })
        .eq("user_id", user.id)
        .gte("created_at", start.toISOString());

      const pro =
        profile?.role === "admin" ||
        (profile?.monthly_album_limit == null && !!profile?.can_zip && !!profile?.can_notes);

      setUsage({
        used: count ?? 0,
        limit: profile?.role === "admin" ? null : profile?.monthly_album_limit ?? null,
        pro,
      });
    })();
  }, []);

  if (!usage) return null;

  const reached = usage.limit != null && usage.used >= usage.limit;

  return (
    <div
      className="mb-6 flex flex-wrap items-center gap-3 rounded-2xl px-5 py-3.5"
      style={{ background: "var(--surface)", border: `1px solid ${reached ? "var(--gold)" : "var(--border)"}` }}
    >
      <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: "var(--surface2)", color: "var(--gold)" }}>
        {usage.pro ? <Crown size={16} /> : <Sparkles size={16} />}
      </span>
      <div className="text-sm">
        <span className="font-medium">{usage.pro ? "Gói Studio" : "Gói Miễn phí"}</span>
        <span style={{ color: "var(--text2)" }}>
          {" · "}
          {usage.limit == null
            ? `Đã tạo ${usage.used} album tháng này · không giới hạn`
            : `Đã tạo ${usage.used}/${usage.limit} album trong tháng này`}
        </span>
      </div>
      {showUpgrade && !usage.pro && (
        <Link
          href="/dashboard/upgrade"
          className="ml-auto rounded-full px-3.5 py-1.5 text-[13px] font-semibold"
          style={{ background: "var(--gold)", color: "#0a0a0c" }}
        >
          Nâng cấp
        </Link>
      )}
    </div>
  );
}

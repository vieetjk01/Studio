"use client";

import Link from "next/link";
import { Monitor } from "lucide-react";
import InstallPwaButton from "@/components/InstallPwaButton";

const RANK: Record<string, number> = { none: 0, booking: 1, plus: 2, full: 3 };

/**
 * Nút tải ứng dụng theo gói:
 *  - 2 gói lớn nhất (Photographer Plus + Studio) → "Tải MStudo Desktop".
 *  - Các gói còn lại → nút cài web app (PWA).
 */
export default function DownloadAppButton({ tier }: { tier: string }) {
  if ((RANK[tier] ?? 0) >= RANK.plus) {
    return (
      <Link
        href="/dashboard/studio/desktop"
        className="flex items-center gap-2.5 rounded-xl px-3 py-2 text-sm font-semibold transition-colors"
        style={{ background: "var(--brandSoft)", color: "var(--brand)" }}
      >
        <Monitor size={16} /> Tải MStudo Desktop
      </Link>
    );
  }
  return <InstallPwaButton />;
}

"use client";

import { useState } from "react";
import { VJK_RED, BRAND } from "@/lib/vieetjk/content";

/**
 * Logo Vieetjk. Thứ tự ưu tiên:
 *   1. src  — logo studio đã upload trong dashboard (studio_logo_url / pl_logo_url)
 *   2. /vieetjk-logo.png — file đặt trong thư mục public/
 *   3. logo vector dự phòng: tam giác play đỏ + chữ "tjk" trắng
 */
export default function Logo({ src, height = 30 }: { src?: string | null; height?: number }) {
  const candidate = src || "/vieetjk-logo.png";
  const [failed, setFailed] = useState(false);

  if (!failed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src={candidate}
        alt={BRAND.name}
        height={height}
        style={{ height, width: "auto", maxHeight: height, display: "block", objectFit: "contain" }}
        onError={() => setFailed(true)}
      />
    );
  }

  // Fallback vector (khi chưa có logo studio và chưa có file).
  return (
    <span className="vjk-logo" aria-label={BRAND.name} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg viewBox="0 0 40 40" width={Math.round(height * 0.8)} height={Math.round(height * 0.8)} aria-hidden="true" focusable="false">
        <path d="M13 8.5c0-1.6 1.75-2.55 3.08-1.68l16.5 10.9c1.2.8 1.2 2.57 0 3.36l-16.5 10.9C14.75 33.05 13 32.1 13 30.5V8.5Z" fill={VJK_RED} />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-manrope), var(--font-hanken), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: Math.round(height * 0.72),
          letterSpacing: "-.02em",
          color: "#fff",
          lineHeight: 1,
        }}
      >
        tjk
      </span>
    </span>
  );
}

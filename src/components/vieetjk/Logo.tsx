"use client";

import { useState } from "react";
import { VJK_RED, BRAND } from "@/lib/vieetjk/content";

/**
 * Logo Vieetjk.
 * - Nếu có file /vieetjk-logo.png (đặt trong thư mục public/) sẽ dùng ảnh đó.
 * - Nếu chưa có, hiển thị logo vector dự phòng: tam giác play đỏ + chữ "tjk" trắng.
 */
export default function Logo({ height = 30 }: { height?: number }) {
  const [imgFailed, setImgFailed] = useState(false);

  if (!imgFailed) {
    return (
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/vieetjk-logo.png"
        alt={BRAND.name}
        height={height}
        style={{ height, width: "auto", display: "block" }}
        onError={() => setImgFailed(true)}
      />
    );
  }

  // Logo dựng lại bằng vector (dùng khi chưa có file /vieetjk-logo.png):
  // tam giác play đỏ + chữ "tjk" trắng — hợp nền tối.
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

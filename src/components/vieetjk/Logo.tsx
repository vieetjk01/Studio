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

  // Fallback vector (khi chưa có file logo).
  return (
    <span className="vjk-logo" aria-label={BRAND.name}>
      <svg viewBox="0 0 40 40" width="24" height="24" aria-hidden="true" focusable="false">
        <path d="M13 8.5c0-1.6 1.75-2.55 3.08-1.68l16.5 10.9c1.2.8 1.2 2.57 0 3.36l-16.5 10.9C14.75 33.05 13 32.1 13 30.5V8.5Z" fill={VJK_RED} />
      </svg>
      <span className="vjk-logo-name" style={{ color: "#fff" }}>tjk</span>
    </span>
  );
}

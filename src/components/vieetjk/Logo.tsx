"use client";

import { useState } from "react";
import { VJK_RED, BRAND } from "@/lib/vieetjk/content";
import type { VjkTheme } from "./ThemeSwitch";

/**
 * Logo tjk media — tự đổi theo giao diện sáng/tối.
 *
 * Nền TỐI:  logo trắng studio (src = studio_logo_url) → /vieetjk-logo.png → vector.
 * Nền SÁNG: logo đen /vieetjk-logo-light.png → logo trắng đặt trên chip tối → vector.
 * Vector dự phòng dùng currentColor nên tự hợp cả 2 nền.
 */
export default function Logo({
  src,
  theme = "dark",
  height = 30,
}: {
  src?: string | null;
  theme?: VjkTheme;
  height?: number;
}) {
  const [primaryFail, setPrimaryFail] = useState(false);
  const [chipFail, setChipFail] = useState(false);

  const imgStyle = { height, width: "auto", maxHeight: height, display: "block", objectFit: "contain" as const };

  if (theme === "light") {
    // 1) Logo đen dành cho nền sáng.
    if (!primaryFail) {
      // eslint-disable-next-line @next/next/no-img-element
      return <img src="/vieetjk-logo-light.png" alt={BRAND.name} style={imgStyle} onError={() => setPrimaryFail(true)} />;
    }
    // 2) Chưa có logo đen → dùng logo trắng studio trên chip tối cho dễ nhìn.
    if (src && !chipFail) {
      return (
        <span style={{ background: "#101014", borderRadius: 9, padding: "5px 9px", display: "inline-flex", alignItems: "center" }}>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={src} alt={BRAND.name} style={{ ...imgStyle, height: height - 6, maxHeight: height - 6 }} onError={() => setChipFail(true)} />
        </span>
      );
    }
    return <Vector height={height} />;
  }

  // Nền tối.
  const candidate = src || "/vieetjk-logo.png";
  if (!primaryFail) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img src={candidate} alt={BRAND.name} style={imgStyle} onError={() => setPrimaryFail(true)} />;
  }
  return <Vector height={height} />;
}

/** Logo vector dự phòng: tam giác play đỏ + chữ "TJK" (theo màu chữ hiện tại). */
function Vector({ height }: { height: number }) {
  return (
    <span className="vjk-logo" aria-label={BRAND.name} style={{ display: "inline-flex", alignItems: "center", gap: 8 }}>
      <svg viewBox="0 0 40 40" width={Math.round(height * 0.82)} height={Math.round(height * 0.82)} aria-hidden="true" focusable="false">
        <path d="M13 8.5c0-1.6 1.75-2.55 3.08-1.68l16.5 10.9c1.2.8 1.2 2.57 0 3.36l-16.5 10.9C14.75 33.05 13 32.1 13 30.5V8.5Z" fill={VJK_RED} />
      </svg>
      <span
        style={{
          fontFamily: "var(--font-manrope), var(--font-hanken), system-ui, sans-serif",
          fontWeight: 800,
          fontSize: Math.round(height * 0.7),
          letterSpacing: "-.01em",
          color: "var(--ink)",
          lineHeight: 1,
        }}
      >
        TJK
      </span>
    </span>
  );
}

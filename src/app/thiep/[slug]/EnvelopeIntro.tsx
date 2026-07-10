"use client";

import { useEffect, useState } from "react";

/**
 * Hiệu ứng BÌ THƯ mở thiệp cho khách mời có link riêng (?guest=…).
 * Hiện bì thư có tên khách → bấm "Mở thiệp" → nắp bì mở, tấm thiệp trồi lên,
 * rồi lớp phủ mờ dần để lộ nội dung thiệp bên dưới.
 */
export default function EnvelopeIntro({ name, label, couple, accent }: { name: string; label: string; couple: string; accent: string }) {
  const [opening, setOpening] = useState(false);
  const [done, setDone] = useState(false);
  const [gone, setGone] = useState(false);

  // Khóa cuộn trang trong lúc bì thư hiển thị.
  useEffect(() => {
    if (gone) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, [gone]);

  function open() {
    if (opening) return;
    setOpening(true);
    setTimeout(() => setDone(true), 1100);   // sau khi nắp mở + thiệp trồi lên
    setTimeout(() => { setGone(true); document.body.style.overflow = ""; }, 1900); // gỡ overlay
  }

  if (gone) return null;

  const dark = shade(accent, -0.22);
  const ease = "cubic-bezier(.22,.61,.36,1)";

  return (
    <div
      onClick={open}
      style={{
        position: "fixed", inset: 0, zIndex: 100, display: "flex", flexDirection: "column",
        alignItems: "center", justifyContent: "center", gap: 26, cursor: opening ? "default" : "pointer",
        background: "radial-gradient(120% 120% at 50% 30%, #fbf7f2 0%, #efe6db 100%)",
        opacity: done ? 0 : 1, transition: `opacity .7s ${ease}`, pointerEvents: done ? "none" : "auto",
        padding: 20,
      }}
    >
      <p style={{ fontFamily: "var(--font-cormorant), serif", letterSpacing: ".22em", textTransform: "uppercase", fontSize: 12, color: dark }}>
        {couple || "Thiệp cưới"}
      </p>

      {/* Bì thư */}
      <div style={{ perspective: 1100, width: "min(88vw, 360px)" }}>
        <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 2" }}>
          {/* Thân bì (đáy) */}
          <div style={{ position: "absolute", inset: 0, borderRadius: 10, background: accent, boxShadow: "0 20px 50px rgba(0,0,0,.22)" }} />

          {/* Tấm thiệp trồi lên khi mở */}
          <div style={{
            position: "absolute", left: "6%", right: "6%", top: "8%", bottom: "8%", borderRadius: 8,
            background: "linear-gradient(#fffdfa,#fbf5ec)", boxShadow: "0 6px 18px rgba(0,0,0,.14)",
            display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 12,
            transform: opening ? "translateY(-64%)" : "translateY(0)", transition: `transform 1s ${ease} .35s`,
            zIndex: opening ? 5 : 1,
          }}>
            <span style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 11, letterSpacing: ".16em", textTransform: "uppercase", color: dark }}>{label}</span>
            <span style={{ fontFamily: "var(--font-script), cursive", fontSize: 30, lineHeight: 1.1, color: "#2c2621", marginTop: 2 }}>{name}</span>
          </div>

          {/* Mặt trước bì (túi dưới) — che nửa dưới tấm thiệp */}
          <div style={{
            position: "absolute", left: 0, right: 0, bottom: 0, top: "42%", borderRadius: "0 0 10px 10px",
            background: `linear-gradient(${shade(accent, 0.05)}, ${dark})`,
            clipPath: "polygon(0 22%, 50% 0, 100% 22%, 100% 100%, 0 100%)", zIndex: 6,
          }} />

          {/* Nắp bì — mở lên khi bấm */}
          <div style={{
            position: "absolute", left: 0, right: 0, top: 0, height: "58%",
            background: `linear-gradient(${dark}, ${shade(accent, -0.08)})`,
            clipPath: "polygon(0 0, 100% 0, 50% 92%)",
            transformOrigin: "top", transform: opening ? "rotateX(180deg)" : "rotateX(0deg)",
            transition: `transform .9s ${ease}`, transformStyle: "preserve-3d", backfaceVisibility: "hidden",
            zIndex: opening ? 2 : 8,
          }} />

          {/* Dấu niêm (con tim) */}
          {!opening && (
            <div style={{
              position: "absolute", left: "50%", top: "46%", transform: "translate(-50%,-50%)", zIndex: 9,
              width: 46, height: 46, borderRadius: "50%", background: "#fff",
              display: "flex", alignItems: "center", justifyContent: "center",
              boxShadow: "0 3px 10px rgba(0,0,0,.2)", color: accent, fontSize: 22,
            }}>♥</div>
          )}
        </div>
      </div>

      {!opening && (
        <button
          onClick={(e) => { e.stopPropagation(); open(); }}
          style={{
            fontFamily: "var(--font-cormorant), serif", fontSize: 15, letterSpacing: ".08em",
            background: accent, color: "#fff", border: "none", borderRadius: 999, padding: "11px 30px",
            boxShadow: "0 8px 22px rgba(0,0,0,.18)", cursor: "pointer", animation: "vkEnvBob 1.8s ease-in-out infinite",
          }}
        >Mở thiệp ✦</button>
      )}
      <style>{"@keyframes vkEnvBob{0%,100%{transform:translateY(0)}50%{transform:translateY(-5px)}}"}</style>
    </div>
  );
}

/** Làm đậm/nhạt một màu hex theo hệ số (-1..1). */
function shade(hex: string, amt: number): string {
  const m = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex.trim());
  if (!m) return hex;
  const adj = (v: number) => Math.max(0, Math.min(255, Math.round(v + (amt < 0 ? v * amt : (255 - v) * amt))));
  const r = adj(parseInt(m[1], 16)), g = adj(parseInt(m[2], 16)), b = adj(parseInt(m[3], 16));
  return `#${[r, g, b].map((x) => x.toString(16).padStart(2, "0")).join("")}`;
}

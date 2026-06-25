"use client";

/*
 * mstudo-video — animated product showcase used in the homepage intro.
 * Pure React/CSS animation (no MP4): a 39s loop of 6 scenes mirroring the app.
 * Autoplays + loops, scales responsively to its container (16:9 / 1280×720),
 * pauses when scrolled off-screen, and freezes on a representative frame when
 * the visitor prefers reduced motion.
 */

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

// ── Easing ──────────────────────────────────────────────────────────────────
const Easing = {
  linear: (t: number) => t,
  easeInCubic: (t: number) => t * t * t,
  easeOutCubic: (t: number) => --t * t * t + 1,
  easeOutBack: (t: number) => {
    const c1 = 1.70158, c3 = c1 + 1;
    return 1 + c3 * Math.pow(t - 1, 3) + c1 * Math.pow(t - 1, 2);
  },
  easeOutSine: (t: number) => Math.sin((t * Math.PI) / 2),
  easeInOutSine: (t: number) => -(Math.cos(Math.PI * t) - 1) / 2,
};

const clamp = (v: number, min: number, max: number) => Math.max(min, Math.min(max, v));

type EaseFn = (t: number) => number;

function interpolate(input: number[], output: number[], ease: EaseFn = Easing.linear) {
  return (t: number) => {
    if (t <= input[0]) return output[0];
    if (t >= input[input.length - 1]) return output[output.length - 1];
    for (let i = 0; i < input.length - 1; i++) {
      if (t >= input[i] && t <= input[i + 1]) {
        const span = input[i + 1] - input[i];
        const local = span === 0 ? 0 : (t - input[i]) / span;
        return output[i] + (output[i + 1] - output[i]) * ease(local);
      }
    }
    return output[output.length - 1];
  };
}

const ease = (a: number, b: number, t: number, e: EaseFn = Easing.easeOutCubic) =>
  interpolate([0, 1], [a, b], e)(clamp(t, 0, 1));

// ── Timeline / sprite context ────────────────────────────────────────────────
const TimelineContext = createContext<{ time: number; duration: number }>({ time: 0, duration: 39 });
const useTimeline = () => useContext(TimelineContext);

const SpriteContext = createContext<{ localTime: number; duration: number }>({ localTime: 0, duration: 0 });
const useSprite = () => useContext(SpriteContext);

function Sprite({ start = 0, end = Infinity, children }: { start?: number; end?: number; children: ReactNode }) {
  const { time } = useTimeline();
  if (time < start || time > end) return null;
  const duration = end - start;
  const localTime = Math.max(0, time - start);
  return <SpriteContext.Provider value={{ localTime, duration }}>{children}</SpriteContext.Provider>;
}

// ── Brand palette ─────────────────────────────────────────────────────────────
const G = "#1f9d63";
const G2 = "#26b074";
const INK = "#14171c";
const MUT = "#5b616b";
const BD = "#e6e8ec";
const SOFT = "rgba(31,157,99,0.10)";
const AMBER = "#c08a1e", AMBERS = "rgba(192,138,30,0.14)";
const BLUE = "#2f6fd0", BLUES = "rgba(47,111,208,0.13)";
const FONT = "'Manrope', system-ui, sans-serif";
const MONO = "ui-monospace, 'SF Mono', monospace";

// ── Logo mark (calendar + lens) ───────────────────────────────────────────────
function Mark({ size = 96, color = "#fff", draw = 1 }: { size?: number; color?: string; draw?: number }) {
  const dash = 200;
  return (
    <svg width={size} height={size} viewBox="0 0 96 96" fill="none"
      style={{ strokeDasharray: dash, strokeDashoffset: (1 - draw) * dash }}>
      <rect x="24" y="28" width="48" height="44" rx="8" stroke={color} strokeWidth="5" fill="none" />
      <path d="M24 40h48" stroke={color} strokeWidth="5" />
      <path d="M36 24v9M60 24v9" stroke={color} strokeWidth="5" strokeLinecap="round" />
      <circle cx="48" cy="55" r="9" stroke={color} strokeWidth="4.6" fill="none" />
      <circle cx="48" cy="55" r="2.4" fill={color} />
    </svg>
  );
}

function Bg({ from, to, dir = "135deg" }: { from: string; to: string; dir?: string }) {
  return <div style={{ position: "absolute", inset: 0, background: `linear-gradient(${dir}, ${from}, ${to})` }} />;
}

function AppFrame({
  path, children, w = 1060, h = 470, x = 110, y = 60, zoom = 1, ox = "50%", oy = "50%",
}: {
  path: string; children: ReactNode; w?: number; h?: number; x?: number; y?: number; zoom?: number; ox?: string; oy?: string;
}) {
  return (
    <div style={{ position: "absolute", left: x, top: y, width: w, height: h,
      transform: `scale(${zoom})`, transformOrigin: `${ox} ${oy}`, willChange: "transform" }}>
      <div style={{ width: "100%", height: "100%", background: "#fff", borderRadius: 16, overflow: "hidden",
        boxShadow: "0 40px 90px rgba(0,0,0,0.40)", border: `1px solid ${BD}` }}>
        <div style={{ height: 46, display: "flex", alignItems: "center", gap: 7, padding: "0 16px", borderBottom: `1px solid ${BD}` }}>
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: "#e7706b" }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: BD }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: BD }} />
          <span style={{ width: 11, height: 11, borderRadius: "50%", background: BD }} />
          <span style={{ marginLeft: 12, fontSize: 13, color: MUT, fontFamily: MONO }}>app.mstudo.com/{path}</span>
        </div>
        <div style={{ position: "relative", height: "calc(100% - 46px)", background: "#fbfcfd" }}>{children}</div>
      </div>
    </div>
  );
}

function Caption({ no, title, sub }: { no: string; title: string; sub: string }) {
  const { localTime, duration } = useSprite();
  const o = clamp(localTime / 0.5, 0, 1) * (1 - clamp((localTime - (duration - 0.5)) / 0.5, 0, 1));
  const ty = (1 - clamp(localTime / 0.5, 0, 1)) * 14;
  return (
    <div style={{ position: "absolute", left: 56, bottom: 40, opacity: o, transform: `translateY(${ty}px)`,
      display: "flex", alignItems: "center", gap: 16, background: "rgba(8,20,14,0.66)",
      backdropFilter: "blur(6px)", padding: "12px 20px 12px 12px", borderRadius: 16, border: "1px solid rgba(255,255,255,0.12)" }}>
      <div style={{ width: 52, height: 52, borderRadius: 14, background: G, color: "#fff", display: "flex",
        alignItems: "center", justifyContent: "center", fontFamily: FONT, fontWeight: 800, fontSize: 22,
        boxShadow: "0 10px 30px rgba(31,157,99,0.4)" }}>{no}</div>
      <div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 30, color: "#fff", letterSpacing: "-0.02em" }}>{title}</div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 16, color: "rgba(255,255,255,0.7)", marginTop: 2 }}>{sub}</div>
      </div>
    </div>
  );
}

// ── SCENE 0 · INTRO ────────────────────────────────────────────────────────────
function SceneIntro() {
  const { localTime: t } = useSprite();
  const draw = clamp(t / 1.1, 0, 1);
  const markScale = ease(0.6, 1, t / 0.9, Easing.easeOutBack);
  const txtO = clamp((t - 0.7) / 0.6, 0, 1);
  const txtY = (1 - ease(0, 1, (t - 0.7) / 0.6)) * 18;
  const subO = clamp((t - 1.3) / 0.6, 0, 1);
  return (
    <>
      <Bg from="#0c2a1d" to="#13864f" />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 6 }}>
        <div style={{ transform: `scale(${markScale})`, marginBottom: 10 }}>
          <div style={{ width: 130, height: 130, borderRadius: 34, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark size={92} draw={draw} />
          </div>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 78, color: "#fff", letterSpacing: "-0.03em", opacity: txtO, transform: `translateY(${txtY}px)` }}>mstudo</div>
        <div style={{ fontFamily: FONT, fontWeight: 500, fontSize: 24, color: "rgba(255,255,255,0.82)", opacity: subO }}>Giải pháp quản lý studio toàn diện</div>
      </div>
    </>
  );
}

// ── SCENE 1 · ĐẶT LỊCH ──────────────────────────────────────────────────────────
const DAYS = ["T2", "T3", "T4", "T5", "T6", "T7", "CN"];
const SHOOTS = [
  { d: 0, label: "Cưới · Anh & Hà", time: "09:00", c: G, cs: SOFT },
  { d: 2, label: "Chân dung", time: "10:30", c: BLUE, cs: BLUES },
  { d: 3, label: "Kỷ yếu 12A", time: "14:00", c: AMBER, cs: AMBERS },
  { d: 5, label: "Sự kiện", time: "08:00", c: G, cs: SOFT },
];
function SceneBooking() {
  const { localTime: t, duration } = useSprite();
  const zoom = ease(1.0, 1.06, t / duration, Easing.easeInOutSine);
  const toastO = clamp((t - 4.4) / 0.5, 0, 1) * (1 - clamp((t - 6.6) / 0.5, 0, 1));
  return (
    <>
      <Bg from="#0d2117" to="#0c1c14" />
      <AppFrame path="lich-chup" zoom={zoom} oy="40%">
        <div style={{ padding: "22px 26px" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 18 }}>
            <span style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: INK }}>Lịch chụp · Tuần 24/06 – 30/06</span>
            <span style={{ fontFamily: FONT, fontWeight: 600, fontSize: 13, color: "#fff", background: G, padding: "8px 14px", borderRadius: 9 }}>+ Thêm lịch</span>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 }}>
            {DAYS.map((dw, i) => {
              const sh = SHOOTS.find((s) => s.d === i);
              const appear = sh ? clamp((t - (0.5 + SHOOTS.indexOf(sh) * 0.45)) / 0.5, 0, 1) : 0;
              const pop = ease(0.7, 1, appear, Easing.easeOutBack);
              return (
                <div key={i} style={{ border: `1px solid ${BD}`, borderRadius: 11, padding: 10, minHeight: 230, background: i === 0 ? SOFT : "#fff" }}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 10 }}>
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700, color: MUT }}>{dw}</span>
                    <span style={{ fontFamily: FONT, fontSize: 16, fontWeight: 800, color: INK }}>{24 + i}</span>
                  </div>
                  {sh && (
                    <div style={{ background: sh.cs, color: sh.c, borderRadius: 8, padding: "8px 9px", opacity: appear, transform: `scale(${pop})`, transformOrigin: "top center" }}>
                      <div style={{ fontFamily: FONT, fontSize: 12, fontWeight: 700 }}>{sh.time}</div>
                      <div style={{ fontFamily: FONT, fontSize: 12, lineHeight: 1.25 }}>{sh.label}</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
        <div style={{ position: "absolute", right: 26, bottom: 22, width: 300, background: "#fff", border: `1px solid ${BD}`, borderRadius: 12, padding: "14px 16px", display: "flex", gap: 12, alignItems: "center", boxShadow: "0 16px 40px rgba(0,0,0,0.14)", opacity: toastO, transform: `translateY(${(1 - toastO) * 16}px)` }}>
          <div style={{ width: 38, height: 38, borderRadius: 10, background: SOFT, color: G, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 20 }}>🔔</div>
          <div>
            <div style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: INK }}>Nhắc hẹn tự động</div>
            <div style={{ fontFamily: FONT, fontSize: 12.5, color: MUT }}>SMS đã gửi cho khách lúc 08:00</div>
          </div>
        </div>
      </AppFrame>
      <Caption no="1" title="Đặt lịch & nhắc hẹn" sub="Quản lý lịch chụp, tránh trùng giờ" />
    </>
  );
}

// ── SCENE 2 · ĐƠN HÀNG & HỢP ĐỒNG ────────────────────────────────────────────────
const ORDERS = [
  { code: "#HD088", client: "Nguyễn Minh Anh", type: "Chụp cưới", val: "25.000.000₫" },
  { code: "#HD087", client: "Công ty FPT", type: "Sự kiện", val: "48.000.000₫" },
  { code: "#HD086", client: "Phạm Quốc Bảo", type: "Chân dung", val: "15.000.000₫" },
  { code: "#HD085", client: "Đỗ Khánh Vy", type: "Chụp cưới", val: "22.000.000₫" },
];
function SceneContracts() {
  const { localTime: t, duration } = useSprite();
  const zoom = ease(1.02, 1.08, t / duration, Easing.easeInOutSine);
  return (
    <>
      <Bg from="#0d2117" to="#0c1c14" />
      <AppFrame path="quan-ly-hop-dong" zoom={zoom} oy="42%">
        <div style={{ padding: "22px 26px" }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: INK, marginBottom: 16 }}>Quản lý hợp đồng</div>
          <div style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr 1.4fr 1.2fr", padding: "0 6px 10px", fontFamily: FONT, fontSize: 12, fontWeight: 700, color: MUT, textTransform: "uppercase", letterSpacing: "0.04em" }}>
            <span>Mã</span><span>Khách hàng</span><span>Loại</span><span>Giá trị</span><span>Trạng thái</span>
          </div>
          {ORDERS.map((o, i) => {
            const ap = clamp((t - (0.5 + i * 0.4)) / 0.5, 0, 1);
            const signed = i === 0 && t > 4.6;
            return (
              <div key={i} style={{ display: "grid", gridTemplateColumns: "1.1fr 2fr 1.4fr 1.4fr 1.2fr", alignItems: "center", padding: "15px 6px", borderTop: `1px solid ${BD}`, fontFamily: FONT, fontSize: 14, color: INK, opacity: ap, transform: `translateX(${(1 - ease(0, 1, ap)) * 24}px)` }}>
                <span style={{ fontWeight: 700, fontFamily: MONO, fontSize: 13 }}>{o.code}</span>
                <span>{o.client}</span>
                <span style={{ color: MUT }}>{o.type}</span>
                <span style={{ fontWeight: 700 }}>{o.val}</span>
                <span>
                  {i === 0 ? (
                    <span style={{ display: "inline-block", fontSize: 12.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, color: signed ? G : AMBER, background: signed ? SOFT : AMBERS }}>
                      {signed ? "✓ Đã ký" : "Chờ ký"}
                    </span>
                  ) : (
                    <span style={{ fontSize: 12.5, fontWeight: 700, padding: "4px 11px", borderRadius: 999, color: i === 1 ? AMBER : G, background: i === 1 ? AMBERS : SOFT }}>{i === 1 ? "Chờ ký" : "Đã ký"}</span>
                  )}
                </span>
              </div>
            );
          })}
        </div>
      </AppFrame>
      <Caption no="2" title="Đơn hàng & hợp đồng" sub="Theo dõi từ báo giá đến lúc ký kết" />
    </>
  );
}

// ── SCENE 3 · THU CHI ────────────────────────────────────────────────────────────
const BARS = [45, 58, 52, 70, 82, 95];
const BMON = ["01", "02", "03", "04", "05", "06"];
function SceneFinance() {
  const { localTime: t, duration } = useSprite();
  const zoom = ease(1.0, 1.05, t / duration, Easing.easeInOutSine);
  const rev = interpolate([0, 1], [0, 128.5], Easing.easeOutCubic)(clamp((t - 0.4) / 1.6, 0, 1));
  return (
    <>
      <Bg from="#0d2117" to="#0c1c14" />
      <AppFrame path="thu-chi" zoom={zoom} oy="44%">
        <div style={{ padding: "22px 26px", display: "grid", gridTemplateColumns: "1fr 1.5fr", gap: 20 }}>
          <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
            <div style={{ border: `1px solid ${BD}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, color: MUT, fontWeight: 600 }}>Tổng thu tháng 06</div>
              <div style={{ fontFamily: FONT, fontSize: 34, fontWeight: 800, color: G, marginTop: 6, letterSpacing: "-0.02em" }}>
                +{rev.toLocaleString("vi-VN", { minimumFractionDigits: 1, maximumFractionDigits: 1 })}M₫
              </div>
            </div>
            <div style={{ border: `1px solid ${BD}`, borderRadius: 14, padding: 20 }}>
              <div style={{ fontFamily: FONT, fontSize: 13, color: MUT, fontWeight: 600 }}>Lợi nhuận</div>
              <div style={{ fontFamily: FONT, fontSize: 28, fontWeight: 800, color: INK, marginTop: 6 }}>86,2M₫</div>
            </div>
          </div>
          <div style={{ border: `1px solid ${BD}`, borderRadius: 14, padding: 20 }}>
            <div style={{ fontFamily: FONT, fontSize: 14, fontWeight: 700, color: INK, marginBottom: 16 }}>Doanh thu 6 tháng</div>
            <div style={{ display: "flex", alignItems: "flex-end", gap: 18, height: 300 }}>
              {BARS.map((bh, i) => {
                const g = clamp((t - (0.5 + i * 0.18)) / 0.7, 0, 1);
                const h = ease(0, bh, g, Easing.easeOutCubic);
                return (
                  <div key={i} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 8, justifyContent: "flex-end", height: "100%" }}>
                    <div style={{ width: "100%", maxWidth: 46, height: `${h}%`, minHeight: 5, borderRadius: "7px 7px 0 0", background: `linear-gradient(180deg, ${G2}, ${G})` }} />
                    <span style={{ fontFamily: FONT, fontSize: 12, fontWeight: 600, color: MUT }}>{BMON[i]}</span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </AppFrame>
      <Caption no="3" title="Thu chi & tài chính" sub="Dòng tiền và doanh thu theo thời gian thực" />
    </>
  );
}

// ── SCENE 4 · BÁO CÁO TỔNG QUAN ──────────────────────────────────────────────────
const STATS = [
  { l: "Doanh thu tháng", v: "128,5M₫", d: "+12,4%", c: G },
  { l: "Đơn mới", v: "34", d: "+6 tuần này", c: G },
  { l: "Buổi chụp", v: "18", d: "5 tuần này", c: MUT },
  { l: "HĐ chờ ký", v: "5", d: "cần xử lý", c: AMBER },
];
function SceneDashboard() {
  const { localTime: t, duration } = useSprite();
  const zoom = ease(1.04, 1.0, t / duration, Easing.easeOutSine);
  return (
    <>
      <Bg from="#0d2117" to="#0c1c14" />
      <AppFrame path="tong-quan" zoom={zoom}>
        <div style={{ padding: "24px 26px" }}>
          <div style={{ fontFamily: FONT, fontWeight: 700, fontSize: 18, color: INK, marginBottom: 18 }}>Tổng quan studio</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 16 }}>
            {STATS.map((s, i) => {
              const ap = clamp((t - (0.4 + i * 0.22)) / 0.55, 0, 1);
              const pop = ease(0.8, 1, ap, Easing.easeOutBack);
              return (
                <div key={i} style={{ border: `1px solid ${BD}`, borderRadius: 14, padding: 18, opacity: ap, transform: `scale(${pop}) translateY(${(1 - ap) * 12}px)`, transformOrigin: "center" }}>
                  <div style={{ fontFamily: FONT, fontSize: 13, color: MUT, fontWeight: 600 }}>{s.l}</div>
                  <div style={{ fontFamily: FONT, fontSize: 26, fontWeight: 800, color: INK, marginTop: 10, letterSpacing: "-0.02em" }}>{s.v}</div>
                  <div style={{ fontFamily: FONT, fontSize: 12.5, fontWeight: 600, color: s.c, marginTop: 4 }}>{s.d}</div>
                </div>
              );
            })}
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1.6fr 1fr", gap: 16, marginTop: 16 }}>
            <div style={{ border: `1px solid ${BD}`, borderRadius: 14, padding: 18, height: 188, opacity: clamp((t - 1.3) / 0.6, 0, 1) }}>
              <div style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: INK, marginBottom: 14 }}>Doanh thu</div>
              <div style={{ display: "flex", alignItems: "flex-end", gap: 12, height: 118 }}>
                {BARS.map((bh, i) => (
                  <div key={i} style={{ flex: 1, borderRadius: "6px 6px 0 0", background: `linear-gradient(180deg, ${G2}, ${G})`, height: `${ease(0, bh, clamp((t - 1.5 - i * 0.08) / 0.5, 0, 1))}%`, minHeight: 4 }} />
                ))}
              </div>
            </div>
            <div style={{ border: `1px solid ${BD}`, borderRadius: 14, padding: 18, height: 188, opacity: clamp((t - 1.5) / 0.6, 0, 1) }}>
              <div style={{ fontFamily: FONT, fontSize: 13.5, fontWeight: 700, color: INK, marginBottom: 14 }}>Lịch sắp tới</div>
              {["Cưới · Anh & Hà", "Kỷ yếu 12A", "Chân dung"].map((x, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", opacity: clamp((t - 1.7 - i * 0.15) / 0.5, 0, 1) }}>
                  <div style={{ width: 8, height: 8, borderRadius: "50%", background: G }} />
                  <span style={{ fontFamily: FONT, fontSize: 13.5, color: INK }}>{x}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      </AppFrame>
      <Caption no="4" title="Báo cáo & tổng quan" sub="Toàn bộ studio trong một màn hình" />
    </>
  );
}

// ── SCENE 5 · OUTRO ──────────────────────────────────────────────────────────────
function SceneOutro() {
  const { localTime: t } = useSprite();
  const markS = ease(0.7, 1, t / 0.7, Easing.easeOutBack);
  const titleO = clamp((t - 0.5) / 0.6, 0, 1);
  const btnO = clamp((t - 1.2) / 0.6, 0, 1);
  const btnPop = ease(0.85, 1, clamp((t - 1.2) / 0.6, 0, 1), Easing.easeOutBack);
  const feats = ["Đặt lịch", "Hợp đồng", "Tài chính", "Báo cáo"];
  return (
    <>
      <Bg from="#0c2a1d" to="#13864f" />
      <div style={{ position: "absolute", inset: 0, display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", gap: 8 }}>
        <div style={{ transform: `scale(${markS})`, marginBottom: 6 }}>
          <div style={{ width: 96, height: 96, borderRadius: 26, background: "rgba(255,255,255,0.12)", display: "flex", alignItems: "center", justifyContent: "center" }}>
            <Mark size={66} draw={1} />
          </div>
        </div>
        <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 56, color: "#fff", letterSpacing: "-0.03em", opacity: titleO, transform: `translateY(${(1 - titleO) * 16}px)`, textAlign: "center", padding: "0 24px" }}>
          Quản lý studio, dễ dàng hơn
        </div>
        <div style={{ display: "flex", gap: 10, marginTop: 10, opacity: titleO, flexWrap: "wrap", justifyContent: "center" }}>
          {feats.map((f, i) => (
            <span key={i} style={{ fontFamily: FONT, fontSize: 15, fontWeight: 600, color: "#fff", background: "rgba(255,255,255,0.14)", padding: "7px 16px", borderRadius: 999 }}>{f}</span>
          ))}
        </div>
        <div style={{ marginTop: 30, opacity: btnO, transform: `scale(${btnPop})` }}>
          <div style={{ fontFamily: FONT, fontWeight: 800, fontSize: 19, color: G, background: "#fff", padding: "17px 40px", borderRadius: 14, boxShadow: "0 16px 44px rgba(0,0,0,0.28)" }}>
            Bắt đầu miễn phí →
          </div>
        </div>
        <div style={{ fontFamily: MONO, fontSize: 15, color: "rgba(255,255,255,0.7)", marginTop: 18, opacity: btnO }}>mstudo.com</div>
      </div>
    </>
  );
}

const DURATION = 39;
// A representative still frame for reduced-motion visitors (mid-dashboard scene).
const STATIC_TIME = 31;

function Scenes() {
  return (
    <>
      <Sprite start={0} end={4.2}><SceneIntro /></Sprite>
      <Sprite start={4.2} end={11.5}><SceneBooking /></Sprite>
      <Sprite start={11.5} end={18.8}><SceneContracts /></Sprite>
      <Sprite start={18.8} end={26.1}><SceneFinance /></Sprite>
      <Sprite start={26.1} end={33}><SceneDashboard /></Sprite>
      <Sprite start={33} end={39}><SceneOutro /></Sprite>
    </>
  );
}

/**
 * Renders the looping showcase, scaled to fill its parent's width at a fixed
 * 1280×720 aspect ratio. Pauses while off-screen; freezes for reduced-motion.
 */
export default function MstudoVideo({ className, style }: { className?: string; style?: CSSProperties }) {
  const wrapRef = useRef<HTMLDivElement | null>(null);
  const rafRef = useRef<number | null>(null);
  const lastTsRef = useRef<number | null>(null);
  const [time, setTime] = useState(0);
  const [scale, setScale] = useState(1);
  const [active, setActive] = useState(true);
  const [reduced, setReduced] = useState(false);

  // Respect prefers-reduced-motion.
  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    const apply = () => setReduced(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Scale the 1280-wide canvas to the container width.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const measure = () => setScale(Math.max(0.05, el.clientWidth / 1280));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);

  // Pause the loop when scrolled out of view.
  useEffect(() => {
    const el = wrapRef.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setActive(e.isIntersecting), { threshold: 0.05 });
    io.observe(el);
    return () => io.disconnect();
  }, []);

  // Animation loop.
  useEffect(() => {
    if (reduced || !active) {
      lastTsRef.current = null;
      return;
    }
    const step = (ts: number) => {
      if (lastTsRef.current == null) lastTsRef.current = ts;
      const dt = (ts - lastTsRef.current) / 1000;
      lastTsRef.current = ts;
      setTime((t) => (t + dt) % DURATION);
      rafRef.current = requestAnimationFrame(step);
    };
    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      lastTsRef.current = null;
    };
  }, [reduced, active]);

  const displayTime = reduced ? STATIC_TIME : time;
  const ctx = useMemo(() => ({ time: displayTime, duration: DURATION }), [displayTime]);

  return (
    <div
      ref={wrapRef}
      className={className}
      style={{ position: "relative", width: "100%", aspectRatio: "1280 / 720", overflow: "hidden", background: "#0b1f17", ...style }}
      aria-label="Giới thiệu mstudo — phần mềm quản lý studio"
      role="img"
    >
      <div style={{ position: "absolute", top: 0, left: 0, width: 1280, height: 720, transform: `scale(${scale})`, transformOrigin: "top left" }}>
        <TimelineContext.Provider value={ctx}>
          <Scenes />
        </TimelineContext.Provider>
      </div>
    </div>
  );
}

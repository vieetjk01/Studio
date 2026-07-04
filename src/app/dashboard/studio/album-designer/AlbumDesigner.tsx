"use client";

import { useState } from "react";
import { Check, ArrowRight } from "lucide-react";
import AlbumEditor from "./AlbumEditor";

/**
 * Thiết kế Album — trình thiết kế album cưới (Chọn khổ → Chọn mẫu → Chỉnh sửa →
 * Xuất file). Bản khởi tạo: hoàn thiện Bước 1 (khổ) & Bước 2 (mẫu); Bước 3
 * (editor kéo-thả + AI rải ảnh) và Bước 4 (xuất file) đang xây tiếp.
 * Đang gắn nhãn "Sắp ra mắt" — chỉ admin thấy để hoàn thiện.
 */

type Size = { id: string; name: string; dim: string; w: number; h: number; tag: string };
const SIZES: Size[] = [
  { id: "sq30", name: "Vuông 30×30", dim: "30 × 30 cm", w: 30, h: 30, tag: "Bán chạy nhất" },
  { id: "sq25", name: "Vuông 25×25", dim: "25 × 25 cm", w: 25, h: 25, tag: "Gọn nhẹ" },
  { id: "ls32", name: "Ngang 30×20", dim: "30 × 20 cm", w: 30, h: 20, tag: "Kể chuyện" },
  { id: "ls43", name: "Ngang 40×30", dim: "40 × 30 cm", w: 40, h: 30, tag: "Khổ lớn" },
  { id: "pt23", name: "Dọc 20×30", dim: "20 × 30 cm", w: 20, h: 30, tag: "Chân dung" },
  { id: "a4l", name: "A4 Ngang", dim: "29.7 × 21 cm", w: 29.7, h: 21, tag: "Tiêu chuẩn" },
  { id: "a4p", name: "A4 Dọc", dim: "21 × 29.7 cm", w: 21, h: 29.7, tag: "Tiêu chuẩn" },
  { id: "sq20", name: "Vuông 20×20", dim: "20 × 20 cm", w: 20, h: 20, tag: "Mini" },
];

type Tpl = { id: string; name: string; cat: string; page: string; ink: string; font: string; sample: string; upper?: boolean };
const CM = "var(--font-cormorant), serif";
const SC = "var(--font-script), cursive";
const TEMPLATES: Tpl[] = [
  { id: "blanc", name: "Blanc", cat: "Hiện đại", page: "#ffffff", ink: "#17181a", font: CM, sample: "Blanc" },
  { id: "grid", name: "Grid Studio", cat: "Hiện đại", page: "#f5f4f1", ink: "#1b1b1b", font: "var(--font-manrope), sans-serif", sample: "STUDIO", upper: true },
  { id: "vogue", name: "Éditorial", cat: "Editorial", page: "#fbfaf8", ink: "#111111", font: CM, sample: "Vol. 01" },
  { id: "kinfolk", name: "Kinfolk", cat: "Editorial", page: "#f2f0ea", ink: "#2a2723", font: CM, sample: "Moments" },
  { id: "amour", name: "Amour", cat: "Lãng mạn", page: "#fbf5ef", ink: "#4a3b34", font: SC, sample: "Amour" },
  { id: "bloom", name: "Bloom", cat: "Lãng mạn", page: "#fcf6f3", ink: "#5b4a45", font: CM, sample: "In Bloom" },
  { id: "noir", name: "Noir", cat: "Sang trọng", page: "#1a1a1c", ink: "#ece7dd", font: CM, sample: "NOIR", upper: true },
  { id: "velvet", name: "Velvet", cat: "Sang trọng", page: "#241d24", ink: "#efe6ea", font: CM, sample: "Velvet" },
  { id: "lumen", name: "Lumen", cat: "Hiện đại", page: "#f7f7f5", ink: "#1c1c1e", font: "var(--font-manrope), sans-serif", sample: "Lumen" },
];
const CATS = ["Tất cả", "Hiện đại", "Editorial", "Lãng mạn", "Sang trọng"];

const STEPS = [
  { key: "size", label: "Khổ giấy" },
  { key: "template", label: "Bộ mẫu" },
  { key: "editor", label: "Chỉnh sửa" },
  { key: "export", label: "Xuất file" },
] as const;
type Step = (typeof STEPS)[number]["key"];

export default function AlbumDesigner() {
  const [step, setStep] = useState<Step>("size");
  const [size, setSize] = useState<Size | null>(null);
  const [customW, setCustomW] = useState("30");
  const [customH, setCustomH] = useState("30");
  const [cat, setCat] = useState("Tất cả");
  const [tpl, setTpl] = useState<Tpl | null>(null);

  const stepIdx = STEPS.findIndex((s) => s.key === step);
  const reachable = (i: number) => i === 0 || (i <= 1 && !!size) || (i <= 2 && !!size && !!tpl) || i <= stepIdx;

  const eyebrow = "text-[11px] font-bold uppercase tracking-[0.05em]";
  const h2 = "text-[26px] font-extrabold tracking-tight sm:text-[28px]";
  const card = "rounded-2xl p-4 transition-all";
  const cardStyle: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)", boxShadow: "0 1px 2px rgba(20,24,33,.05), 0 8px 24px rgba(20,24,33,.05)" };

  return (
    <div className="animate-[vkFade_.5s_ease_both] pb-16">
      {/* Step bar */}
      <div className="mb-8 flex flex-wrap items-center gap-2">
        {STEPS.map((s, i) => {
          const done = i < stepIdx;
          const active = i === stepIdx;
          const can = reachable(i);
          return (
            <button
              key={s.key}
              onClick={() => can && setStep(s.key)}
              disabled={!can}
              className="flex items-center gap-2 rounded-full px-3 py-1.5 text-sm font-semibold disabled:opacity-40"
              style={{ background: active ? "var(--brandSoft)" : "transparent", color: active ? "var(--brand)" : "var(--text2)" }}
            >
              <span className="flex h-6 w-6 items-center justify-center rounded-full text-xs font-bold" style={{ background: done || active ? "var(--brand)" : "var(--surface2)", color: done || active ? "#fff" : "var(--text3)" }}>
                {done ? <Check size={13} /> : i + 1}
              </span>
              {s.label}
            </button>
          );
        })}
      </div>

      {/* STEP 1 — Chọn khổ */}
      {step === "size" && (
        <div className="mx-auto max-w-5xl">
          <div className="mb-6 text-center">
            <span className={eyebrow} style={{ color: "var(--brand)" }}>Bước 1 / 4</span>
            <h1 className={`${h2} mt-1`}>Chọn khổ album</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Chọn khổ in cố định trước khi thiết kế.</p>
          </div>
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
            {SIZES.map((s) => {
              const ar = s.w / s.h;
              const maxPx = 98;
              const pw = ar >= 1 ? maxPx : maxPx * ar;
              const ph = ar >= 1 ? maxPx / ar : maxPx;
              return (
                <button key={s.id} onClick={() => { setSize(s); setStep("template"); }} className={`${card} text-left hover:-translate-y-0.5`} style={cardStyle}>
                  <div className="flex h-[120px] items-center justify-center">
                    <div style={{ width: pw, height: ph, border: "2px solid var(--brand)", borderRadius: 6, background: "linear-gradient(135deg, var(--brandSoft), var(--surface2))" }} />
                  </div>
                  <p className="text-[15px] font-extrabold">{s.name}</p>
                  <p className="text-[12.5px]" style={{ color: "var(--text2)" }}>{s.dim}</p>
                  <p className="mt-0.5 text-[11px] font-semibold" style={{ color: "var(--text3)" }}>{s.tag}</p>
                </button>
              );
            })}
          </div>
          {/* Custom size */}
          <div className={`${card} mt-4 flex flex-wrap items-end gap-3`} style={cardStyle}>
            <div className="flex-1">
              <p className="text-[15px] font-extrabold">Khổ tùy chỉnh</p>
              <p className="text-[12.5px]" style={{ color: "var(--text2)" }}>Nhập kích thước riêng (cm).</p>
            </div>
            <label className="text-xs" style={{ color: "var(--text2)" }}>Rộng
              <input value={customW} onChange={(e) => setCustomW(e.target.value)} inputMode="decimal" className="input ml-2 w-[74px]" />
            </label>
            <label className="text-xs" style={{ color: "var(--text2)" }}>Cao
              <input value={customH} onChange={(e) => setCustomH(e.target.value)} inputMode="decimal" className="input ml-2 w-[74px]" />
            </label>
            <button
              onClick={() => {
                const w = parseFloat(customW) || 30, h = parseFloat(customH) || 30;
                setSize({ id: "custom", name: `Tùy chỉnh ${w}×${h}`, dim: `${w} × ${h} cm`, w, h, tag: "Tùy chỉnh" });
                setStep("template");
              }}
              className="btn-primary gap-1.5"
            >
              Tiếp tục <ArrowRight size={15} />
            </button>
          </div>
        </div>
      )}

      {/* STEP 2 — Chọn mẫu */}
      {step === "template" && (
        <div className="mx-auto max-w-6xl">
          <div className="mb-6 text-center">
            <span className={eyebrow} style={{ color: "var(--brand)" }}>Bước 2 / 4</span>
            <h1 className={`${h2} mt-1`}>Chọn bộ mẫu</h1>
            <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Phông chữ + màu trang + phong cách dàn trang.</p>
          </div>
          <div className="mb-6 flex flex-wrap justify-center gap-2">
            {CATS.map((c) => (
              <button key={c} onClick={() => setCat(c)} className="rounded-full px-3.5 py-1.5 text-sm font-semibold" style={{ background: cat === c ? "var(--brand)" : "var(--surface)", color: cat === c ? "#fff" : "var(--text2)", border: "1px solid var(--border)" }}>{c}</button>
            ))}
          </div>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2 lg:grid-cols-3">
            {TEMPLATES.filter((t) => cat === "Tất cả" || t.cat === cat).map((t) => (
              <button key={t.id} onClick={() => { setTpl(t); setStep("editor"); }} className={`${card} text-left hover:-translate-y-[3px]`} style={cardStyle}>
                <div className="flex h-[150px] items-center justify-center gap-[5px] overflow-hidden rounded-[11px] p-3.5" style={{ background: t.page }}>
                  <span style={{ fontFamily: t.font, color: t.ink, fontSize: 26, textTransform: t.upper ? "uppercase" : "none", letterSpacing: t.upper ? ".08em" : undefined }}>{t.sample}</span>
                </div>
                <div className="mt-3 flex items-center justify-between">
                  <div>
                    <p className="text-[15px] font-extrabold">{t.name}</p>
                    <p className="text-[12px]" style={{ color: "var(--text2)" }}>{t.cat}</p>
                  </div>
                  <span className="rounded-full px-2.5 py-1 text-[11px] font-bold" style={{ color: "var(--brand)", background: "var(--brandSoft)" }}>Dùng mẫu</span>
                </div>
              </button>
            ))}
          </div>
        </div>
      )}

      {/* STEP 3 — Editor */}
      {step === "editor" && size && tpl && (
        <AlbumEditor
          size={{ name: size.name, w: size.w, h: size.h }}
          tpl={{ id: tpl.id, name: tpl.name, page: tpl.page, ink: tpl.ink, font: tpl.font }}
          onBack={() => setStep("template")}
        />
      )}
    </div>
  );
}

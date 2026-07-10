// Visual "skins" for wedding invitation templates. Each template is a palette +
// typography + a few layout flags; the renderer (WeddingRenderer) applies them
// as CSS variables so one renderer can produce several distinct looks.

export type WeddingSkin = {
  name: string;
  label: string;
  accent: string;       // primary accent (overridable by config.accent)
  bg: string;           // page background
  surface: string;      // card background
  text: string;         // body text
  muted: string;        // secondary text
  border: string;
  font: "serif" | "sans";
  hero: "overlay" | "framed"; // cover treatment
  motif: "floral" | "geo" | "none";
  dark: boolean;        // dark templates flip the cover text colour logic
};

export const WEDDING_SKINS: Record<string, WeddingSkin> = {
  classic: {
    name: "classic",
    label: "Cổ điển (be ấm)",
    accent: "#b08968",
    bg: "#fbf7f2",
    surface: "#ffffff",
    text: "#3a3530",
    muted: "rgba(58,53,48,0.62)",
    border: "rgba(58,53,48,0.14)",
    font: "serif",
    hero: "overlay",
    motif: "none",
    dark: false,
  },
  elegant: {
    name: "elegant",
    label: "Sang trọng (tối + vàng)",
    accent: "#c9a86a",
    bg: "#15110d",
    surface: "rgba(255,255,255,0.045)",
    text: "#ece6da",
    muted: "rgba(236,230,218,0.6)",
    border: "rgba(201,168,106,0.28)",
    font: "serif",
    hero: "overlay",
    motif: "geo",
    dark: true,
  },
  floral: {
    name: "floral",
    label: "Hoa (hồng pastel)",
    accent: "#d77a93",
    bg: "#fdf3f4",
    surface: "#ffffff",
    text: "#4a373c",
    muted: "rgba(74,55,60,0.6)",
    border: "rgba(215,122,147,0.22)",
    font: "serif",
    hero: "overlay",
    motif: "floral",
    dark: false,
  },
  modern: {
    name: "modern",
    label: "Hiện đại (tối giản)",
    accent: "#2f7d77",
    bg: "#ffffff",
    surface: "#f5f6f4",
    text: "#232524",
    muted: "rgba(35,37,36,0.55)",
    border: "rgba(35,37,36,0.12)",
    font: "sans",
    hero: "framed",
    motif: "none",
    dark: false,
  },
  cinematic: {
    name: "cinematic", label: "Điện ảnh (tối · chữ viết tay)",
    accent: "#e6c39c", bg: "#171013", surface: "rgba(255,255,255,0.045)", text: "#f4e9df",
    muted: "rgba(244,233,223,0.62)", border: "rgba(230,195,156,0.28)", font: "serif", hero: "overlay", motif: "geo", dark: true,
  },
  story: {
    name: "story", label: "Story trượt (tối · gold)",
    accent: "#e8c9a8", bg: "#0d0a0b", surface: "rgba(255,255,255,0.05)", text: "#f0e6e2",
    muted: "rgba(240,230,226,0.6)", border: "rgba(232,201,168,0.26)", font: "serif", hero: "overlay", motif: "geo", dark: true,
  },
  editorial: {
    name: "editorial", label: "Tạp chí (sáng · cam đất)",
    accent: "#b5624f", bg: "#f4f1ec", surface: "#ffffff", text: "#241f21",
    muted: "#8f867f", border: "#e4ddd3", font: "serif", hero: "framed", motif: "none", dark: false,
  },
  royal: {
    name: "royal", label: "Hoàng gia (kem · vàng · chữ viết tay)",
    accent: "#a67c52", bg: "#f7f1e7", surface: "#fffdf8", text: "#413a30",
    muted: "#9c9483", border: "#e7ddcc", font: "serif", hero: "overlay", motif: "floral", dark: false,
  },
  sweet: {
    name: "sweet", label: "Ngọt ngào (hồng · cuộn dọc đầy đủ)",
    accent: "#c98a86", bg: "#fbeef0", surface: "#fff8f6", text: "#5a3f42",
    muted: "rgba(90,63,66,0.6)", border: "rgba(201,138,134,0.24)", font: "serif", hero: "overlay", motif: "floral", dark: false,
  },
};

export const WEDDING_TEMPLATE_LIST = Object.values(WEDDING_SKINS).map((s) => ({ name: s.name, label: s.label }));

export function getSkin(template?: string): WeddingSkin {
  return WEDDING_SKINS[template ?? "classic"] ?? WEDDING_SKINS.classic;
}

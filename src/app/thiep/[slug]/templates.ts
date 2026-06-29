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
};

export const WEDDING_TEMPLATE_LIST = Object.values(WEDDING_SKINS).map((s) => ({ name: s.name, label: s.label }));

export function getSkin(template?: string): WeddingSkin {
  return WEDDING_SKINS[template ?? "classic"] ?? WEDDING_SKINS.classic;
}

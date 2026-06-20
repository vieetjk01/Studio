import type { SiteTheme, SiteBlockType } from "@/lib/types";

export type SiteTemplate = {
  key: string;
  name: string;
  theme: SiteTheme;
  blocks: { type: SiteBlockType; config: Record<string, unknown> }[];
};

const STANDARD: { type: SiteBlockType; config: Record<string, unknown> }[] = [
  { type: "hero", config: {} },
  { type: "about", config: { heading: "Về tôi", text: "Mình kể chuyện qua từng khung hình." } },
  { type: "gallery", config: { heading: "Bộ sưu tập" } },
  { type: "pricing", config: { heading: "Bảng giá" } },
  { type: "testimonials", config: { heading: "Khách hàng nói gì" } },
  { type: "contact", config: { heading: "Liên hệ" } },
];

/** Starter templates: apply a theme (colours + layout) + a set of blocks. */
export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    key: "classic",
    name: "Cổ điển (tối)",
    theme: { mode: "dark", accent: "#c7a76b", bg: "#0c0c0d", text: "#ececec", font: "serif", heroAlign: "center", galleryCols: 3, radius: "rounded" },
    blocks: STANDARD,
  },
  {
    key: "minimal",
    name: "Tối giản (sáng)",
    theme: { mode: "light", accent: "#111111", bg: "#ffffff", text: "#161616", font: "sans", heroAlign: "left", galleryCols: 3, radius: "sharp" },
    blocks: [
      { type: "hero", config: {} },
      { type: "gallery", config: { heading: "Tác phẩm" } },
      { type: "about", config: { heading: "Giới thiệu", text: "" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "magazine",
    name: "Tạp chí (sáng)",
    theme: { mode: "light", accent: "#a8763a", bg: "#f6f3ee", text: "#211c16", font: "serif", heroAlign: "left", galleryCols: 2, radius: "rounded" },
    blocks: [
      { type: "hero", config: {} },
      { type: "about", config: { heading: "Câu chuyện", text: "" } },
      { type: "gallery", config: { heading: "Album nổi bật" } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chụp cưới | Phóng sự trọn ngày\nPrewedding | Concept theo yêu cầu\nChụp gia đình | Studio & ngoại cảnh" } },
      { type: "testimonials", config: { heading: "Cảm nhận" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "bold",
    name: "Hiện đại (tối)",
    theme: { mode: "dark", accent: "#e0b85c", bg: "#0a0a0f", text: "#f2f2f4", font: "sans", heroAlign: "center", galleryCols: 4, radius: "rounded" },
    blocks: [
      { type: "hero", config: {} },
      { type: "stats", config: { items: "8 năm | Kinh nghiệm\n300+ | Album đã chụp\n100% | Khách hài lòng" } },
      { type: "gallery", config: { heading: "Portfolio" } },
      { type: "video", config: { heading: "Highlight", url: "" } },
      { type: "pricing", config: { heading: "Gói dịch vụ" } },
      { type: "social", config: { heading: "Theo dõi" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "film",
    name: "Chất film (tối ấm)",
    theme: { mode: "dark", accent: "#d8a25e", bg: "#14110d", text: "#ece4d6", font: "serif", heroAlign: "left", galleryCols: 3, radius: "sharp" },
    blocks: STANDARD,
  },
  {
    key: "studio",
    name: "Studio đầy đủ",
    theme: { mode: "dark", accent: "#b9935a", bg: "#11100e", text: "#efece6", font: "serif", heroAlign: "center", galleryCols: 3, radius: "rounded" },
    blocks: [
      { type: "hero", config: {} },
      { type: "gallery", config: { heading: "Album nổi bật" } },
      { type: "pricing", config: { heading: "Các gói dịch vụ" } },
      { type: "video", config: { heading: "Highlight", url: "" } },
      { type: "testimonials", config: { heading: "Cảm nhận khách hàng" } },
      { type: "faq", config: { heading: "Câu hỏi thường gặp", items: "Đặt cọc bao nhiêu? | Studio giữ lịch khi cọc 30%.\nKhi nào nhận ảnh? | Ảnh chỉnh giao trong 15–20 ngày." } },
      { type: "social", config: { heading: "Theo dõi" } },
      { type: "contact", config: { heading: "Liên hệ & đặt lịch" } },
    ],
  },
];

import type { SiteTheme, SiteBlockType } from "@/lib/types";

export type SiteTemplate = {
  key: string;
  name: string;
  theme: SiteTheme;
  blocks: { type: SiteBlockType; config: Record<string, unknown> }[];
};

/** Starter templates: apply a theme + a sensible set of blocks in one click. */
export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    key: "classic",
    name: "Cổ điển (tối)",
    theme: { accent: "#c7a76b", bg: "#0c0c0d", text: "#ececec", font: "serif" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Nhiếp ảnh cưới & chân dung" } },
      { type: "about", config: { heading: "Về tôi", text: "Mình kể chuyện qua từng khung hình.\nMỗi buổi chụp là một kỷ niệm được lưu giữ." } },
      { type: "gallery", config: { heading: "Bộ sưu tập" } },
      { type: "pricing", config: { heading: "Bảng giá" } },
      { type: "testimonials", config: { heading: "Khách hàng nói gì" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "minimal",
    name: "Tối giản (sáng)",
    theme: { accent: "#111111", bg: "#ffffff", text: "#161616", font: "sans" },
    blocks: [
      { type: "hero", config: { heading: "" } },
      { type: "gallery", config: { heading: "Tác phẩm" } },
      { type: "about", config: { heading: "Giới thiệu", text: "" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "studio",
    name: "Studio đầy đủ",
    theme: { accent: "#b9935a", bg: "#11100e", text: "#efece6", font: "serif" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "" } },
      { type: "gallery", config: { heading: "Album nổi bật" } },
      { type: "pricing", config: { heading: "Các gói dịch vụ" } },
      { type: "video", config: { heading: "Highlight", url: "" } },
      { type: "testimonials", config: { heading: "Cảm nhận khách hàng" } },
      { type: "faq", config: { heading: "Câu hỏi thường gặp", items: "Đặt cọc bao nhiêu? | Studio nhận giữ lịch khi cọc 30%.\nKhi nào nhận ảnh? | Ảnh chỉnh giao trong 15–20 ngày." } },
      { type: "social", config: { heading: "Theo dõi" } },
      { type: "contact", config: { heading: "Liên hệ & đặt lịch" } },
    ],
  },
];

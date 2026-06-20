import type { SiteTheme, SiteBlockType } from "@/lib/types";

export type SiteTemplate = {
  key: string;
  name: string;
  thumb: string; // preview image for the picker
  theme: SiteTheme;
  blocks: { type: SiteBlockType; config: Record<string, unknown> }[];
};

// Stable sample photos so a fresh site looks complete (users replace later).
const img = (seed: string, w = 1600, h = 900) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

/** One-click starter templates: theme (colours + layout) + blocks with sample content. */
export const SITE_TEMPLATES: SiteTemplate[] = [
  {
    key: "home",
    name: "Như trang chủ",
    thumb: img("vk-home", 600, 380),
    theme: { mode: "dark", accent: "#c7a76b", bg: "#0b0b0d", text: "#ececec", font: "serif", heroAlign: "center", galleryCols: 3, radius: "rounded", navPosition: "top", heroSize: "medium", contentWidth: "compact" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Nhiếp ảnh gia cưới & chân dung · Studio", image: img("vk-home-hero") } },
      { type: "stats", config: { items: "8 năm | Kinh nghiệm\n300+ | Album\n100% | Khách hài lòng" } },
      { type: "gallery", config: { heading: "Bộ sưu tập nổi bật" } },
      { type: "pricing", config: { heading: "Bảng giá dịch vụ" } },
      { type: "testimonials", config: { heading: "Khách hàng nói gì" } },
      { type: "contact", config: { heading: "Liên hệ & đặt lịch" } },
    ],
  },
  {
    key: "classic",
    name: "Cổ điển",
    thumb: img("vk-classic", 600, 380),
    theme: { mode: "dark", accent: "#c7a76b", bg: "#0c0c0d", text: "#ececec", font: "serif", heroAlign: "center", galleryCols: 3, radius: "rounded" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Nhiếp ảnh cưới & chân dung", image: img("vk-classic-hero") } },
      { type: "about", config: { heading: "Về tôi", text: "Mình kể chuyện qua từng khung hình.\nMỗi buổi chụp là một kỷ niệm được lưu giữ trọn vẹn.", image: img("vk-classic-about", 800, 600) } },
      { type: "gallery", config: { heading: "Bộ sưu tập" } },
      { type: "pricing", config: { heading: "Bảng giá" } },
      { type: "testimonials", config: { heading: "Khách hàng nói gì" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "minimal",
    name: "Tối giản",
    thumb: img("vk-minimal", 600, 380),
    theme: { mode: "light", accent: "#111111", bg: "#ffffff", text: "#161616", font: "sans", heroAlign: "left", galleryCols: 3, radius: "sharp" },
    blocks: [
      { type: "hero", config: { heading: "", image: img("vk-minimal-hero") } },
      { type: "gallery", config: { heading: "Tác phẩm" } },
      { type: "about", config: { heading: "Giới thiệu", text: "Phong cách tối giản, tập trung vào cảm xúc thật.", image: img("vk-minimal-about", 800, 600) } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "magazine",
    name: "Tạp chí",
    thumb: img("vk-magazine", 600, 380),
    theme: { mode: "light", accent: "#a8763a", bg: "#f6f3ee", text: "#211c16", font: "serif", heroAlign: "left", galleryCols: 2, radius: "rounded" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Câu chuyện qua ống kính", image: img("vk-mag-hero") } },
      { type: "about", config: { heading: "Câu chuyện", text: "Mỗi bộ ảnh là một câu chuyện riêng.", image: img("vk-mag-about", 800, 600) } },
      { type: "gallery", config: { heading: "Album nổi bật" } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chụp cưới | Phóng sự trọn ngày\nPrewedding | Concept theo yêu cầu\nChụp gia đình | Studio & ngoại cảnh" } },
      { type: "testimonials", config: { heading: "Cảm nhận" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "bold",
    name: "Hiện đại",
    thumb: img("vk-bold", 600, 380),
    theme: { mode: "dark", accent: "#e0b85c", bg: "#0a0a0f", text: "#f2f2f4", font: "sans", heroAlign: "center", galleryCols: 4, radius: "rounded" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Khoảnh khắc đáng nhớ", image: img("vk-bold-hero") } },
      { type: "stats", config: { items: "8 năm | Kinh nghiệm\n300+ | Album đã chụp\n100% | Khách hài lòng" } },
      { type: "gallery", config: { heading: "Portfolio" } },
      { type: "pricing", config: { heading: "Gói dịch vụ" } },
      { type: "social", config: { heading: "Theo dõi" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "film",
    name: "Chất film",
    thumb: img("vk-film", 600, 380),
    theme: { mode: "dark", accent: "#d8a25e", bg: "#14110d", text: "#ece4d6", font: "serif", heroAlign: "left", galleryCols: 3, radius: "sharp" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Tông màu film hoài niệm", image: img("vk-film-hero") } },
      { type: "about", config: { heading: "Về tôi", text: "Chụp bằng cảm xúc, giữ lại nét mộc mạc.", image: img("vk-film-about", 800, 600) } },
      { type: "gallery", config: { heading: "Bộ sưu tập" } },
      { type: "pricing", config: { heading: "Bảng giá" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "studio",
    name: "Studio đầy đủ",
    thumb: img("vk-studio", 600, 380),
    theme: { mode: "dark", accent: "#b9935a", bg: "#11100e", text: "#efece6", font: "serif", heroAlign: "center", galleryCols: 3, radius: "rounded" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Dịch vụ chụp & quay trọn gói", image: img("vk-studio-hero") } },
      { type: "gallery", config: { heading: "Album nổi bật" } },
      { type: "pricing", config: { heading: "Các gói dịch vụ" } },
      { type: "video", config: { heading: "Highlight", url: "" } },
      { type: "testimonials", config: { heading: "Cảm nhận khách hàng" } },
      { type: "faq", config: { heading: "Câu hỏi thường gặp", items: "Đặt cọc bao nhiêu? | Studio giữ lịch khi cọc 30%.\nKhi nào nhận ảnh? | Ảnh chỉnh giao trong 15–20 ngày." } },
      { type: "social", config: { heading: "Theo dõi" } },
      { type: "contact", config: { heading: "Liên hệ & đặt lịch" } },
    ],
  },
  {
    key: "side-minimal",
    name: "Tối giản · menu trái",
    thumb: img("vk-side", 600, 380),
    theme: { mode: "light", accent: "#1a1a1a", bg: "#fbfbfa", text: "#1a1a1a", font: "sans", heroAlign: "left", galleryCols: 3, radius: "sharp", navPosition: "left", heroSize: "small" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Nhiếp ảnh tối giản", image: img("vk-side-hero") } },
      { type: "gallery", config: { heading: "Tác phẩm" } },
      { type: "about", config: { heading: "Giới thiệu", text: "Ít chi tiết thừa — chỉ còn cảm xúc.", image: img("vk-side-about", 800, 600) } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chân dung | Studio & ngoại cảnh\nSự kiện | Phóng sự\nThương mại | Sản phẩm" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
  {
    key: "mono-dark",
    name: "Tối thanh lịch",
    thumb: img("vk-mono", 600, 380),
    theme: { mode: "dark", accent: "#eaeaea", bg: "#0b0b0b", text: "#eaeaea", font: "sans", heroAlign: "center", galleryCols: 4, radius: "sharp", navPosition: "top", heroSize: "small" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Đen trắng · tinh tế", image: img("vk-mono-hero") } },
      { type: "gallery", config: { heading: "Portfolio" } },
      { type: "stats", config: { items: "10 năm | Kinh nghiệm\n500+ | Dự án" } },
      { type: "contact", config: { heading: "Liên hệ" } },
    ],
  },
];

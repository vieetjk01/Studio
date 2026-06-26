import type { SiteTheme, SiteBlockType } from "@/lib/types";

export type SiteTemplate = {
  key: string;
  name: string;
  tag: string;          // one-line description shown under the name
  thumb: string;        // preview image for the picker
  theme: SiteTheme;
  blocks: { type: SiteBlockType; config: Record<string, unknown> }[];
};

/**
 * Thông tin người dùng nhập 1 lần ở form "Bắt đầu nhanh". Khi chọn mẫu, các
 * thông tin này được điền tự động vào các khối tương ứng để người dùng gần như
 * không phải chỉnh sửa gì thêm.
 */
export type SiteIntake = {
  brand: string;       // tên studio / thương hiệu (tiêu đề hero)
  tagline: string;     // câu giới thiệu ngắn (dưới hero)
  about: string;       // đoạn giới thiệu về studio
  services: string;    // mỗi dòng: "Tên dịch vụ | mô tả"
  stats: string;       // mỗi dòng: "Con số | nhãn"
  email: string;
  address: string;
  facebook: string;
  instagram: string;
  ctaText: string;     // câu kêu gọi đặt lịch
};

export const EMPTY_INTAKE: SiteIntake = {
  brand: "", tagline: "", about: "", services: "", stats: "",
  email: "", address: "", facebook: "", instagram: "", ctaText: "",
};

// Stable sample photos so a fresh site looks complete (users replace later).
const img = (seed: string, w = 1600, h = 900) => `https://picsum.photos/seed/${seed}/${w}/${h}`;

/**
 * Thumbnail tĩnh cho mỗi mẫu — vẽ bằng SVG đúng theo bảng màu / phông / bo góc
 * của chính mẫu đó, nên ảnh xem trước luôn khớp với giao diện thật và không phụ
 * thuộc dịch vụ ảnh bên ngoài.
 */
function makeThumb(t: SiteTheme, label: string): string {
  const bg = t.bg || "#111";
  const text = t.text || "#eee";
  const accent = t.accent || "#c7a76b";
  const serif = t.font !== "sans";
  const family = serif ? "Georgia,serif" : "Helvetica,Arial,sans-serif";
  const r = t.radius === "sharp" ? 0 : 12;
  const center = t.heroAlign !== "left";
  const titleX = center ? 300 : 40;
  const anchor = center ? "middle" : "start";
  const underlineX = center ? 230 : 40;
  const svg = `<svg xmlns='http://www.w3.org/2000/svg' width='600' height='380' viewBox='0 0 600 380'>
  <rect width='600' height='380' fill='${bg}'/>
  <rect x='40' y='28' width='88' height='9' rx='4' fill='${accent}'/>
  <rect x='452' y='28' width='108' height='9' rx='4' fill='${text}' opacity='0.28'/>
  <text x='${titleX}' y='168' font-family='${family}' font-size='46' font-style='${serif ? "italic" : "normal"}' fill='${text}' text-anchor='${anchor}'>${label}</text>
  <rect x='${underlineX}' y='192' width='140' height='7' rx='3.5' fill='${accent}'/>
  <rect x='${center ? 180 : 40}' y='214' width='${center ? 240 : 300}' height='6' rx='3' fill='${text}' opacity='0.30'/>
  <rect x='40' y='258' width='168' height='92' rx='${r}' fill='${accent}' opacity='0.20'/>
  <rect x='216' y='258' width='168' height='92' rx='${r}' fill='${text}' opacity='0.12'/>
  <rect x='392' y='258' width='168' height='92' rx='${r}' fill='${accent}' opacity='0.14'/>
</svg>`;
  return `data:image/svg+xml,${encodeURIComponent(svg)}`;
}

/**
 * Điền thông tin người dùng vào các khối của mẫu. Chỉ ghi đè khi người dùng có
 * nhập (field không rỗng) — còn lại giữ nguyên nội dung mẫu để trang vẫn đẹp.
 */
export function personalizeBlocks(
  blocks: { type: SiteBlockType; config: Record<string, unknown> }[],
  intake: SiteIntake,
): { type: SiteBlockType; config: Record<string, unknown> }[] {
  const has = (v: string) => typeof v === "string" && v.trim().length > 0;
  return blocks.map((b) => {
    const config = { ...b.config };
    switch (b.type) {
      case "hero":
        if (has(intake.brand)) config.heading = intake.brand;
        if (has(intake.tagline)) config.subheading = intake.tagline;
        break;
      case "about":
        if (has(intake.about)) config.text = intake.about;
        break;
      case "services":
        if (has(intake.services)) config.items = intake.services;
        break;
      case "stats":
        if (has(intake.stats)) config.items = intake.stats;
        break;
      case "contact":
        if (has(intake.email)) config.email = intake.email;
        if (has(intake.address)) config.address = intake.address;
        break;
      case "map":
        if (has(intake.address)) config.address = intake.address;
        break;
      case "social":
        if (has(intake.facebook)) config.facebook = intake.facebook;
        if (has(intake.instagram)) config.instagram = intake.instagram;
        break;
      case "cta":
        if (has(intake.ctaText)) config.text = intake.ctaText;
        break;
      case "quote":
        if (has(intake.brand)) config.author = intake.brand;
        break;
    }
    return { type: b.type, config };
  });
}

/** True nếu người dùng đã nhập ít nhất 1 thông tin. */
export function intakeHasContent(i: SiteIntake): boolean {
  return Object.values(i).some((v) => typeof v === "string" && v.trim().length > 0);
}

/**
 * 5 mẫu giao diện sẵn — mỗi mẫu là theme (màu + bố cục) + các khối có nội dung
 * mẫu. Người dùng đổi màu, sửa nội dung, thêm/bớt khối tuỳ ý sau khi áp dụng.
 */
const RAW_TEMPLATES: Omit<SiteTemplate, "thumb">[] = [
  // 1) Sang trọng — fine-art wedding (Maison): nền tối, vàng champagne, serif.
  {
    key: "maison",
    name: "Sang trọng",
    tag: "Áo cưới cao cấp · nền tối, vàng champagne",
    theme: { mode: "dark", accent: "#a08850", bg: "#16140f", text: "#ece6d8", font: "serif", heroAlign: "center", galleryCols: 4, radius: "sharp", heroSize: "large", contentWidth: "compact" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Khoảnh khắc vĩnh cửu · Studio áo cưới cao cấp", image: img("vk-maison-hero") } },
      { type: "quote", config: { text: "Một đám cưới đẹp không nằm ở sự cầu kỳ, mà ở những ánh nhìn chân thật được giữ lại mãi mãi.", author: "Maison Atelier" } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chụp ngày cưới | Trọn vẹn ngày trọng đại theo phong cách phóng sự nhẹ nhàng, không dàn dựng.\nPre-wedding | Buổi chụp đôi tại studio hoặc ngoại cảnh, định hình phong cách riêng.\nAlbum & in ấn | Album thủ công bìa vải, in fine-art lưu giữ chất lượng qua thời gian." } },
      { type: "gallery", config: { heading: "Bộ sưu tập" } },
      { type: "about", config: { heading: "Về studio", text: "Thành lập năm 2014, chúng tôi là studio áo cưới chuyên dòng ảnh fine-art.\nMỗi năm chỉ nhận một số lượng giới hạn để dành trọn tâm sức cho từng cặp đôi.", image: img("vk-maison-about", 800, 600) } },
      { type: "stats", config: { items: "2014 | Năm thành lập\n300+ | Cặp đôi\n100% | Khách hài lòng" } },
      { type: "testimonials", config: { heading: "Cảm nhận" } },
      { type: "cta", config: { heading: "Hãy kể cho chúng tôi câu chuyện của bạn", text: "Đặt lịch tư vấn cho mùa cưới 2026.", button: "Đặt lịch tư vấn" } },
      { type: "contact", config: { heading: "Liên hệ", email: "hello@studio.vn", address: "24 Lê Lợi, Quận 1, TP.HCM" } },
      { type: "map", config: { heading: "Ghé studio", address: "24 Lê Lợi, Quận 1, TP.HCM" } },
    ],
  },

  // 2) Hoài niệm — film/vintage: tông nâu rust, giấy ngà, serif cổ điển.
  {
    key: "vintage",
    name: "Hoài niệm",
    tag: "Chất film cổ điển · tông nâu ấm, giấy ngà",
    theme: { mode: "light", accent: "#9c5a36", bg: "#ece3d2", text: "#3c3326", font: "serif", heroAlign: "left", galleryCols: 3, radius: "sharp", heroSize: "large" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Tình yêu, kể bằng chất phim hoài niệm", image: img("vk-vintage-hero") } },
      { type: "quote", config: { text: "Những khung hình ấm áp, hạt mịn — tựa như ký ức được giữ trong ngăn kéo.", author: "Hồi Niệm Studio" } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chụp phim ngày cưới | Máy phim 35mm & medium format, tráng rọi thủ công giữ trọn sắc độ ấm.\nPre-wedding hoài cổ | Bối cảnh vintage, trang phục và đạo cụ gợi nhớ một thời đã qua.\nAlbum bọc da | Album bìa da thật khâu tay, ảnh in fine-art lưu giữ hàng chục năm." } },
      { type: "gallery", config: { heading: "Khung kỷ niệm" } },
      { type: "about", config: { heading: "Về studio", text: "Từ năm 1998, chúng tôi giữ nguyên cách chụp film truyền thống — tráng rọi thủ công trong phòng tối ngay tại studio.\nMột không gian nhỏ ấm cúng giữa lòng phố cổ.", image: img("vk-vintage-about", 800, 600) } },
      { type: "testimonials", config: { heading: "Cảm nhận" } },
      { type: "cta", config: { heading: "Lưu giữ ngày của bạn trên thước phim", text: "Hẹn buổi chụp cùng chúng tôi.", button: "Hẹn buổi chụp" } },
      { type: "contact", config: { heading: "Liên hệ", email: "hello@studio.vn", address: "12 Hàng Bạc, Hoàn Kiếm, Hà Nội" } },
      { type: "map", config: { heading: "Ghé studio", address: "12 Hàng Bạc, Hoàn Kiếm, Hà Nội" } },
    ],
  },

  // 3) Lãng mạn — pastel hồng, Cormorant serif, bo tròn, dịu dàng.
  {
    key: "flora",
    name: "Lãng mạn",
    tag: "Pastel hồng ngọt ngào · bo tròn mềm mại",
    theme: { mode: "light", accent: "#c98a92", bg: "#fbf4f3", text: "#4a3a3e", font: "serif", heroAlign: "center", galleryCols: 3, radius: "rounded", heroSize: "medium" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Yêu thương nở hoa · Studio áo cưới lãng mạn", image: img("vk-flora-hero") } },
      { type: "quote", config: { text: "Tình yêu là khu vườn, và ngày cưới là mùa hoa rực rỡ nhất.", author: "Flora" } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chụp ngày cưới | Phóng sự nhẹ nhàng, bắt trọn từng cảm xúc ngọt ngào của ngày trọng đại.\nPre-wedding | Buổi chụp đôi với hoa tươi và bối cảnh lãng mạn theo mùa.\nAlbum & hoa | Album bìa vải pastel kèm thiết kế hoa tươi riêng cho cặp đôi." } },
      { type: "gallery", config: { heading: "Khoảnh khắc ngọt ngào" } },
      { type: "about", config: { heading: "Về studio", text: "Flora là studio áo cưới theo phong cách lãng mạn, ngọt ngào.\nChúng tôi yêu hoa tươi, ánh sáng mềm và những cảm xúc dịu dàng trong từng khung hình.", image: img("vk-flora-about", 800, 600) } },
      { type: "testimonials", config: { heading: "Khách hàng nói gì" } },
      { type: "cta", config: { heading: "Hãy để chúng tôi kể chuyện tình của bạn", text: "Đặt lịch tư vấn miễn phí.", button: "Đặt lịch tư vấn" } },
      { type: "contact", config: { heading: "Liên hệ", email: "hello@studio.vn", address: "56 Phan Xích Long, Phú Nhuận, TP.HCM" } },
    ],
  },

  // 4) Câu chuyện — nhiếp ảnh gia cá nhân, editorial ấm, bố cục lệch trái.
  {
    key: "story",
    name: "Câu chuyện",
    tag: "Nhiếp ảnh gia cá nhân · editorial ấm",
    theme: { mode: "light", accent: "#a6552f", bg: "#f8f5f0", text: "#241f1a", font: "serif", heroAlign: "left", galleryCols: 3, radius: "sharp", heroSize: "medium" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Mỗi bức ảnh là một câu chuyện", image: img("vk-story-hero") } },
      { type: "about", config: { heading: "Về tôi", text: "Tôi cầm máy lần đầu năm 16 tuổi với chiếc máy phim của bố. Từ đó, nhiếp ảnh trở thành cách tôi nhìn và hiểu thế giới.\nHôm nay, tôi chụp chân dung, cưới và những dự án cá nhân — luôn đặt cảm xúc thật lên trên mọi kỹ thuật.", image: img("vk-story-about", 800, 600) } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chân dung cá nhân | Buổi chụp 2 giờ, định hình phong cách riêng của bạn.\nChụp cưới kể chuyện | Phóng sự trọn ngày theo dòng cảm xúc tự nhiên.\nDự án cá nhân | Đồng hành cùng bạn trong các dự án sáng tạo riêng." } },
      { type: "gallery", config: { heading: "Tác phẩm" } },
      { type: "quote", config: { text: "Tôi đi tìm những khoảnh khắc thật của con người và lưu giữ chúng.", author: "" } },
      { type: "cta", config: { heading: "Kể câu chuyện của bạn", text: "Còn vài lịch trống cho mùa cuối năm 2026.", button: "Liên hệ với tôi" } },
      { type: "social", config: { heading: "Theo dõi", facebook: "", instagram: "" } },
      { type: "contact", config: { heading: "Liên hệ", email: "hello@studio.vn", address: "27 Trần Phú, Hải Châu, Đà Nẵng" } },
    ],
  },

  // 6) Sự kiện — media/event company, nền đen acid-yellow (từ mediadynamic.dc.html).
  {
    key: "media-event",
    name: "Sự kiện",
    tag: "Media sự kiện · nền đen, nhấn xanh neon",
    theme: { mode: "dark", accent: "#c6ff3d", bg: "#08090c", text: "#f3f5f8", font: "sans", heroAlign: "left", galleryCols: 3, radius: "rounded", heroSize: "large", contentWidth: "full" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Chúng tôi quay sự kiện sống động · Concert, ra mắt, hội nghị", image: img("vk-media-ev-hero") } },
      { type: "stats", config: { items: "500+ | Sự kiện đã quay\n12 | Năm kinh nghiệm\n4K | Chuẩn sản xuất\n48h | Giao aftermovie" } },
      { type: "services", config: { heading: "Chúng tôi làm gì", items: "Aftermovie sự kiện | Dựng video highlight cảm xúc cao, giao trong 48 giờ.\nLivestream đa camera | Phát trực tiếp nhiều góc máy, chuyển cảnh chuyên nghiệp.\nẢnh phóng sự | Ekip ảnh bắt trọn không khí và khoảnh khắc quan trọng.\nTVC & quảng cáo | Sản xuất video thương hiệu từ ý tưởng đến hậu kỳ." } },
      { type: "gallery", config: { heading: "Dự án nổi bật" } },
      { type: "cta", config: { heading: "Sẵn sàng lên sóng?", text: "Liên hệ để nhận báo giá và tư vấn miễn phí.", button: "Bắt đầu dự án" } },
      { type: "contact", config: { heading: "Liên hệ", email: "hi@studio.vn", address: "TP. Hồ Chí Minh" } },
    ],
  },

  // 7) Doanh nghiệp — corporate media, xanh dương sạch (từ mediacorporate.dc.html).
  {
    key: "media-corporate",
    name: "Doanh nghiệp",
    tag: "Corporate · nền trắng, xanh dương chuyên nghiệp",
    theme: { mode: "light", accent: "#1d5fd6", bg: "#ffffff", text: "#0f1b2d", font: "sans", heroAlign: "left", galleryCols: 3, radius: "rounded", heroSize: "large", contentWidth: "compact" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Sản xuất media sự kiện chuyên nghiệp cho doanh nghiệp", image: img("vk-media-corp-hero") } },
      { type: "services", config: { heading: "Dịch vụ toàn diện", items: "Quay phim sự kiện | Đội ngũ nhiều máy quay, ghi hình hội nghị và sự kiện quy mô lớn.\nChụp ảnh phóng sự | Ảnh chất lượng cao, bàn giao nhanh ngay trong sự kiện.\nLivestream chuyên nghiệp | Phát trực tiếp đa nền tảng, ổn định, đồ hoạ thương hiệu.\nHậu kỳ & aftermovie | Dựng phim recap, TVC và nội dung truyền thông sau sự kiện." } },
      { type: "stats", config: { items: "800+ | Sự kiện\n150+ | Khách doanh nghiệp\n15 | Năm hoạt động\n24h | Phản hồi báo giá" } },
      { type: "gallery", config: { heading: "Dự án tiêu biểu" } },
      { type: "cta", config: { heading: "Cùng tạo nên sự kiện đáng nhớ", text: "Nhận tư vấn và báo giá trong vòng 24 giờ.", button: "Liên hệ ngay" } },
      { type: "contact", config: { heading: "Thông tin liên hệ", email: "contact@studio.vn", address: "Hà Nội" } },
      { type: "map", config: { heading: "Ghé văn phòng", address: "Hà Nội" } },
    ],
  },

  // 8) Tối giản — nhiếp ảnh cá nhân, trắng tinh serif (từ photographerminimal.dc.html).
  {
    key: "photographer-minimal",
    name: "Tối giản",
    tag: "Nhiếp ảnh cá nhân · trắng tinh, serif thanh nhã",
    theme: { mode: "light", accent: "#16160f", bg: "#fbfbfa", text: "#16160f", font: "serif", heroAlign: "left", galleryCols: 2, radius: "sharp", heroSize: "large", contentWidth: "full" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Ánh sáng & con người · Tuyển tập 2020–2026", image: img("vk-photo-min-hero") } },
      { type: "gallery", config: { heading: "Tác phẩm" } },
      { type: "quote", config: { text: "Tôi không sắp đặt khoảnh khắc. Tôi chờ nó đến, rồi giữ lại bằng ánh sáng.", author: "" } },
      { type: "about", config: { heading: "Về tôi", text: "Tôi cầm máy lần đầu với chiếc máy phim của bố. Từ đó, nhiếp ảnh trở thành cách tôi nhìn và hiểu thế giới.\nHôm nay tôi chụp chân dung, đôi lứa và những dự án cá nhân — luôn đặt cảm xúc thật lên trên mọi kỹ thuật.", image: img("vk-photo-min-about", 800, 600) } },
      { type: "contact", config: { heading: "Cùng chụp nhé?", email: "hello@studio.vn", address: "" } },
    ],
  },

  // 5) Hiện đại — editorial, Bodoni-ish serif, vàng nâu, bố cục lệch.
  {
    key: "editorial",
    name: "Hiện đại",
    tag: "Editorial thanh lịch · vàng nâu, hiện đại",
    theme: { mode: "light", accent: "#9a7b53", bg: "#f4f1ec", text: "#211d18", font: "serif", heroAlign: "left", galleryCols: 3, radius: "rounded", heroSize: "large" },
    blocks: [
      { type: "hero", config: { heading: "", subheading: "Ngày của hai ta · Studio áo cưới hiện đại", image: img("vk-editorial-hero") } },
      { type: "quote", config: { text: "Một bức ảnh đẹp không kể lại sự kiện — nó giữ lại cảm xúc.", author: "Vows Studio" } },
      { type: "gallery", config: { heading: "Bộ sưu tập" } },
      { type: "services", config: { heading: "Dịch vụ", items: "Chụp ngày cưới | Phóng sự trọn ngày, bắt trọn từng cảm xúc thật khi nó diễn ra.\nPre-wedding | Buổi chụp đôi theo concept hiện đại, định hình phong cách riêng.\nAlbum thiết kế | Album layout tinh giản, in fine-art lưu giữ chất lượng qua thời gian." } },
      { type: "about", config: { heading: "Về studio", text: "Thành lập năm 2017, chúng tôi theo đuổi phong cách cưới hiện đại, tinh giản.\nMỗi cặp đôi nhận một bộ ảnh và album được thiết kế riêng, chỉn chu đến từng chi tiết.", image: img("vk-editorial-about", 800, 600) } },
      { type: "testimonials", config: { heading: "Cảm nhận" } },
      { type: "cta", config: { heading: "Cùng kể câu chuyện của bạn", text: "Đặt lịch tư vấn cho mùa cưới 2026.", button: "Đặt lịch tư vấn" } },
      { type: "social", config: { heading: "Theo dõi", facebook: "", instagram: "" } },
      { type: "contact", config: { heading: "Liên hệ", email: "studio@vows.vn", address: "88 Hai Bà Trưng, Hoàn Kiếm, Hà Nội" } },
    ],
  },
];

export const SITE_TEMPLATES: SiteTemplate[] = RAW_TEMPLATES.map((t) => ({
  ...t,
  thumb: makeThumb(t.theme, t.name),
}));

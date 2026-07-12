// ────────────────────────────────────────────────────────────────────────────
//  NỘI DUNG TRANG VIEETJK.COM  —  CHỖ CHỈNH SỬA TẬP TRUNG (song ngữ VI / EN)
//  Mọi chữ, mô tả, gói dịch vụ nằm ở đây. Mỗi chuỗi có 2 bản: { vi, en }.
//
//  ⚠️ Bảng giá CƯỚI & ĐÍNH HÔN lấy động từ "Bảng giá studio" trong dashboard
//     mstudo (Dashboard → Studio → Bảng giá). Ở đây chỉ chọn GÓI CHÍNH nào hiện.
// ────────────────────────────────────────────────────────────────────────────

export type Lang = "vi" | "en";
export type T = { vi: string; en: string };
/** Lấy chuỗi theo ngôn ngữ. */
export const tr = (lang: Lang, t: T): string => t[lang];

/** Màu đỏ thương hiệu (theo logo). */
export const VJK_RED = "#c1121f";

export const BRAND = {
  domain: "vieetjk.com",
  name: "VIEETJK",
  tagline: { vi: "Quay phim · Chụp ảnh · Quảng Ngãi", en: "Film · Photography · Quảng Ngãi" },
  heroTitle: {
    vi: "Lưu giữ khoảnh khắc,\nkể câu chuyện của bạn",
    en: "Capture the moment,\ntell your story",
  },
  heroSub: {
    vi: "Studio quay phim & chụp ảnh tại Quảng Ngãi — đồng hành cùng bạn trong ngày cưới, sự kiện và hình ảnh doanh nghiệp.",
    en: "A film & photography studio in Quảng Ngãi — by your side for weddings, events and business imagery.",
  },
};

// ── Chuỗi giao diện dùng chung ──────────────────────────────────────────────
export const UI = {
  navHome: { vi: "Trang chủ", en: "Home" },
  navContact: { vi: "Liên hệ", en: "Contact" },
  book: { vi: "Đặt lịch", en: "Book" },
  bookNow: { vi: "Đặt lịch ngay", en: "Book now" },
  viewPricing: { vi: "Xem bảng giá", en: "View pricing" },
  contactInfo: { vi: "Thông tin liên hệ", en: "Contact info" },
  ourWork: { vi: "Sản phẩm", en: "Our work" },
  pricing: { vi: "Bảng giá", en: "Pricing" },
  services: { vi: "Dịch vụ", en: "Services" },
  servicesTitle: { vi: "Ba mảng dịch vụ chính", en: "Three core services" },
  servicesLead: {
    vi: "Chọn dịch vụ để xem chi tiết, sản phẩm và bảng giá riêng của từng mảng.",
    en: "Choose a service to see its details, work and dedicated pricing.",
  },
  bookPickTitle: { vi: "Đặt lịch chụp", en: "Book a session" },
  bookPickLead: {
    vi: "Chọn loại dịch vụ để đặt lịch — bảng giá tương ứng sẽ hiện ở bước đặt lịch.",
    en: "Choose a service to book — its pricing appears on the booking page.",
  },
  bookThis: { vi: "Đặt lịch dịch vụ này", en: "Book this service" },
  viewService: { vi: "Xem chi tiết", en: "Learn more" },
  wedding: { vi: "Đám cưới", en: "Wedding" },
  engagement: { vi: "Đính hôn", en: "Engagement" },
  contactPrice: { vi: "Liên hệ", en: "Contact" },
  galleryEmpty: {
    vi: "Bộ sưu tập đang được cập nhật. Ghé lại sớm để xem sản phẩm mới của Vieetjk nhé!",
    en: "Our gallery is being updated. Check back soon for new work from Vieetjk!",
  },
  aboutHeading: { vi: "Về Vieetjk", en: "About Vieetjk" },
  aboutTitle: {
    vi: "Kể câu chuyện của bạn bằng hình ảnh",
    en: "Telling your story through images",
  },
  homeWorkTitle: { vi: "Khoảnh khắc chúng tôi đã lưu giữ", en: "Moments we've captured" },
  ctaHomeTitle: { vi: "Sẵn sàng lưu giữ khoảnh khắc của bạn?", en: "Ready to capture your moment?" },
  ctaHomeSub: {
    vi: "Liên hệ Vieetjk để được tư vấn gói dịch vụ phù hợp và nhận báo giá chi tiết.",
    en: "Contact Vieetjk for advice on the right package and a detailed quote.",
  },
  builtWith: { vi: "Được xây dựng với ♥ tại Quảng Ngãi", en: "Made with ♥ in Quảng Ngãi" },
  eventTypesTitle: { vi: "Chúng tôi nhận các sự kiện", en: "Events we cover" },
  processTitle: { vi: "Quy trình làm việc", en: "How we work" },
  bizServicesTitle: { vi: "Dịch vụ hình ảnh doanh nghiệp", en: "Business imagery services" },
  whyUsTitle: { vi: "Vì sao chọn Vieetjk", en: "Why choose Vieetjk" },
};

export const ABOUT = {
  body: {
    vi: "Vieetjk là studio quay phim và chụp ảnh tại Quảng Ngãi. Chúng tôi tin mỗi khoảnh khắc đều xứng đáng được kể lại bằng hình ảnh chân thật và giàu cảm xúc — từ ngày cưới trọng đại, sự kiện sôi động, đến hình ảnh chuyên nghiệp cho doanh nghiệp.",
    en: "Vieetjk is a film and photography studio in Quảng Ngãi. We believe every moment deserves to be told through honest, emotive imagery — from your wedding day to lively events and professional business visuals.",
  },
  stats: [
    { value: "500+", label: { vi: "Dự án đã thực hiện", en: "Projects delivered" } },
    { value: "5+", label: { vi: "Năm kinh nghiệm", en: "Years of experience" } },
    { value: "100%", label: { vi: "Giao file gốc", en: "Original files delivered" } },
  ],
};

export const CONTACT = {
  phone: "0974374744",
  phoneHref: "tel:0974374744",
  zalo: "https://zalo.me/0974374744",
  email: "vieetjk@gmail.com",
  facebook: "https://fb.com/vieetjk",
  tiktok: "https://www.tiktok.com/@vieetjk",
  address: { vi: "Quảng Ngãi", en: "Quảng Ngãi, Vietnam" },
};

// ── Gói CHÍNH của trang Wedding (chọn từ bảng giá mstudo) ────────────────────
// match: các từ khoá để tìm đúng gói trong bảng giá studio (không phân biệt hoa
// thường). Giá lấy từ bảng giá mstudo (list "cuoi" & "dinh-hon").
export type WeddingPkg = { key: string; label: T; note: T; match: string[] };
export const WEDDING_MAIN: WeddingPkg[] = [
  { key: "chup1", label: { vi: "Chụp cơ bản", en: "Basic Photo" }, note: { vi: "1 thợ chụp", en: "1 photographer" }, match: ["phóng sự x1", "truyền thống"] },
  { key: "chup2", label: { vi: "Phóng sự", en: "Reportage" }, note: { vi: "2 thợ chụp", en: "2 photographers" }, match: ["phóng sự x2"] },
  { key: "quay1", label: { vi: "Quay phim", en: "Videography" }, note: { vi: "1 thợ quay", en: "1 videographer" }, match: ["quay cơ bản"] },
  { key: "quay2", label: { vi: "Quay Plus", en: "Video Plus" }, note: { vi: "2 thợ quay", en: "2 videographers" }, match: ["quay plus"] },
  { key: "combo", label: { vi: "Combo trọn gói", en: "Full Combo" }, note: { vi: "2 chụp · 2 quay", en: "2 photo · 2 video" }, match: ["combo"] },
];

// ── Bảng giá dạng thẻ (sự kiện / doanh nghiệp) ──────────────────────────────
export type PriceTier = { name: T; price: T; items: T[]; featured?: boolean };

export type ServiceVariant = "wedding" | "event" | "business";

export type InfoItem = { label: T; desc: T };

export type ServiceContent = {
  slug: string;
  variant: ServiceVariant;
  navLabel: T; // tên trên menu (Wedding cho gọn)
  title: T;
  tagline: T;
  cardDesc: T; // mô tả ngắn cho thẻ dịch vụ ở trang chủ
  intro: T;
  categories: string[]; // loại album map vào gallery
  bookingListKey: string; // list_key dùng ở /book?list=
  // Giá:
  priceListKeys?: string[]; // dùng cho wedding (lấy động từ mstudo)
  priceTiers?: PriceTier[]; // dùng cho event/business
  priceNote?: T;
  // Nội dung riêng theo biến thể:
  infoItems?: InfoItem[]; // loại sự kiện / dịch vụ doanh nghiệp
  process?: InfoItem[]; // quy trình (event)
  whyUs?: InfoItem[]; // lý do chọn (business)
};

export const SERVICES: ServiceContent[] = [
  {
    slug: "cuoi",
    variant: "wedding",
    navLabel: { vi: "Wedding", en: "Wedding" },
    title: { vi: "Cưới & Đính hôn", en: "Wedding & Engagement" },
    tagline: { vi: "Trọn vẹn ngày chung đôi", en: "Your day, beautifully told" },
    cardDesc: {
      vi: "Phóng sự cưới, đính hôn — chụp ảnh và quay phim ghi trọn cảm xúc.",
      en: "Wedding & engagement reportage — photo and film that capture the feeling.",
    },
    intro: {
      vi: "Ngày cưới chỉ diễn ra một lần. Vieetjk theo sát từng khoảnh khắc — ánh mắt, nụ cười, giọt nước mắt hạnh phúc — bằng phong cách phóng sự chân thật, tự nhiên. Nhận chụp ảnh và quay phim cho lễ cưới, đính hôn, đám hỏi.",
      en: "Your wedding happens only once. Vieetjk follows every moment — a glance, a smile, a happy tear — in an honest, natural reportage style. Photo & film for weddings, engagements and betrothals.",
    },
    categories: ["cuoi", "cuoi-hoi", "dinh-hon"],
    bookingListKey: "cuoi",
    priceListKeys: ["cuoi", "dinh-hon"],
    priceNote: {
      vi: "Giá lấy từ bảng giá studio, đã gồm ê-kíp và giao toàn bộ file gốc. Phí đi lại ngoại tỉnh báo riêng.",
      en: "Prices come from the studio price list, including the crew and all original files. Out-of-province travel quoted separately.",
    },
  },
  {
    slug: "su-kien",
    variant: "event",
    navLabel: { vi: "Sự kiện", en: "Events" },
    title: { vi: "Sự kiện", en: "Events" },
    tagline: { vi: "Ghi trọn từng khoảnh khắc", en: "Every moment, captured" },
    cardDesc: {
      vi: "Hội nghị, khai trương, tiệc, gala — chụp và quay chuyên nghiệp.",
      en: "Conferences, openings, parties, galas — professional photo & film.",
    },
    intro: {
      vi: "Mỗi sự kiện là một câu chuyện đáng nhớ. Vieetjk nhận chụp ảnh và quay phim cho hội nghị, khai trương, gala, chương trình nghệ thuật... Giao file nhanh, hình ảnh sắc nét, sẵn sàng cho truyền thông ngay sau sự kiện.",
      en: "Every event is a story worth remembering. Vieetjk photographs and films conferences, openings, galas and performances — fast delivery, crisp imagery ready for media right after the event.",
    },
    categories: ["su-kien"],
    bookingListKey: "su-kien",
    infoItems: [
      { label: { vi: "Hội nghị & Hội thảo", en: "Conferences & Seminars" }, desc: { vi: "Ghi hình chuyên nghiệp, đa góc máy.", en: "Professional multi-angle coverage." } },
      { label: { vi: "Khai trương & Ra mắt", en: "Openings & Launches" }, desc: { vi: "Bắt trọn không khí ngày trọng đại.", en: "Capture the buzz of the big day." } },
      { label: { vi: "Tiệc & Gala", en: "Parties & Galas" }, desc: { vi: "Highlight sống động, cảm xúc.", en: "Lively, emotive highlights." } },
      { label: { vi: "Sinh nhật & Kỷ niệm", en: "Birthdays & Anniversaries" }, desc: { vi: "Lưu giữ khoảnh khắc sum vầy.", en: "Preserve moments together." } },
      { label: { vi: "Chương trình nghệ thuật", en: "Performances & Shows" }, desc: { vi: "Sân khấu ánh sáng, quay đa máy.", en: "Stage-lit, multi-camera filming." } },
      { label: { vi: "Sự kiện thể thao", en: "Sports Events" }, desc: { vi: "Bắt nét những pha hành động.", en: "Sharp action shots." } },
    ],
    process: [
      { label: { vi: "Liên hệ & tư vấn", en: "Contact & consult" }, desc: { vi: "Trao đổi nhu cầu, quy mô sự kiện.", en: "Discuss your needs and scale." } },
      { label: { vi: "Chốt gói & lịch", en: "Confirm & schedule" }, desc: { vi: "Chọn gói, chốt ê-kíp và thời gian.", en: "Choose a package, crew and time." } },
      { label: { vi: "Ghi hình sự kiện", en: "Cover the event" }, desc: { vi: "Ê-kíp có mặt, ghi trọn khoảnh khắc.", en: "Our crew captures every moment." } },
      { label: { vi: "Giao file nhanh", en: "Fast delivery" }, desc: { vi: "Ảnh/video xử lý và giao sớm.", en: "Edited photos/videos delivered fast." } },
    ],
    priceNote: {
      vi: "Mỗi sự kiện có quy mô khác nhau — mức giá dưới đây là tham khảo. Liên hệ để nhận báo giá chi tiết.",
      en: "Every event differs in scale — the prices below are indicative. Contact us for a detailed quote.",
    },
    priceTiers: [
      { name: { vi: "Chụp ảnh sự kiện", en: "Event Photography" }, price: { vi: "từ 2.000.000đ", en: "from 2,000,000₫" }, items: [
        { vi: "1 thợ chụp chuyên nghiệp", en: "1 professional photographer" },
        { vi: "Giao toàn bộ file gốc", en: "All original files delivered" },
        { vi: "Chỉnh sửa 100–150 ảnh", en: "100–150 edited photos" },
        { vi: "Giao ảnh trong 2–3 ngày", en: "Delivered in 2–3 days" },
      ] },
      { name: { vi: "Quay + Chụp sự kiện", en: "Photo + Film" }, price: { vi: "từ 6.000.000đ", en: "from 6,000,000₫" }, featured: true, items: [
        { vi: "1 thợ chụp + 1 thợ quay", en: "1 photographer + 1 videographer" },
        { vi: "Video highlight 3–5 phút", en: "3–5 min highlight video" },
        { vi: "Toàn bộ ảnh + chỉnh sửa", en: "All photos + editing" },
        { vi: "Ưu tiên xử lý & giao nhanh", en: "Priority editing & delivery" },
      ] },
      { name: { vi: "Quay phim sự kiện", en: "Event Filming" }, price: { vi: "từ 4.000.000đ", en: "from 4,000,000₫" }, items: [
        { vi: "1 thợ quay chuyên nghiệp", en: "1 professional videographer" },
        { vi: "Video highlight 3–5 phút", en: "3–5 min highlight video" },
        { vi: "Giao toàn bộ file quay gốc", en: "All original footage" },
        { vi: "Tùy chọn flycam (báo riêng)", en: "Optional drone (quoted separately)" },
      ] },
    ],
  },
  {
    slug: "doanh-nghiep",
    variant: "business",
    navLabel: { vi: "Doanh nghiệp", en: "Business" },
    title: { vi: "Doanh nghiệp", en: "Business" },
    tagline: { vi: "Hình ảnh chuyên nghiệp", en: "Imagery that means business" },
    cardDesc: {
      vi: "Ảnh profile, sản phẩm, TVC — nâng tầm thương hiệu của bạn.",
      en: "Profiles, products, TVC — elevate your brand.",
    },
    intro: {
      vi: "Hình ảnh chuyên nghiệp là bộ mặt của doanh nghiệp. Vieetjk cung cấp dịch vụ chụp ảnh chân dung nhân sự, ảnh sản phẩm, hình ảnh truyền thông và sản xuất video giới thiệu (TVC) — giúp thương hiệu của bạn nổi bật và đáng tin cậy.",
      en: "Professional imagery is the face of your business. Vieetjk offers staff portraits, product photography, media visuals and promotional video (TVC) production — making your brand stand out and feel trustworthy.",
    },
    categories: ["doanh-nghiep"],
    bookingListKey: "doanh-nghiep",
    infoItems: [
      { label: { vi: "Chân dung & Profile", en: "Portraits & Profiles" }, desc: { vi: "Ảnh nhân sự, hồ sơ công ty.", en: "Staff and company profile photos." } },
      { label: { vi: "Ảnh sản phẩm & Catalogue", en: "Product & Catalogue" }, desc: { vi: "Sản phẩm sắc nét, chuẩn thương hiệu.", en: "Crisp, on-brand product shots." } },
      { label: { vi: "Video giới thiệu (TVC)", en: "Promo Video (TVC)" }, desc: { vi: "Kịch bản, quay dựng chuyên nghiệp.", en: "Scripted, professionally produced." } },
      { label: { vi: "Hình ảnh truyền thông", en: "Media & Social" }, desc: { vi: "Nội dung cho website & mạng xã hội.", en: "Content for web & social media." } },
    ],
    whyUs: [
      { label: { vi: "Chuẩn thương hiệu", en: "On brand" }, desc: { vi: "Concept theo nhận diện của bạn.", en: "Concepts built around your identity." } },
      { label: { vi: "Đúng hạn", en: "On time" }, desc: { vi: "Cam kết tiến độ, giao đúng hẹn.", en: "Committed schedules, on-time delivery." } },
      { label: { vi: "Chất lượng cao", en: "High quality" }, desc: { vi: "Thiết bị & hậu kỳ chuyên nghiệp.", en: "Pro gear and post-production." } },
    ],
    priceNote: {
      vi: "Nhu cầu mỗi doanh nghiệp mỗi khác. Mức giá dưới đây là tham khảo — liên hệ để nhận báo giá riêng theo dự án.",
      en: "Every business is different. The prices below are indicative — contact us for a project-based quote.",
    },
    priceTiers: [
      { name: { vi: "Chân dung & Profile", en: "Portraits & Profile" }, price: { vi: "từ 1.500.000đ", en: "from 1,500,000₫" }, items: [
        { vi: "Ảnh chân dung nhân sự", en: "Staff portrait photography" },
        { vi: "Ánh sáng studio / tại văn phòng", en: "Studio or on-site lighting" },
        { vi: "Chỉnh sửa chuyên nghiệp", en: "Professional retouching" },
        { vi: "Giao file độ phân giải cao", en: "High-resolution files" },
      ] },
      { name: { vi: "Sản phẩm & Thương hiệu", en: "Product & Brand" }, price: { vi: "từ 2.500.000đ", en: "from 2,500,000₫" }, featured: true, items: [
        { vi: "Chụp sản phẩm, catalogue", en: "Product & catalogue shots" },
        { vi: "Hình ảnh cho website & MXH", en: "Imagery for web & social" },
        { vi: "Concept theo thương hiệu", en: "On-brand concepts" },
        { vi: "Chỉnh sửa, tách nền theo yêu cầu", en: "Editing & cut-outs on request" },
      ] },
      { name: { vi: "TVC / Video giới thiệu", en: "TVC / Promo Video" }, price: { vi: "từ 8.000.000đ", en: "from 8,000,000₫" }, items: [
        { vi: "Tư vấn kịch bản & concept", en: "Script & concept consulting" },
        { vi: "Quay dựng chuyên nghiệp", en: "Professional shooting & editing" },
        { vi: "Video giới thiệu doanh nghiệp", en: "Company introduction video" },
        { vi: "Tối ưu cho quảng cáo & MXH", en: "Optimised for ads & social" },
      ] },
    ],
  },
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

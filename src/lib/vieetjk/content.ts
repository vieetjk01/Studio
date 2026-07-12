// ────────────────────────────────────────────────────────────────────────────
//  NỘI DUNG TRANG VIEETJK.COM  —  CHỖ CHỈNH SỬA TẬP TRUNG
//  Toàn bộ chữ, mô tả, bảng giá "báo giá riêng" của trang vieetjk nằm ở đây.
//  Muốn đổi tiêu đề, giới thiệu, giá... chỉ cần sửa trong file này rồi lưu lại.
//
//  ⚠️ Bảng giá CƯỚI & ĐÍNH HÔN KHÔNG nằm ở đây — chúng được lấy động từ
//     "Bảng giá studio" trong dashboard mstudo (Dashboard → Studio → Bảng giá).
//     Sửa giá cưới/đính hôn ngay trong dashboard, web sẽ tự cập nhật.
// ────────────────────────────────────────────────────────────────────────────

/** Màu đỏ thương hiệu (theo logo tam giác play). Đổi tại đây nếu cần. */
export const VJK_RED = "#c1121f";

export const BRAND = {
  /** Domain của trang. */
  domain: "vieetjk.com",
  /** Tên hiển thị (wordmark). */
  name: "VIEETJK",
  /** Dòng mô tả ngắn dưới logo. */
  tagline: "Quay phim · Chụp ảnh · Quảng Ngãi",
  /** Câu chốt ngắn trên hero. */
  heroTitle: "Lưu giữ khoảnh khắc,\nkể câu chuyện của bạn",
  heroSub:
    "Studio quay phim & chụp ảnh tại Quảng Ngãi — đồng hành cùng bạn trong ngày cưới, sự kiện và hình ảnh doanh nghiệp.",
};

/** Đoạn giới thiệu studio (khối "Về Vieetjk" ở trang chủ). */
export const ABOUT = {
  heading: "Về Vieetjk",
  body:
    "Vieetjk là studio quay phim và chụp ảnh tại Quảng Ngãi. Chúng tôi tin mỗi " +
    "khoảnh khắc đều xứng đáng được kể lại bằng hình ảnh chân thật và giàu cảm " +
    "xúc — từ ngày cưới trọng đại, sự kiện sôi động, đến hình ảnh chuyên nghiệp " +
    "cho doanh nghiệp. Với đội ngũ tận tâm và con mắt kể chuyện, Vieetjk mang " +
    "đến cho bạn những thước phim và bức ảnh đáng để lưu giữ mãi.",
  stats: [
    { value: "500+", label: "Dự án đã thực hiện" },
    { value: "5+", label: "Năm kinh nghiệm" },
    { value: "100%", label: "Giao file gốc" },
  ],
};

// ── Thông tin liên hệ & mạng xã hội ─────────────────────────────────────────
export const CONTACT = {
  phone: "0974374744",
  phoneHref: "tel:0974374744",
  zalo: "https://zalo.me/0974374744",
  email: "vieetjk@gmail.com",
  facebook: "https://fb.com/vieetjk",
  tiktok: "https://www.tiktok.com/@vieetjk",
  address: "Quảng Ngãi",
};

// ── Ba dịch vụ chính ────────────────────────────────────────────────────────
// slug: đường dẫn trang (vieetjk.com/<slug>)
// categories: các "loại album" trong thư viện mstudo được gom vào gallery của
//             dịch vụ này. Bạn gắn "loại album" cho album trong dashboard là ảnh
//             tự hiện ở đúng dịch vụ.
export type PriceTier = {
  name: string;
  price: string; // hiển thị dạng chữ, vd "từ 2.000.000đ"
  items: string[];
  featured?: boolean;
};

export type ServiceContent = {
  slug: string;
  /** Tên ngắn (thẻ ở trang chủ). */
  title: string;
  /** Câu tagline ngắn cho thẻ. */
  tagline: string;
  /** Mô tả 1 dòng cho thẻ trang chủ. */
  cardDesc: string;
  /** Đoạn giới thiệu dài ở đầu trang dịch vụ. */
  intro: string;
  /** Các loại album (category) map vào gallery của dịch vụ. */
  categories: string[];
  /**
   * Nguồn bảng giá:
   *  - "pricelist": lấy động từ bảng giá studio (list keys ở priceListKeys).
   *  - "tiers": bảng giá "báo giá riêng" cố định ngay bên dưới (priceTiers).
   */
  priceSource: "pricelist" | "tiers";
  priceListKeys?: string[];
  priceNote?: string;
  priceTiers?: PriceTier[];
};

export const SERVICES: ServiceContent[] = [
  {
    slug: "cuoi",
    title: "Cưới & Đính hôn",
    tagline: "Trọn vẹn ngày chung đôi",
    cardDesc: "Phóng sự cưới, đính hôn — chụp ảnh và quay phim ghi trọn cảm xúc.",
    intro:
      "Ngày cưới chỉ diễn ra một lần. Vieetjk theo sát từng khoảnh khắc — ánh " +
      "mắt, nụ cười, giọt nước mắt hạnh phúc — bằng phong cách phóng sự chân " +
      "thật, tự nhiên. Chúng tôi nhận chụp ảnh và quay phim cho lễ cưới, lễ " +
      "đính hôn, đám hỏi tại Quảng Ngãi và các tỉnh lân cận.",
    categories: ["cuoi", "cuoi-hoi", "dinh-hon"],
    priceSource: "pricelist",
    priceListKeys: ["cuoi", "dinh-hon"],
    priceNote:
      "Giá đã bao gồm ê-kíp và giao toàn bộ file gốc. Phí đi lại ngoại tỉnh sẽ " +
      "báo riêng. Liên hệ để được tư vấn gói phù hợp nhất.",
  },
  {
    slug: "su-kien",
    title: "Sự kiện",
    tagline: "Ghi trọn từng khoảnh khắc",
    cardDesc: "Hội nghị, khai trương, tiệc, gala — chụp và quay chuyên nghiệp.",
    intro:
      "Mỗi sự kiện là một câu chuyện đáng nhớ. Vieetjk nhận chụp ảnh và quay " +
      "phim cho hội nghị, khai trương, sinh nhật, tiệc công ty, gala, chương " +
      "trình nghệ thuật... Giao file nhanh, hình ảnh sắc nét, sẵn sàng cho " +
      "truyền thông ngay sau sự kiện.",
    categories: ["su-kien"],
    priceSource: "tiers",
    priceNote:
      "Mỗi sự kiện có quy mô và thời lượng khác nhau — mức giá dưới đây mang " +
      "tính tham khảo. Liên hệ để nhận báo giá chi tiết theo nhu cầu của bạn.",
    priceTiers: [
      {
        name: "Chụp ảnh sự kiện",
        price: "từ 2.000.000đ",
        items: [
          "1 thợ chụp chuyên nghiệp",
          "Giao toàn bộ file gốc",
          "Chỉnh sửa 100–150 ảnh chọn lọc",
          "Giao ảnh trong 2–3 ngày",
        ],
      },
      {
        name: "Quay + Chụp sự kiện",
        price: "từ 6.000.000đ",
        featured: true,
        items: [
          "1 thợ chụp + 1 thợ quay",
          "Video highlight 3–5 phút",
          "Toàn bộ ảnh file gốc + chỉnh sửa",
          "Ưu tiên xử lý & giao nhanh",
        ],
      },
      {
        name: "Quay phim sự kiện",
        price: "từ 4.000.000đ",
        items: [
          "1 thợ quay chuyên nghiệp",
          "Video highlight 3–5 phút",
          "Giao toàn bộ file quay gốc",
          "Tùy chọn flycam (báo riêng)",
        ],
      },
    ],
  },
  {
    slug: "doanh-nghiep",
    title: "Doanh nghiệp",
    tagline: "Hình ảnh chuyên nghiệp",
    cardDesc: "Ảnh profile, sản phẩm, TVC — nâng tầm thương hiệu của bạn.",
    intro:
      "Hình ảnh chuyên nghiệp là bộ mặt của doanh nghiệp. Vieetjk cung cấp dịch " +
      "vụ chụp ảnh chân dung nhân sự, ảnh sản phẩm, hình ảnh truyền thông và " +
      "sản xuất video giới thiệu (TVC) — giúp thương hiệu của bạn nổi bật và " +
      "đáng tin cậy hơn trong mắt khách hàng.",
    categories: ["doanh-nghiep"],
    priceSource: "tiers",
    priceNote:
      "Nhu cầu mỗi doanh nghiệp mỗi khác. Mức giá dưới đây là tham khảo — liên " +
      "hệ để nhận báo giá riêng theo dự án của bạn.",
    priceTiers: [
      {
        name: "Chân dung & Profile",
        price: "từ 1.500.000đ",
        items: [
          "Ảnh chân dung nhân sự",
          "Ánh sáng studio / tại văn phòng",
          "Chỉnh sửa chuyên nghiệp",
          "Giao file độ phân giải cao",
        ],
      },
      {
        name: "Sản phẩm & Thương hiệu",
        price: "từ 2.500.000đ",
        featured: true,
        items: [
          "Chụp sản phẩm, catalogue",
          "Hình ảnh cho website & MXH",
          "Concept & bố cục theo thương hiệu",
          "Chỉnh sửa, tách nền theo yêu cầu",
        ],
      },
      {
        name: "TVC / Video giới thiệu",
        price: "từ 8.000.000đ",
        items: [
          "Tư vấn kịch bản & concept",
          "Quay dựng chuyên nghiệp",
          "Video giới thiệu doanh nghiệp",
          "Tối ưu cho quảng cáo & MXH",
        ],
      },
    ],
  },
];

export function getService(slug: string): ServiceContent | undefined {
  return SERVICES.find((s) => s.slug === slug);
}

"use client";

import {
  createContext,
  useContext,
  useEffect,
  useState,
  type ReactNode,
} from "react";

export type Lang = "vi" | "en";

type Dict = Record<string, { vi: string; en: string }>;

export const dict: Dict = {
  brand: { vi: "Vieetjk", en: "Vieetjk" },
  tagline: {
    vi: "Bộ sưu tập ảnh dành cho khách hàng",
    en: "Photo collection for customers",
  },
  // nav / auth
  login: { vi: "Đăng nhập", en: "Sign in" },
  logout: { vi: "Đăng xuất", en: "Sign out" },
  dashboard: { vi: "Bảng điều khiển", en: "Dashboard" },
  email: { vi: "Email", en: "Email" },
  password: { vi: "Mật khẩu", en: "Password" },
  fullName: { vi: "Họ và tên", en: "Full name" },
  signingIn: { vi: "Đang đăng nhập…", en: "Signing in…" },
  loginSubtitle: {
    vi: "Khu vực dành cho nhiếp ảnh gia & quản trị viên",
    en: "For photographers & administrators",
  },
  // dashboard
  myAlbums: { vi: "Album của tôi", en: "My albums" },
  newAlbum: { vi: "Tạo album", en: "New album" },
  admin: { vi: "Quản trị", en: "Admin" },
  noAlbums: { vi: "Chưa có album nào.", en: "No albums yet." },
  photos: { vi: "ảnh", en: "photos" },
  selections: { vi: "lượt chọn", en: "selections" },
  edit: { vi: "Sửa", en: "Edit" },
  view: { vi: "Xem", en: "View" },
  open: { vi: "Mở", en: "Open" },
  draft: { vi: "Nháp", en: "Draft" },
  published: { vi: "Đã xuất bản", en: "Published" },
  status: { vi: "Trạng thái", en: "Status" },
  showcaseOnHome: { vi: "Hiển thị ngoài trang chủ (album tham khảo)", en: "Show on homepage (reference album)" },
  showcaseHint: {
    vi: "Album sẽ hiện ở mục “Album tham khảo” trên trang chủ — chỉ để xem, không cho chọn ảnh.",
    en: "Appears under “Reference albums” on the homepage — view-only, no selection.",
  },
  pinnedFeatured: { vi: "Ghim nổi bật (ưu tiên hiển thị)", en: "Pin as featured" },
  albumKind: { vi: "Thể loại", en: "Category" },
  // album editor
  albumTitle: { vi: "Tên album", en: "Album title" },
  description: { vi: "Mô tả", en: "Description" },
  slug: { vi: "Đường dẫn (slug)", en: "URL slug" },
  cover: { vi: "Ảnh bìa", en: "Cover image" },
  setCover: { vi: "Đặt làm bìa", en: "Set as cover" },
  albumPassword: { vi: "Mật khẩu album", en: "Album password" },
  passwordHint: {
    vi: "Để trống nếu không cần mật khẩu. Nhập để đặt/đổi.",
    en: "Leave empty for no password. Type to set/change.",
  },
  selectionLimit: { vi: "Giới hạn số ảnh chọn", en: "Selection limit" },
  unlimited: { vi: "Không giới hạn", en: "Unlimited" },
  watermark: { vi: "Watermark", en: "Watermark" },
  watermarkText: { vi: "Chữ watermark", en: "Watermark text" },
  enableWatermark: { vi: "Bật watermark", en: "Enable watermark" },
  sources: { vi: "Nguồn ảnh (Google Drive)", en: "Image sources (Google Drive)" },
  sourceName: { vi: "Tên nhóm", en: "Group name" },
  driveLink: { vi: "Link Drive (file hoặc folder)", en: "Drive link (file or folder)" },
  addSource: { vi: "Thêm nguồn", en: "Add source" },
  syncDrive: { vi: "Đồng bộ ảnh từ Drive", en: "Sync photos from Drive" },
  syncing: { vi: "Đang đồng bộ…", en: "Syncing…" },
  save: { vi: "Lưu", en: "Save" },
  saving: { vi: "Đang lưu…", en: "Saving…" },
  saved: { vi: "Đã lưu", en: "Saved" },
  delete: { vi: "Xóa", en: "Delete" },
  remove: { vi: "Gỡ", en: "Remove" },
  settings: { vi: "Cài đặt", en: "Settings" },
  back: { vi: "Quay lại", en: "Back" },
  // customer view
  enterPassword: { vi: "Nhập mật khẩu để xem album", en: "Enter password to view this album" },
  wrongPassword: { vi: "Mật khẩu không đúng", en: "Wrong password" },
  enter: { vi: "Vào xem", en: "Enter" },
  selectPhotos: { vi: "Chọn ảnh", en: "Select photos" },
  selected: { vi: "đã chọn", en: "selected" },
  selectThis: { vi: "Chọn", en: "Select" },
  deselect: { vi: "Bỏ chọn", en: "Deselect" },
  limitReached: {
    vi: "Đã đạt giới hạn số ảnh được chọn.",
    en: "You have reached the selection limit.",
  },
  yourSelection: { vi: "Ảnh bạn đã chọn", en: "Your selection" },
  exportList: { vi: "Xuất danh sách", en: "Export list" },
  copyList: { vi: "Copy danh sách (không đuôi)", en: "Copy list (no extension)" },
  copied: { vi: "Đã copy!", en: "Copied!" },
  downloadZip: { vi: "Tải ZIP", en: "Download ZIP" },
  preparingZip: { vi: "Đang nén ảnh…", en: "Preparing ZIP…" },
  yourName: { vi: "Tên của bạn (tuỳ chọn)", en: "Your name (optional)" },
  submitSelection: { vi: "Gửi lựa chọn cho photographer", en: "Send selection to photographer" },
  submitted: { vi: "Đã gửi lựa chọn của bạn!", en: "Your selection has been sent!" },
  allPhotos: { vi: "Tất cả", en: "All" },
  // selections view (photographer)
  customerSelections: { vi: "Lượt chọn của khách", en: "Customer selections" },
  note: { vi: "Ghi chú", en: "Note" },
  addNote: { vi: "Thêm ghi chú", en: "Add note" },
  noSelections: { vi: "Chưa có lượt chọn nào.", en: "No selections yet." },
  session: { vi: "Phiên", en: "Session" },
  // admin
  photographers: { vi: "Nhiếp ảnh gia", en: "Photographers" },
  role: { vi: "Vai trò", en: "Role" },
  active: { vi: "Kích hoạt", en: "Active" },
  maxAlbums: { vi: "Giới hạn album", en: "Album limit" },
  monthlyLimit: { vi: "Album/tháng", en: "Albums/month" },
  canZip: { vi: "Cho tải ảnh", en: "Allow download" },
  canNotes: { vi: "Cho ghi chú", en: "Allow notes" },
  update: { vi: "Cập nhật", en: "Update" },
  createUser: { vi: "Tạo tài khoản", en: "Create account" },
  upgrade: { vi: "Nâng cấp", en: "Upgrade" },
  filterPhotos: { vi: "Lọc ảnh", en: "Filter" },
  compressPhotos: { vi: "Nén ảnh", en: "Compress" },
  galleries: { vi: "Gallery khách", en: "Galleries" },
  // homepage
  navHome: { vi: "Trang chủ", en: "Home" },
  navAlbum: { vi: "Album", en: "Albums" },
  navPricing: { vi: "Bảng giá", en: "Pricing" },
  navContact: { vi: "Liên hệ", en: "Contact" },
  bookShoot: { vi: "Đặt lịch chụp", en: "Book a shoot" },
  book: { vi: "Đặt lịch", en: "Book now" },
  contact: { vi: "Liên hệ", en: "Contact" },
  viewAll: { vi: "Xem tất cả", en: "View all" },
  statAlbums: { vi: "Album", en: "Albums" },
  statPhotos: { vi: "Ảnh", en: "Photos" },
  statYears: { vi: "Năm nghề", en: "Years" },
  ebFeatured: { vi: "Tuyển chọn", en: "Featured" },
  hFeatured: { vi: "Hình ảnh nổi bật", en: "Featured photos" },
  ebPhotoAlbum: { vi: "Album ảnh", en: "Photo albums" },
  hPhotoAlbum: { vi: "Bộ ảnh nổi bật", en: "Featured collections" },
  ebVideo: { vi: "Video", en: "Video" },
  hVideo: { vi: "Phim & video", en: "Films & video" },
  ebPricing: { vi: "Bảng giá", en: "Pricing" },
  hPricing: { vi: "Gói dịch vụ", en: "Service packages" },
  pricingDetail: { vi: "Xem chi tiết & lưu ý →", en: "See details & notes →" },
  ebFeedback: { vi: "Cảm nhận", en: "Testimonials" },
  hFeedback: { vi: "Khách hàng nói gì", en: "What clients say" },
  ebBooking: { vi: "Đặt lịch", en: "Booking" },
  hBooking: { vi: "Đặt lịch quay chụp", en: "Book a session" },
  bookingIntro: {
    vi: "Chọn loại dịch vụ và để lại thông tin — Vieetjk sẽ liên hệ trong vòng 24 giờ.",
    en: "Pick a service and leave your details — Vieetjk will get back to you within 24 hours.",
  },
  serviceType: { vi: "Loại dịch vụ", en: "Service type" },
  svcWedding: { vi: "Quay chụp đám cưới", en: "Wedding photo & film" },
  svcWeddingDesc: { vi: "Phóng sự & phim cưới", en: "Reportage & wedding films" },
  svcEvent: { vi: "Quay chụp sự kiện", en: "Event coverage" },
  svcEventDesc: { vi: "Gala · hội nghị · khai trương", en: "Gala · conference · opening" },
  svcSports: { vi: "Quay chụp thể thao", en: "Sports coverage" },
  svcSportsDesc: { vi: "Giải đấu · vận động viên", en: "Tournaments · athletes" },
  svcOther: { vi: "Nội dung khác", en: "Other content" },
  svcOtherDesc: { vi: "TVC · sản phẩm · gia đình", en: "TVC · product · family" },
  fullNameLabel: { vi: "Họ tên", en: "Full name" },
  yourNamePlaceholder: { vi: "Tên của bạn", en: "Your name" },
  phoneLabel: { vi: "Số điện thoại", en: "Phone" },
  expectedDate: { vi: "Ngày dự kiến", en: "Preferred date" },
  contentLabel: { vi: "Nội dung", en: "Details" },
  bookingNotePlaceholder: {
    vi: "Mô tả ngắn về buổi chụp, địa điểm, ý tưởng…",
    en: "A short note about the shoot, location, ideas…",
  },
  sendBooking: { vi: "Gửi yêu cầu đặt lịch", en: "Send booking request" },
  sendingBooking: { vi: "Đang gửi…", en: "Sending…" },
  bookingReceived: {
    vi: "Đã nhận yêu cầu! Vieetjk sẽ liên hệ sớm với bạn.",
    en: "Request received! Vieetjk will contact you soon.",
  },
  hContact: { vi: "Thông tin liên hệ", en: "Contact information" },
  contactIntro: {
    vi: "Liên hệ trực tiếp qua các kênh dưới đây — phản hồi nhanh trong giờ làm việc.",
    en: "Reach out through the channels below — quick replies during business hours.",
  },
  cPhone: { vi: "Điện thoại", en: "Phone" },
  cEmail: { vi: "Email", en: "Email" },
  cInstagram: { vi: "Instagram", en: "Instagram" },
  cFacebook: { vi: "Facebook", en: "Facebook" },
  cTiktok: { vi: "TikTok", en: "TikTok" },
  cYoutube: { vi: "YouTube", en: "YouTube" },
  cAddress: { vi: "Địa chỉ studio", en: "Studio address" },
  cHours: { vi: "Giờ làm việc", en: "Working hours" },
  themeLight: { vi: "Giao diện sáng", en: "Light mode" },
  themeDark: { vi: "Giao diện tối", en: "Dark mode" },
  // misc
  loading: { vi: "Đang tải…", en: "Loading…" },
  confirmDelete: { vi: "Bạn chắc chắn muốn xóa?", en: "Are you sure you want to delete?" },
  error: { vi: "Có lỗi xảy ra", en: "Something went wrong" },
  notFound: { vi: "Không tìm thấy", en: "Not found" },
  albumNotReady: { vi: "Album chưa được xuất bản.", en: "This album is not published yet." },
};

interface LangContextValue {
  lang: Lang;
  setLang: (l: Lang) => void;
  t: (key: keyof typeof dict) => string;
}

const LangContext = createContext<LangContextValue | null>(null);

export function LangProvider({ children }: { children: ReactNode }) {
  const [lang, setLangState] = useState<Lang>("vi");

  useEffect(() => {
    const stored = window.localStorage.getItem("vk_lang") as Lang | null;
    if (stored === "vi" || stored === "en") setLangState(stored);
  }, []);

  const setLang = (l: Lang) => {
    setLangState(l);
    window.localStorage.setItem("vk_lang", l);
  };

  const t = (key: keyof typeof dict) => dict[key]?.[lang] ?? String(key);

  return (
    <LangContext.Provider value={{ lang, setLang, t }}>
      {children}
    </LangContext.Provider>
  );
}

export function useLang() {
  const ctx = useContext(LangContext);
  if (!ctx) throw new Error("useLang must be used within LangProvider");
  return ctx;
}

// Default price-list packages (from the studio's printed cards). Used both to
// auto-seed an empty list (server) and the "dùng mẫu" buttons (client).

export type SeedItem = {
  list_key: string;
  category: string;
  name: string;
  price: number;
  unit: string;
  description: string;
};

export const PRICE_LISTS: { key: string; label: string; title: string }[] = [
  { key: "cuoi", label: "Cưới", title: "Bảng giá chụp ảnh ngày cưới" },
  { key: "dinh-hon", label: "Đính hôn", title: "Bảng giá chụp ảnh đính hôn" },
];

export const WEDDING_SEED: SeedItem[] = [
  { list_key: "cuoi", category: "Gói chụp cơ bản", name: "Truyền thống", price: 2500000, unit: "", description: "Giao toàn bộ file gốc\nChỉnh sửa 100 file" },
  { list_key: "cuoi", category: "Gói chụp cơ bản", name: "Phóng sự x1", price: 4000000, unit: "", description: "1 thợ chụp nhà gái\nGiao toàn bộ file gốc\n150–200 hình chỉnh sửa" },
  { list_key: "cuoi", category: "Gói chụp cơ bản", name: "Phóng sự x2", price: 6000000, unit: "", description: "1 thợ nhà gái, 1 thợ nhà trai\nGiao toàn bộ file gốc\nChỉnh sửa 300–400 hình" },
  { list_key: "cuoi", category: "Gói quay PS ngày cưới", name: "Gói quay cơ bản", price: 4000000, unit: "", description: "1 thợ quay (Sáng → trưa)\nGiao toàn bộ file\nVideo chỉnh sửa 3–5 phút" },
  { list_key: "cuoi", category: "Gói quay PS ngày cưới", name: "Gói quay Plus", price: 7500000, unit: "", description: "2 thợ quay nhà gái và nhà trai (Sáng → trưa)\n1 flycam (nếu khu vực cho phép bay)\nVideo chỉnh sửa 5–7 phút (có thể yêu cầu)" },
  { list_key: "cuoi", category: "Gói quay PS ngày cưới", name: "Gói combo", price: 13500000, unit: "", description: "2 thợ chụp, 2 thợ quay, 1 flycam (Sáng → trưa)\nGiao toàn bộ file gốc\nChỉnh sửa 300–400 hình\nVideo 5–7 phút (theo yêu cầu)\nTặng Album 150 ảnh" },
  { list_key: "cuoi", category: "Phát sinh thêm", name: "Phát sinh thêm", price: 0, unit: "", description: "Nếu quý khách có nhu cầu in album sẽ được trợ giá 500k/1 album 100 hình. In phát sinh thêm 8.000đ/1 hình\nPhát sinh đãi trước 1 ngày: +1.000.000đ\nPhát sinh tiệc tối 500.000đ cho gói chụp\nChi phí trên chưa bao gồm phí đi lại nếu quý khách ở xa, ngoại tỉnh" },
  { list_key: "cuoi", category: "Lưu ý", name: "Lưu ý", price: 0, unit: "", description: "Sau khi chốt gói dịch vụ, quý khách vui lòng cọc trước 20% hợp đồng\nThanh toán toàn bộ hợp đồng sau khi giao file gốc\nFile gốc được lưu trữ trong vòng 30 ngày kể từ ngày giao file. Sau thời gian trên, studio không chịu trách nhiệm về việc thất lạc, mất mát file" },
];

export const ENGAGEMENT_SEED: SeedItem[] = [
  { list_key: "dinh-hon", category: "Gói chụp cơ bản", name: "Truyền thống", price: 1800000, unit: "", description: "Giao toàn bộ file gốc\nChỉnh sửa 50 file" },
  { list_key: "dinh-hon", category: "Gói chụp cơ bản", name: "Phóng sự x1", price: 2500000, unit: "", description: "1 thợ chụp nhà gái\nGiao toàn bộ file gốc\n100 hình chỉnh sửa" },
  { list_key: "dinh-hon", category: "Gói chụp cơ bản", name: "Phóng sự x2", price: 5000000, unit: "", description: "1 thợ nhà gái, 1 thợ nhà trai\nGiao toàn bộ file gốc\nChỉnh sửa 200 hình" },
  { list_key: "dinh-hon", category: "Gói quay PS đính hôn", name: "Gói quay cơ bản", price: 3500000, unit: "", description: "1 thợ quay (Sáng → trưa)\nGiao toàn bộ file\nVideo chỉnh sửa 3–5 phút" },
  { list_key: "dinh-hon", category: "Gói quay PS đính hôn", name: "Gói quay Plus", price: 7500000, unit: "", description: "2 thợ quay nhà gái và nhà trai (Sáng → trưa)\n1 flycam (nếu khu vực cho phép bay)\nVideo chỉnh sửa 5–7 phút (có thể yêu cầu)" },
  { list_key: "dinh-hon", category: "Gói quay PS đính hôn", name: "Gói combo", price: 11500000, unit: "", description: "2 thợ chụp, 2 thợ quay, 1 flycam (Sáng → trưa)\nGiao toàn bộ file gốc\nChỉnh sửa 300–400 hình\nVideo 5–7 phút (theo yêu cầu)\nTặng Album 100 ảnh" },
  { list_key: "dinh-hon", category: "Phát sinh thêm", name: "Phát sinh thêm", price: 0, unit: "", description: "Nếu quý khách có nhu cầu in album sẽ được trợ giá 500k/1 album 100 hình. In phát sinh thêm 8.000đ/1 hình\nPhát sinh đãi trước 1 ngày: +1.000.000đ\nPhát sinh tiệc tối 500.000đ cho gói chụp\nChi phí trên chưa bao gồm phí đi lại nếu quý khách ở xa, ngoại tỉnh" },
  { list_key: "dinh-hon", category: "Lưu ý", name: "Lưu ý", price: 0, unit: "", description: "Sau khi chốt gói dịch vụ, quý khách vui lòng cọc trước 20% hợp đồng\nThanh toán toàn bộ hợp đồng sau khi giao file gốc\nFile gốc được lưu trữ trong vòng 30 ngày kể từ ngày giao file. Sau thời gian trên, studio không chịu trách nhiệm về việc thất lạc, mất mát file" },
];

export const ALL_SEED: SeedItem[] = [...WEDDING_SEED, ...ENGAGEMENT_SEED];

# MStudo Desktop — client Windows

Ứng dụng máy tính cho tài khoản gói Studio: **tự động lưu hợp đồng (PDF + Word)**
về thư mục đã chọn ngay khi khách ký, và **tự xuất Excel toàn bộ dữ liệu hằng
ngày** để chống mất dữ liệu. Xây bằng Tauri v2 (Rust + WebView2), file cài ~10MB.

## Kiến trúc

- `ui/` — giao diện tiếng Việt (HTML/CSS/JS thuần, không framework): 3 màn hình
  Kết nối → Chọn thư mục → Trạng thái. Toàn bộ engine đồng bộ nằm ở `ui/app.js`.
- `src-tauri/` — phần Rust: gọi API mstudo (tránh CORS), ghi file an toàn
  (ghi `.tmp` rồi đổi tên), chọn thư mục, chuyển HTML→PDF bằng **Microsoft Edge
  headless** (sẵn trên Windows 10/11 — bản PDF giữ nguyên ảnh chữ ký), dọn file
  cũ hơn 30 ngày, di chuyển dữ liệu khi đổi thư mục.
- Xác thực bằng **mã kết nối thiết bị** (`msd_...`): chủ studio lấy mã ở trang
  *mstudo → MStudo Desktop → Kết nối thiết bị mới* (mã chỉ hiện 1 lần, server
  chỉ giữ bản băm; tối đa 2 máy/tài khoản).

## Build trên máy Windows

Yêu cầu: [Rust](https://rustup.rs) + [Node.js 18+](https://nodejs.org) +
WebView2 (sẵn trên Windows 10/11).

```bash
cd desktop
npm install          # cài @tauri-apps/cli
npm run dev          # chạy thử (cửa sổ dev)
npm run build        # đóng gói — file cài NSIS tại:
                     # src-tauri/target/release/bundle/nsis/MStudo Desktop_0.1.0_x64-setup.exe
```

Upload file `...-setup.exe` lên hosting rồi đặt biến môi trường
`NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL` cho web app (Vercel) — nút "Tải bản cài đặt"
trên trang MStudo Desktop sẽ tự trỏ vào đó.

## Ghi chú

- **SmartScreen**: chưa mua chứng chỉ ký số nên lần cài đầu Windows sẽ cảnh báo —
  hướng dẫn người dùng bấm *More info → Run anyway* (đã ghi sẵn trên trang tải).
- **Tự cập nhật**: sẽ thêm `tauri-plugin-updater` ở bước sau (cần tạo cặp khóa
  ký cập nhật bằng `npm run tauri signer generate` và nơi chứa manifest).
- Cấu trúc dữ liệu client tạo trong thư mục studio chọn:

```
HopDong/Hop dong HD-2026-001 - Ten Khach - 0901234567/   ← mỗi HĐ 1 thư mục
  Hop dong ... .pdf / .docx                               ← bản đầu
  Hop dong ... (ban 2 - 2026-07-10).pdf / .docx           ← khi sửa/ký lại
  mstudo.json                                             ← manifest phiên bản
KhachHang/ BaoGia/ ChiTieu/ Luong/ LichHen/ NhanVien/     ← Excel mỗi ngày 1 file
SaoLuu/mstudo-backup-YYYY-MM-DD.json                      ← bản đầy đủ để khôi phục
```

- File Excel/JSON quá 30 ngày tự xóa; thư mục `HopDong/` **không bao giờ** tự xóa.

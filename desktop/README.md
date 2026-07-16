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

## Cách 1 (khuyến nghị): build tự động bằng GitHub Actions — KHÔNG cần máy Windows

Đã có workflow `.github/workflows/desktop-build.yml` build trên máy ảo Windows
của GitHub và cho ra file cài `.exe`:

1. Vào repo trên GitHub → tab **Actions** → chọn **"Build MStudo Desktop
   (Windows)"** → bấm **Run workflow**. (Nút này chỉ hiện khi workflow đã nằm
   trên nhánh mặc định — sau khi merge nhánh vào `main`.)
2. Chờ ~5–10 phút, mở lần chạy → tải file trong mục **Artifacts →
   MStudo-Desktop-Windows**.
3. Hoặc đẩy tag `desktop-v0.1.0` → workflow tự build và **tạo Release** kèm file
   `.exe` để tải trực tiếp.

## Cách 2: build tay trên máy Windows

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
- **Tự cập nhật**: app kiểm tra bản phát hành mới (GitHub Releases, tag
  `desktop-dev`) khi mở app và mỗi 2 giờ. Khi có bản mới, nếu app đang **rảnh**
  (không đồng bộ/đang tải/đang xuất) sẽ **tự tải & cài** (đóng app → chạy trình
  cài → mở lại); nếu đang bận thì hiện banner để bấm “Cập nhật ngay” khi tiện.
  Phát hành bản mới = build, upload file cài, rồi đặt
  `DESKTOP_LATEST_VERSION` (vd `0.2.0`) trên Vercel. Nhớ tăng `version` ở
  `tauri.conf.json`, `Cargo.toml`, `package.json` và `APP_VERSION` trong
  `ui/app.js` cho khớp. (Cập nhật ngầm bằng tauri-plugin-updater để sau — cần
  quản lý khóa ký riêng.)
- Cấu trúc dữ liệu client tạo trong thư mục studio chọn:

```
HopDong/Hop dong HD-2026-001 - Ten Khach - 0901234567/   ← mỗi HĐ 1 thư mục
  Hop dong ... .pdf / .docx                               ← bản đầu
  Hop dong ... (ban 2 - 2026-07-10).pdf / .docx           ← khi sửa/ký lại
  mstudo.json                                             ← manifest phiên bản
  Photo/JPG Goc · Raw · File ChinhSua                     ← ảnh (tự đồng bộ lên Drive)
  Video/Video Goc · Video HoanThien                       ← video (nếu HĐ có quay)
  mstudo-drive.json                                       ← manifest đồng bộ Drive
KhachHang/ BaoGia/ ChiTieu/ Luong/ LichHen/ NhanVien/     ← Excel mỗi ngày 1 file
SaoLuu/mstudo-backup-YYYY-MM-DD.json                      ← bản đầy đủ để khôi phục
```

- File Excel/JSON quá 30 ngày tự xóa; thư mục `HopDong/` **không bao giờ** tự xóa.

## Đồng bộ ảnh/video lên Google Drive

Khi hợp đồng đã ký, app tạo cây thư mục ảnh/video theo tên hợp đồng và **tự tải
lên Google Drive của studio** (1 chiều). Chủ studio:

- Kết nối Drive một lần trên web tại **mstudo → Khách hàng → Đồng bộ Drive**, đặt
  **tên thư mục gốc** trên Drive (app tạo giúp; có thể tự kéo thư mục đó đi bất kỳ
  đâu trong Drive — vẫn đồng bộ đúng), và chỉnh *mẫu thư mục* (photo/video:
  đổi tên, thêm/bớt, chọn thư mục loại trừ).
- Trong app desktop, bấm **“Chọn thư mục gốc…”** để chọn thư mục trên máy chứa
  ảnh/video (mỗi hợp đồng 1 thư mục con) — KHÔNG còn nằm trong `HopDong/`.

Mặc định **JPG Goc** → album chọn ảnh, **File ChinhSua** → gallery giao khách;
**Raw** và **Video Goc** không đồng bộ. Cần đặt `GOOGLE_STUDIO_DRIVE_REDIRECT_URI`
và chạy migration `supabase/migrations/studio_drive_sync.sql`.

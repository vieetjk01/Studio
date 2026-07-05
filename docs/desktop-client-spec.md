# MStudo Desktop — Đặc tả & kế hoạch triển khai

> Client Windows cho tài khoản gói Studio: tự động lưu hợp đồng về máy, tự xuất
> dữ liệu ra Excel theo lịch để chống mất dữ liệu.
> Trạng thái: **chưa xuất bản — chỉ admin thấy** (feature flag `desktop`, giống Story/Album/Slide).

## 1. Quyết định đã chốt

| Hạng mục | Quyết định |
| --- | --- |
| Kiến trúc | App desktop (Tauri) chạy giao diện web mstudo + cầu nối ghi file xuống máy. Cần internet để dùng. |
| Hệ điều hành | Chỉ Windows |
| Người được cài | **Chỉ chủ studio** (không phải nhân viên), tối đa **2 máy / tài khoản** |
| Hợp đồng | Lưu **PDF + Word**, tự lưu **ngay khi khách ký** |
| Tên & tổ chức file hợp đồng | Mỗi hợp đồng **1 thư mục riêng**: `Hợp đồng {mã HĐ} - {Tên khách} - {SĐT}`; khi sửa/ký lại → **lưu thành bản mới** trong cùng thư mục, không ghi đè |
| Hợp đồng cũ | Lần chạy đầu **tải toàn bộ** hợp đồng đã ký về máy |
| Xuất dữ liệu khác | **Mỗi mảng 1 file Excel** (khách hàng, báo giá, chi tiêu, lương, lịch hẹn, nhân viên); chạy **hằng ngày + khi mở app** (xuất bù nếu hôm trước máy tắt) |
| Giữ bản cũ | **30 ngày**, tự xóa bản cũ hơn |
| Khôi phục ngược | **Có** — nhập file sao lưu JSON để phục hồi dữ liệu vào hệ thống |
| Bảo mật file | **File thường** (không mã hóa), kèm cảnh báo trong app |
| Hết hạn gói Studio | Client ngừng đồng bộ; **hợp đồng trên hệ thống bị khóa lại**; file đã lưu trên máy giữ nguyên |
| Code signing | **Không đầu tư** — chấp nhận cảnh báo SmartScreen, kèm hướng dẫn cài đặt |
| Phân phối | Mục **"Tải MStudo Desktop"** trong trang quản trị (chỉ gói Studio; giai đoạn đầu chỉ admin thấy) |
| Thư mục lưu | Studio chọn vị trí lưu; **đổi vị trí thì các lần lưu sau theo vị trí mới** (hỏi có di chuyển dữ liệu cũ sang hay không) |
| Đề xuất mở rộng (làm sau) | Sao lưu tự động lên Google Drive của studio (chạy từ server, không cần client); cache offline |

## 2. Kiến trúc

```
┌─ Máy studio (Windows) ─────────────────────────┐
│  MStudo Desktop (Tauri)                        │
│  ├─ WebView: giao diện mstudo hiện tại         │
│  ├─ Cầu nối (Rust): ghi file, chọn thư mục,    │
│  │   lịch chạy, tải file, thông báo            │
│  └─ Bộ lưu trữ cấu hình: thư mục lưu, token    │
└────────────┬───────────────────────────────────┘
             │ HTTPS + Supabase Realtime
┌────────────┴───────────────────────────────────┐
│  Server mstudo (Next.js + Supabase)            │
│  ├─ API thiết bị: đăng ký / thu hồi (tối đa 2) │
│  ├─ API xuất: Excel từng mảng, JSON đầy đủ     │
│  ├─ API hợp đồng: danh sách + PDF + DOCX       │
│  ├─ Realtime: sự kiện "hợp đồng đã ký"         │
│  └─ API khôi phục: nhập JSON, xem trước, ghi   │
└────────────────────────────────────────────────┘
```

- **Luồng hợp đồng ký**: khách ký trên web → server ghi nhận → phát realtime →
  client tải PDF + DOCX về đúng thư mục hợp đồng. Client tắt lúc đó → khi mở
  lại, gọi API "hợp đồng chưa lưu từ lần đồng bộ cuối" để **tải bù**.
- **Ghi file an toàn**: luôn ghi ra file `.tmp` rồi đổi tên — tránh hỏng file
  khi mất điện; file Excel đang mở bị khóa → thử lại + thông báo.

## 3. Cấu trúc thư mục trên máy

```
MStudo/                                  ← studio chọn vị trí gốc
├─ HopDong/
│  └─ Hop dong HD-2026-0012 - Nguyen Van A - 0901234567/
│     ├─ Hop dong HD-2026-0012 - Nguyen Van A - 0901234567.pdf
│     ├─ Hop dong HD-2026-0012 - Nguyen Van A - 0901234567.docx
│     ├─ Hop dong ... (ban 2 - 2026-07-10).pdf    ← khi sửa/ký lại
│     └─ Hop dong ... (ban 2 - 2026-07-10).docx
├─ BaoGia/        BaoGia_2026-07-05.xlsx
├─ KhachHang/     KhachHang_2026-07-05.xlsx
├─ ChiTieu/       ChiTieu_2026-07.xlsx
├─ LichHen/       LichHen_2026-07-05.xlsx
├─ NhanVien/      NhanVien_2026-07-05.xlsx · Luong_2026-07.xlsx
└─ SaoLuu/        mstudo-backup-2026-07-05.json   ← bản đầy đủ để khôi phục
```

- Tên file/thư mục: giữ tiếng Việt, loại bỏ ký tự Windows cấm (`\ / : * ? " < > |`).
- Dọn dẹp: file Excel/JSON quá **30 ngày** tự xóa; **thư mục hợp đồng không bao giờ tự xóa**.
- Đổi thư mục gốc: client hỏi *"Di chuyển dữ liệu đã lưu sang thư mục mới?"* —
  Có → move toàn bộ; Không → dữ liệu cũ giữ nguyên, lưu mới vào chỗ mới.

## 4. Thiết bị & phiên đăng nhập

- Đăng nhập trong client bằng tài khoản mstudo; chỉ chấp nhận **chủ studio** (owner) gói Studio.
- Bảng `desktop_devices`: id, studio_id, tên máy, phiên bản, lần đồng bộ cuối, trạng thái.
- Tối đa **2 thiết bị hoạt động**; đăng ký máy thứ 3 → yêu cầu thu hồi 1 máy cũ.
- Trang quản lý thiết bị (trong phần cài đặt studio): xem danh sách, thu hồi.
- Hết hạn gói: API từ chối đồng bộ; hợp đồng trên hệ thống chuyển trạng thái khóa
  (không tạo/sửa/ký); client hiện thông báo gia hạn; file trên máy giữ nguyên.

## 5. Khôi phục ngược

- Nguồn: file `mstudo-backup-*.json` (đầy đủ mọi mảng, có version schema).
- Chỉ chủ studio thao tác; luồng: chọn file → **xem trước** (số bản ghi từng mảng,
  chênh lệch so với hiện tại) → xác nhận → server ghi theo kiểu upsert, có nhật ký.
- Không phục hồi đè im lặng: bản ghi xung đột (đã sửa mới hơn trên server) được
  liệt kê để chọn giữ bên nào.

## 6. Phát hành & cập nhật

- Trang quản trị: mục **"Tải MStudo Desktop"** — flag `desktop` (mặc định ẩn, chỉ admin).
- Không code signing: kèm hướng dẫn cài (SmartScreen → "More info" → "Run anyway").
- Tự cập nhật qua Tauri Updater; file cài + manifest đặt trên hosting của mstudo.

## 7. Kế hoạch triển khai

**Giai đoạn A — nền tảng phía server (làm trong repo này)**
1. Flag `desktop` + trang "Tải MStudo Desktop" trong quản trị (admin-only).
2. API xuất Excel từng mảng + JSON đầy đủ (dùng chung cho client và nút xuất trên web).
3. API hợp đồng: danh sách theo lần-đồng-bộ-cuối + xuất PDF + DOCX.
4. Bảng + API `desktop_devices` (đăng ký, thu hồi, giới hạn 2).
5. Khóa hợp đồng khi hết hạn gói.

**Giai đoạn B — client Windows (thư mục `desktop/` trong repo, Tauri v2)**
1. ✅ Scaffold hoàn chỉnh: UI tiếng Việt 3 màn hình (kết nối → chọn thư mục →
   trạng thái) + Rust commands (HTTP, ghi file an toàn, chọn thư mục, dọn 30
   ngày, di chuyển dữ liệu). Build trên máy Windows theo `desktop/README.md`.
2. ✅ Xác thực bằng MÃ KẾT NỐI thiết bị: nút "Kết nối thiết bị mới" trên trang
   web tạo token `msd_` hiện 1 lần → dán vào app (thay cho đăng nhập webview —
   đơn giản, không phụ thuộc cookie).
3. ✅ PDF hợp đồng: server trả HTML bản in → client chuyển PDF bằng Microsoft
   Edge headless (sẵn trên Win 10/11, giữ nguyên ảnh chữ ký); không có Edge →
   giữ bản HTML dự phòng.
4. ✅ Engine: tải bù theo mốc đồng bộ cuối (chỉ dời mốc khi lưu trọn vẹn),
   mỗi HĐ 1 thư mục + bản mới khi sửa (manifest mstudo.json), Excel hằng ngày
   + khi mở app, dọn 30 ngày (không đụng HopDong), đổi thư mục có hỏi di chuyển.
5. Còn lại: auto-update (tauri-plugin-updater + khóa ký), build file cài NSIS
   trên Windows, upload + đặt NEXT_PUBLIC_DESKTOP_DOWNLOAD_URL.

**Giai đoạn C — hoàn thiện**
1. Khôi phục ngược (xem trước + xung đột).
2. Quản lý thiết bị trong cài đặt studio.
3. (Làm sau) Sao lưu Google Drive từ server; cache offline.

## 8. Việc còn mở (chốt khi làm)

- Mẫu file Word hợp đồng (dùng đúng mẫu hợp đồng hiện tại, có logo studio?).
- Cột cụ thể của từng file Excel (lấy theo màn hình danh sách hiện tại, chốt khi code).
- Tên miền/đường dẫn chứa file cài đặt và manifest cập nhật.

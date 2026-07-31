# Giảm dung lượng & băng thông Supabase

Ghi chép cách mstudo tiêu tốn hạn mức Supabase, vì sao nó vượt, và cách kéo xuống.

Hạn mức gói Free: **Egress 5 GB · File storage 1 GB · Database 500 MB · MAU 50.000**.

## Cái gì đang tốn

| Hạng mục | Nguồn tốn chính |
|---|---|
| **File storage** | Bucket cache ảnh Drive (`DRIVE_IMG_CACHE_BUCKET`) — `/api/img` lưu mỗi ảnh đã proxy thành một object `<id>_w<width>.jpg`, và trước đây cả bản gốc `<id>_orig`. Ảnh gốc một tấm cưới thường 5–15 MB. |
| | Bucket `wedding-photos` — ảnh/nhạc của thiệp cưới. Trước đây **không có** job nào dọn ảnh của thiệp đã xoá. |
| | Bucket `payment-proofs` — đã có cron xoá sau 30 ngày kể từ khi hợp đồng hoàn thành. |
| **Egress** | Mỗi lần bucket cache phục vụ ảnh (302 → CDN Supabase) đều tính egress. Nặng nhất là bản gốc tải ZIP. |
| | Truy vấn DB từ Vercel. Đáng kể nhất là polling: trang album khách hàng trước đây gọi lại `/api/a/<slug>/select` mỗi 5 giây, kể cả khi tab bị ẩn. |
| **Database** | 69 MB / 500 MB — chưa phải vấn đề. |

Điểm mấu chốt: **ảnh HIỂN THỊ không tốn gì của Supabase.** `/api/img` đã 302 thẳng
sang CDN của Google cho các lượt tải `<img>` thông thường (xem `IMG_CDN_REDIRECT`).
Phần chảy qua Supabase chỉ là byte không redirect được: tải ZIP, tải bản gốc, và
ảnh fetch cross-origin để đóng watermark bằng canvas.

## Đã sửa những gì

1. **Không cache ảnh gốc nữa** (`DRIVE_IMG_CACHE_ORIGINALS`, mặc định tắt). Bản gốc
   chảy thẳng từ Google qua Vercel — Supabase tốn 0 byte storage và 0 byte egress.
   Đây là thay đổi có tác dụng lớn nhất.
2. **Chỉ cache bề rộng ≤ 1024** (`DRIVE_IMG_CACHE_MAX_WIDTH`). Bản w=2000/2560 chỉ
   được fetch đúng một lần lúc tải về, cache vào chỉ tốn chỗ.
3. **Trần dung lượng cứng cho bucket cache** (`DRIVE_IMG_CACHE_MAX_BYTES`, mặc định
   500 MB). Dọn theo tuổi thôi thì không bao giờ đủ — bucket đầy từ lâu trước khi
   file đầu tiên đủ tuổi. Cron nay xoá tiếp file cũ nhất cho tới khi lọt trần.
4. **Cron cache chạy hằng ngày** thay vì hằng tuần, và hạn tuổi mặc định 60 → 21 ngày.
5. **Cron mới `cleanup-wedding-photos`** (hằng tuần) xoá ảnh của thiệp cưới đã bị xoá.
   Chỉ đụng vào thư mục mồ côi — thiệp còn sống thì không bao giờ bị chạm.
6. **Album khách hàng poll 20 giây và dừng khi tab bị ẩn** (trước: 5 giây, chạy mãi).

Xoá cache **không mất dữ liệu gì**: mọi object trong bucket cache đều dựng lại được
từ Drive ở lần xem kế tiếp, chỉ tốn đúng một lượt fetch qua Vercel.

## Cần làm ngay để lấy lại chỗ (dự án đang vượt hạn mức)

Các thay đổi trên chặn tăng trưởng về sau; phần đã chiếm chỗ phải tự thu hồi.

**1. Dọn sạch bucket cache một lần:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<domain>/api/cron/cleanup-drive-cache?purge=1"
```

Chạy lặp lại tới khi `removed` trả về 0 (mỗi lượt xử lý tối đa 100 trang × 1000 file).

**2. Dọn ảnh thiệp cưới mồ côi:**

```bash
curl -H "Authorization: Bearer $CRON_SECRET" \
  "https://<domain>/api/cron/cleanup-wedding-photos"
```

**3. Kiểm tra bucket nào đang chiếm chỗ** — chạy trong Supabase SQL Editor:

```sql
select bucket_id,
       count(*)                                             as objects,
       pg_size_pretty(sum((metadata->>'size')::bigint))     as size
from storage.objects
group by bucket_id
order by sum((metadata->>'size')::bigint) desc;
```

**4. Nếu vẫn chật:** đặt `DRIVE_IMG_CACHE_BUCKET=` (để trống) trên Vercel. `/api/img`
quay về chế độ proxy thuần — Supabase storage/egress cho ảnh về **0**, đổi lại Vercel
gánh băng thông (hạn mức Free 100 GB/tháng, rộng hơn 5 GB của Supabase rất nhiều).

## Vài điều cần biết

- Ảnh trong bucket cache **không** được tham chiếu từ bảng nào — chúng được đánh địa
  chỉ theo nội dung (`<id>_w<width>.jpg`). Vì thế cron dọn theo tuổi/dung lượng chứ
  không dò theo bản ghi DB.
- Ảnh người dùng tải lên ưu tiên vào **Drive của admin** (`uploadToAdminDrive`), chỉ
  rơi xuống Supabase Storage khi Drive chưa kết nối. Nếu `wedding-photos` phình to,
  kiểm tra kết nối Drive admin trước — nhiều khả năng nó đã rớt và mọi thứ đang
  fallback sang Supabase.
- Egress trên gói Free tính cả byte phục vụ qua CDN, nên tăng `cacheControl` không
  làm giảm hoá đơn egress. Cách duy nhất để giảm là **đừng để byte đi ra từ Supabase**
  — tức đẩy chúng sang CDN Google, đúng như những gì các thay đổi trên làm.

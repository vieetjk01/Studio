-- ─────────────────────────────────────────────────────────────────────────
-- Photographer Plus: cột giá/hoa hồng còn thiếu
--
-- Gói photographer_plus đã tồn tại trong hệ thống nhưng thiếu 2 cột cấu hình
-- (kiểu cũ, áp cho cả tháng/năm) khiến trang chủ & affiliate không đọc được:
--   • photographer_plus_discount_percent — % giảm giá chung (trang chủ dùng).
--   • affiliate_commission_photographer_plus — % hoa hồng affiliate.
-- Chạy migration này trước khi deploy để trang chủ hiển thị giá đúng và hoa
-- hồng cho gói Photographer Plus được ghi nhận.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.site_settings add column if not exists photographer_plus_discount_percent integer not null default 0;
alter table public.site_settings add column if not exists affiliate_commission_photographer_plus int not null default 10;

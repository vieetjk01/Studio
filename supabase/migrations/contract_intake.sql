-- ============================================================================
-- Form điền thông tin trước buổi chụp (gửi kèm nhắc lịch qua Zalo).
-- Khách mở bằng LINK RIÊNG không cần mật khẩu (intake_token — khó đoán).
-- Dữ liệu điền lưu vào jsonb `intake`; hợp đồng PSC gồm 2 phần (nhà gái/nhà trai)
-- với SĐT, các mốc giờ và VỊ TRÍ (lat/lng + link Google Maps do khách chọn).
-- Idempotent.
-- ============================================================================

alter table public.studio_contracts add column if not exists intake_token       text unique;
alter table public.studio_contracts add column if not exists intake              jsonb;
alter table public.studio_contracts add column if not exists intake_submitted_at timestamptz;

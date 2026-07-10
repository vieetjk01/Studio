-- ============================================================================
-- VÁ C1 — Chống leo thang đặc quyền trên bảng profiles
-- Chạy MỘT LẦN trên Supabase (SQL Editor). An toàn khi chạy lại (idempotent).
--
-- Vì sao cần: RLS chỉ lọc theo DÒNG chứ không theo CỘT. Nếu authenticated có
-- quyền UPDATE toàn bảng, một user có thể tự đặt role='admin' / đổi plan /
-- studio_owner_id… trên chính dòng của mình. Ta thu hồi UPDATE toàn bảng rồi
-- CHỈ cấp lại các cột cấu hình an toàn; mọi cột nhạy cảm chỉ sửa được qua
-- service-role ở API server.
-- ============================================================================

revoke update on public.profiles from authenticated, anon;

grant update (
  full_name,
  monthly_revenue_target,
  pl_show_clauses,
  booking_token, calendar_token,
  pl_phone, pl_facebook,
  pl_bank_holder, pl_bank_account, pl_bank_name, pl_bank_bin,
  pl_bg, pl_text, pl_accent, pl_logo_url,
  studio_logo_url, studio_brand_name,
  pl_hidden_lists, pl_list_labels,
  auto_client_emails
) on public.profiles to authenticated;

-- ── Kiểm tra sau khi chạy: liệt kê các cột authenticated còn được UPDATE ──────
-- Kết quả PHẢI chỉ gồm các cột an toàn ở trên (KHÔNG có role, is_active, plan…).
--
-- select column_name
-- from information_schema.column_privileges
-- where table_schema = 'public'
--   and table_name = 'profiles'
--   and grantee = 'authenticated'
--   and privilege_type = 'UPDATE'
-- order by column_name;

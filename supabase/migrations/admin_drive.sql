-- ============================================================================
-- VÁ BẢO MẬT — di chuyển refresh_token Google Drive của admin ra khỏi
-- site_settings (bảng có policy đọc CÔNG KHAI using(true) → anon bằng anon key có
-- thể đọc được token) sang bảng riêng public.admin_drive chỉ service-role.
-- Đồng thời khóa quyền đọc công khai của album_shares (chống duyệt token share).
-- Chạy trên Supabase (SQL Editor). An toàn khi chạy lại (idempotent).
-- ============================================================================

create table if not exists public.admin_drive (
  id            int primary key default 1 check (id = 1),
  refresh_token text,
  folder_id     text,
  updated_at    timestamptz not null default now()
);
insert into public.admin_drive (id) values (1) on conflict (id) do nothing;
revoke all on public.admin_drive from anon, authenticated;
alter table public.admin_drive enable row level security;

-- Copy giá trị cũ từ site_settings (nếu còn) rồi XÓA 2 cột bí mật khỏi bảng công khai.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public' and table_name = 'site_settings' and column_name = 'drive_refresh_token'
  ) then
    update public.admin_drive a
      set refresh_token = s.drive_refresh_token, folder_id = s.drive_folder_id, updated_at = now()
      from public.site_settings s
      where a.id = 1 and s.id = 1;
    alter table public.site_settings drop column if exists drive_refresh_token;
    alter table public.site_settings drop column if exists drive_folder_id;
  end if;
end $$;

-- album_shares: đọc qua service-role, thu hồi quyền đọc của anon/authenticated.
drop policy if exists album_shares_public_read on public.album_shares;
revoke select on public.album_shares from anon, authenticated;

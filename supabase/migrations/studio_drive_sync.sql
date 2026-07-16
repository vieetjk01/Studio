-- ============================================================================
-- MStudo Desktop · Đồng bộ ảnh/video hợp đồng lên Google Drive của studio
-- Chạy trên Supabase (SQL Editor). An toàn khi chạy lại (idempotent).
--
-- Mô hình: khi hợp đồng ĐÃ KÝ, client MStudo Desktop tạo cây thư mục trên máy
-- (Photo/{JPG Goc,Raw,File ChinhSua}, Video/{Video Goc,Video HoanThien}), tạo
-- cây thư mục tương ứng trên Google Drive của studio rồi TẢI LÊN (1 chiều).
-- "JPG Goc" tự thành album chọn ảnh, "File ChinhSua" tự thành gallery giao khách.
--
-- Refresh token của studio là BÍ MẬT → để trong bảng RIÊNG, RLS bật, KHÔNG cấp
-- quyền cho anon/authenticated (chỉ service-role ở API server đọc/ghi được).
-- ============================================================================

create table if not exists public.studio_drive (
  owner_id         uuid primary key references public.profiles (id) on delete cascade,
  refresh_token    text,        -- OAuth Google Drive của studio (scope drive.file) — CHỈ SERVER
  root_folder_id   text,        -- thư mục gốc do app tạo trong Drive studio (studio có thể tự kéo đi nơi khác — vẫn nhận theo ID)
  root_folder_name text,        -- tên thư mục gốc studio đặt (null → "MStudo")
  folder_template  jsonb,       -- mẫu thư mục con mặc định (null → mặc định trong mã)
  connected_at     timestamptz,
  updated_at       timestamptz not null default now()
);
alter table public.studio_drive add column if not exists root_folder_name text;

-- Không để lộ refresh token ra trình duyệt: khóa mọi quyền của anon/authenticated,
-- bật RLS mà KHÔNG tạo policy → chỉ service-role (bỏ qua RLS) mới truy cập được.
revoke all on public.studio_drive from anon, authenticated;
alter table public.studio_drive enable row level security;

-- Mỗi hợp đồng: thư mục Drive đã tạo + sơ đồ cây (local ↔ Drive) + mốc đồng bộ.
-- drive_tree = [{ "path": "Photo/JPG Goc", "id": "<driveFolderId>",
--                 "role": "selection"|"delivery"|null, "excluded": bool }]
alter table public.studio_contracts add column if not exists drive_folder_id text;
alter table public.studio_contracts add column if not exists drive_tree      jsonb;
alter table public.studio_contracts add column if not exists drive_synced_at timestamptz;

-- Studio chọn ngay khi TẠO hợp đồng có tạo thư mục nào không (video chọn riêng).
alter table public.studio_contracts add column if not exists drive_make_photo boolean not null default true;
alter table public.studio_contracts add column if not exists drive_make_video boolean not null default false;

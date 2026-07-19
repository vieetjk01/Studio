-- ============================================================================
-- MStudo Desktop · Nhiều THƯ MỤC GỐC theo loại dịch vụ (Cưới, Sự kiện, Kỷ yếu…)
-- Chạy trên Supabase (SQL Editor). An toàn khi chạy lại (idempotent).
--
-- Studio tự đặt nhiều thư mục gốc; mỗi loại dịch vụ (studio_services) trỏ tới một
-- thư mục gốc. Khi tạo cây thư mục cho hợp đồng, thư mục hợp đồng nằm trong thư
-- mục gốc của loại dịch vụ tương ứng (cả trên Drive lẫn trên máy tính). Nếu loại
-- dịch vụ chưa gán thư mục gốc → dùng thư mục gốc mặc định (studio_drive).
--
-- Bảng này KHÔNG chứa bí mật (chỉ tên/ID thư mục Drive + mẫu thư mục), nhưng để
-- đồng nhất với studio_drive và quản lý qua API server, ta revoke anon/authenticated
-- và bật RLS không policy → chỉ service-role (API server) đọc/ghi.
-- ============================================================================

create table if not exists public.studio_drive_roots (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  name            text not null default 'MStudo',   -- tên thư mục gốc studio đặt
  drive_folder_id text,        -- id thư mục gốc trên Drive (tạo khi hợp đồng đầu tiên cần)
  folder_template jsonb,       -- mẫu thư mục con riêng (null → dùng mẫu mặc định của studio)
  position        int not null default 0,
  created_at      timestamptz not null default now()
);
create index if not exists studio_drive_roots_owner_idx on public.studio_drive_roots (owner_id, position);

revoke all on public.studio_drive_roots from anon, authenticated;
alter table public.studio_drive_roots enable row level security;

-- Mỗi loại dịch vụ trỏ tới 1 thư mục gốc (null → dùng thư mục gốc mặc định).
alter table public.studio_services
  add column if not exists drive_root_id uuid references public.studio_drive_roots (id) on delete set null;

-- ============================================================================
-- TRANG LOVE STORY (wedding story / share page)
-- A studio gift like the wedding invitation, but Instagram-style: photos & video
-- come from a Google Drive FOLDER the couple provides (read-only), the couple
-- edits the content, guests view + leave wishes. QR/print reuse the invite flow.
--
-- Run in the Supabase SQL editor (also folded into schema.sql).
-- ============================================================================

create table if not exists public.story_pages (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  contract_id  uuid references public.studio_contracts (id) on delete set null,
  slug         text not null unique,          -- thiep.<domain>/story/<slug> (or /story/<slug>)
  edit_token   text not null unique,          -- /story/sua/<edit_token> (client edits, no login)
  config       jsonb not null default '{}'::jsonb,  -- xem StoryConfig (drive_folder, video, story…)
  published    boolean not null default false,
  created_at   timestamptz not null default now(),
  updated_at   timestamptz not null default now()
);
create index if not exists story_pages_owner_idx on public.story_pages (owner_id);
create index if not exists story_pages_contract_idx on public.story_pages (contract_id);
create index if not exists story_pages_slug_idx on public.story_pages (slug);

drop trigger if exists story_pages_set_updated_at on public.story_pages;
create trigger story_pages_set_updated_at
  before update on public.story_pages
  for each row execute function public.set_updated_at();

alter table public.story_pages enable row level security;
drop policy if exists story_pages_owner_all on public.story_pages;
create policy story_pages_owner_all on public.story_pages
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- Guest wishes (lời chúc) — written by the public page via the service-role API.
create table if not exists public.story_wishes (
  id         uuid primary key default gen_random_uuid(),
  story_id   uuid not null references public.story_pages (id) on delete cascade,
  guest_name text not null default '',
  wish       text not null default '',
  created_at timestamptz not null default now()
);
create index if not exists story_wishes_story_idx on public.story_wishes (story_id);

alter table public.story_wishes enable row level security;
drop policy if exists story_wishes_owner_read on public.story_wishes;
create policy story_wishes_owner_read on public.story_wishes
  for select using (exists (
    select 1 from public.story_pages s
    where s.id = story_id and (s.owner_id = auth.uid() or public.is_admin())
  ));

-- ============================================================================
-- CÁCH 1: khách gửi ảnh/video → lưu vào Google Drive CỦA CHÍNH CẶP ĐÔI.
-- Cặp đôi nối Drive (OAuth drive.file) ngay trong trình sửa; file khách tải lên
-- được ghi vào một thư mục app tự tạo trên Drive của họ. Chạy phần dưới nếu bạn
-- đã có bảng story_pages từ trước.
-- ============================================================================
alter table public.story_pages add column if not exists drive_refresh_token text;   -- couple's Drive OAuth refresh token
alter table public.story_pages add column if not exists drive_upload_folder text;    -- app-created folder id for guest uploads

create table if not exists public.story_uploads (
  id            uuid primary key default gen_random_uuid(),
  story_id      uuid not null references public.story_pages (id) on delete cascade,
  drive_file_id text not null,                 -- file id trên Drive của cặp đôi
  name          text not null default '',
  is_video      boolean not null default false,
  guest_name    text not null default '',
  approved      boolean not null default true, -- tự duyệt; cặp đôi có thể gỡ trong trình sửa
  created_at    timestamptz not null default now()
);
create index if not exists story_uploads_story_idx on public.story_uploads (story_id, approved, created_at);

alter table public.story_uploads enable row level security;
drop policy if exists story_uploads_owner_read on public.story_uploads;
create policy story_uploads_owner_read on public.story_uploads
  for select using (exists (
    select 1 from public.story_pages s
    where s.id = story_id and (s.owner_id = auth.uid() or public.is_admin())
  ));

-- ============================================================================
-- Vieetjk Photo Collection — Supabase schema
-- Run this in the Supabase SQL Editor (or via the CLI) once per project.
-- ============================================================================

-- Extensions ----------------------------------------------------------------
create extension if not exists "pgcrypto";

-- ============================================================================
-- profiles: one row per authenticated user (admin or photographer)
-- ============================================================================
create table if not exists public.profiles (
  id            uuid primary key references auth.users (id) on delete cascade,
  email         text not null,
  full_name     text,
  role          text not null default 'photographer'
                  check (role in ('admin', 'photographer')),
  -- per-photographer limits / permissions
  max_albums    integer,                 -- null = unlimited (hard total cap)
  monthly_album_limit integer default 5, -- albums creatable per calendar month (null = unlimited)
  can_zip       boolean not null default false, -- may customers download (ZIP)?
  can_notes     boolean not null default false, -- may customers add notes?
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);
-- For databases created before these existed:
alter table public.profiles add column if not exists monthly_album_limit integer default 5;
alter table public.profiles add column if not exists can_notes boolean not null default false;
alter table public.profiles alter column can_zip set default false;

-- ============================================================================
-- albums
-- ============================================================================
create table if not exists public.albums (
  id              uuid primary key default gen_random_uuid(),
  owner_id        uuid not null references public.profiles (id) on delete cascade,
  slug            text not null unique,
  title           text not null,
  description     text,
  cover_url       text,
  -- album access password (bcrypt hash, nullable = no password)
  password_hash   text,
  -- max photos a customer may select (null = unlimited)
  selection_limit integer,
  watermark_enabled boolean not null default true,
  watermark_text  text default 'Vieetjk',
  status          text not null default 'draft'
                    check (status in ('draft', 'published')),
  created_at      timestamptz not null default now(),
  updated_at      timestamptz not null default now()
);
create index if not exists albums_owner_idx on public.albums (owner_id);

-- ============================================================================
-- album_sources: each album can have several Google Drive sources (groups),
-- which can be displayed separately or merged together.
-- ============================================================================
create table if not exists public.album_sources (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid not null references public.albums (id) on delete cascade,
  name        text not null default 'Untitled',
  drive_url   text not null,
  kind        text not null default 'file' check (kind in ('file', 'folder')),
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists album_sources_album_idx on public.album_sources (album_id);

-- ============================================================================
-- photos: individual images resolved from sources
-- ============================================================================
create table if not exists public.photos (
  id            uuid primary key default gen_random_uuid(),
  album_id      uuid not null references public.albums (id) on delete cascade,
  source_id     uuid references public.album_sources (id) on delete cascade,
  drive_file_id text not null,
  name          text not null default '',
  position      integer not null default 0,
  created_at    timestamptz not null default now()
);
create index if not exists photos_album_idx on public.photos (album_id);
create unique index if not exists photos_album_file_uidx
  on public.photos (album_id, drive_file_id);

-- ============================================================================
-- selections: photos chosen by customers (no login required).
-- A customer "session" is identified by a client-generated session_id.
-- ============================================================================
create table if not exists public.selections (
  id               uuid primary key default gen_random_uuid(),
  album_id         uuid not null references public.albums (id) on delete cascade,
  photo_id         uuid not null references public.photos (id) on delete cascade,
  photo_name       text not null default '',
  session_id       text not null,
  client_name      text,
  client_note      text,            -- note left by the customer on this photo
  photographer_note text,           -- note added by the photographer
  created_at       timestamptz not null default now(),
  unique (album_id, photo_id, session_id)
);
create index if not exists selections_album_idx on public.selections (album_id);
create index if not exists selections_session_idx on public.selections (album_id, session_id);

-- For databases created before client notes existed:
alter table public.selections add column if not exists client_note text;

-- Enable Supabase Realtime on selections (live updates on the photographer's
-- dashboard). Idempotent — only adds the table if not already published.
do $$
begin
  if not exists (
    select 1 from pg_publication_tables
    where pubname = 'supabase_realtime'
      and schemaname = 'public'
      and tablename = 'selections'
  ) then
    alter publication supabase_realtime add table public.selections;
  end if;
end $$;

-- ============================================================================
-- updated_at trigger for albums
-- ============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists albums_set_updated_at on public.albums;
create trigger albums_set_updated_at
  before update on public.albums
  for each row execute function public.set_updated_at();

-- ============================================================================
-- New auth user -> profile (default photographer, inactive until admin enables)
-- ============================================================================
create or replace function public.handle_new_user()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  insert into public.profiles (id, email, full_name, role, is_active)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data ->> 'full_name', new.raw_user_meta_data ->> 'name', new.email),
    'photographer',
    true   -- self-serve: new sign-ups (incl. Google) can create albums right away
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- ============================================================================
-- Helper: is the current user an admin?
-- ============================================================================
create or replace function public.is_admin()
returns boolean language sql security definer stable set search_path = public as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_active
  );
$$;

-- ============================================================================
-- Row Level Security
-- ============================================================================
alter table public.profiles       enable row level security;
alter table public.albums         enable row level security;
alter table public.album_sources  enable row level security;
alter table public.photos         enable row level security;
alter table public.selections     enable row level security;

-- profiles -------------------------------------------------------------------
drop policy if exists profiles_self_read on public.profiles;
create policy profiles_self_read on public.profiles
  for select using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_self_update on public.profiles;
create policy profiles_self_update on public.profiles
  for update using (id = auth.uid() or public.is_admin());

drop policy if exists profiles_admin_all on public.profiles;
create policy profiles_admin_all on public.profiles
  for all using (public.is_admin()) with check (public.is_admin());

-- albums ---------------------------------------------------------------------
-- Owners (and admins) manage their albums.
drop policy if exists albums_owner_all on public.albums;
create policy albums_owner_all on public.albums
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- album_sources & photos: tied to album ownership ---------------------------
drop policy if exists sources_owner_all on public.album_sources;
create policy sources_owner_all on public.album_sources
  for all using (
    exists (select 1 from public.albums a
            where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.albums a
            where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists photos_owner_all on public.photos;
create policy photos_owner_all on public.photos
  for all using (
    exists (select 1 from public.albums a
            where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.albums a
            where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  );

-- selections: owners read/update (notes); customer writes happen via the
-- service role through API routes, so no public insert policy is needed.
drop policy if exists selections_owner_rw on public.selections;
create policy selections_owner_rw on public.selections
  for all using (
    exists (select 1 from public.albums a
            where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  )
  with check (
    exists (select 1 from public.albums a
            where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  );

-- ============================================================================
-- Showcase / pinned flags for the public profile homepage
-- ============================================================================
alter table public.albums add column if not exists is_showcase boolean not null default false;
alter table public.albums add column if not exists is_pinned   boolean not null default false;
alter table public.albums add column if not exists kind        text;  -- e.g. "Phóng sự cưới"

-- ============================================================================
-- Delivery galleries (vieetjk.com/album) — reuse the albums/sources/photos
-- infrastructure with is_gallery = true. View password = the client's phone.
-- ============================================================================
alter table public.albums add column if not exists is_gallery     boolean not null default false;
alter table public.albums add column if not exists client_name    text;
alter table public.albums add column if not exists client_phone   text;   -- view password; never sent to the public client
alter table public.albums add column if not exists event_date     date;   -- wedding / engagement date
alter table public.albums add column if not exists category        text;   -- cuoi-hoi | su-kien | gia-dinh | video | khac
alter table public.albums add column if not exists category_label text;   -- custom label
alter table public.albums add column if not exists gallery_pinned  boolean not null default false; -- pinned to homepage (no password)
create index if not exists albums_gallery_idx on public.albums (is_gallery, status);

-- Video support + per-account gallery permission + admin-curated featured photos
alter table public.photos add column if not exists is_video boolean not null default false;
alter table public.profiles add column if not exists can_galleries boolean not null default false;
alter table public.site_settings add column if not exists featured_images text[] not null default '{}';
alter table public.albums add column if not exists download_enabled boolean not null default true;

-- ============================================================================
-- feedback: client testimonials for a gallery / the photographer
-- ============================================================================
create table if not exists public.feedback (
  id          uuid primary key default gen_random_uuid(),
  album_id    uuid references public.albums (id) on delete cascade,
  client_name text,
  rating      integer,
  content     text not null,
  approved    boolean not null default true,
  created_at  timestamptz not null default now()
);
alter table public.feedback enable row level security;
-- Public can read approved feedback (homepage / gallery); owner & admin manage.
drop policy if exists feedback_public_read on public.feedback;
create policy feedback_public_read on public.feedback
  for select using (
    approved
    or exists (select 1 from public.albums a where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  );
drop policy if exists feedback_owner_manage on public.feedback;
create policy feedback_owner_manage on public.feedback
  for all using (
    exists (select 1 from public.albums a where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.albums a where a.id = album_id and (a.owner_id = auth.uid() or public.is_admin()))
  );

-- ============================================================================
-- site_settings: single-row studio profile + contact info (public read)
-- ============================================================================
create table if not exists public.site_settings (
  id               smallint primary key default 1 check (id = 1),
  profile_name     text not null default 'Vieetjk',
  profile_role     text not null default 'Nhiếp ảnh gia cưới & chân dung · Studio',
  profile_location text not null default 'Hà Nội · Việt Nam',
  profile_bio      text not null default 'Mình là Vieetjk — kể chuyện qua từng khung hình cưới và chân dung. Mỗi buổi chụp được lưu thành một album riêng, nơi bạn thong thả xem lại, đánh dấu những tấm ưng ý nhất và tải về bản gốc bất cứ lúc nào.',
  profile_avatar_url text,
  profile_cover_url  text,
  stat_years       integer not null default 8,
  contact_phone    text not null default '0987 654 321',
  contact_email    text not null default 'hello@vieetjk.studio',
  contact_instagram text not null default '@vieetjk.studio',
  contact_facebook text,
  contact_tiktok   text,
  contact_youtube  text,
  contact_address  text not null default '12 Nhà Thờ, Hoàn Kiếm, Hà Nội',
  contact_hours    text not null default 'Thứ 2 – Chủ nhật · 8:00–20:00',
  updated_at       timestamptz not null default now()
);
insert into public.site_settings (id) values (1) on conflict (id) do nothing;
-- Social links for databases created before these existed:
alter table public.site_settings add column if not exists contact_facebook text;
alter table public.site_settings add column if not exists contact_tiktok   text;
alter table public.site_settings add column if not exists contact_youtube  text;

alter table public.site_settings enable row level security;
drop policy if exists site_settings_public_read on public.site_settings;
create policy site_settings_public_read on public.site_settings
  for select using (true);
drop policy if exists site_settings_admin_write on public.site_settings;
create policy site_settings_admin_write on public.site_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- bookings: leads from the homepage booking form (insert via service role)
-- ============================================================================
create table if not exists public.bookings (
  id          uuid primary key default gen_random_uuid(),
  service     text not null default 'other',
  name        text not null,
  phone       text not null,
  date        text,
  note        text,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.bookings enable row level security;
-- Only admins read/manage; customer inserts happen through the service role.
drop policy if exists bookings_admin_all on public.bookings;
create policy bookings_admin_all on public.bookings
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- upgrade_requests: photographers asking to lift the free-tier limits
-- (inserted via the service role; admins read/manage)
-- ============================================================================
create table if not exists public.upgrade_requests (
  id          uuid primary key default gen_random_uuid(),
  user_id     uuid references auth.users (id) on delete cascade,
  email       text,
  note        text,
  handled     boolean not null default false,
  created_at  timestamptz not null default now()
);
alter table public.upgrade_requests enable row level security;
drop policy if exists upgrade_admin_all on public.upgrade_requests;
create policy upgrade_admin_all on public.upgrade_requests
  for all using (public.is_admin()) with check (public.is_admin());

-- ============================================================================
-- Monthly album-creation quota. Counted from an append-only creation log so
-- that DELETING an album does NOT free up the monthly quota. Admins exempt.
-- ============================================================================
create table if not exists public.album_creations (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
alter table public.album_creations enable row level security;
drop policy if exists album_creations_read on public.album_creations;
create policy album_creations_read on public.album_creations
  for select using (user_id = auth.uid() or public.is_admin());

-- One-time backfill from existing albums.
do $$
begin
  if not exists (select 1 from public.album_creations) then
    insert into public.album_creations (user_id, created_at)
    select owner_id, created_at from public.albums;
  end if;
end $$;

create or replace function public.enforce_album_quota()
returns trigger language plpgsql security definer set search_path = public as $$
declare
  lim   integer;
  isadm boolean;
  cangal boolean;
  used  integer;
begin
  select monthly_album_limit, (role = 'admin'), can_galleries
    into lim, isadm, cangal
    from public.profiles where id = new.owner_id;

  if coalesce(new.is_gallery, false) then
    -- Only admins / permitted accounts may create delivery galleries.
    if not (coalesce(isadm, false) or coalesce(cangal, false)) then
      raise exception 'Tài khoản chưa được cấp quyền tạo gallery khách.'
        using errcode = 'P0001';
    end if;
    return new; -- galleries don't use the selection quota
  end if;
  if coalesce(isadm, false) then return new; end if;
  if lim is null then return new; end if;

  select count(*) into used
    from public.album_creations
    where user_id = new.owner_id
      and created_at >= date_trunc('month', now());

  if used >= lim then
    raise exception 'Đã đạt giới hạn % album trong tháng này.', lim
      using errcode = 'P0001';
  end if;
  return new;
end;
$$;

drop trigger if exists albums_quota on public.albums;
create trigger albums_quota
  before insert on public.albums
  for each row execute function public.enforce_album_quota();

-- Log each creation (append-only; survives album deletion).
create or replace function public.log_album_creation()
returns trigger language plpgsql security definer set search_path = public as $$
begin
  if coalesce(new.is_gallery, false) then return new; end if; -- galleries don't count
  insert into public.album_creations (user_id, created_at) values (new.owner_id, now());
  return new;
end;
$$;

drop trigger if exists albums_log_creation on public.albums;
create trigger albums_log_creation
  after insert on public.albums
  for each row execute function public.log_album_creation();

-- ============================================================================
-- Image-compress tool (img.vieetjk.com) — per-account usage limits.
--   compress_daily_limit  : "basic" compress (local files + public Drive link),
--                           counted PER DAY (Vietnam time). Free = 2/day.
--   compress_picker_limit : compress via the Google Picker (writes back to the
--                           user's own Drive), counted LIFETIME. Free = 1 (trial).
-- null = unlimited; admins are always exempt. Counted from an append-only log.
-- ============================================================================
alter table public.profiles add column if not exists compress_daily_limit integer default 2;
alter table public.profiles alter column compress_daily_limit set default 2;
-- Bump accounts still on the old default (1) to the new free allowance (2).
update public.profiles set compress_daily_limit = 2 where compress_daily_limit = 1;
alter table public.profiles add column if not exists compress_picker_limit integer default 1;
-- "Pro" watermark features (image/logo watermark + compressing in the watermark
-- tab): false for free accounts, admins always allowed.
alter table public.profiles add column if not exists can_watermark_pro boolean not null default false;

-- ============================================================================
-- Subscription plan (free | basic | studio). The plan drives the monthly
-- quotas in code; assigning a plan also syncs the legacy columns above.
-- ============================================================================
alter table public.profiles add column if not exists plan text not null default 'free';
-- Allow the Photographer tier (recreate the check constraint).
alter table public.profiles drop constraint if exists profiles_plan_check;
alter table public.profiles add constraint profiles_plan_check
  check (plan in ('free', 'basic', 'photographer', 'studio'));
-- Billing cycle + auto-expiry. When the plan expires it is treated as 'free'.
alter table public.profiles add column if not exists plan_cycle text;            -- 'month' | 'year' | null
alter table public.profiles add column if not exists plan_expires_at timestamptz; -- null = no expiry (free / lifetime)

-- Per-month "filter tool" usage log (free = 10/month).
create table if not exists public.filter_usages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now()
);
create index if not exists filter_usages_user_idx on public.filter_usages (user_id, created_at);
alter table public.filter_usages enable row level security;
drop policy if exists filter_usages_read on public.filter_usages;
create policy filter_usages_read on public.filter_usages
  for select using (user_id = auth.uid() or public.is_admin());

-- Admin-configurable plan prices (VND) + discounts shown on the pricing page.
alter table public.site_settings add column if not exists basic_discount_percent integer not null default 0;
alter table public.site_settings add column if not exists price_basic_month  integer not null default 50000;
alter table public.site_settings add column if not exists price_basic_year   integer not null default 500000;
alter table public.site_settings add column if not exists price_studio_month integer not null default 300000;
alter table public.site_settings add column if not exists price_studio_year  integer not null default 3000000;
alter table public.site_settings add column if not exists studio_promo_percent integer not null default 50;
alter table public.site_settings add column if not exists price_photographer_month integer not null default 100000;
alter table public.site_settings add column if not exists price_photographer_year  integer not null default 999000;
-- Per-plan general discount (%) applied to both billing cycles.
alter table public.site_settings add column if not exists basic_discount_percent        integer not null default 0;
alter table public.site_settings add column if not exists photographer_discount_percent  integer not null default 0;
alter table public.site_settings add column if not exists studio_discount_percent        integer not null default 0;

-- Desired plan / billing cycle / discount code / contact phone on an upgrade request.
alter table public.upgrade_requests add column if not exists plan text;
alter table public.upgrade_requests add column if not exists cycle text;
alter table public.upgrade_requests add column if not exists discount_code text;
alter table public.upgrade_requests add column if not exists phone text;
alter table public.upgrade_requests add column if not exists amount integer; -- final price after discount (VND)

-- ============================================================================
-- Discount codes (admin-created). Validated server-side; admins manage.
-- ============================================================================
create table if not exists public.discount_codes (
  id         uuid primary key default gen_random_uuid(),
  code       text not null unique,
  percent    integer not null default 0,
  plan       text,            -- null = any paid plan, else 'basic' | 'studio'
  active     boolean not null default true,
  max_uses   integer,         -- null = unlimited; 1 = single use
  used_count integer not null default 0,
  created_at timestamptz not null default now()
);
alter table public.discount_codes add column if not exists max_uses integer;
alter table public.discount_codes add column if not exists used_count integer not null default 0;
alter table public.discount_codes add column if not exists expires_at timestamptz; -- null = no expiry
alter table public.discount_codes add column if not exists cycle text;            -- null = any cycle, else 'month' | 'year'
alter table public.discount_codes enable row level security;
-- Only admins read/manage directly; customers validate a code via the API (service role).
drop policy if exists discount_codes_admin on public.discount_codes;
create policy discount_codes_admin on public.discount_codes
  for all using (public.is_admin()) with check (public.is_admin());

-- Per-account redemption log: each code can be used at most once per user.
create table if not exists public.discount_redemptions (
  id         uuid primary key default gen_random_uuid(),
  code       text not null,
  user_id    uuid references auth.users (id) on delete cascade,
  created_at timestamptz not null default now(),
  unique (code, user_id)
);
alter table public.discount_redemptions enable row level security;
drop policy if exists discount_redemptions_read on public.discount_redemptions;
create policy discount_redemptions_read on public.discount_redemptions
  for select using (user_id = auth.uid() or public.is_admin());

create table if not exists public.compress_usages (
  id         uuid primary key default gen_random_uuid(),
  user_id    uuid references auth.users (id) on delete cascade,
  kind       text not null default 'basic',   -- 'basic' | 'picker'
  created_at timestamptz not null default now()
);
alter table public.compress_usages add column if not exists kind text not null default 'basic';
create index if not exists compress_usages_user_idx
  on public.compress_usages (user_id, kind, created_at);
alter table public.compress_usages enable row level security;
-- Users read their own usage; admins read all. Inserts happen via the service
-- role through the /api/compress/use route, so no public insert policy needed.
drop policy if exists compress_usages_read on public.compress_usages;
create policy compress_usages_read on public.compress_usages
  for select using (user_id = auth.uid() or public.is_admin());

-- ============================================================================
-- STUDIO MODULE (studio.vieetjk.com) — contracts, crew, salaries, schedule.
-- Studio-plan accounts (and admins) manage contracts; clients view their own
-- contract via an unguessable token (+ phone), crew see their jobs by phone.
-- All public-facing reads/writes go through the service role in API routes,
-- so RLS only needs to cover the owner (logged-in studio) + admin.
-- ============================================================================

-- Contracts -------------------------------------------------------------------
create table if not exists public.studio_contracts (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  code          text,                       -- human reference, e.g. HD-2026-001
  title         text not null default 'Hợp đồng',
  client_name   text,
  client_phone  text,                       -- also the client's view password
  client_email  text,
  shoot_type    text not null default 'photo'
                  check (shoot_type in ('photo', 'video', 'both')),
  event_date    date,
  event_time    text,
  location      text,
  status        text not null default 'draft'
                  check (status in ('draft', 'sent', 'approved', 'in_progress', 'completed', 'cancelled')),
  deposit       integer not null default 0, -- tiền cọc (VND)
  note          text,
  client_token  text not null unique,       -- /c/[token]
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists studio_contracts_owner_idx on public.studio_contracts (owner_id);

drop trigger if exists studio_contracts_set_updated_at on public.studio_contracts;
create trigger studio_contracts_set_updated_at
  before update on public.studio_contracts
  for each row execute function public.set_updated_at();

-- Contract line items (hạng mục tự nhập + đơn giá) ----------------------------
create table if not exists public.contract_items (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.studio_contracts (id) on delete cascade,
  name        text not null default '',
  qty         integer not null default 1,
  unit_price  integer not null default 0,   -- VND
  position    integer not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists contract_items_contract_idx on public.contract_items (contract_id);

-- Crew assigned to a contract (photographer / cameraman) + salary -------------
create table if not exists public.contract_crew (
  id           uuid primary key default gen_random_uuid(),
  contract_id  uuid not null references public.studio_contracts (id) on delete cascade,
  name         text not null default '',
  phone        text,                          -- crew identify themselves by phone
  role         text not null default 'photographer'
                 check (role in ('photographer', 'cameraman', 'assistant', 'editor', 'other')),
  salary       integer not null default 0,    -- lương theo hợp đồng (VND)
  status       text not null default 'pending'
                 check (status in ('pending', 'accepted', 'declined')),
  note         text,                          -- yêu cầu riêng gửi cho thợ này
  responded_at timestamptz,
  position     integer not null default 0,
  created_at   timestamptz not null default now()
);
create index if not exists contract_crew_contract_idx on public.contract_crew (contract_id);
create index if not exists contract_crew_phone_idx on public.contract_crew (phone);

-- Client requests to amend a contract -----------------------------------------
create table if not exists public.contract_edit_requests (
  id          uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.studio_contracts (id) on delete cascade,
  message     text not null,
  status      text not null default 'open' check (status in ('open', 'resolved')),
  created_at  timestamptz not null default now(),
  resolved_at timestamptz
);
create index if not exists contract_edit_requests_contract_idx on public.contract_edit_requests (contract_id);

-- Studio crew roster (sổ thợ, quản lý theo SĐT) -------------------------------
create table if not exists public.studio_crew (
  id         uuid primary key default gen_random_uuid(),
  owner_id   uuid not null references public.profiles (id) on delete cascade,
  name       text not null default '',
  phone      text not null,
  role       text not null default 'photographer',
  note       text,
  created_at timestamptz not null default now(),
  unique (owner_id, phone)
);
create index if not exists studio_crew_owner_idx on public.studio_crew (owner_id);

-- Calendar notes / reminders (lịch ghi chú hợp đồng) --------------------------
create table if not exists public.studio_events (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  contract_id uuid references public.studio_contracts (id) on delete set null,
  title       text not null default '',
  event_date  date not null,
  event_time  text,
  note        text,
  remind      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists studio_events_owner_idx on public.studio_events (owner_id, event_date);

-- RLS: owner (logged-in studio) + admin only. Public access is service-role.
alter table public.studio_contracts      enable row level security;
alter table public.contract_items        enable row level security;
alter table public.contract_crew         enable row level security;
alter table public.contract_edit_requests enable row level security;
alter table public.studio_crew           enable row level security;
alter table public.studio_events         enable row level security;

drop policy if exists studio_contracts_owner_all on public.studio_contracts;
create policy studio_contracts_owner_all on public.studio_contracts
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- Child tables: gated on owning the parent contract.
drop policy if exists contract_items_owner_all on public.contract_items;
create policy contract_items_owner_all on public.contract_items
  for all using (
    exists (select 1 from public.studio_contracts c
            where c.id = contract_id and (c.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.studio_contracts c
            where c.id = contract_id and (c.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists contract_crew_owner_all on public.contract_crew;
create policy contract_crew_owner_all on public.contract_crew
  for all using (
    exists (select 1 from public.studio_contracts c
            where c.id = contract_id and (c.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.studio_contracts c
            where c.id = contract_id and (c.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists contract_edit_requests_owner_all on public.contract_edit_requests;
create policy contract_edit_requests_owner_all on public.contract_edit_requests
  for all using (
    exists (select 1 from public.studio_contracts c
            where c.id = contract_id and (c.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.studio_contracts c
            where c.id = contract_id and (c.owner_id = auth.uid() or public.is_admin()))
  );

drop policy if exists studio_crew_owner_all on public.studio_crew;
create policy studio_crew_owner_all on public.studio_crew
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists studio_events_owner_all on public.studio_events;
create policy studio_events_owner_all on public.studio_events
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- ============================================================================
-- Promote your first admin (replace the email), run AFTER signing up once:
--   update public.profiles set role = 'admin', is_active = true,
--     can_zip = true, can_notes = true, monthly_album_limit = null
--   where email = 'you@example.com';
-- ============================================================================

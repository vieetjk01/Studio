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
  max_albums    integer,                 -- null = unlimited
  can_zip       boolean not null default true,
  is_active     boolean not null default true,
  created_at    timestamptz not null default now()
);

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
  photographer_note text,           -- note added by the photographer
  created_at       timestamptz not null default now(),
  unique (album_id, photo_id, session_id)
);
create index if not exists selections_album_idx on public.selections (album_id);
create index if not exists selections_session_idx on public.selections (album_id, session_id);

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
    coalesce(new.raw_user_meta_data ->> 'full_name', new.email),
    'photographer',
    false
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
-- Promote your first admin (replace the email), run AFTER signing up once:
--   update public.profiles set role = 'admin', is_active = true
--   where email = 'you@example.com';
-- ============================================================================

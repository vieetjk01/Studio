-- ============================================================================
-- Album Designer — bảng lưu album đã thiết kế. Chạy trên Supabase SQL Editor.
-- An toàn khi chạy lại (idempotent).
-- ============================================================================
create table if not exists public.album_designs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  name        text not null default 'Album chưa đặt tên',
  size        jsonb not null default '{}'::jsonb,
  tpl         jsonb not null default '{}'::jsonb,
  spreads     jsonb not null default '[]'::jsonb,
  folder      text,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists album_designs_owner_idx on public.album_designs (owner_id, updated_at desc);
alter table public.album_designs enable row level security;
drop policy if exists album_designs_owner_all on public.album_designs;
create policy album_designs_owner_all on public.album_designs
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

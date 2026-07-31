-- ============================================================================
-- MStudo — Đếm lượt xem website studio (mỗi ngày một dòng).
--
-- Studio đang không biết trang mình có ai vào. Bảng này giữ số lượt xem theo
-- NGÀY cho từng site (không lưu IP, không theo dõi cá nhân — chỉ đếm).
-- Chỉ service-role (API server) được GHI; chủ studio ĐỌC số của site mình.
-- Chạy được nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.site_views (
  site_id uuid not null references public.sites (id) on delete cascade,
  day     date not null default current_date,
  views   integer not null default 0,
  primary key (site_id, day)
);

create index if not exists site_views_site_day_idx on public.site_views (site_id, day desc);

alter table public.site_views enable row level security;

-- Chủ studio (và admin) chỉ ĐỌC số liệu của site mình.
drop policy if exists site_views_owner_read on public.site_views;
create policy site_views_owner_read on public.site_views
  for select using (
    exists (
      select 1 from public.sites s
      where s.id = site_id and (s.owner_id = auth.uid() or public.is_admin())
    )
  );
-- Không có policy insert/update cho người dùng: chỉ service-role ghi được, qua
-- hàm bump_site_view() bên dưới.

-- Tăng bộ đếm của ngày hôm nay. Dùng upsert nguyên tử nên nhiều lượt truy cập
-- cùng lúc không ghi đè nhau.
create or replace function public.bump_site_view(p_site uuid)
returns void
language sql
security definer
set search_path = public
as $$
  insert into public.site_views (site_id, day, views)
  values (p_site, current_date, 1)
  on conflict (site_id, day) do update set views = public.site_views.views + 1;
$$;

revoke all on function public.bump_site_view(uuid) from public, anon, authenticated;
grant execute on function public.bump_site_view(uuid) to service_role;

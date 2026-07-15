-- ============================================================================
-- RENTAL MODULE (Thuê đồ) — quản lý kho trang phục (váy cưới, vest, áo dài,
-- phụ kiện) và đơn cho thuê. Theo pattern studio_*: owner_id + RLS owner/admin.
-- Mọi thao tác đăng nhập đi qua RLS; đơn thuê liên kết tùy chọn với hợp đồng.
-- Chạy 1 lần trong Supabase SQL Editor.
-- ============================================================================

-- Kho trang phục -------------------------------------------------------------
create table if not exists public.rental_items (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  name          text not null default '',
  category      text not null default 'dress'
                  check (category in ('dress', 'vest', 'ao_dai', 'accessory', 'other')),
  code          text,                          -- mã sản phẩm (SKU)
  size          text,
  color         text,
  rental_price  integer not null default 0,    -- giá thuê / lần (VND)
  deposit       integer not null default 0,    -- tiền cọc (VND)
  quantity      integer not null default 1,    -- số lượng sở hữu
  cover_url     text,                          -- ảnh minh hoạ
  status        text not null default 'available'
                  check (status in ('available', 'maintenance', 'retired')),
  note          text,
  created_at    timestamptz not null default now()
);
create index if not exists rental_items_owner_idx on public.rental_items (owner_id, category);

-- Đơn thuê -------------------------------------------------------------------
create table if not exists public.rental_orders (
  id            uuid primary key default gen_random_uuid(),
  owner_id      uuid not null references public.profiles (id) on delete cascade,
  contract_id   uuid references public.studio_contracts (id) on delete set null,
  client_name   text not null default '',
  client_phone  text,
  pickup_date   date,                          -- ngày nhận
  return_date   date,                          -- ngày trả (hẹn)
  returned_at   date,                          -- ngày trả thực tế (null = chưa trả)
  total_price   integer not null default 0,    -- tổng tiền thuê (VND)
  deposit_paid  integer not null default 0,    -- cọc đã thu (VND)
  status        text not null default 'booked'
                  check (status in ('booked', 'picked_up', 'returned', 'overdue', 'canceled')),
  note          text,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now()
);
create index if not exists rental_orders_owner_idx on public.rental_orders (owner_id, status);
create index if not exists rental_orders_contract_idx on public.rental_orders (contract_id);

drop trigger if exists rental_orders_set_updated_at on public.rental_orders;
create trigger rental_orders_set_updated_at
  before update on public.rental_orders
  for each row execute function public.set_updated_at();

-- Dòng đơn thuê (nối đơn ↔ trang phục) ---------------------------------------
create table if not exists public.rental_order_items (
  id         uuid primary key default gen_random_uuid(),
  order_id   uuid not null references public.rental_orders (id) on delete cascade,
  item_id    uuid references public.rental_items (id) on delete set null,
  name       text not null default '',         -- snapshot tên món (giữ khi item bị xoá)
  price      integer not null default 0,        -- giá tại thời điểm thuê (VND)
  qty        integer not null default 1,
  created_at timestamptz not null default now()
);
create index if not exists rental_order_items_order_idx on public.rental_order_items (order_id);
create index if not exists rental_order_items_item_idx on public.rental_order_items (item_id);

-- RLS: owner (studio đăng nhập) + admin.
alter table public.rental_items       enable row level security;
alter table public.rental_orders      enable row level security;
alter table public.rental_order_items enable row level security;

drop policy if exists rental_items_owner_all on public.rental_items;
create policy rental_items_owner_all on public.rental_items
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists rental_orders_owner_all on public.rental_orders;
create policy rental_orders_owner_all on public.rental_orders
  for all using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- Dòng đơn: gated theo quyền sở hữu đơn cha.
drop policy if exists rental_order_items_owner_all on public.rental_order_items;
create policy rental_order_items_owner_all on public.rental_order_items
  for all using (
    exists (select 1 from public.rental_orders o
            where o.id = order_id and (o.owner_id = auth.uid() or public.is_admin()))
  ) with check (
    exists (select 1 from public.rental_orders o
            where o.id = order_id and (o.owner_id = auth.uid() or public.is_admin()))
  );

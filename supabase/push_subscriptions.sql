-- Web Push subscriptions. Run this in Supabase → SQL Editor.
create table if not exists push_subscriptions (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null,          -- the studio owner who receives notifications
  user_id     uuid not null,          -- the device's logged-in user (owner or staff)
  endpoint    text not null unique,   -- unique per device/browser
  p256dh      text not null,
  auth        text not null,
  created_at  timestamptz default now()
);

create index if not exists push_subscriptions_owner_idx on push_subscriptions (owner_id);

-- Writes go through the service-role key (server API routes), so RLS can stay
-- enabled with no public policies — clients never touch this table directly.
alter table push_subscriptions enable row level security;

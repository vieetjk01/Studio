-- ============================================================================
-- MStudo — Lead & hội thoại từ chatbox tư vấn trên website (vieetjk.com).
--
-- Khách nhắn qua chatbox → khi để lại SĐT (tự nhập hoặc bot xin được) thì lưu
-- một "lead" kèm toàn bộ hội thoại. Chủ studio xem trong dashboard và được báo
-- qua Zalo. Chỉ service-role (API server) GHI; chủ studio ĐỌC/cập nhật của mình.
-- Chạy được nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.website_leads (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete cascade,
  source      text not null default 'vieetjk',       -- nguồn (site nào)
  session_id  text,                                   -- gom các tin cùng 1 phiên chat
  name        text,
  phone       text,
  interest    text,                                   -- khách quan tâm gì (tóm tắt)
  -- Toàn bộ hội thoại: [{ role: 'user'|'assistant', content: '...' }, ...]
  transcript  jsonb not null default '[]'::jsonb,
  status      text not null default 'new'
                check (status in ('new', 'contacted', 'closed')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists website_leads_owner_idx
  on public.website_leads (owner_id, created_at desc);

alter table public.website_leads enable row level security;

-- Chủ studio (và admin) ĐỌC lead của mình.
drop policy if exists website_leads_owner_read on public.website_leads;
create policy website_leads_owner_read on public.website_leads
  for select using (owner_id = auth.uid() or public.is_admin());

-- Chủ studio (và admin) cập nhật trạng thái lead của mình (đã liên hệ / đóng).
drop policy if exists website_leads_owner_update on public.website_leads;
create policy website_leads_owner_update on public.website_leads
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

-- GHI (insert) chỉ qua service-role: không cấp quyền insert cho anon/authenticated.
revoke insert on public.website_leads from anon, authenticated;

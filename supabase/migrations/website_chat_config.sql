-- ============================================================================
-- MStudo — Cấu hình chatbox tư vấn website (mỗi studio tự chỉnh câu trả lời).
--
-- Chủ studio gõ lời chào + kiến thức/FAQ/luật riêng trong dashboard → lưu ở đây.
-- API chat đọc (service-role) và ghép vào system prompt để bot trả lời theo ý.
-- Chủ studio đọc/ghi cấu hình CỦA MÌNH (RLS). Chạy được nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.website_chat_config (
  owner_id      uuid primary key references public.profiles (id) on delete cascade,
  -- Lời chào mở đầu (để trống → dùng mặc định trong code).
  greeting      text,
  -- Kiến thức / FAQ / chính sách / giọng văn / luật riêng — văn bản tự do.
  instructions  text,
  updated_at    timestamptz not null default now()
);

alter table public.website_chat_config enable row level security;

drop policy if exists website_chat_config_owner_read on public.website_chat_config;
create policy website_chat_config_owner_read on public.website_chat_config
  for select using (owner_id = auth.uid() or public.is_admin());

drop policy if exists website_chat_config_owner_insert on public.website_chat_config;
create policy website_chat_config_owner_insert on public.website_chat_config
  for insert with check (owner_id = auth.uid() or public.is_admin());

drop policy if exists website_chat_config_owner_update on public.website_chat_config;
create policy website_chat_config_owner_update on public.website_chat_config
  for update using (owner_id = auth.uid() or public.is_admin())
  with check (owner_id = auth.uid() or public.is_admin());

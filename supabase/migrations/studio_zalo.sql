-- ============================================================================
-- MStudo — Tự động nhắn tin Zalo (per-studio). CHỈ dành cho gói `studio`.
--
-- Mỗi studio tự KẾT NỐI kênh Zalo của họ (giống studio_drive):
--   • channel = 'oa'       → Official Account (chính thống): gửi ZNS / tin OA.
--   • channel = 'personal' → tài khoản Zalo cá nhân (đăng nhập QR, dùng zca-js).
--
-- Token OA + phiên đăng nhập cá nhân là BÍ MẬT → bảng riêng, RLS bật + REVOKE mọi
-- quyền của anon/authenticated ⇒ CHỈ service-role (API server) đọc/ghi được.
-- Phiên cá nhân còn được mã hoá AES-256-GCM trước khi lưu (src/lib/zalo/crypto.ts).
-- Chạy được nhiều lần (idempotent).
-- ============================================================================

create table if not exists public.studio_zalo (
  owner_id             uuid primary key references public.profiles (id) on delete cascade,
  channel              text not null default 'personal' check (channel in ('oa', 'personal')),
  display_name         text,                 -- tên OA / tên tài khoản cá nhân (hiển thị trong UI)
  status               text not null default 'disconnected'
                         check (status in ('disconnected', 'connected', 'expired', 'error')),

  -- ── Kênh OA (chính thống) — ZNS / tin OA ─────────────────────────────────
  oa_id                text,
  oa_access_token      text,
  oa_access_expires_at timestamptz,
  oa_refresh_token     text,

  -- ── Kênh cá nhân (zca-js) — { cookie, imei, userAgent } đã MÃ HOÁ ────────
  personal_session     text,                 -- ciphertext AES-256-GCM, KHÔNG bao giờ lưu thô
  personal_self        jsonb,                -- { id, name, avatar } của tài khoản đã đăng nhập

  -- ── Cấu hình tự động gửi theo mốc vòng đời hợp đồng ──────────────────────
  -- { "<event_key>": { "client": true, "crew": false, "templateId": "..." }, ... }
  auto_events          jsonb not null default '{}'::jsonb,

  last_error           text,
  connected_at         timestamptz,
  updated_at           timestamptz not null default now()
);

-- Không để lộ token/cookie ra trình duyệt: khoá mọi quyền của anon/authenticated,
-- bật RLS mà KHÔNG tạo policy → chỉ service-role (bỏ qua RLS) mới truy cập được.
revoke all on public.studio_zalo from anon, authenticated;
alter table public.studio_zalo enable row level security;

-- ── Hàng đợi + nhật ký tin Zalo đã gửi ─────────────────────────────────────
-- Chủ studio ĐỌC được tin của mình (hiển thị lịch sử); chỉ service-role GHI
-- (việc gửi luôn chạy phía máy chủ).
create table if not exists public.zalo_messages (
  id           uuid primary key default gen_random_uuid(),
  owner_id     uuid not null references public.profiles (id) on delete cascade,
  channel      text not null default 'personal',
  audience     text,                          -- 'client' | 'crew' | null
  to_phone     text,
  to_uid       text,                          -- Zalo user id đã phân giải (nếu có)
  to_name      text,
  body         text not null default '',
  template_id  text,                          -- template ZNS đã dùng (nếu là OA)
  kind         text,                          -- mốc vòng đời: booking_confirm, shoot_reminder, …
  contract_id  uuid references public.studio_contracts (id) on delete set null,
  status       text not null default 'pending'
                 check (status in ('pending', 'sent', 'failed', 'skipped')),
  error        text,
  attempts     int not null default 0,
  created_at   timestamptz not null default now(),
  sent_at      timestamptz
);
create index if not exists zalo_messages_owner_idx on public.zalo_messages (owner_id, created_at desc);
create index if not exists zalo_messages_pending_idx on public.zalo_messages (status) where status = 'pending';

alter table public.zalo_messages enable row level security;
drop policy if exists zalo_messages_owner_read on public.zalo_messages;
create policy zalo_messages_owner_read on public.zalo_messages
  for select using (owner_id = auth.uid() or public.is_admin());

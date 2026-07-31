-- ─────────────────────────────────────────────────────────────────────────
-- Hồ sơ thợ · thông tin show · đăng ký theo studio · feed lịch
--
-- Chạy SAU crew_schedule.sql. Idempotent, chạy lại nhiều lần vô hại.
-- ─────────────────────────────────────────────────────────────────────────

-- 1) Hồ sơ thợ — studio nhập, hoặc thợ tự điền nếu studio để trống.
alter table public.studio_crew add column if not exists email          text;
alter table public.studio_crew add column if not exists address        text;
alter table public.studio_crew add column if not exists birthday       date;
alter table public.studio_crew add column if not exists id_number      text;   -- CCCD
alter table public.studio_crew add column if not exists bank_name      text;
alter table public.studio_crew add column if not exists bank_account   text;
alter table public.studio_crew add column if not exists skills         text;
alter table public.studio_crew add column if not exists avatar_url     text;
-- Thợ tự điền lúc nào (để studio biết dòng nào do thợ khai).
alter table public.studio_crew add column if not exists self_filled_at timestamptz;
-- 'active'  = studio đã nhận vào sổ
-- 'pending' = thợ tự đăng ký qua link của studio, chờ studio duyệt
alter table public.studio_crew add column if not exists status         text not null default 'active';

-- 2) Thông tin SHOW trên từng phân công — studio gán gì thì thợ thấy đúng thế.
--    task: chụp / quay / cả hai · side: nhà trai / nhà gái / sắp xếp sau
alter table public.contract_crew add column if not exists task       text;
alter table public.contract_crew add column if not exists side       text;
alter table public.contract_crew add column if not exists start_time time;
alter table public.contract_crew add column if not exists end_time   time;

-- 3) Nối mốc lịch với phân công: gỡ thợ khỏi hợp đồng thì mốc lịch tự biến mất
--    (on delete cascade), khỏi để lại lịch ma.
alter table public.crew_unavailable
  add column if not exists contract_crew_id uuid references public.contract_crew (id) on delete cascade;
create index if not exists crew_unavailable_assign_idx on public.crew_unavailable (contract_crew_id);

-- 4) Link đăng ký riêng của mỗi studio: /crew/<crew_token>.
--    Tách khỏi booking_token (dành cho KHÁCH đặt lịch) để hai đối tượng không
--    dùng chung một bí mật — đổi cái này không làm hỏng cái kia.
alter table public.profiles add column if not exists crew_token text unique;

-- 5) Tài khoản nhẹ của thợ: giữ token feed lịch (.ics) để thợ tự đăng ký vào
--    Google Calendar. Không OAuth, không tài khoản — thợ chỉ có số điện thoại.
create table if not exists public.crew_account (
  phone          text primary key,
  calendar_token text unique,
  created_at     timestamptz not null default now()
);
alter table public.crew_account enable row level security;
-- Ghi đi qua service role từ cổng thợ; studio đã đăng nhập chỉ cần đọc.
drop policy if exists crew_account_read on public.crew_account;
create policy crew_account_read on public.crew_account
  for select using (auth.role() = 'authenticated');

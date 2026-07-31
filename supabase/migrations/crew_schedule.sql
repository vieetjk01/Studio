-- ─────────────────────────────────────────────────────────────────────────
-- Lịch thợ (sổ thợ → lịch)
--
-- `crew_unavailable` vốn chỉ ghi "ngày này thợ bận" (một dòng / ngày). Lịch thợ
-- cần hơn thế: thợ đã nhận việc ngày 15/8 TỪ MẤY GIỜ ĐẾN MẤY GIỜ, và một ngày
-- có thể nhận nhiều việc. Nên mở rộng chính bảng này thay vì đẻ thêm bảng thứ
-- hai cùng ý nghĩa — dữ liệu cũ vẫn dùng được, chỉ là không có giờ (cả ngày).
--
-- Chạy trước khi deploy.
-- ─────────────────────────────────────────────────────────────────────────

alter table public.crew_unavailable add column if not exists start_time time;
alter table public.crew_unavailable add column if not exists end_time   time;
-- Ca đêm vắt qua nửa đêm (20:00 → 08:00 hôm sau): giờ kết thúc NHỎ HƠN giờ bắt
-- đầu. Cờ này để đọc/hiển thị khỏi phải đoán.
alter table public.crew_unavailable add column if not exists overnight  boolean not null default false;
alter table public.crew_unavailable add column if not exists title      text;
-- null = thợ tự thêm; có giá trị = studio thêm hộ (studio nào thêm).
alter table public.crew_unavailable add column if not exists owner_id   uuid references public.profiles (id) on delete set null;

-- Một ngày có thể có nhiều mốc lịch → bỏ ràng buộc duy nhất theo (phone, date).
-- Chỉ số tra cứu ở dưới vẫn giữ nguyên nên truy vấn không chậm đi.
alter table public.crew_unavailable drop constraint if exists crew_unavailable_phone_date_key;

-- ─────────────────────────────────────────────────────────────────────────
-- Ca công ty của thợ freelancer (Hòa Phát: 3 ca A/B/C).
--
-- KHÔNG lưu từng ca vào lịch — chu kỳ là công thức thuần tuý (xem
-- src/lib/crew-shift.ts) nên chỉ cần nhớ thợ thuộc ca nào, còn lịch thì tính ra
-- lúc hiển thị. Nhờ vậy lịch đúng ở mọi tháng, quá khứ lẫn tương lai, mà không
-- phải sinh sẵn dòng nào.
-- ─────────────────────────────────────────────────────────────────────────
create table if not exists public.crew_shift_plan (
  phone      text primary key,
  company    text not null default 'hoa_phat',
  shift      text not null check (shift in ('A', 'B', 'C')),
  updated_at timestamptz not null default now()
);

alter table public.crew_shift_plan enable row level security;
-- Studio đã đăng nhập đọc được để xem lịch đội; ghi đi qua service role từ cổng
-- thợ (thợ không có tài khoản) — giống hệt cách crew_unavailable đang làm.
drop policy if exists crew_shift_plan_read on public.crew_shift_plan;
create policy crew_shift_plan_read on public.crew_shift_plan
  for select using (auth.role() = 'authenticated');

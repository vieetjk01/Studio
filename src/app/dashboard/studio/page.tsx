import Link from "next/link";
import { redirect } from "next/navigation";
import { Plus, FileText, CalendarDays, Users, AlertCircle, Wallet, UserCheck, Clock, TrendingUp, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import ZaloButton from "@/components/ZaloButton";
import StudioTrialButton from "@/components/StudioTrialButton";
import MessengerButton from "@/components/MessengerButton";
import VietQRButton from "@/components/VietQR";
import AutoEmailToggle from "@/components/AutoEmailToggle";
import { shootReminderMessage } from "@/lib/zalo";
import {
  contractTotal,
  sumAmounts,
  vnd,
  CONTRACT_STATUS_LABEL,
  QUOTE_STATUS_LABEL,
  SHOOT_TYPE_LABEL,
  CREW_ROLE_LABEL,
  quoteSelectedTotal,
  type ContractStatus,
  type QuoteStatus,
  type CrewRole,
} from "@/lib/types";

/* ── Design tokens (ported from the mstudo app mockup) ─────────────────────
   Status tones with a soft background, matching the green-accent mstudo look.
   These work on the dark app shell; the accent is the brand green. */
const TONE = {
  green: { fg: "#3fb98a", soft: "rgba(63,185,138,.14)" },
  amber: { fg: "#d6a44a", soft: "rgba(214,164,74,.16)" },
  red: { fg: "#e0746f", soft: "rgba(224,116,111,.16)" },
  blue: { fg: "#6fa0ec", soft: "rgba(111,160,236,.16)" },
  gray: { fg: "var(--text2)", soft: "var(--surface2)" },
} as const;
type ToneKey = keyof typeof TONE;
const ACCENT = TONE.green.fg;
const ACCENT_SOFT = TONE.green.soft;

function badgeStyle(tone: ToneKey): React.CSSProperties {
  return {
    display: "inline-block",
    fontSize: 12,
    fontWeight: 700,
    padding: "3px 10px",
    borderRadius: 999,
    color: TONE[tone].fg,
    background: TONE[tone].soft,
    whiteSpace: "nowrap",
  };
}

const STATUS_TONE: Record<ContractStatus, ToneKey> = {
  draft: "gray",
  sent: "blue",
  approved: "green",
  in_progress: "amber",
  completed: "green",
  cancelled: "red",
};

/* ── Shared UI bits ──────────────────────────────────────────────────────── */
function StatCard({
  icon: Icon,
  label,
  value,
  delta,
  deltaTone = "gray",
}: {
  icon: typeof FileText;
  label: string;
  value: string;
  delta?: string;
  deltaTone?: ToneKey;
}) {
  return (
    <div className="card p-5">
      <div className="flex items-center justify-between">
        <span className="text-[13px] font-medium" style={{ color: "var(--text2)" }}>{label}</span>
        <span
          className="flex h-8 w-8 items-center justify-center rounded-lg"
          style={{ background: ACCENT_SOFT, color: ACCENT }}
        >
          <Icon size={16} />
        </span>
      </div>
      <p className="mt-3 font-serif text-[26px] font-medium leading-none">{value}</p>
      {delta ? (
        <p className="mt-2 text-xs font-semibold" style={{ color: TONE[deltaTone].fg }}>{delta}</p>
      ) : null}
    </div>
  );
}

/** Mini 6-month revenue bar chart, sharing the overview's card look. */
function RevenueChart({ bars }: { bars: { label: string; value: number }[] }) {
  const max = Math.max(1, ...bars.map((b) => b.value));
  return (
    <div className="card p-6">
      <div className="mb-4 flex items-center justify-between">
        <h2 className="flex items-center gap-2 font-serif text-lg font-medium">
          <TrendingUp size={18} style={{ color: ACCENT }} /> Doanh thu
        </h2>
        <span className="text-xs" style={{ color: "var(--text3)" }}>6 tháng gần nhất</span>
      </div>
      <div className="flex h-[170px] items-end gap-3 pt-2">
        {bars.map((b) => (
          <div key={b.label} className="flex h-full flex-1 flex-col items-center justify-end gap-2">
            <span className="text-[10px] font-semibold" style={{ color: "var(--text3)" }}>
              {b.value > 0 ? vnd(b.value).replace("₫", "").trim() : ""}
            </span>
            <div
              className="w-full max-w-[42px] rounded-t-md"
              style={{
                height: `${Math.max(4, (b.value / max) * 100)}%`,
                minHeight: 6,
                background: b.value > 0 ? ACCENT : "var(--surface2)",
              }}
            />
            <span className="text-[11px] font-semibold" style={{ color: "var(--text2)" }}>{b.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

/** Photographer-plan overview: bookings + upcoming shoots, no contracts/finance. */
async function BookingOverview({ ownerId }: { ownerId: string }) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

  // Check if user already used the Studio trial
  const { data: trialRed } = await supabase
    .from("discount_redemptions")
    .select("id")
    .eq("user_id", ownerId)
    .eq("code", "TRIAL_STUDIO_1D")
    .maybeSingle();
  const trialUsed = !!trialRed;

  const { data } = await supabase
    .from("studio_bookings")
    .select("id, name, phone, service, preferred_date, package_name, package_price, status, created_at")
    .eq("owner_id", ownerId)
    .neq("status", "archived")
    .order("created_at", { ascending: false });
  const bookings = (data ?? []) as Array<{
    id: string; name: string; phone: string; service: string | null;
    preferred_date: string | null; package_name: string | null; package_price: number | null;
    status: "new" | "handled" | "archived"; created_at: string;
  }>;

  const newCount = bookings.filter((b) => b.status === "new").length;
  const upcoming = bookings
    .filter((b) => b.preferred_date && b.preferred_date >= today)
    .sort((a, b) => (a.preferred_date || "").localeCompare(b.preferred_date || ""))
    .slice(0, 8);

  const stats: { icon: typeof FileText; label: string; value: string; delta?: string; deltaTone?: ToneKey }[] = [
    { icon: AlertCircle, label: "Đặt lịch mới", value: String(newCount), delta: newCount > 0 ? "cần xử lý" : undefined, deltaTone: "amber" },
    { icon: CalendarDays, label: "Lịch sắp tới", value: String(upcoming.length) },
    { icon: Users, label: "Tổng yêu cầu đặt lịch", value: String(bookings.length) },
  ];

  const quickLinks = [
    { href: "/dashboard/studio/bookings", icon: Clock, label: "Đặt lịch", desc: "Yêu cầu khách gửi" },
    { href: "/dashboard/studio/calendar", icon: CalendarDays, label: "Lịch chụp", desc: "Xem & sắp lịch" },
    { href: "/dashboard/studio/pricing", icon: Wallet, label: "Bảng giá", desc: "Các gói dịch vụ" },
    { href: "/dashboard/studio/clients", icon: Users, label: "Khách hàng", desc: "Danh bạ khách" },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="font-serif text-2xl font-medium">Tổng quan</h1>
        <Link href="/dashboard/site" className="btn-ghost ml-auto">
          <Globe size={16} /> Website riêng
        </Link>
        <Link href="/dashboard/studio/bookings" className="btn-primary">
          <CalendarDays size={16} /> Đặt lịch
        </Link>

      </div>
      <p className="mb-6 text-[13px]" style={{ color: "var(--text3)" }}>Quản lý lịch chụp & yêu cầu đặt lịch của khách</p>

      <div className="mb-6 grid grid-cols-1 gap-4 sm:grid-cols-3">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      <div className="mb-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href} className="card card-interactive p-5">
            <span className="flex h-8 w-8 items-center justify-center rounded-lg" style={{ background: ACCENT_SOFT, color: ACCENT }}>
              <q.icon size={16} />
            </span>
            <p className="mt-3 font-medium">{q.label}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>{q.desc}</p>
          </Link>
        ))}
      </div>

      {/* Upgrade to Studio CTA */}
      <div className="mb-6 card p-5 flex flex-col sm:flex-row sm:items-center gap-4" style={{ borderColor: "rgba(214,164,74,.4)", background: "rgba(214,164,74,.06)" }}>
        <div className="flex-1 min-w-0">
          <p className="font-medium" style={{ color: "#d6a44a" }}>Nâng cấp lên Studio</p>
          <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>
            Mở khóa quản lý hợp đồng, tài chính, đội ngũ và toàn bộ tính năng studio chuyên nghiệp.
          </p>
        </div>
        <div className="flex items-center gap-3 shrink-0">
          <StudioTrialButton used={trialUsed} />
          <Link href="/dashboard/upgrade" className="btn-primary text-sm">Xem gói Studio</Link>
        </div>
      </div>

      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium">
          <CalendarDays size={18} style={{ color: ACCENT }} /> Lịch chụp sắp tới
        </h2>
        <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>
          {upcoming.length > 0 ? `${upcoming.length} buổi chụp đã có ngày` : "Chưa có lịch chụp nào sắp tới"}
        </p>
        {upcoming.length > 0 ? (
          <ul className="space-y-2">
            {upcoming.map((b) => (
              <li key={b.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-sm font-medium">{b.name}</p>
                  <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                    {[b.package_name || b.service, b.phone].filter(Boolean).join(" · ") || "—"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="text-sm" style={{ color: ACCENT }}>{b.preferred_date}</p>
                  {b.package_price ? <p className="text-[11px]" style={{ color: "var(--text3)" }}>{vnd(b.package_price)}</p> : null}
                </div>
              </li>
            ))}
          </ul>
        ) : (
          <Link href="/dashboard/studio/bookings" className="btn-ghost mt-1">Mở trang đặt lịch</Link>
        )}
      </div>
    </div>
  );
}

export default async function StudioOverview() {
  const profile = await requireStudio("booking");
  // Free/Basic accounts have no studio tier — send them to the album library
  // (not /dashboard, which redirects back here and would loop).
  if (!profile) redirect("/dashboard/albums");

  const supabase = createClient();

  // Photographer plan (booking tier): a focused overview around shoots &
  // bookings — no contracts/finance, which belong to the full Studio plan.
  if (profile.studioTier === "booking") return <BookingOverview ownerId={profile.id} />;

  const bank = {
    bin: (profile.pl_bank_bin as string | null) ?? null,
    account: (profile.pl_bank_account as string | null) ?? null,
    holder: (profile.pl_bank_holder as string | null) ?? null,
    name: (profile.pl_bank_name as string | null) ?? null,
  };

  // Pre-compute date constants so all query groups can run in parallel.
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  const dueLimit = horizon.toISOString().slice(0, 10);
  // Start of the 6-month window for the revenue chart (this month minus 5).
  const chartStart = new Date(now.getFullYear(), now.getMonth() - 5, 1).toISOString().slice(0, 10);

  // Explicit columns + drop cancelled at the DB (less payload than select *).
  let cq = supabase
    .from("studio_contracts")
    .select(
      "id, code, title, client_name, client_phone, client_messenger, location, event_date, event_time, delivery_due, status, shoot_type, client_signed_at, updated_at, contract_items(qty, unit_price), contract_edit_requests(status), contract_payments(amount), contract_crew(id, name, phone, role, status)"
    )
    .eq("owner_id", profile.id)
    .neq("status", "cancelled");
  if (profile.actingRole === "staff") cq = cq.eq("assigned_to", profile.actingUserId);

  const [
    { data: contracts },
    { data: planRows },
    { data: payMonth },
    { data: paySixMonths },
    { count: newBookings },
    { count: bookingsAll },
    { data: recentQuotes },
  ] = await Promise.all([
    cq.order("event_date", { ascending: true, nullsFirst: false }),
    supabase
      .from("contract_payment_plan")
      .select("id, label, amount, due_date, paid, contract:studio_contracts!inner(id, owner_id, title)")
      .eq("contract.owner_id", profile.id)
      .eq("paid", false)
      .not("due_date", "is", null)
      .lte("due_date", dueLimit)
      .order("due_date"),
    supabase
      .from("contract_payments")
      .select("amount, contract:studio_contracts!inner(owner_id)")
      .eq("contract.owner_id", profile.id)
      .gte("paid_at", monthStart),
    supabase
      .from("contract_payments")
      .select("amount, paid_at, contract:studio_contracts!inner(owner_id)")
      .eq("contract.owner_id", profile.id)
      .gte("paid_at", chartStart),
    supabase.from("studio_bookings").select("id", { count: "exact", head: true }).eq("owner_id", profile.id).eq("status", "new"),
    supabase.from("studio_bookings").select("id", { count: "exact", head: true }).eq("owner_id", profile.id),
    supabase
      .from("studio_quotes")
      .select("id, code, client_name, client_phone, status, created_at, quote_items(qty, unit_price, selected, is_optional, is_discount)")
      .eq("owner_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  type CrewLite = { id: string; name: string; phone: string | null; role: CrewRole; status: string };
  const list = (contracts ?? []) as Array<{
    id: string;
    code: string | null;
    title: string;
    client_name: string | null;
    client_phone: string | null;
    client_messenger: string | null;
    location: string | null;
    event_date: string | null;
    event_time: string | null;
    delivery_due: string | null;
    status: ContractStatus;
    shoot_type: keyof typeof SHOOT_TYPE_LABEL;
    client_signed_at: string | null;
    updated_at: string;
    contract_items: { qty: number; unit_price: number }[];
    contract_edit_requests: { status: string }[];
    contract_payments: { amount: number }[];
    contract_crew: CrewLite[];
  }>;

  const active = list.filter((c) => c.status !== "cancelled" && c.status !== "completed");
  const upcoming = list
    // Lịch chụp sắp tới chỉ tính hợp đồng đã xác nhận/ký (bỏ nháp & mới gửi).
    .filter((c) => c.event_date && c.event_date >= today && ["approved", "in_progress", "completed"].includes(c.status))
    .slice(0, 6);
  const totalValue = list
    .filter((c) => c.status !== "cancelled")
    .reduce((s, c) => s + contractTotal(c.contract_items || []), 0);
  const openRequests = list.reduce(
    (s, c) => s + (c.contract_edit_requests || []).filter((r) => r.status === "open").length,
    0
  );

  // Outstanding debts: active contracts where collected < total.
  const debts = list
    .filter((c) => c.status !== "cancelled")
    .map((c) => ({ c, due: contractTotal(c.contract_items || []) - sumAmounts(c.contract_payments || []) }))
    .filter((d) => d.due > 0)
    .sort((a, b) => (a.c.event_date || "9999").localeCompare(b.c.event_date || "9999"));
  const totalDue = debts.reduce((s, d) => s + d.due, 0);

  // Crew who haven't responded yet (pending) on non-cancelled contracts.
  const pendingCrew = list
    .filter((c) => c.status !== "cancelled")
    .flatMap((c) => (c.contract_crew || []).filter((cr) => cr.status === "pending").map((cr) => ({ c, cr })));

  // Contracts sent to the client but not signed yet (oldest waiting first).
  const unsigned = list
    .filter((c) => c.status === "sent" && !c.client_signed_at)
    .map((c) => ({ c, days: Math.max(0, Math.floor((Date.now() - new Date(c.updated_at).getTime()) / 86400000)) }))
    .sort((a, b) => b.days - a.days);

  // Photo deliveries past their due date and not yet completed.
  const lateDeliveries = list
    .filter((c) => c.delivery_due && c.delivery_due < today && c.status !== "completed" && c.status !== "cancelled")
    .sort((a, b) => (a.delivery_due || "").localeCompare(b.delivery_due || ""));

  // Scheduled payment installments due within 7 days (or overdue) & unpaid.
  const duePlan = ((planRows ?? []) as unknown as Array<{
    id: string; label: string; amount: number; due_date: string;
    contract: { id: string; title: string } | null;
  }>);

  // ── KPIs ──────────────────────────────────────────────────────
  const revenueMonth = sumAmounts((payMonth ?? []) as unknown as { amount: number }[]);
  const notCancelled = list.filter((c) => c.status !== "cancelled");
  const avgValue = notCancelled.length ? Math.round(totalValue / notCancelled.length) : 0;
  const uniqueClients = new Set(
    notCancelled.map((c) => (c.client_phone || "").replace(/\D/g, "") || (c.client_name || "").trim().toLowerCase()).filter(Boolean)
  ).size;
  // Rough close rate: contracts vs total booking requests received.
  const closeRate = bookingsAll ? Math.min(100, Math.round((notCancelled.length / bookingsAll) * 100)) : null;

  // ── 6-month revenue chart: bucket payments by YYYY-MM ─────────────
  const sixMonthPays = (paySixMonths ?? []) as unknown as { amount: number; paid_at: string }[];
  const revBars = Array.from({ length: 6 }, (_, i) => {
    const d = new Date(now.getFullYear(), now.getMonth() - 5 + i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    const value = sixMonthPays
      .filter((p) => (p.paid_at || "").slice(0, 7) === key)
      .reduce((s, p) => s + (p.amount || 0), 0);
    return { label: String(d.getMonth() + 1).padStart(2, "0"), value };
  });
  // Month-over-month revenue delta for the headline stat.
  const prevMonthRev = revBars.length >= 2 ? revBars[revBars.length - 2].value : 0;
  const revDeltaPct = prevMonthRev > 0 ? Math.round(((revenueMonth - prevMonthRev) / prevMonthRev) * 100) : null;

  const stats: { icon: typeof FileText; label: string; value: string; delta?: string; deltaTone?: ToneKey }[] = [
    {
      icon: Wallet,
      label: "Doanh thu tháng này",
      value: vnd(revenueMonth),
      delta: revDeltaPct != null ? `${revDeltaPct >= 0 ? "+" : ""}${revDeltaPct}% so với tháng trước` : undefined,
      deltaTone: (revDeltaPct ?? 0) >= 0 ? "green" : "red",
    },
    { icon: FileText, label: "Hợp đồng đang hoạt động", value: String(active.length), delta: `${notCancelled.length} tổng hợp đồng`, deltaTone: "gray" },
    { icon: CalendarDays, label: "Lịch sắp tới", value: String(upcoming.length), delta: `${uniqueClients} khách hàng`, deltaTone: "gray" },
    {
      icon: AlertCircle,
      label: "Yêu cầu sửa đang chờ",
      value: String(openRequests),
      delta: openRequests > 0 ? "cần xử lý" : "không có",
      deltaTone: openRequests > 0 ? "amber" : "gray",
    },
  ];

  const kpis = [
    { label: "Giá trị HĐ trung bình", value: vnd(avgValue) },
    { label: "Công nợ cần thu", value: vnd(totalDue) },
    closeRate != null
      ? { label: "Tỉ lệ chốt (HĐ/đặt lịch)", value: `${closeRate}%` }
      : { label: "Đặt lịch mới", value: String(newBookings ?? 0) },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-1 flex items-center gap-3">
        <h1 className="font-serif text-2xl font-medium">Tổng quan</h1>
        <Link href="/dashboard/site" className="btn-ghost ml-auto hidden sm:inline-flex">
          <Globe size={16} /> Website riêng
        </Link>
        <Link href="/dashboard/studio/contracts/new" className="btn-primary hidden sm:inline-flex">
          <Plus size={16} /> Hợp đồng mới
        </Link>
      </div>
      <p className="mb-4 text-[13px]" style={{ color: "var(--text3)" }}>Tổng quan hoạt động studio</p>

      {/* Mobile quick actions — prominent tappable shortcuts */}
      <div className="mb-5 grid grid-cols-3 gap-3 sm:hidden">
        <Link
          href="/dashboard/studio/contracts/new"
          className="flex flex-col items-center gap-2 rounded-2xl py-4 text-center text-xs font-bold"
          style={{ background: "var(--brand)", color: "var(--brandFg)" }}
        >
          <Plus size={22} />
          Tạo HĐ
        </Link>
        <Link
          href="/dashboard/studio/bookings"
          className="flex flex-col items-center gap-2 rounded-2xl py-4 text-center text-xs font-bold"
          style={{ background: "var(--surface2)", color: "var(--text)" }}
        >
          <Clock size={22} />
          Đặt lịch
        </Link>
        <Link
          href="/dashboard/studio/calendar"
          className="flex flex-col items-center gap-2 rounded-2xl py-4 text-center text-xs font-bold"
          style={{ background: "var(--surface2)", color: "var(--text)" }}
        >
          <CalendarDays size={22} />
          Lịch chụp
        </Link>
      </div>

      {/* Stat cards — 1 col on mobile, 2 on sm, 4 on lg */}
      <div className="mb-4 grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s) => (
          <StatCard key={s.label} {...s} />
        ))}
      </div>

      {/* Secondary KPIs — horizontal scroll on mobile */}
      <div className="mb-6 flex gap-3 overflow-x-auto pb-1 sm:grid sm:grid-cols-3 sm:overflow-visible sm:pb-0">
        {kpis.map((k) => (
          <div key={k.label} className="card shrink-0 basis-44 p-4 sm:basis-auto sm:p-5">
            <p className="font-serif text-xl font-medium">{k.value}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Revenue chart + upcoming shoots */}
      <div className="mb-6 grid gap-4 lg:grid-cols-[1.5fr_1fr]">
        <RevenueChart bars={revBars} />
        <div className="card p-6">
          <h2 className="mb-4 flex items-center gap-2 font-serif text-lg font-medium">
            <CalendarDays size={18} style={{ color: ACCENT }} /> Lịch chụp sắp tới
          </h2>
          {upcoming.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có lịch sắp tới.</p>
          ) : (
            <ul className="space-y-3">
              {upcoming.map((c) => {
                const d = c.event_date ? new Date(c.event_date) : null;
                return (
                  <li key={c.id}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="flex items-center gap-3">
                      <div
                        className="flex h-11 w-11 flex-none flex-col items-center justify-center rounded-xl"
                        style={{ background: "var(--surface2)" }}
                      >
                        <span className="text-[15px] font-bold leading-none">{d ? d.getDate() : "—"}</span>
                        <span className="text-[10px] font-semibold" style={{ color: "var(--text3)" }}>
                          {d ? `TH${d.getMonth() + 1}` : ""}
                        </span>
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-[13px] font-bold">{c.title}</p>
                        <p className="text-xs" style={{ color: "var(--text3)" }}>
                          {(c.event_time || "—")} · {c.client_name || SHOOT_TYPE_LABEL[c.shoot_type]}
                        </p>
                      </div>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
          <Link href="/dashboard/studio/calendar" className="mt-4 inline-block text-xs hover:underline" style={{ color: ACCENT }}>
            Xem lịch đầy đủ →
          </Link>
        </div>
      </div>

      {/* Recent contracts table */}
      <div className="card mb-6 p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium">Hợp đồng gần đây</h2>
          <Link href="/dashboard/studio/contracts" className="text-xs hover:underline" style={{ color: ACCENT }}>
            Tất cả →
          </Link>
        </div>
        {list.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text3)" }}>
            Chưa có hợp đồng nào.{" "}
            <Link href="/dashboard/studio/contracts/new" style={{ color: ACCENT }} className="hover:underline">Tạo ngay</Link>.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                  <th className="px-2 py-2.5 font-bold">Mã</th>
                  <th className="px-2 py-2.5 font-bold">Khách hàng</th>
                  <th className="px-2 py-2.5 font-bold">Loại</th>
                  <th className="px-2 py-2.5 font-bold">Giá trị</th>
                  <th className="px-2 py-2.5 font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {list.slice(0, 8).map((c) => (
                  <tr key={c.id} style={{ borderTop: "1px solid var(--border)" }}>
                    <td className="px-2 py-3 font-bold font-mono">
                      <Link href={`/dashboard/studio/contracts/${c.id}`} className="hover:underline">
                        {c.code || c.id.slice(0, 6)}
                      </Link>
                    </td>
                    <td className="px-2 py-3">{c.client_name || "—"}</td>
                    <td className="px-2 py-3" style={{ color: "var(--text2)" }}>{SHOOT_TYPE_LABEL[c.shoot_type]}</td>
                    <td className="px-2 py-3 font-bold">{vnd(contractTotal(c.contract_items || []))}</td>
                    <td className="px-2 py-3">
                      <span style={badgeStyle(STATUS_TONE[c.status])}>{CONTRACT_STATUS_LABEL[c.status]}</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Recent quotes */}
      {recentQuotes && recentQuotes.length > 0 && (
        <div className="card mb-6 p-6">
          <div className="mb-2 flex items-center justify-between">
            <h2 className="font-serif text-lg font-medium">Báo giá gần đây</h2>
            <Link href="/dashboard/studio/quotes" className="text-xs hover:underline" style={{ color: ACCENT }}>
              Tất cả →
            </Link>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-[13.5px]">
              <thead>
                <tr className="text-left text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>
                  <th className="px-2 py-2.5 font-bold">Mã</th>
                  <th className="px-2 py-2.5 font-bold">Khách hàng</th>
                  <th className="px-2 py-2.5 font-bold">Tổng</th>
                  <th className="px-2 py-2.5 font-bold">Trạng thái</th>
                </tr>
              </thead>
              <tbody>
                {(recentQuotes as Array<{ id: string; code: string | null; client_name: string | null; client_phone: string | null; status: QuoteStatus; created_at: string; quote_items: { qty: number; unit_price: number; selected: boolean; is_optional: boolean; is_discount?: boolean }[] }>).map((q) => {
                  const total = quoteSelectedTotal(q.quote_items || []);
                  const QUOTE_TONE: Record<string, ToneKey> = {
                    draft: "gray", sent: "blue", viewed: "blue",
                    adjust_requested: "amber", accepted: "green",
                    converted: "green", expired: "gray", cancelled: "red",
                  };
                  return (
                    <tr key={q.id} style={{ borderTop: "1px solid var(--border)" }}>
                      <td className="px-2 py-3 font-bold font-mono">
                        <Link href={`/dashboard/studio/quotes/${q.id}`} className="hover:underline">
                          {q.code || q.id.slice(0, 6)}
                        </Link>
                      </td>
                      <td className="px-2 py-3">{q.client_name || "—"}</td>
                      <td className="px-2 py-3 font-bold">{vnd(total)}</td>
                      <td className="px-2 py-3">
                        <span style={badgeStyle(QUOTE_TONE[q.status] ?? "gray")}>
                          {QUOTE_STATUS_LABEL[q.status] || q.status}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Reminders: unsigned + debts + crew awaiting response + late deliveries + due installments */}
      {(unsigned.length > 0 || debts.length > 0 || pendingCrew.length > 0 || lateDeliveries.length > 0 || duePlan.length > 0) && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {unsigned.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#6fa0ec55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: TONE.blue.fg }}>
                <FileText size={18} /> Hợp đồng chờ khách ký
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{unsigned.length} hợp đồng đã gửi nhưng chưa ký</p>
              <ul className="space-y-2">
                {unsigned.slice(0, 6).map(({ c, days }) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-[11px]" style={{ color: days >= 3 ? TONE.amber.fg : "var(--text3)" }}>
                        {c.client_name || "—"} · đã gửi {days > 0 ? `${days} ngày trước` : "hôm nay"}
                      </p>
                    </Link>
                    <ZaloButton
                      phone={c.client_phone}
                      label="Nhắc ký"
                      message={`Xin chào ${c.client_name || "anh/chị"}, studio gửi lại hợp đồng "${c.title}" để anh/chị xem & ký xác nhận giúp em nhé. Cảm ơn ạ!`}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
          {duePlan.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#d6a44a55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: TONE.amber.fg }}>
                <Wallet size={18} /> Sắp đến hạn thu
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{duePlan.length} đợt thu trong 7 ngày tới / quá hạn</p>
              <ul className="space-y-2">
                {duePlan.slice(0, 6).map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/studio/contracts/${d.contract?.id}`} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.contract?.title || "Hợp đồng"} · {d.label}</p>
                        <p className="text-[11px]" style={{ color: d.due_date < today ? TONE.red.fg : "var(--text3)" }}>
                          {vnd(d.amount)} · hạn {d.due_date}{d.due_date < today ? " · quá hạn" : ""}
                        </p>
                      </div>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {lateDeliveries.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#e0746f55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: TONE.red.fg }}>
                <Clock size={18} /> Trễ hạn giao ảnh
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{lateDeliveries.length} hợp đồng quá hạn giao</p>
              <ul className="space-y-2">
                {lateDeliveries.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <span className="shrink-0 text-[11px]" style={{ color: TONE.red.fg }}>hạn {c.delivery_due}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {debts.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#d6a44a55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: TONE.amber.fg }}>
                <Wallet size={18} /> Công nợ cần thu
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>Tổng còn phải thu: <b style={{ color: "var(--text)" }}>{vnd(totalDue)}</b></p>
              <ul className="space-y-2">
                {debts.slice(0, 6).map(({ c, due }) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>{c.client_name || "—"} · còn {vnd(due)}</p>
                    </Link>
                    <div className="flex shrink-0 items-center gap-2">
                      <VietQRButton bank={bank} amount={due} addInfo={(c.code || c.title || "").slice(0, 25)} label="QR" />
                      <ZaloButton
                        phone={c.client_phone}
                        label="Zalo"
                        message={`Xin chào ${c.client_name || "anh/chị"}, studio xin nhắc khoản còn lại của hợp đồng "${c.title}" là ${vnd(due)}. Anh/chị thanh toán giúp em nhé. Cảm ơn ạ!`}
                      />
                      <MessengerButton
                        link={c.client_messenger}
                        label="Messenger"
                        message={`Xin chào ${c.client_name || "anh/chị"}, studio xin nhắc khoản còn lại của hợp đồng "${c.title}" là ${vnd(due)}. Anh/chị thanh toán giúp em nhé. Cảm ơn ạ!`}
                      />
                    </div>
                  </li>
                ))}
              </ul>
            </div>
          )}

          {pendingCrew.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#6fa0ec55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: TONE.blue.fg }}>
                <UserCheck size={18} /> Thợ chưa phản hồi
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{pendingCrew.length} lời mời đang chờ nhận/từ chối</p>
              <ul className="space-y-2">
                {pendingCrew.slice(0, 6).map(({ c, cr }) => (
                  <li key={cr.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{cr.name || cr.phone || "—"}</p>
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>{CREW_ROLE_LABEL[cr.role]} · {c.title}</p>
                    </Link>
                    <ZaloButton
                      phone={cr.phone}
                      label="Nhắc"
                      message={shootReminderMessage({ name: cr.name, title: c.title, date: c.event_date, time: c.event_time, location: c.location, role: CREW_ROLE_LABEL[cr.role] })}
                    />
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {profile.actingRole !== "staff" && (
        <AutoEmailToggle ownerId={profile.id} initial={!!profile.auto_client_emails} />
      )}
    </div>
  );
}

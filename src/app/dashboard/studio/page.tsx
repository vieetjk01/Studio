import Link from "next/link";
import { Plus, FileText, CalendarDays, Users, AlertCircle, Wallet, UserCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import ZaloButton from "@/components/ZaloButton";
import MessengerButton from "@/components/MessengerButton";
import VietQRButton from "@/components/VietQR";
import AutoEmailToggle from "@/components/AutoEmailToggle";
import { shootReminderMessage } from "@/lib/zalo";
import {
  contractTotal,
  sumAmounts,
  vnd,
  CONTRACT_STATUS_LABEL,
  SHOOT_TYPE_LABEL,
  CREW_ROLE_LABEL,
  type ContractStatus,
  type CrewRole,
} from "@/lib/types";

export const dynamic = "force-dynamic";

const STATUS_TONE: Record<ContractStatus, string> = {
  draft: "var(--text3)",
  sent: "#c7a76b",
  approved: "#7bb38a",
  in_progress: "#6ba3c7",
  completed: "#7bb38a",
  cancelled: "#c77b7b",
};

function NotStudio() {
  return (
    <div className="mx-auto max-w-lg text-center">
      <div className="card p-8">
        <h1 className="font-serif text-2xl font-medium">Cần gói Photographer trở lên</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
          Trang quản lý dành cho tài khoản gói <b>Photographer</b> (đặt lịch, bảng giá,
          lịch chụp) trở lên. Gói <b>Studio</b> mở thêm hợp đồng, tài chính & quản lý đội ngũ.
        </p>
        <a href="/dashboard/upgrade" className="btn-primary mt-5">Nâng cấp gói</a>
      </div>
    </div>
  );
}

/** Photographer-plan overview: bookings + upcoming shoots, no contracts/finance. */
async function BookingOverview({ ownerId }: { ownerId: string }) {
  const supabase = createClient();
  const today = new Date().toISOString().slice(0, 10);

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

  const stats = [
    { icon: AlertCircle, label: "Đặt lịch mới", value: String(newCount) },
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
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Quản lý lịch chụp</p>
          <h1 className="font-serif text-3xl font-medium">Tổng quan</h1>
        </div>
        <Link href="/dashboard/studio/bookings" className="btn-primary">
          <CalendarDays size={16} /> Đặt lịch
        </Link>
      </div>

      <div className="mb-8 grid grid-cols-3 gap-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <s.icon size={18} style={{ color: "var(--text3)" }} />
            <p className="mt-3 font-serif text-2xl font-medium">{s.value}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {quickLinks.map((q) => (
          <Link key={q.href} href={q.href} className="card p-5 transition-colors hover:border-[var(--gold)]">
            <q.icon size={18} style={{ color: "var(--gold)" }} />
            <p className="mt-3 font-medium">{q.label}</p>
            <p className="mt-0.5 text-xs" style={{ color: "var(--text2)" }}>{q.desc}</p>
          </Link>
        ))}
      </div>

      <div className="card p-6">
        <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium">
          <CalendarDays size={18} style={{ color: "var(--gold)" }} /> Lịch chụp sắp tới
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
                  <p className="text-sm" style={{ color: "var(--gold)" }}>{b.preferred_date}</p>
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
  if (!profile) return <NotStudio />;

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

  // Pre-compute date constants so all three query groups can run in parallel.
  const today = new Date().toISOString().slice(0, 10);
  const monthStart = `${today.slice(0, 7)}-01`;
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  const dueLimit = horizon.toISOString().slice(0, 10);

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
    { count: newBookings },
    { count: bookingsAll },
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
    supabase.from("studio_bookings").select("id", { count: "exact", head: true }).eq("owner_id", profile.id).eq("status", "new"),
    supabase.from("studio_bookings").select("id", { count: "exact", head: true }).eq("owner_id", profile.id),
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
    .filter((c) => c.event_date && c.event_date >= today && c.status !== "cancelled")
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

  const kpis = [
    { label: "Doanh thu tháng này", value: vnd(revenueMonth) },
    { label: "Giá trị HĐ trung bình", value: vnd(avgValue) },
    { label: "Số khách hàng", value: String(uniqueClients) },
    closeRate != null
      ? { label: "Tỉ lệ chốt (HĐ/đặt lịch)", value: `${closeRate}%` }
      : { label: "Đặt lịch mới", value: String(newBookings ?? 0) },
  ];

  const stats = [
    { icon: FileText, label: "Hợp đồng đang hoạt động", value: String(active.length) },
    { icon: CalendarDays, label: "Lịch sắp tới", value: String(upcoming.length) },
    { icon: Users, label: "Tổng giá trị hợp đồng", value: vnd(totalValue) },
    { icon: AlertCircle, label: "Yêu cầu sửa đang chờ", value: String(openRequests) },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Quản lý studio</p>
          <h1 className="font-serif text-3xl font-medium">Tổng quan</h1>
        </div>
        <Link href="/dashboard/studio/contracts/new" className="btn-primary">
          <Plus size={16} /> Hợp đồng mới
        </Link>
      </div>

      <div className="mb-4 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <s.icon size={18} style={{ color: "var(--text3)" }} />
            <p className="mt-3 font-serif text-2xl font-medium">{s.value}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {kpis.map((k) => (
          <div key={k.label} className="card p-5">
            <p className="font-serif text-xl font-medium">{k.value}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{k.label}</p>
          </div>
        ))}
      </div>

      {/* Reminders: unsigned + debts + crew awaiting response + late deliveries + due installments */}
      {(unsigned.length > 0 || debts.length > 0 || pendingCrew.length > 0 || lateDeliveries.length > 0 || duePlan.length > 0) && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
          {unsigned.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#6ba3c755" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: "#6ba3c7" }}>
                <FileText size={18} /> Hợp đồng chờ khách ký
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{unsigned.length} hợp đồng đã gửi nhưng chưa ký</p>
              <ul className="space-y-2">
                {unsigned.slice(0, 6).map(({ c, days }) => (
                  <li key={c.id} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <p className="text-[11px]" style={{ color: days >= 3 ? "#c7a76b" : "var(--text3)" }}>
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
            <div className="card p-6" style={{ borderColor: "#c7a76b55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: "#c7a76b" }}>
                <Wallet size={18} /> Sắp đến hạn thu
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{duePlan.length} đợt thu trong 7 ngày tới / quá hạn</p>
              <ul className="space-y-2">
                {duePlan.slice(0, 6).map((d) => (
                  <li key={d.id}>
                    <Link href={`/dashboard/studio/contracts/${d.contract?.id}`} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <div className="min-w-0">
                        <p className="truncate text-sm font-medium">{d.contract?.title || "Hợp đồng"} · {d.label}</p>
                        <p className="text-[11px]" style={{ color: d.due_date < today ? "#c77b7b" : "var(--text3)" }}>
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
            <div className="card p-6" style={{ borderColor: "#c77b7b55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: "#c77b7b" }}>
                <Clock size={18} /> Trễ hạn giao ảnh
              </h2>
              <p className="mb-4 text-xs" style={{ color: "var(--text3)" }}>{lateDeliveries.length} hợp đồng quá hạn giao</p>
              <ul className="space-y-2">
                {lateDeliveries.slice(0, 6).map((c) => (
                  <li key={c.id}>
                    <Link href={`/dashboard/studio/contracts/${c.id}`} className="flex items-center justify-between gap-2 rounded-xl px-3 py-2.5" style={{ background: "var(--surface2)" }}>
                      <p className="truncate text-sm font-medium">{c.title}</p>
                      <span className="shrink-0 text-[11px]" style={{ color: "#c77b7b" }}>hạn {c.delivery_due}</span>
                    </Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {debts.length > 0 && (
            <div className="card p-6" style={{ borderColor: "#c7a76b55" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: "#c7a76b" }}>
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
            <div className="card p-6" style={{ borderColor: "#6ba3c755" }}>
              <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium" style={{ color: "#6ba3c7" }}>
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

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Upcoming */}
        <div className="card p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Lịch chụp sắp tới</h2>
          {upcoming.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có lịch sắp tới.</p>
          ) : (
            <ul className="space-y-2">
              {upcoming.map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/studio/contracts/${c.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface2)]"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs" style={{ color: "var(--text3)" }}>
                        {c.client_name || "—"} · {SHOOT_TYPE_LABEL[c.shoot_type]}
                      </p>
                    </div>
                    <span className="text-xs" style={{ color: "var(--text2)" }}>{c.event_date}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/studio/calendar" className="mt-4 inline-block text-xs text-accent hover:underline">
            Xem lịch đầy đủ →
          </Link>
        </div>

        {/* Recent contracts */}
        <div className="card p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Hợp đồng gần đây</h2>
          {list.length === 0 ? (
            <p className="text-sm" style={{ color: "var(--text3)" }}>
              Chưa có hợp đồng nào.{" "}
              <Link href="/dashboard/studio/contracts/new" className="text-accent hover:underline">Tạo ngay</Link>.
            </p>
          ) : (
            <ul className="space-y-2">
              {list.slice(0, 6).map((c) => (
                <li key={c.id}>
                  <Link
                    href={`/dashboard/studio/contracts/${c.id}`}
                    className="flex items-center justify-between rounded-xl px-3 py-2.5 transition-colors hover:bg-[var(--surface2)]"
                  >
                    <div>
                      <p className="text-sm font-medium">{c.title}</p>
                      <p className="text-xs" style={{ color: "var(--text3)" }}>
                        {vnd(contractTotal(c.contract_items || []))}
                      </p>
                    </div>
                    <span className="text-[11px]" style={{ color: STATUS_TONE[c.status] }}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
          <Link href="/dashboard/studio/contracts" className="mt-4 inline-block text-xs text-accent hover:underline">
            Tất cả hợp đồng →
          </Link>
        </div>
      </div>

      {profile.actingRole !== "staff" && (
        <AutoEmailToggle ownerId={profile.id} initial={!!profile.auto_client_emails} />
      )}
    </div>
  );
}

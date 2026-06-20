import Link from "next/link";
import { Plus, FileText, CalendarDays, Users, AlertCircle, Wallet, UserCheck, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import ZaloButton from "@/components/ZaloButton";
import MessengerButton from "@/components/MessengerButton";
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
        <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
        <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
          Trang quản lý studio (hợp đồng, lịch chụp, quản lý photographer) chỉ dành cho
          tài khoản gói <b>Studio</b>. Vui lòng nâng cấp để sử dụng.
        </p>
        <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
      </div>
    </div>
  );
}

export default async function StudioOverview() {
  const profile = await requireStudio();
  if (!profile) return <NotStudio />;

  const supabase = createClient();
  const { data: contracts } = await supabase
    .from("studio_contracts")
    .select("*, contract_items(qty, unit_price), contract_edit_requests(status), contract_payments(amount), contract_crew(id, name, phone, role, status)")
    .eq("owner_id", profile.id)
    .order("event_date", { ascending: true, nullsFirst: false });

  type CrewLite = { id: string; name: string; phone: string | null; role: CrewRole; status: string };
  const list = (contracts ?? []) as Array<{
    id: string;
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
    contract_items: { qty: number; unit_price: number }[];
    contract_edit_requests: { status: string }[];
    contract_payments: { amount: number }[];
    contract_crew: CrewLite[];
  }>;

  const today = new Date().toISOString().slice(0, 10);
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

  // Photo deliveries past their due date and not yet completed.
  const lateDeliveries = list
    .filter((c) => c.delivery_due && c.delivery_due < today && c.status !== "completed" && c.status !== "cancelled")
    .sort((a, b) => (a.delivery_due || "").localeCompare(b.delivery_due || ""));

  // Scheduled payment installments due within 7 days (or overdue) & unpaid.
  const horizon = new Date();
  horizon.setDate(horizon.getDate() + 7);
  const dueLimit = horizon.toISOString().slice(0, 10);
  const { data: planRows } = await supabase
    .from("contract_payment_plan")
    .select("id, label, amount, due_date, paid, contract:studio_contracts!inner(id, owner_id, title)")
    .eq("contract.owner_id", profile.id)
    .eq("paid", false)
    .not("due_date", "is", null)
    .lte("due_date", dueLimit)
    .order("due_date");
  const duePlan = ((planRows ?? []) as unknown as Array<{
    id: string; label: string; amount: number; due_date: string;
    contract: { id: string; title: string } | null;
  }>);

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

      <div className="mb-8 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <div key={s.label} className="card p-5">
            <s.icon size={18} style={{ color: "var(--text3)" }} />
            <p className="mt-3 font-serif text-2xl font-medium">{s.value}</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>{s.label}</p>
          </div>
        ))}
      </div>

      {/* Reminders: debts + crew awaiting response + late deliveries + due installments */}
      {(debts.length > 0 || pendingCrew.length > 0 || lateDeliveries.length > 0 || duePlan.length > 0) && (
        <div className="mb-8 grid gap-6 lg:grid-cols-2">
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
    </div>
  );
}

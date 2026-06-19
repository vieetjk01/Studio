import Link from "next/link";
import { Plus, FileText, CalendarDays, Users, AlertCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import {
  contractTotal,
  vnd,
  CONTRACT_STATUS_LABEL,
  SHOOT_TYPE_LABEL,
  type ContractStatus,
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
    .select("*, contract_items(qty, unit_price), contract_edit_requests(status)")
    .eq("owner_id", profile.id)
    .order("event_date", { ascending: true, nullsFirst: false });

  const list = (contracts ?? []) as Array<{
    id: string;
    title: string;
    client_name: string | null;
    event_date: string | null;
    status: ContractStatus;
    shoot_type: keyof typeof SHOOT_TYPE_LABEL;
    contract_items: { qty: number; unit_price: number }[];
    contract_edit_requests: { status: string }[];
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

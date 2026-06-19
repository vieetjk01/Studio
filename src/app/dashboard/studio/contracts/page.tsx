import Link from "next/link";
import { Plus } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { requireStudio } from "@/lib/auth-guards";
import {
  contractTotal,
  vnd,
  CONTRACT_STATUS_LABEL,
  SHOOT_TYPE_LABEL,
  type ContractStatus,
  type ShootType,
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

export default async function ContractsList() {
  const profile = await requireStudio();
  if (!profile) {
    return (
      <div className="mx-auto max-w-lg text-center">
        <div className="card p-8">
          <h1 className="font-serif text-2xl font-medium">Cần gói Studio</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Tính năng này chỉ dành cho tài khoản gói Studio.
          </p>
          <a href="/dashboard/upgrade" className="btn-primary mt-5">Xem gói Studio</a>
        </div>
      </div>
    );
  }

  const supabase = createClient();
  const { data } = await supabase
    .from("studio_contracts")
    .select("*, contract_items(qty, unit_price)")
    .eq("owner_id", profile.id)
    .order("created_at", { ascending: false });

  const list = (data ?? []) as Array<{
    id: string;
    code: string | null;
    title: string;
    client_name: string | null;
    client_phone: string | null;
    event_date: string | null;
    status: ContractStatus;
    shoot_type: ShootType;
    deposit: number;
    contract_items: { qty: number; unit_price: number }[];
  }>;

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Quản lý studio</p>
          <h1 className="font-serif text-3xl font-medium">Hợp đồng</h1>
        </div>
        <Link href="/dashboard/studio/contracts/new" className="btn-primary">
          <Plus size={16} /> Hợp đồng mới
        </Link>
      </div>

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p style={{ color: "var(--text2)" }}>Chưa có hợp đồng nào.</p>
          <Link href="/dashboard/studio/contracts/new" className="btn-ghost mt-4">
            <Plus size={16} /> Tạo hợp đồng
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {list.map((c) => {
            const total = contractTotal(c.contract_items || []);
            return (
              <Link
                key={c.id}
                href={`/dashboard/studio/contracts/${c.id}`}
                className="card flex flex-col gap-3 p-5 transition-colors hover:bg-[var(--surface2)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span
                      className="rounded-full px-2 py-0.5 text-[11px]"
                      style={{ color: STATUS_TONE[c.status], border: `1px solid ${STATUS_TONE[c.status]}33` }}
                    >
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </span>
                    {c.code && (
                      <span className="text-[11px]" style={{ color: "var(--text3)" }}>{c.code}</span>
                    )}
                  </div>
                  <p className="mt-1.5 truncate font-serif text-lg font-medium">{c.title}</p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>
                    {c.client_name || "Chưa có khách"} · {SHOOT_TYPE_LABEL[c.shoot_type]}
                    {c.event_date ? ` · ${c.event_date}` : ""}
                  </p>
                </div>
                <div className="text-left sm:text-right">
                  <p className="font-serif text-lg font-medium">{vnd(total)}</p>
                  <p className="text-xs" style={{ color: "var(--text3)" }}>
                    Cọc {vnd(c.deposit)} · Còn {vnd(total - c.deposit)}
                  </p>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}

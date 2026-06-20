"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search } from "lucide-react";
import {
  contractTotal,
  sumAmounts,
  vnd,
  CONTRACT_STATUS_LABEL,
  SHOOT_TYPE_LABEL,
  type ContractStatus,
  type ShootType,
} from "@/lib/types";

export type ContractRow = {
  id: string;
  code: string | null;
  title: string;
  client_name: string | null;
  client_phone: string | null;
  event_date: string | null;
  status: ContractStatus;
  shoot_type: ShootType;
  contract_items: { qty: number; unit_price: number }[];
  contract_payments: { amount: number }[];
};

const STATUS_TONE: Record<ContractStatus, string> = {
  draft: "var(--text3)",
  sent: "#c7a76b",
  approved: "#7bb38a",
  in_progress: "#6ba3c7",
  completed: "#7bb38a",
  cancelled: "#c77b7b",
};

export default function ContractsListView({ list }: { list: ContractRow[] }) {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ContractStatus>("all");

  const filtered = useMemo(() => {
    const needle = q.trim().toLowerCase();
    return list.filter((c) => {
      if (status !== "all" && c.status !== status) return false;
      if (!needle) return true;
      return [c.title, c.client_name, c.code, c.client_phone]
        .filter(Boolean)
        .some((v) => (v as string).toLowerCase().includes(needle));
    });
  }, [list, q, status]);

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6 flex items-center justify-between">
        <div>
          <p className="eyebrow mb-1.5">Quản lý studio</p>
          <h1 className="font-serif text-3xl font-medium">Hợp đồng</h1>
        </div>
        <Link href="/dashboard/studio/contracts/new" className="btn-primary">
          <Plus size={16} /> Hợp đồng mới
        </Link>
      </div>

      {list.length > 0 && (
        <div className="mb-5 flex flex-wrap items-center gap-3">
          <div className="relative flex-1 min-w-[200px]">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
            <input
              className="input pl-9"
              placeholder="Tìm theo tên HĐ, khách, mã, SĐT…"
              value={q}
              onChange={(e) => setQ(e.target.value)}
            />
          </div>
          <select className="input w-auto" value={status} onChange={(e) => setStatus(e.target.value as "all" | ContractStatus)}>
            <option value="all">Tất cả trạng thái</option>
            {(Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).map((k) => (
              <option key={k} value={k}>{CONTRACT_STATUS_LABEL[k]}</option>
            ))}
          </select>
        </div>
      )}

      {list.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p style={{ color: "var(--text2)" }}>Chưa có hợp đồng nào.</p>
          <Link href="/dashboard/studio/contracts/new" className="btn-ghost mt-4">
            <Plus size={16} /> Tạo hợp đồng
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Không tìm thấy hợp đồng phù hợp.</div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const total = contractTotal(c.contract_items || []);
            const collected = sumAmounts(c.contract_payments || []);
            return (
              <Link
                key={c.id}
                href={`/dashboard/studio/contracts/${c.id}`}
                className="card flex flex-col gap-3 p-5 transition-colors hover:bg-[var(--surface2)] sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full px-2 py-0.5 text-[11px]" style={{ color: STATUS_TONE[c.status], border: `1px solid ${STATUS_TONE[c.status]}33` }}>
                      {CONTRACT_STATUS_LABEL[c.status]}
                    </span>
                    {c.code && <span className="text-[11px]" style={{ color: "var(--text3)" }}>{c.code}</span>}
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
                    Đã thu {vnd(collected)} · Còn {vnd(total - collected)}
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

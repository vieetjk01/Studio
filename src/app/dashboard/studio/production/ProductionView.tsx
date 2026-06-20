"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Package, Clock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { PRODUCT_STATUS_LABEL, type ProductStatus } from "@/lib/types";

export type ProductRow = {
  id: string;
  name: string;
  qty: number;
  cost: number;
  status: ProductStatus;
  note: string | null;
  assigned_to: string | null;
  contract: { id: string; title: string; client_name: string | null; delivery_due: string | null } | null;
};

type Staff = { id: string; full_name: string | null; email: string };

const ORDER: ProductStatus[] = ["ordered", "in_progress", "done"];
const TONE: Record<ProductStatus, string> = { ordered: "#c7a76b", in_progress: "#6ba3c7", done: "#7bb38a" };

export default function ProductionView({ initial, staff }: { initial: ProductRow[]; staff: Staff[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<ProductRow[]>(initial);
  const [filter, setFilter] = useState<ProductStatus | "all">("all");
  const today = new Date().toISOString().slice(0, 10);
  const staffName = (id: string | null) => {
    if (!id) return "";
    const s = staff.find((x) => x.id === id);
    return s ? s.full_name || s.email : "";
  };

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, ordered: 0, in_progress: 0, done: 0 };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);
  const doneCount = counts.done || 0;
  const pct = rows.length ? Math.round((doneCount / rows.length) * 100) : 0;

  const visible = useMemo(() => {
    const list = filter === "all" ? rows.filter((r) => r.status !== "done") : rows.filter((r) => r.status === filter);
    return [...list].sort((a, b) => (a.contract?.delivery_due || "9999").localeCompare(b.contract?.delivery_due || "9999"));
  }, [rows, filter]);

  async function setStatus(id: string, status: ProductStatus) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("contract_products").update({ status }).eq("id", id);
  }
  async function setAssignee(id: string, assigned_to: string | null) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, assigned_to } : r)));
    await supabase.from("contract_products").update({ assigned_to }).eq("id", id);
  }

  const tabs: { key: ProductStatus | "all"; label: string }[] = [
    { key: "all", label: "Đang xử lý" },
    { key: "ordered", label: PRODUCT_STATUS_LABEL.ordered },
    { key: "in_progress", label: PRODUCT_STATUS_LABEL.in_progress },
    { key: "done", label: PRODUCT_STATUS_LABEL.done },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Xử lý hình ảnh</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Xử lý ảnh, video, in ấn… của mọi hợp đồng — giao việc cho nhân viên &amp; theo dõi tiến độ.</p>
      </div>

      {/* Overall progress */}
      {rows.length > 0 && (
        <div className="card mb-5 p-5">
          <div className="mb-2 flex items-center justify-between text-sm">
            <span style={{ color: "var(--text2)" }}>Tiến độ chung</span>
            <span className="font-medium">{doneCount}/{rows.length} xong · {pct}%</span>
          </div>
          <div className="h-2 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
            <div className="h-full rounded-full" style={{ width: `${pct}%`, background: "#7bb38a" }} />
          </div>
        </div>
      )}

      <div className="mb-5 flex flex-wrap gap-2">
        {tabs.map((t) => (
          <button
            key={t.key}
            onClick={() => setFilter(t.key)}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: filter === t.key ? "var(--surface2)" : "transparent", border: "1px solid var(--border2)", color: filter === t.key ? "var(--accent)" : "var(--text2)" }}
          >
            {t.label} ({t.key === "all" ? (counts.ordered || 0) + (counts.in_progress || 0) : counts[t.key] || 0})
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Không có nội dung xử lý nào.</div>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => {
            const overdue = r.status !== "done" && r.contract?.delivery_due && r.contract.delivery_due < today;
            return (
              <div key={r.id} className="card flex flex-col gap-3 p-4 lg:flex-row lg:items-center lg:justify-between">
                <div className="min-w-0 flex-1">
                  <p className="flex items-center gap-2 font-medium">
                    <Package size={15} style={{ color: "var(--text3)" }} />
                    {r.name}{r.qty > 1 ? ` ×${r.qty}` : ""}
                    <span className="rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface2)", color: TONE[r.status] }}>{PRODUCT_STATUS_LABEL[r.status]}</span>
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>
                    {r.contract ? (
                      <Link href={`/dashboard/studio/contracts/${r.contract.id}`} className="hover:underline">{r.contract.title}</Link>
                    ) : "—"}
                    {r.contract?.client_name ? ` · ${r.contract.client_name}` : ""}
                    {r.contract?.delivery_due ? (
                      <span style={{ color: overdue ? "#c77b7b" : "var(--text3)" }}> · <Clock size={11} className="inline" /> giao {r.contract.delivery_due}{overdue ? " · trễ" : ""}</span>
                    ) : ""}
                    {r.assigned_to ? ` · 👤 ${staffName(r.assigned_to)}` : ""}
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <div className="flex shrink-0 gap-2">
                  <select
                    className="input w-auto py-1.5 text-xs"
                    value={r.assigned_to ?? ""}
                    onChange={(e) => setAssignee(r.id, e.target.value || null)}
                    title="Giao cho nhân viên"
                  >
                    <option value="">— Chưa giao —</option>
                    {staff.map((s) => (
                      <option key={s.id} value={s.id}>{s.full_name || s.email}</option>
                    ))}
                  </select>
                  <select
                    className="input w-auto py-1.5 text-xs"
                    value={r.status}
                    onChange={(e) => setStatus(r.id, e.target.value as ProductStatus)}
                  >
                    {ORDER.map((s) => (
                      <option key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</option>
                    ))}
                  </select>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

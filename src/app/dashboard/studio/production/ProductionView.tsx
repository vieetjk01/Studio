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
  contract: { id: string; title: string; client_name: string | null; delivery_due: string | null } | null;
};

const ORDER: ProductStatus[] = ["ordered", "in_progress", "done"];
const TONE: Record<ProductStatus, string> = { ordered: "#c7a76b", in_progress: "#6ba3c7", done: "#7bb38a" };

export default function ProductionView({ initial }: { initial: ProductRow[] }) {
  const supabase = createClient();
  const [rows, setRows] = useState<ProductRow[]>(initial);
  const [filter, setFilter] = useState<ProductStatus | "all">("all");
  const today = new Date().toISOString().slice(0, 10);

  const counts = useMemo(() => {
    const c: Record<string, number> = { all: rows.length, ordered: 0, in_progress: 0, done: 0 };
    for (const r of rows) c[r.status] = (c[r.status] || 0) + 1;
    return c;
  }, [rows]);

  const visible = useMemo(() => {
    const list = filter === "all" ? rows.filter((r) => r.status !== "done") : rows.filter((r) => r.status === filter);
    // Sort by delivery due (soonest first; nulls last).
    return [...list].sort((a, b) => (a.contract?.delivery_due || "9999").localeCompare(b.contract?.delivery_due || "9999"));
  }, [rows, filter]);

  async function setStatus(id: string, status: ProductStatus) {
    setRows((p) => p.map((r) => (r.id === id ? { ...r, status } : r)));
    await supabase.from("contract_products").update({ status }).eq("id", id);
  }

  const tabs: { key: ProductStatus | "all"; label: string }[] = [
    { key: "all", label: "Đang sản xuất" },
    { key: "ordered", label: PRODUCT_STATUS_LABEL.ordered },
    { key: "in_progress", label: PRODUCT_STATUS_LABEL.in_progress },
    { key: "done", label: PRODUCT_STATUS_LABEL.done },
  ];

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Hàng đợi sản xuất</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Album, ảnh in &amp; sản phẩm của mọi hợp đồng — theo dõi để không sót đơn giao.</p>
      </div>

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
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Không có sản phẩm nào.</div>
      ) : (
        <div className="space-y-2">
          {visible.map((r) => {
            const overdue = r.status !== "done" && r.contract?.delivery_due && r.contract.delivery_due < today;
            return (
              <div key={r.id} className="card flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between">
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
                    {r.note ? ` · ${r.note}` : ""}
                  </p>
                </div>
                <select
                  className="input w-auto shrink-0 py-1.5 text-xs"
                  value={r.status}
                  onChange={(e) => setStatus(r.id, e.target.value as ProductStatus)}
                >
                  {ORDER.map((s) => (
                    <option key={s} value={s}>{PRODUCT_STATUS_LABEL[s]}</option>
                  ))}
                </select>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

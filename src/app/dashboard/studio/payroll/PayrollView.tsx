"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { ChevronDown, ChevronRight } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { vnd, CREW_ROLE_LABEL, CREW_STATUS_LABEL, type CrewRole, type CrewStatus } from "@/lib/types";

export type PayrollRow = {
  id: string;
  name: string;
  phone: string | null;
  role: CrewRole;
  salary: number;
  status: CrewStatus;
  paid: boolean;
  contract: { id: string; title: string; event_date: string | null } | null;
};

function monthOptions(): { value: string; label: string }[] {
  const now = new Date();
  const out: { value: string; label: string }[] = [{ value: "all", label: "Tất cả thời gian" }];
  for (let i = 0; i < 12; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const v = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
    out.push({ value: v, label: `Tháng ${d.getMonth() + 1}/${d.getFullYear()}` });
  }
  return out;
}

export default function PayrollView({ rows }: { rows: PayrollRow[] }) {
  const supabase = createClient();
  const [month, setMonth] = useState("all");
  const [data, setData] = useState(rows);
  const [open, setOpen] = useState<Record<string, boolean>>({});

  const filtered = useMemo(
    () => (month === "all" ? data : data.filter((r) => (r.contract?.event_date || "").startsWith(month))),
    [data, month]
  );

  // Group by person (phone if present, else name).
  const groups = useMemo(() => {
    const map = new Map<string, { key: string; name: string; phone: string | null; rows: PayrollRow[] }>();
    for (const r of filtered) {
      const key = (r.phone && r.phone.replace(/\D/g, "")) || r.name || r.id;
      if (!map.has(key)) map.set(key, { key, name: r.name || r.phone || "—", phone: r.phone, rows: [] });
      map.get(key)!.rows.push(r);
    }
    return Array.from(map.values()).sort((a, b) => a.name.localeCompare(b.name));
  }, [filtered]);

  const grandTotal = filtered.reduce((s, r) => s + (r.salary || 0), 0);
  const grandPaid = filtered.filter((r) => r.paid).reduce((s, r) => s + (r.salary || 0), 0);

  async function togglePaid(r: PayrollRow) {
    const next = !r.paid;
    await supabase
      .from("contract_crew")
      .update({ paid: next, paid_at: next ? new Date().toISOString() : null })
      .eq("id", r.id);
    setData((p) => p.map((x) => (x.id === r.id ? { ...x, paid: next } : x)));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-medium mr-auto">Bảng lương</h1>
        <select className="input w-auto" value={month} onChange={(e) => setMonth(e.target.value)}>
          {monthOptions().map((o) => (
            <option key={o.value} value={o.value}>{o.label}</option>
          ))}
        </select>
      </div>

      <div className="mb-6 grid grid-cols-3 gap-4">
        <div className="card p-5"><p className="text-xs" style={{ color: "var(--text3)" }}>Tổng lương</p><p className="mt-1 font-serif text-xl font-medium">{vnd(grandTotal)}</p></div>
        <div className="card p-5"><p className="text-xs" style={{ color: "var(--text3)" }}>Đã trả</p><p className="mt-1 font-serif text-xl font-medium" style={{ color: "#7bb38a" }}>{vnd(grandPaid)}</p></div>
        <div className="card p-5"><p className="text-xs" style={{ color: "var(--text3)" }}>Còn nợ</p><p className="mt-1 font-serif text-xl font-medium" style={{ color: "#c7a76b" }}>{vnd(grandTotal - grandPaid)}</p></div>
      </div>

      {groups.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có dữ liệu lương cho kỳ này.</div>
      ) : (
        <div className="space-y-2">
          {groups.map((g) => {
            const tot = g.rows.reduce((s, r) => s + (r.salary || 0), 0);
            const paid = g.rows.filter((r) => r.paid).reduce((s, r) => s + (r.salary || 0), 0);
            const isOpen = open[g.key];
            return (
              <div key={g.key} className="card overflow-hidden">
                <button onClick={() => setOpen((p) => ({ ...p, [g.key]: !p[g.key] }))} className="flex w-full items-center justify-between p-4 text-left">
                  <div className="flex items-center gap-2">
                    {isOpen ? <ChevronDown size={16} /> : <ChevronRight size={16} />}
                    <div>
                      <p className="font-medium">{g.name}</p>
                      <p className="text-xs" style={{ color: "var(--text3)" }}>{g.phone || "—"} · {g.rows.length} buổi</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className="font-serif font-medium">{vnd(tot)}</p>
                    <p className="text-[11px]" style={{ color: paid >= tot ? "#7bb38a" : "#c7a76b" }}>
                      Đã trả {vnd(paid)}
                    </p>
                  </div>
                </button>
                {isOpen && (
                  <div className="border-t px-4 pb-3" style={{ borderColor: "var(--border)" }}>
                    {g.rows.map((r) => (
                      <div key={r.id} className="flex items-center justify-between py-2.5 text-sm">
                        <div>
                          <Link href={`/dashboard/studio/contracts/${r.contract?.id}`} className="hover:underline">
                            {r.contract?.title || "Hợp đồng"}
                          </Link>
                          <p className="text-[11px]" style={{ color: "var(--text3)" }}>
                            {CREW_ROLE_LABEL[r.role]} · {r.contract?.event_date || "—"} · {CREW_STATUS_LABEL[r.status]}
                          </p>
                        </div>
                        <div className="flex items-center gap-3">
                          <span className="font-medium">{vnd(r.salary)}</span>
                          <button onClick={() => togglePaid(r)} className="text-[11px]" style={{ color: r.paid ? "#7bb38a" : "var(--text3)" }}>
                            {r.paid ? "✓ Đã trả" : "Đánh dấu trả"}
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Phone, Repeat, Search, Download } from "lucide-react";
import { vnd, LEAD_SOURCE_LABEL } from "@/lib/types";

export type ClientAgg = {
  key: string;
  name: string;
  phone: string;
  count: number;
  value: number;
  collected: number;
  last: string | null;
  source: string | null;
};

const digits = (s: string) => (s || "").replace(/\D/g, "");

export default function ClientsView({ clients }: { clients: ClientAgg[] }) {
  const [q, setQ] = useState("");
  const returning = clients.filter((c) => c.count > 1).length;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    if (!n) return clients;
    return clients.filter((c) => c.name.toLowerCase().includes(n) || c.phone.toLowerCase().includes(n));
  }, [clients, q]);

  function exportCsv() {
    const rows: string[][] = [["Tên", "SĐT", "Số HĐ", "Tổng giá trị", "Đã thu", "Lần gần nhất", "Nguồn"]];
    for (const c of filtered) {
      rows.push([c.name, c.phone, String(c.count), String(c.value), String(c.collected), c.last || "", c.source ? LEAD_SOURCE_LABEL[c.source] || c.source : ""]);
    }
    const csv = "﻿" + rows.map((r) => r.map((x) => `"${(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    a.download = "khach-hang.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6 flex items-start justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Quản lý studio</p>
          <h1 className="font-serif text-3xl font-medium">Khách hàng</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
            {clients.length} khách · {returning} khách quay lại (chụp ≥ 2 lần)
          </p>
        </div>
        {clients.length > 0 && (
          <button onClick={exportCsv} className="btn-ghost px-3 py-2 text-xs"><Download size={14} /> CSV</button>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có khách hàng nào.</div>
      ) : (
        <>
          <div className="relative mb-5">
            <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
            <input className="input pl-9" placeholder="Tìm theo tên hoặc SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
          </div>
          {filtered.length === 0 ? (
            <div className="card py-12 text-center text-sm" style={{ color: "var(--text3)" }}>Không tìm thấy khách phù hợp.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <Link
                  key={c.key}
                  href={`/dashboard/studio/clients/${encodeURIComponent(digits(c.phone) || c.key)}`}
                  className="card flex flex-col gap-2 p-4 transition-colors hover:bg-[var(--surface2)] sm:flex-row sm:items-center sm:justify-between"
                >
                  <div>
                    <p className="flex items-center gap-2 font-medium">
                      {c.name}
                      {c.count > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface2)", color: "#7bb38a" }}>
                          <Repeat size={10} /> khách cũ
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                      <Phone size={12} /> {c.phone || "—"} · {c.count} hợp đồng
                      {c.source ? ` · ${LEAD_SOURCE_LABEL[c.source] || c.source}` : ""}
                      {c.last ? ` · gần nhất ${c.last}` : ""}
                    </p>
                  </div>
                  <div className="text-left sm:text-right">
                    <p className="font-serif text-lg font-medium">{vnd(c.value)}</p>
                    <p className="text-xs" style={{ color: "var(--text3)" }}>đã thu {vnd(c.collected)}</p>
                  </div>
                </Link>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

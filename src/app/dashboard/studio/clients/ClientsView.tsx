"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Phone, Repeat, Search, Download, HeartHandshake } from "lucide-react";
import ZaloButton from "@/components/ZaloButton";
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
  const [onlyOld, setOnlyOld] = useState(false);
  const [sort, setSort] = useState<"recent" | "value" | "count">("recent");
  const returning = clients.filter((c) => c.count > 1).length;

  // "Lâu chưa quay lại": last shoot > 6 months ago.
  const cutoff = useMemo(() => {
    const d = new Date();
    d.setMonth(d.getMonth() - 6);
    return d.toISOString().slice(0, 10);
  }, []);
  const isOld = (c: ClientAgg) => !!c.last && c.last < cutoff;
  const oldCount = clients.filter(isOld).length;

  const filtered = useMemo(() => {
    const n = q.trim().toLowerCase();
    const list = clients.filter((c) => {
      if (onlyOld && !isOld(c)) return false;
      if (!n) return true;
      return c.name.toLowerCase().includes(n) || c.phone.toLowerCase().includes(n);
    });
    const sorted = [...list];
    if (sort === "value") sorted.sort((a, b) => b.value - a.value);
    else if (sort === "count") sorted.sort((a, b) => b.count - a.count || b.value - a.value);
    else sorted.sort((a, b) => (b.last || "").localeCompare(a.last || ""));
    return sorted;
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [clients, q, onlyOld, cutoff, sort]);

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
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-medium">Khách hàng</h1>
        {clients.length > 0 && (
          <>
            <div className="relative min-w-[160px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input className="input pl-9" placeholder="Tên hoặc SĐT…" value={q} onChange={(e) => setQ(e.target.value)} />
            </div>
            <select
              className="input shrink-0 w-auto"
              value={sort}
              onChange={(e) => setSort(e.target.value as "recent" | "value" | "count")}
            >
              <option value="recent">Gần đây nhất</option>
              <option value="value">Chi nhiều nhất</option>
              <option value="count">Nhiều hợp đồng nhất</option>
            </select>
            <button
              onClick={() => setOnlyOld((v) => !v)}
              className="shrink-0 rounded-full px-3 py-2 text-xs"
              style={{ background: onlyOld ? "var(--surface2)" : "transparent", border: "1px solid var(--border2)", color: onlyOld ? "var(--accent)" : "var(--text2)" }}
            >
              <HeartHandshake size={13} className="mr-1 inline" /> Lâu chưa quay lại ({oldCount})
            </button>
            <button onClick={exportCsv} className="btn-ghost shrink-0 px-3 py-2 text-xs"><Download size={14} /> CSV</button>
          </>
        )}
      </div>

      {clients.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Chưa có khách hàng nào.</div>
      ) : (
        <>
          {filtered.length === 0 ? (
            <div className="card py-12 text-center text-sm" style={{ color: "var(--text3)" }}>Không tìm thấy khách phù hợp.</div>
          ) : (
            <div className="space-y-2">
              {filtered.map((c) => (
                <div key={c.key} className="card flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:justify-between">
                  <Link href={`/dashboard/studio/clients/${encodeURIComponent(digits(c.phone) || c.key)}`} className="min-w-0 flex-1">
                    <p className="flex items-center gap-2 font-medium">
                      {c.name}
                      {c.count > 1 && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface2)", color: "#7bb38a" }}>
                          <Repeat size={10} /> khách cũ
                        </span>
                      )}
                      {isOld(c) && (
                        <span className="inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "var(--surface2)", color: "#c7a76b" }}>
                          <HeartHandshake size={10} /> cần chăm sóc
                        </span>
                      )}
                    </p>
                    <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                      <Phone size={12} /> {c.phone || "—"} · {c.count} hợp đồng
                      {c.source ? ` · ${LEAD_SOURCE_LABEL[c.source] || c.source}` : ""}
                      {c.last ? ` · gần nhất ${c.last}` : ""}
                    </p>
                  </Link>
                  <div className="flex items-center justify-between gap-3 sm:justify-end">
                    <div className="text-left sm:text-right">
                      <p className="font-serif text-lg font-medium">{vnd(c.value)}</p>
                      <p className="text-xs" style={{ color: "var(--text3)" }}>đã thu {vnd(c.collected)}</p>
                    </div>
                    {isOld(c) && c.phone && (
                      <ZaloButton
                        phone={c.phone}
                        label="Mời lại"
                        message={`Xin chào ${c.name}, đã lâu chưa được phục vụ anh/chị. Studio đang có ưu đãi cho khách cũ, anh/chị có dịp nào muốn chụp lại không ạ? Cảm ơn anh/chị!`}
                      />
                    )}
                  </div>
                </div>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

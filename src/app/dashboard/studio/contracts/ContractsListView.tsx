"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { Plus, Search, Download, SlidersHorizontal, X } from "lucide-react";
import { useCachedJson } from "@/lib/client-cache";
import {
  contractTotal,
  sumAmounts,
  vnd,
  CONTRACT_STATUS_LABEL,
  SHOOT_TYPE_LABEL,
  type ContractStatus,
  type ShootType,
} from "@/lib/types";
import { fmtDate } from "@/lib/date";
import { filterContracts, sortContracts, splitContracts, type ContractSort } from "@/lib/contract-filter";

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
  sent: "var(--s-amber)",
  approved: "var(--s-green)",
  in_progress: "var(--s-blue)",
  completed: "var(--s-green)",
  cancelled: "var(--s-red)",
};

/** Nhãn sắp xếp — nói rõ chiều để không phải đoán "gần nhất" là trước hay sau. */
const SORT_OPTIONS: [ContractSort, string][] = [
  ["default", "Mới tạo trước"],
  ["event_asc", "Ngày thực hiện: cũ → mới"],
  ["event_desc", "Ngày thực hiện: mới → cũ"],
  ["code_asc", "Mã HĐ: A → Z"],
  ["code_desc", "Mã HĐ: Z → A"],
];

/** Trạng thái chọn được ở tab "Đang thực hiện" — completed đã có tab riêng. */
const ACTIVE_STATUSES = (Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).filter(
  (k) => k !== "completed"
);

export default function ContractsListView() {
  const [q, setQ] = useState("");
  const [status, setStatus] = useState<"all" | ContractStatus>("all");
  const [code, setCode] = useState("");
  // Khoảng NGÀY THỰC HIỆN (event_date). Cột kiểu date → "YYYY-MM-DD", so sánh
  // chuỗi là đúng thứ tự nên không cần parse ra Date.
  const [from, setFrom] = useState("");
  const [to, setTo] = useState("");
  const [showFilters, setShowFilters] = useState(false);
  const [sort, setSort] = useState<ContractSort>("default");
  // HĐ đã hoàn thành tách hẳn sang tab riêng để danh sách việc đang chạy gọn lại.
  const [tab, setTab] = useState<"active" | "completed">("active");
  const [updating, setUpdating] = useState<string | null>(null);

  // Tải danh sách + cache trên máy: hiện tức thì bản đã lưu, làm mới ngầm.
  const { data, loading, fromCache, setData } = useCachedJson<{ list: ContractRow[] }>(
    "contracts-list",
    "/api/studio/contracts-list",
    { list: [] }
  );
  const rows = data.list;
  const setRows = (fn: (prev: ContractRow[]) => ContractRow[]) => setData((d) => ({ list: fn(d.list) }));
  // Lần đầu chưa có cache và đang tải → hiện trạng thái tải thay vì "chưa có HĐ".
  const initialLoading = loading && !fromCache && rows.length === 0;

  // Lọc chung (tìm kiếm + mã + khoảng ngày) TRƯỚC khi tách tab, để số đếm trên
  // hai tab phản ánh đúng bộ lọc đang bật. Logic ở @/lib/contract-filter.
  const matched = useMemo(() => filterContracts(rows, { q, code, from, to }), [rows, q, code, from, to]);

  const completedCount = useMemo(() => matched.filter((c) => c.status === "completed").length, [matched]);
  const activeCount = matched.length - completedCount;

  const filtered = useMemo(
    () => sortContracts(splitContracts(matched, tab, status), sort),
    [matched, tab, status, sort]
  );

  const filterCount = (code.trim() ? 1 : 0) + (from ? 1 : 0) + (to ? 1 : 0) + (status !== "all" ? 1 : 0);

  function clearFilters() {
    setCode("");
    setFrom("");
    setTo("");
    setStatus("all");
  }

  async function changeStatus(id: string, next: ContractStatus, e: React.ChangeEvent<HTMLSelectElement>) {
    e.stopPropagation();
    setUpdating(id);
    const prev = rows.find((r) => r.id === id)?.status;
    // Cập nhật lạc quan ngay (ghi cả cache) → phản hồi tức thì, rồi lưu lên server.
    setRows((p) => p.map((r) => r.id === id ? { ...r, status: next } : r));
    // Route server tập trung: đóng dấu completed_at + tạo album giao khi hoàn thành.
    try {
      const res = await fetch("/api/studio/contract-status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ contractId: id, status: next }),
      });
      if (!res.ok && prev) setRows((p) => p.map((r) => r.id === id ? { ...r, status: prev } : r));
    } catch {
      if (prev) setRows((p) => p.map((r) => r.id === id ? { ...r, status: prev } : r));
    }
    setUpdating(null);
  }

  function exportCsv() {
    const rows2: string[][] = [["Mã", "Tên HĐ", "Khách", "SĐT", "Trạng thái", "Ngày", "Giá trị", "Đã thu", "Còn lại"]];
    for (const c of filtered) {
      const total = contractTotal(c.contract_items || []);
      const collected = sumAmounts(c.contract_payments || []);
      rows2.push([
        c.code || "", c.title, c.client_name || "", c.client_phone || "",
        CONTRACT_STATUS_LABEL[c.status], c.event_date || "",
        String(total), String(collected), String(total - collected),
      ]);
    }
    const csv = "﻿" + rows2.map((r) => r.map((x) => `"${(x ?? "").replace(/"/g, '""')}"`).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8;" }));
    const a = document.createElement("a");
    a.href = url;
    // Xuất đúng danh sách đang thấy (tab + bộ lọc), tên file theo tab để hai
    // lần xuất không ghi đè nhau.
    a.download = tab === "completed" ? "hop-dong-hoan-thanh.csv" : "hop-dong-dang-thuc-hien.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="font-serif text-2xl font-medium mr-auto">Hợp đồng</h1>
        <Link href="/dashboard/studio/contracts/new" className="btn-primary shrink-0">
          <Plus size={16} /> Hợp đồng mới
        </Link>
      </div>

      {rows.length > 0 && (
        <div className="mb-4 space-y-3">
          <div className="flex flex-wrap items-center gap-2">
            <div className="relative min-w-[180px] flex-1">
              <Search size={15} className="absolute left-3 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
              <input
                className="input pl-9"
                placeholder="Tìm tên HĐ, khách, ngày thực hiện, mã, SĐT…"
                aria-label="Tìm hợp đồng"
                value={q}
                onChange={(e) => setQ(e.target.value)}
              />
            </div>
            <select
              className="input w-auto shrink-0 py-2 text-xs"
              aria-label="Sắp xếp hợp đồng"
              value={sort}
              onChange={(e) => setSort(e.target.value as ContractSort)}
            >
              {SORT_OPTIONS.map(([value, label]) => (
                <option key={value} value={value}>{label}</option>
              ))}
            </select>
            <button
              onClick={() => setShowFilters((v) => !v)}
              className="btn-ghost shrink-0 px-3 py-2 text-xs"
              aria-expanded={showFilters}
            >
              <SlidersHorizontal size={14} /> Bộ lọc
              {filterCount > 0 && (
                <span
                  className="ml-0.5 rounded-full px-1.5 text-[10px] font-semibold"
                  style={{ background: "var(--brandSoft)", color: "var(--brand)" }}
                >
                  {filterCount}
                </span>
              )}
            </button>
            <button onClick={exportCsv} className="btn-ghost shrink-0 px-3 py-2 text-xs"><Download size={14} /> CSV</button>
          </div>

          {showFilters && (
            <div className="card grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
              <div>
                <label className="label" htmlFor="f-code">Mã hợp đồng</label>
                <input
                  id="f-code"
                  className="input"
                  placeholder="Nhập mã…"
                  value={code}
                  onChange={(e) => setCode(e.target.value)}
                />
              </div>
              <div>
                <label className="label" htmlFor="f-status">Trạng thái</label>
                <select
                  id="f-status"
                  className="input"
                  value={tab === "completed" ? "completed" : status}
                  disabled={tab === "completed"}
                  onChange={(e) => setStatus(e.target.value as "all" | ContractStatus)}
                >
                  {tab === "completed" ? (
                    <option value="completed">{CONTRACT_STATUS_LABEL.completed}</option>
                  ) : (
                    <>
                      <option value="all">Tất cả</option>
                      {ACTIVE_STATUSES.map((k) => (
                        <option key={k} value={k}>{CONTRACT_STATUS_LABEL[k]}</option>
                      ))}
                    </>
                  )}
                </select>
              </div>
              <div>
                <label className="label" htmlFor="f-from">Ngày thực hiện từ</label>
                <input id="f-from" type="date" className="input" value={from} max={to || undefined} onChange={(e) => setFrom(e.target.value)} />
              </div>
              <div>
                <label className="label" htmlFor="f-to">Đến ngày</label>
                <input id="f-to" type="date" className="input" value={to} min={from || undefined} onChange={(e) => setTo(e.target.value)} />
              </div>
              {filterCount > 0 && (
                <button onClick={clearFilters} className="btn-ghost justify-self-start px-3 py-2 text-xs sm:col-span-2 lg:col-span-4">
                  <X size={14} /> Xoá bộ lọc
                </button>
              )}
            </div>
          )}

          {/* Tách HĐ đã hoàn thành sang tab riêng. Số đếm theo bộ lọc đang bật. */}
          <div role="tablist" aria-label="Nhóm hợp đồng" className="flex flex-wrap gap-2">
            {([
              ["active", "Đang thực hiện", activeCount],
              ["completed", "Đã hoàn thành", completedCount],
            ] as const).map(([key, label, count]) => (
              <button
                key={key}
                role="tab"
                aria-selected={tab === key}
                onClick={() => { setTab(key); setStatus("all"); }}
                className="rounded-full px-3.5 py-1.5 text-xs font-medium transition-colors"
                style={
                  tab === key
                    ? { background: "var(--brand)", color: "var(--brandFg, #fff)" }
                    : { background: "var(--surface2)", color: "var(--text2)" }
                }
              >
                {label} ({count})
              </button>
            ))}
          </div>
        </div>
      )}

      {initialLoading ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>Đang tải hợp đồng…</div>
      ) : rows.length === 0 ? (
        <div className="card flex flex-col items-center justify-center py-20 text-center">
          <p style={{ color: "var(--text2)" }}>Chưa có hợp đồng nào.</p>
          <Link href="/dashboard/studio/contracts/new" className="btn-ghost mt-4">
            <Plus size={16} /> Tạo hợp đồng
          </Link>
        </div>
      ) : filtered.length === 0 ? (
        <div className="card py-16 text-center text-sm" style={{ color: "var(--text3)" }}>
          {/* Nói rõ trống vì chưa có HĐ trong nhóm hay vì bộ lọc — không thì
              studio tưởng mất dữ liệu. */}
          {q.trim() || filterCount > 0
            ? "Không tìm thấy hợp đồng phù hợp với tìm kiếm / bộ lọc."
            : tab === "completed"
              ? "Chưa có hợp đồng nào hoàn thành."
              : "Tất cả hợp đồng đã hoàn thành — xem ở tab “Đã hoàn thành”."}
        </div>
      ) : (
        <div className="space-y-3">
          {filtered.map((c) => {
            const total = contractTotal(c.contract_items || []);
            const collected = sumAmounts(c.contract_payments || []);
            return (
              <div key={c.id} className="card p-4 transition-colors hover:bg-[var(--surface2)]">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <Link href={`/dashboard/studio/contracts/${c.id}`} className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      {c.code && <span className="text-[11px]" style={{ color: "var(--text3)" }}>{c.code}</span>}
                    </div>
                    <p className="mt-0.5 truncate font-serif text-lg font-medium">{c.title}</p>
                    <p className="text-xs" style={{ color: "var(--text3)" }}>
                      {c.client_name || "Chưa có khách"} · {SHOOT_TYPE_LABEL[c.shoot_type]}
                      {c.event_date ? ` · ${fmtDate(c.event_date)}` : ""}
                    </p>
                  </Link>
                  <div className="flex flex-col items-end gap-2">
                    <div className="text-right">
                      <p className="font-serif text-base font-medium">{vnd(total)}</p>
                      <p className="text-xs" style={{ color: "var(--text3)" }}>
                        Đã thu {vnd(collected)} · Còn {vnd(total - collected)}
                      </p>
                    </div>
                    <select
                      className="input py-1.5 text-xs"
                      aria-label="Đổi trạng thái hợp đồng"
                      style={{
                        width: "auto",
                        color: STATUS_TONE[c.status],
                        opacity: updating === c.id ? 0.5 : 1,
                      }}
                      value={c.status}
                      disabled={updating === c.id}
                      onClick={(e) => e.stopPropagation()}
                      onChange={(e) => changeStatus(c.id, e.target.value as ContractStatus, e)}
                    >
                      {(Object.keys(CONTRACT_STATUS_LABEL) as ContractStatus[]).map((k) => (
                        <option key={k} value={k}>{CONTRACT_STATUS_LABEL[k]}</option>
                      ))}
                    </select>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}


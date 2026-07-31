/* Đối chiếu công thức Tổng quan: desktop (data.js) vs web (page.tsx).
 * Dựng một bộ dữ liệu giả có đủ các bẫy đã từng làm lệch số:
 *  - hợp đồng đã huỷ (web loại ở truy vấn)
 *  - hợp đồng nháp (web KHÔNG loại)
 *  - hợp đồng trả dư (không được bù cho hợp đồng khác)
 *  - thanh toán của hợp đồng đã huỷ (web VẪN tính vào doanh thu tháng)
 */
import { readFileSync } from "node:fs";
import vm from "node:vm";

const today = new Date(Date.now() + 7 * 3600 * 1000).toISOString().slice(0, 10);
const monthStart = today.slice(0, 7) + "-01";
const future = (n) => {
  const d = new Date(Date.now() + 7 * 3600 * 1000 + n * 86400000);
  return d.toISOString().slice(0, 10);
};

const tables = {
  studio_contracts: [
    { id: "c1", status: "approved", event_date: future(3), client_phone: "0900000001", client_name: "A", created_at: "2026-01-01" },
    { id: "c2", status: "draft", event_date: future(5), client_phone: "0900000002", client_name: "B", created_at: "2026-01-02" },
    { id: "c3", status: "cancelled", event_date: future(2), client_phone: "0900000003", client_name: "C", created_at: "2026-01-03" },
    { id: "c4", status: "completed", event_date: future(1), client_phone: "0900000001", client_name: "A", created_at: "2026-01-04" },
    { id: "c5", status: "sent", event_date: future(9), client_phone: "", client_name: "", created_at: "2026-01-05" },
  ],
  contract_items: [
    { contract_id: "c1", qty: 2, unit_price: 1_000_000 },
    { contract_id: "c2", qty: 1, unit_price: 500_000 },
    { contract_id: "c3", qty: 1, unit_price: 9_000_000 },
    { contract_id: "c4", qty: 1, unit_price: 3_000_000 },
    { contract_id: "c5", qty: 1, unit_price: 700_000 },
  ],
  contract_payments: [
    { contract_id: "c1", amount: 800_000, paid_at: monthStart },
    { contract_id: "c4", amount: 4_000_000, paid_at: today },   // trả DƯ 1tr
    { contract_id: "c3", amount: 250_000, paid_at: today },      // HĐ đã huỷ
    { contract_id: "c1", amount: 100_000, paid_at: "2025-01-01" }, // tháng cũ
  ],
  contract_edit_requests: [
    { contract_id: "c1", status: "open" },
    { contract_id: "c3", status: "open" },   // thuộc HĐ đã huỷ
    { contract_id: "c2", status: "done" },
  ],
  albums: [
    { id: "a1", phase: "selection", status: "published", is_gallery: false },
    { id: "a2", phase: "selection", status: "draft", is_gallery: false },
    { id: "a3", phase: "delivery", status: "published", is_gallery: true },
  ],
  studio_bookings: [{ status: "new" }, { status: "handled" }, { status: "new" }],
  studio_events: [],
};

// ─── Bản WEB: chép nguyên công thức từ src/app/dashboard/studio/page.tsx ──────
const sumAmounts = (rows) => rows.reduce((s, r) => s + (r.amount || 0), 0);
const contractTotalItems = (items) => items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0);

function web() {
  const itemsOf = (id) => tables.contract_items.filter((i) => i.contract_id === id);
  const paysOf = (id) => tables.contract_payments.filter((p) => p.contract_id === id);
  const reqsOf = (id) => tables.contract_edit_requests.filter((r) => r.contract_id === id);
  const list = tables.studio_contracts.filter((c) => c.status !== "cancelled");

  const payMonth = tables.contract_payments.filter((p) => p.paid_at >= monthStart);
  const revenueMonth = sumAmounts(payMonth);
  const active = list.filter((c) => c.status !== "cancelled" && c.status !== "completed");
  const notCancelled = list.filter((c) => c.status !== "cancelled");
  const upcoming = list
    .filter((c) => c.event_date && c.event_date >= today && ["approved", "in_progress", "completed"].includes(c.status))
    .slice(0, 6);
  const selectingAlbums = tables.albums.filter((a) => a.phase === "selection" && a.status === "published" && !a.is_gallery).length;
  const openRequests = list.reduce((s, c) => s + reqsOf(c.id).filter((r) => r.status === "open").length, 0);
  const totalValue = list.filter((c) => c.status !== "cancelled").reduce((s, c) => s + contractTotalItems(itemsOf(c.id)), 0);
  const avgValue = notCancelled.length ? Math.round(totalValue / notCancelled.length) : 0;
  const debts = list
    .filter((c) => c.status !== "cancelled")
    .map((c) => ({ due: contractTotalItems(itemsOf(c.id)) - sumAmounts(paysOf(c.id)) }))
    .filter((d) => d.due > 0);
  const totalDue = debts.reduce((s, d) => s + d.due, 0);
  const bookingsAll = tables.studio_bookings.length;
  const closeRate = bookingsAll ? Math.min(100, Math.round((notCancelled.length / bookingsAll) * 100)) : null;
  const uniqueClients = new Set(
    notCancelled.map((c) => (c.client_phone || "").replace(/\D/g, "") || (c.client_name || "").trim().toLowerCase()).filter(Boolean),
  ).size;

  return { revenueMonth, active: active.length, total: notCancelled.length, upcoming: upcoming.length,
           selectingAlbums, openRequests, avgValue, totalDue, closeRate, uniqueClients };
}

// ─── Bản DESKTOP: nạp data.js thật rồi đọc số từ HTML nó sinh ra ─────────────
function desktop() {
  const src = readFileSync("desktop/ui/data.js", "utf8");
  const captured = [];
  const ctx = {
    document: { getElementById: () => null },
    window: { cacheStamp: () => "test" },
    crypto: { randomUUID: () => "x" },
    console,
    // Chặn stat() để lấy thẳng cặp (nhãn, giá trị) thay vì bóc HTML.
    __stat: (label, value, sub) => { captured.push([label, value, sub]); return ""; },
  };
  vm.createContext(ctx);
  vm.runInContext(src.replace(/^function stat\(/m, "function __unused_stat("), ctx);
  vm.runInContext("stat = __stat; setData({ tables: " + JSON.stringify(tables) + " });", ctx);
  vm.runInContext("__out = renderOverview();", ctx);
  return Object.fromEntries(captured.map(([l, v, s]) => [l, { value: v, sub: s }]));
}

const w = web();
const d = desktop();
const num = (s) => Number(String(s).replace(/[^\d-]/g, ""));

const checks = [
  ["Doanh thu tháng này", w.revenueMonth, num(d["Doanh thu tháng này"]?.value)],
  ["Hợp đồng đang hoạt động", w.active, num(d["Hợp đồng đang hoạt động"]?.value)],
  ["Tổng hợp đồng (phụ đề)", w.total, num(d["Hợp đồng đang hoạt động"]?.sub)],
  ["Album đang được khách chọn", w.selectingAlbums, num(d["Album đang được khách chọn"]?.value)],
  ["Lịch sắp tới", w.upcoming, num(d["Lịch sắp tới"]?.value)],
  ["Khách hàng (phụ đề)", w.uniqueClients, num(d["Lịch sắp tới"]?.sub)],
  ["Yêu cầu sửa đang chờ", w.openRequests, num(d["Yêu cầu sửa đang chờ"]?.value)],
  ["Giá trị HĐ trung bình", w.avgValue, num(d["Giá trị HĐ trung bình"]?.value)],
  ["Công nợ cần thu", w.totalDue, num(d["Công nợ cần thu"]?.value)],
  ["Tỉ lệ chốt", w.closeRate, num(d["Tỉ lệ chốt (HĐ/đặt lịch)"]?.value)],
];

let bad = 0;
for (const [name, expect, got] of checks) {
  const ok = expect === got;
  if (!ok) bad++;
  console.log(`${ok ? "✓" : "✗"} ${name.padEnd(30)} web=${String(expect).padStart(10)}  desktop=${String(got).padStart(10)}`);
}
console.log(bad ? `\n${bad} chỉ số LỆCH` : "\nTất cả khớp");
process.exit(bad ? 1 : 0);

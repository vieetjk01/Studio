/* MStudo Desktop — trình duyệt dữ liệu OFFLINE.
 * Đọc bản cache (backup JSON tải từ server) và hiển thị/tìm kiếm hoàn toàn cục
 * bộ — không gọi server mỗi thao tác nên mượt hơn web app. Tạo/sửa vẫn mở app
 * online (nút "Mở ứng dụng quản lý"). setData() được app.js gọi sau mỗi lần sync.
 */

let DB = { tables: {} };
let dataTab = "overview";
let dataQuery = "";

// app.js gọi khi có dữ liệu mới (từ cache đĩa lúc mở, hoặc sau mỗi lần đồng bộ).
function setData(backup) {
  DB = backup && backup.tables ? backup : { tables: {} };
  if (typeof renderData === "function") renderData();
}
const T = (name) => (DB.tables && DB.tables[name]) || [];

// ─── Định dạng ───────────────────────────────────────────────────────────────
const vnd = (n) => (Number(n) || 0).toLocaleString("vi-VN") + " đ";
const D = (s) => {
  if (!s) return "";
  const d = new Date(s);
  if (isNaN(d.getTime())) return String(s).slice(0, 10);
  const p = (x) => String(x).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()}`;
};
const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
const digits = (s) => String(s ?? "").replace(/\D/g, "");
const norm = (s) => String(s ?? "").toLowerCase().normalize("NFD").replace(/[\u0300-\u036f]/g, "");
const monthKey = (s) => (s ? String(s).slice(0, 7) : "");
const thisMonth = () => new Date().toISOString().slice(0, 7);

const CONTRACT_STATUS = { draft: "Nháp", sent: "Đã gửi", approved: "Đã duyệt", in_progress: "Đang thực hiện", completed: "Hoàn thành", cancelled: "Đã hủy" };
const QUOTE_STATUS = { draft: "Nháp", sent: "Đã gửi", viewed: "Đã xem", adjust_requested: "Xin chỉnh", accepted: "Đã chốt", converted: "Đã chuyển HĐ", expired: "Hết hạn", cancelled: "Đã hủy" };
const BOOKING_STATUS = { new: "Mới", handled: "Đã xử lý", archived: "Lưu trữ" };

// ─── Tổng hợp ────────────────────────────────────────────────────────────────
function contractTotal(id) {
  return T("contract_items").filter((i) => i.contract_id === id).reduce((s, i) => s + (Number(i.qty) || 0) * (Number(i.unit_price) || 0), 0);
}
function contractPaid(id) {
  return T("contract_payments").filter((p) => p.contract_id === id).reduce((s, p) => s + (Number(p.amount) || 0), 0);
}

const DATA_TABS = [
  ["overview", "Tổng quan"], ["contracts", "Hợp đồng"], ["clients", "Khách hàng"],
  ["quotes", "Báo giá"], ["expenses", "Thu chi"], ["payroll", "Lương"], ["calendar", "Lịch"],
];

function renderData() {
  const host = document.getElementById("dataView");
  if (!host) return;
  const tabs = DATA_TABS.map(([id, label]) =>
    `<button class="dtab ${id === dataTab ? "on" : ""}" data-tab="${id}">${label}</button>`).join("");
  const needSearch = dataTab !== "overview";
  host.innerHTML =
    `<div class="dtabs">${tabs}</div>` +
    (needSearch ? `<input id="dataSearch" class="dsearch" placeholder="Tìm kiếm…" value="${esc(dataQuery)}" />` : "") +
    `<div id="dataBody">${renderTab()}</div>`;
  host.querySelectorAll(".dtab").forEach((b) => b.onclick = () => { dataTab = b.dataset.tab; dataQuery = ""; renderData(); });
  const s = document.getElementById("dataSearch");
  if (s) s.oninput = () => { dataQuery = s.value; document.getElementById("dataBody").innerHTML = renderTab(); bindRowClicks(); };
  bindRowClicks();
}

function bindRowClicks() {
  document.querySelectorAll("#dataBody [data-contract]").forEach((r) => r.onclick = () => openContract(r.dataset.contract));
  document.querySelectorAll("#dataBody [data-expense]").forEach((r) => r.onclick = () => openExpense(r.dataset.expense));
  const add = document.getElementById("addExpense");
  if (add) add.onclick = () => openExpense();
}

function match(row, fields) {
  if (!dataQuery.trim()) return true;
  const q = norm(dataQuery);
  return fields.some((f) => norm(f).includes(q) || digits(f).includes(digits(dataQuery)));
}

function empty(msg) { return `<div class="dempty">${msg}</div>`; }

function renderTab() {
  if (!DB.tables || !Object.keys(DB.tables).length) return empty("Chưa có dữ liệu offline. Bấm “Xuất Excel ngay” để tải dữ liệu về máy.");
  switch (dataTab) {
    case "overview": return renderOverview();
    case "contracts": return renderContracts();
    case "clients": return renderClients();
    case "quotes": return renderQuotes();
    case "expenses": return renderExpenses();
    case "payroll": return renderPayroll();
    case "calendar": return renderCalendar();
    default: return "";
  }
}

function stat(label, value, sub) {
  return `<div class="dstat"><div class="dstat-l">${label}</div><div class="dstat-v">${value}</div>${sub ? `<div class="dstat-s">${sub}</div>` : ""}</div>`;
}

function renderOverview() {
  const contracts = T("studio_contracts");
  const mk = thisMonth();
  const revenue = contracts.reduce((s, c) => s + contractTotal(c.id), 0);
  const paid = contracts.reduce((s, c) => s + contractPaid(c.id), 0);
  const expMonth = T("studio_expenses").filter((e) => monthKey(e.spent_at) === mk).reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const contractsMonth = contracts.filter((c) => monthKey(c.event_date || c.created_at) === mk).length;
  const active = contracts.filter((c) => !["completed", "cancelled"].includes(c.status)).length;
  const newBookings = T("studio_bookings").filter((b) => b.status === "new").length;
  return `<div class="dstats">
    ${stat("Tổng hợp đồng", contracts.length, `${active} đang thực hiện`)}
    ${stat("Doanh thu (tổng HĐ)", vnd(revenue), `Đã thu ${vnd(paid)}`)}
    ${stat("Còn phải thu", vnd(Math.max(0, revenue - paid)), "")}
    ${stat("HĐ tháng này", contractsMonth, "")}
    ${stat("Chi tháng này", vnd(expMonth), "")}
    ${stat("Đặt lịch mới", newBookings, "chờ xử lý")}
  </div>
  <p class="dnote">Dữ liệu offline cập nhật lần cuối: ${window.cacheStamp ? window.cacheStamp() : "—"}. Mở “Ứng dụng quản lý” để tạo/sửa.</p>`;
}

function renderContracts() {
  const rows = T("studio_contracts")
    .filter((c) => match(c, [c.code, c.client_name, c.client_phone, c.title]))
    .sort((a, b) => String(b.event_date || b.created_at || "").localeCompare(String(a.event_date || a.created_at || "")));
  if (!rows.length) return empty("Không có hợp đồng khớp.");
  const body = rows.map((c) => {
    const tot = contractTotal(c.id), paid = contractPaid(c.id);
    return `<tr data-contract="${c.id}" class="clickable">
      <td>${esc(c.code || "")}</td><td>${esc(c.client_name || "")}</td>
      <td>${esc(c.client_phone || "")}</td><td>${D(c.event_date)}</td>
      <td><span class="badge">${CONTRACT_STATUS[c.status] || c.status || ""}</span></td>
      <td class="r">${vnd(tot)}</td><td class="r">${paid >= tot && tot > 0 ? "Đã thu đủ" : vnd(paid)}</td></tr>`;
  }).join("");
  return table(["Mã", "Khách", "SĐT", "Ngày", "Trạng thái", "Giá trị", "Đã thu"], body, `${rows.length} hợp đồng`);
}

function openContract(id) {
  const c = T("studio_contracts").find((x) => x.id === id);
  if (!c) return;
  const items = T("contract_items").filter((i) => i.contract_id === id).sort((a, b) => (a.position || 0) - (b.position || 0));
  const pays = T("contract_payments").filter((p) => p.contract_id === id);
  const crew = T("contract_crew").filter((x) => x.contract_id === id);
  const tot = contractTotal(id), paid = contractPaid(id);
  const rows = (arr, cols) => arr.map(cols).join("");
  const html = `
    <div class="dmodal-head">
      <div><div class="dmodal-title">${esc(c.title || "Hợp đồng")} · ${esc(c.code || "")}</div>
      <div class="muted">${esc(c.client_name || "")} · ${esc(c.client_phone || "")} · ${D(c.event_date)}</div></div>
      <button id="dmClose" class="btn small">Đóng</button>
    </div>
    <div class="dmodal-body">
      <div class="drow"><span class="badge">${CONTRACT_STATUS[c.status] || c.status || ""}</span>
        ${c.client_signed_at ? `<span class="badge ok">Khách đã ký ${D(c.client_signed_at)}</span>` : `<span class="badge warn">Chưa ký</span>`}</div>
      ${c.location ? `<p><b>Địa điểm:</b> ${esc(c.location)}</p>` : ""}
      <h4>Hạng mục</h4>
      ${items.length ? `<table class="dtable"><thead><tr><th>Hạng mục</th><th class="r">SL</th><th class="r">Đơn giá</th><th class="r">Thành tiền</th></tr></thead><tbody>${rows(items, (i) => `<tr><td>${esc(i.name)}</td><td class="r">${i.qty}</td><td class="r">${vnd(i.unit_price)}</td><td class="r">${vnd((i.qty || 0) * (i.unit_price || 0))}</td></tr>`)}</tbody></table>` : `<p class="muted">Không có hạng mục.</p>`}
      <p class="dtotals"><b>Tổng:</b> ${vnd(tot)} · <b>Đã thu:</b> ${vnd(paid)} · <b>Còn lại:</b> ${vnd(Math.max(0, tot - paid))}</p>
      ${pays.length ? `<h4>Thanh toán</h4><table class="dtable"><thead><tr><th>Ngày</th><th>Loại</th><th class="r">Số tiền</th></tr></thead><tbody>${rows(pays, (p) => `<tr><td>${D(p.paid_at)}</td><td>${esc(p.kind || "")}</td><td class="r">${vnd(p.amount)}</td></tr>`)}</tbody></table>` : ""}
      ${crew.length ? `<h4>Đội ngũ</h4><table class="dtable"><thead><tr><th>Tên</th><th>Vai trò</th><th class="r">Lương</th><th>Đã trả</th></tr></thead><tbody>${rows(crew, (w) => `<tr><td>${esc(w.name)}</td><td>${esc(w.role || "")}</td><td class="r">${vnd(w.salary)}</td><td>${w.paid ? "Rồi" : "Chưa"}</td></tr>`)}</tbody></table>` : ""}
      ${c.note ? `<h4>Ghi chú</h4><p>${esc(c.note).replace(/\n/g, "<br/>")}</p>` : ""}
    </div>`;
  const ov = document.getElementById("dataModal");
  ov.querySelector(".dmodal").innerHTML = html;
  ov.classList.remove("hidden");
  document.getElementById("dmClose").onclick = () => ov.classList.add("hidden");
  ov.onclick = (e) => { if (e.target === ov) ov.classList.add("hidden"); };
}

function renderClients() {
  const map = new Map();
  for (const c of T("studio_contracts")) {
    const key = digits(c.client_phone) || norm(c.client_name) || "?";
    const cur = map.get(key) || { name: c.client_name || "", phone: c.client_phone || "", n: 0, spent: 0, last: "" };
    cur.n++; cur.spent += contractTotal(c.id);
    const d = c.event_date || c.created_at || "";
    if (d > cur.last) cur.last = d;
    if (!cur.name && c.client_name) cur.name = c.client_name;
    map.set(key, cur);
  }
  let rows = [...map.values()].filter((c) => match(c, [c.name, c.phone]));
  rows.sort((a, b) => String(b.last).localeCompare(String(a.last)));
  if (!rows.length) return empty("Không có khách hàng khớp.");
  const body = rows.map((c) => `<tr><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td class="r">${c.n}</td><td class="r">${vnd(c.spent)}</td><td>${D(c.last)}</td></tr>`).join("");
  return table(["Tên khách", "SĐT", "Số HĐ", "Tổng chi", "Gần nhất"], body, `${rows.length} khách hàng`);
}

function renderQuotes() {
  const totals = new Map();
  for (const i of T("quote_items")) {
    if (i.is_optional && i.selected === false) continue;
    totals.set(i.quote_id, (totals.get(i.quote_id) || 0) + (Number(i.qty) || 0) * (Number(i.unit_price) || 0));
  }
  const rows = T("studio_quotes").filter((q) => match(q, [q.code, q.client_name, q.client_phone, q.title]))
    .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")));
  if (!rows.length) return empty("Không có báo giá khớp.");
  const body = rows.map((q) => `<tr><td>${esc(q.code || "")}</td><td>${esc(q.client_name || "")}</td><td>${esc(q.client_phone || "")}</td><td>${D(q.event_date)}</td><td><span class="badge">${QUOTE_STATUS[q.status] || q.status || ""}</span></td><td class="r">${vnd(totals.get(q.id) || 0)}</td></tr>`).join("");
  return table(["Mã", "Khách", "SĐT", "Ngày", "Trạng thái", "Tổng"], body, `${rows.length} báo giá`);
}

function renderExpenses() {
  const rows = T("studio_expenses").filter((e) => match(e, [e.title, e.category]))
    .sort((a, b) => String(b.spent_at || "").localeCompare(String(a.spent_at || "")));
  const total = rows.reduce((s, e) => s + (Number(e.amount) || 0), 0);
  const bar = `<div class="dbar"><button class="btn small primary" id="addExpense">＋ Thêm khoản chi</button><span class="dcap" style="margin:0">${rows.length} khoản · tổng ${vnd(total)}</span></div>`;
  if (!rows.length) return bar + empty(dataQuery ? "Không có khoản chi khớp." : "Chưa có khoản chi. Bấm ＋ để thêm — chạy cục bộ, lưu ngay, đồng bộ ngầm.");
  const body = rows.map((e) => `<tr data-expense="${e.id}" class="clickable"><td>${D(e.spent_at)}</td><td>${esc(e.title)}</td><td>${esc(e.category || "")}</td><td class="r">${vnd(e.amount)}</td></tr>`).join("");
  return bar + table(["Ngày", "Nội dung", "Danh mục", "Số tiền"], body, "");
}

// Form tạo/sửa khoản chi — chạy cục bộ, lưu tức thì + đồng bộ ngầm.
function openExpense(id) {
  const e = id ? T("studio_expenses").find((x) => x.id === id) : null;
  const v = e || { spent_at: new Date().toISOString().slice(0, 10), title: "", amount: "", category: "", note: "" };
  const ov = document.getElementById("dataModal");
  ov.querySelector(".dmodal").innerHTML = `
    <div class="dmodal-head">
      <div class="dmodal-title">${id ? "Sửa khoản chi" : "Thêm khoản chi"}</div>
      <button id="dmClose" class="btn small">Đóng</button>
    </div>
    <div class="dmodal-body dform">
      <label>Ngày chi</label><input id="exDate" type="date" value="${esc((v.spent_at || "").slice(0, 10))}" />
      <label>Nội dung</label><input id="exTitle" type="text" value="${esc(v.title || "")}" placeholder="VD: Mua đạo cụ" />
      <label>Danh mục</label><input id="exCat" type="text" value="${esc(v.category || "")}" placeholder="VD: Đạo cụ, Đi lại…" />
      <label>Số tiền (VND)</label><input id="exAmount" type="number" value="${esc(v.amount ?? "")}" placeholder="0" />
      <label>Ghi chú</label><input id="exNote" type="text" value="${esc(v.note || "")}" />
      <div class="dform-actions">
        ${id ? `<button id="exDelete" class="btn small danger">Xóa</button>` : ""}
        <button id="exSave" class="btn small primary" style="margin-left:auto">Lưu</button>
      </div>
    </div>`;
  ov.classList.remove("hidden");
  const close = () => ov.classList.add("hidden");
  document.getElementById("dmClose").onclick = close;
  ov.onclick = (ev2) => { if (ev2.target === ov) close(); };
  document.getElementById("exSave").onclick = async () => {
    const title = document.getElementById("exTitle").value.trim();
    const amount = Math.round(Number(document.getElementById("exAmount").value) || 0);
    if (!title) { document.getElementById("exTitle").focus(); return; }
    const row = {
      id: id || uuid(),
      title,
      amount,
      category: document.getElementById("exCat").value.trim(),
      spent_at: document.getElementById("exDate").value || new Date().toISOString().slice(0, 10),
      note: document.getElementById("exNote").value.trim(),
    };
    await window.localMutate("studio_expenses", id ? "update" : "insert", row);
    close();
  };
  if (id) document.getElementById("exDelete").onclick = async () => {
    if (!confirm("Xóa khoản chi này?")) return;
    await window.localMutate("studio_expenses", "delete", { id });
    close();
  };
}

function renderPayroll() {
  const byId = new Map(T("studio_contracts").map((c) => [c.id, c]));
  const rows = T("contract_crew").map((w) => ({ ...w, c: byId.get(w.contract_id) }))
    .filter((w) => match(w, [w.name, w.phone, w.role, w.c?.code, w.c?.client_name]))
    .sort((a, b) => String(b.c?.event_date || "").localeCompare(String(a.c?.event_date || "")));
  if (!rows.length) return empty("Không có dòng lương khớp.");
  const total = rows.reduce((s, w) => s + (Number(w.salary) || 0), 0);
  const unpaid = rows.filter((w) => !w.paid).reduce((s, w) => s + (Number(w.salary) || 0), 0);
  const body = rows.map((w) => `<tr><td>${esc(w.name)}</td><td>${esc(w.role || "")}</td><td>${esc(w.c?.code || "")}</td><td>${D(w.c?.event_date)}</td><td class="r">${vnd(w.salary)}</td><td>${w.paid ? "<span class='badge ok'>Đã trả</span>" : "<span class='badge warn'>Chưa</span>"}</td></tr>`).join("");
  return table(["Tên", "Vai trò", "Mã HĐ", "Ngày chụp", "Lương", "Trạng thái"], body, `${rows.length} dòng · tổng ${vnd(total)} · chưa trả ${vnd(unpaid)}`);
}

function renderCalendar() {
  const ev = T("studio_events").map((e) => ({ d: e.event_date, t: e.event_time, title: e.title, note: e.note, kind: "Lịch" }));
  const bk = T("studio_bookings").map((b) => ({ d: b.preferred_date, t: "", title: `${b.name || ""} · ${b.service || ""}`, note: BOOKING_STATUS[b.status] || "", kind: "Đặt lịch" }));
  let rows = [...ev, ...bk].filter((r) => r.d).filter((r) => match(r, [r.title, r.note]));
  rows.sort((a, b) => String(b.d).localeCompare(String(a.d)));
  if (!rows.length) return empty("Không có lịch khớp.");
  const body = rows.map((r) => `<tr><td>${D(r.d)}${r.t ? " · " + esc(r.t) : ""}</td><td><span class="badge">${r.kind}</span></td><td>${esc(r.title)}</td><td>${esc(r.note || "")}</td></tr>`).join("");
  return table(["Ngày", "Loại", "Nội dung", "Ghi chú"], body, `${rows.length} mục`);
}

function table(cols, body, caption) {
  return `<div class="dcap">${caption}</div><div class="dtable-wrap"><table class="dtable"><thead><tr>${cols.map((c, i) => `<th class="${i >= cols.length - 1 || /Giá|tiền|Lương|Tổng|thu|SL/.test(c) ? "" : ""}">${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
}

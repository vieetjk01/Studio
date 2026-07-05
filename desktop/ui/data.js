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
const SHOOT_TYPE = { photo: "Chụp ảnh", video: "Quay phim", both: "Chụp & quay", psc: "Phóng sự cưới", makeup: "Trang điểm", rental: "Thuê đồ", prewedding: "Pre-wedding", wedding: "Ngày cưới", other: "Khác" };

// <option> trạng thái, đánh dấu mục đang chọn.
function statusOptions(map, cur) {
  return Object.entries(map).map(([k, v]) => `<option value="${k}"${k === cur ? " selected" : ""}>${v}</option>`).join("");
}

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

// Điều hướng do menu trái (app.js) gọi.
function gotoTab(tab) { dataTab = tab; dataQuery = ""; renderData(); }

function renderData() {
  const host = document.getElementById("dataView");
  if (!host) return;
  const needSearch = dataTab !== "overview";
  host.innerHTML =
    (needSearch ? `<input id="dataSearch" class="dsearch" placeholder="Tìm kiếm…" value="${esc(dataQuery)}" />` : "") +
    `<div id="dataBody">${renderTab()}</div>`;
  const s = document.getElementById("dataSearch");
  if (s) s.oninput = () => { dataQuery = s.value; document.getElementById("dataBody").innerHTML = renderTab(); bindRowClicks(); };
  bindRowClicks();
}

function bindRowClicks() {
  const body = document.getElementById("dataBody");
  if (!body) return;
  body.querySelectorAll("[data-contract]").forEach((r) => r.onclick = () => openContract(r.dataset.contract));
  body.querySelectorAll("[data-expense]").forEach((r) => r.onclick = () => openExpense(r.dataset.expense));
  body.querySelectorAll("[data-crew]").forEach((r) => r.onclick = () => openCrew(r.dataset.crew));
  body.querySelectorAll("[data-event]").forEach((r) => r.onclick = (e) => { e.stopPropagation(); openEvent(r.dataset.event); });
  // Đổi trạng thái hợp đồng / đặt lịch ngay tại chỗ (cục bộ + đồng bộ ngầm).
  body.querySelectorAll("[data-status-contract]").forEach((sel) => {
    sel.onclick = (e) => e.stopPropagation();
    sel.onchange = () => window.localMutate("studio_contracts", "update", { id: sel.dataset.statusContract, status: sel.value });
  });
  body.querySelectorAll("[data-status-booking]").forEach((sel) => {
    sel.onclick = (e) => e.stopPropagation();
    sel.onchange = () => window.localMutate("studio_bookings", "update", { id: sel.dataset.statusBooking, status: sel.value });
  });
  const add = document.getElementById("addExpense");
  if (add) add.onclick = () => openExpense();
  const addEv = document.getElementById("addEvent");
  if (addEv) addEv.onclick = () => openEvent();
  const addCt = document.getElementById("addContract");
  if (addCt) addCt.onclick = () => openContractEdit();
  body.querySelectorAll("[data-client]").forEach((r) => r.onclick = () => { const [n, p] = r.dataset.client.split("|"); openClient(n, p); });
  const addCl = document.getElementById("addClient");
  if (addCl) addCl.onclick = () => openContractEdit();
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
  <p class="dnote">Dữ liệu cập nhật lần cuối: ${window.cacheStamp ? window.cacheStamp() : "—"}. Thu chi, Lịch, Lương, trạng thái Hợp đồng/Đặt lịch sửa được ngay tại đây (cục bộ + đồng bộ ngầm). Tạo hợp đồng mới đầy đủ: mở “Ứng dụng quản lý”.</p>`;
}

function renderContracts() {
  const rows = T("studio_contracts")
    .filter((c) => match(c, [c.code, c.client_name, c.client_phone, c.title]))
    .sort((a, b) => String(b.event_date || b.created_at || "").localeCompare(String(a.event_date || a.created_at || "")));
  const bar = `<div class="dbar"><button class="btn small primary" id="addContract">＋ Hợp đồng mới</button><span class="dcap" style="margin:0">${rows.length} hợp đồng</span></div>`;
  if (!rows.length) return bar + empty(dataQuery ? "Không có hợp đồng khớp." : "Chưa có hợp đồng. Bấm ＋ để tạo.");
  const cards = rows.map((c) => {
    const tot = contractTotal(c.id), paid = contractPaid(c.id);
    return `<div class="ccard">
      <div class="ccard-main" data-contract="${c.id}">
        ${c.code ? `<div class="ccard-code">${esc(c.code)}</div>` : ""}
        <div class="ccard-title">${esc(c.title || "Hợp đồng")}</div>
        <div class="ccard-sub">${esc(c.client_name || "Chưa có khách")}${c.shoot_type ? " · " + (SHOOT_TYPE[c.shoot_type] || "") : ""}${c.event_date ? " · " + D(c.event_date) : ""}</div>
      </div>
      <div class="ccard-right">
        <div class="ccard-amt">${vnd(tot)}</div>
        <div class="ccard-paid">Đã thu ${vnd(paid)} · Còn ${vnd(Math.max(0, tot - paid))}</div>
        <select class="dsel" data-status-contract="${c.id}">${statusOptions(CONTRACT_STATUS, c.status)}</select>
      </div>
    </div>`;
  }).join("");
  return bar + `<div class="ccards">${cards}</div>`;
}

// Tạo/sửa hợp đồng đầy đủ (thông tin + hạng mục) — chạy cục bộ + đồng bộ ngầm.
let _editItems = [];
function itemsRows() {
  return _editItems.map((it, i) => `<div class="irow" data-i="${i}">
    <input class="in-name" placeholder="Hạng mục" value="${esc(it.name || "")}" />
    <input class="in-qty" type="number" placeholder="SL" value="${esc(it.qty ?? 1)}" />
    <input class="in-price" type="number" placeholder="Đơn giá" value="${esc(it.unit_price ?? 0)}" />
    <button class="btn small in-del" data-del="${i}">×</button>
  </div>`).join("");
}
function syncItems() {
  document.querySelectorAll("#itemsBox .irow").forEach((r) => {
    const i = +r.dataset.i;
    if (_editItems[i]) {
      _editItems[i].name = r.querySelector(".in-name").value;
      _editItems[i].qty = r.querySelector(".in-qty").value;
      _editItems[i].unit_price = r.querySelector(".in-price").value;
    }
  });
}
function drawItems() {
  const box = document.getElementById("itemsBox");
  box.innerHTML = itemsRows() + `<div class="itotal">Tổng: ${vnd(_editItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0))}</div>`;
  box.querySelectorAll(".in-del").forEach((b) => b.onclick = () => { syncItems(); _editItems.splice(+b.dataset.del, 1); drawItems(); });
  box.querySelectorAll(".in-qty,.in-price").forEach((inp) => inp.oninput = () => { syncItems(); const t = document.querySelector("#itemsBox .itotal"); if (t) t.textContent = "Tổng: " + vnd(_editItems.reduce((s, it) => s + (Number(it.qty) || 0) * (Number(it.unit_price) || 0), 0)); });
}
function openContractEdit(id, prefill) {
  const c = id ? T("studio_contracts").find((x) => x.id === id) : null;
  const v = c || { status: "draft", shoot_type: "photo", event_date: "", client_name: prefill?.client_name || "", client_phone: prefill?.client_phone || "" };
  _editItems = id ? T("contract_items").filter((i) => i.contract_id === id).sort((a, b) => (a.position || 0) - (b.position || 0)).map((i) => ({ id: i.id, name: i.name, qty: i.qty, unit_price: i.unit_price })) : [];
  const ov = document.getElementById("dataModal");
  ov.querySelector(".dmodal").innerHTML = `
    <div class="dmodal-head">
      <div class="dmodal-title">${id ? "Sửa hợp đồng" : "Hợp đồng mới"}</div>
      <button id="dmClose" class="btn small">Đóng</button>
    </div>
    <div class="dmodal-body dform">
      <div class="fgrid">
        <div><label>Mã HĐ</label><input id="ctCode" value="${esc(v.code || "")}" placeholder="VD: HD-2026-001" /></div>
        <div><label>Trạng thái</label><select id="ctStatus" class="dsel" style="width:100%;height:40px">${statusOptions(CONTRACT_STATUS, v.status)}</select></div>
      </div>
      <label>Tiêu đề</label><input id="ctTitle" value="${esc(v.title || "")}" placeholder="VD: Chụp ảnh cưới" />
      <div class="fgrid">
        <div><label>Tên khách</label><input id="ctName" value="${esc(v.client_name || "")}" /></div>
        <div><label>SĐT khách</label><input id="ctPhone" value="${esc(v.client_phone || "")}" /></div>
      </div>
      <div class="fgrid">
        <div><label>Loại dịch vụ</label><select id="ctShoot" class="dsel" style="width:100%;height:40px">${statusOptions(SHOOT_TYPE, v.shoot_type)}</select></div>
        <div><label>Ngày chụp</label><input id="ctDate" type="date" value="${esc((v.event_date || "").slice(0, 10))}" /></div>
      </div>
      <label>Địa điểm</label><input id="ctLoc" value="${esc(v.location || "")}" />
      <label>Ghi chú</label><input id="ctNote" value="${esc(v.note || "")}" />
      <label style="margin-top:14px">Hạng mục</label>
      <div id="itemsBox" class="items-box"></div>
      <button id="ctAddItem" class="btn small" style="margin-top:8px">＋ Thêm hạng mục</button>
      <div class="dform-actions">
        ${id ? `<button id="ctDelete" class="btn small danger">Xóa HĐ</button>` : ""}
        <button id="ctSave" class="btn small primary" style="margin-left:auto">Lưu</button>
      </div>
    </div>`;
  ov.classList.remove("hidden");
  drawItems();
  const close = () => ov.classList.add("hidden");
  document.getElementById("dmClose").onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  document.getElementById("ctAddItem").onclick = () => { syncItems(); _editItems.push({ id: uuid(), name: "", qty: 1, unit_price: 0 }); drawItems(); };
  if (id) document.getElementById("ctDelete").onclick = async () => {
    if (!confirm("Xóa hợp đồng này và toàn bộ hạng mục?")) return;
    for (const it of T("contract_items").filter((i) => i.contract_id === id)) await window.localMutate("contract_items", "delete", { id: it.id, contract_id: id });
    await window.localMutate("studio_contracts", "delete", { id });
    close();
  };
  document.getElementById("ctSave").onclick = async () => {
    syncItems();
    const title = document.getElementById("ctTitle").value.trim() || "Hợp đồng";
    const cid = id || uuid();
    const crow = {
      id: cid, code: document.getElementById("ctCode").value.trim(), title,
      client_name: document.getElementById("ctName").value.trim(),
      client_phone: document.getElementById("ctPhone").value.trim(),
      shoot_type: document.getElementById("ctShoot").value,
      event_date: document.getElementById("ctDate").value || null,
      location: document.getElementById("ctLoc").value.trim(),
      note: document.getElementById("ctNote").value.trim(),
      status: document.getElementById("ctStatus").value,
    };
    if (!id) crow.client_token = "c" + uuid().replace(/-/g, "").slice(0, 22);
    await window.localMutate("studio_contracts", id ? "update" : "insert", crow);
    const existing = T("contract_items").filter((i) => i.contract_id === cid);
    for (let idx = 0; idx < _editItems.length; idx++) {
      const it = _editItems[idx];
      const row = { id: it.id, contract_id: cid, name: (it.name || "").trim(), qty: Math.round(Number(it.qty) || 0), unit_price: Math.round(Number(it.unit_price) || 0), position: idx };
      await window.localMutate("contract_items", existing.find((e) => e.id === it.id) ? "update" : "insert", row);
    }
    for (const e of existing) if (!_editItems.find((it) => it.id === e.id)) await window.localMutate("contract_items", "delete", { id: e.id, contract_id: cid });
    close();
  };
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
      <div class="row-gap"><button id="dmEdit" class="btn small primary">Sửa</button><button id="dmClose" class="btn small">Đóng</button></div>
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
  document.getElementById("dmEdit").onclick = () => { ov.classList.add("hidden"); openContractEdit(id); };
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
  const bar = `<div class="dbar"><button class="btn small primary" id="addClient">＋ Khách + hợp đồng</button><span class="dcap" style="margin:0">${rows.length} khách hàng</span></div>`;
  if (!rows.length) return bar + empty(dataQuery ? "Không có khách hàng khớp." : "Khách hàng hình thành từ hợp đồng. Bấm ＋ để tạo hợp đồng cho khách mới.");
  const body = rows.map((c) => `<tr data-client="${esc(c.name)}|${esc(c.phone)}" class="clickable"><td>${esc(c.name)}</td><td>${esc(c.phone)}</td><td class="r">${c.n}</td><td class="r">${vnd(c.spent)}</td><td>${D(c.last)}</td></tr>`).join("");
  return bar + table(["Tên khách", "SĐT", "Số HĐ", "Tổng chi", "Gần nhất"], body, "");
}

// Chi tiết khách: các hợp đồng + tổng chi + tạo HĐ mới cho khách này.
function openClient(name, phone) {
  const dg = digits(phone);
  const cs = T("studio_contracts").filter((c) => (dg && digits(c.client_phone) === dg) || (!dg && (c.client_name || "") === name))
    .sort((a, b) => String(b.event_date || b.created_at || "").localeCompare(String(a.event_date || a.created_at || "")));
  const total = cs.reduce((s, c) => s + contractTotal(c.id), 0);
  const paid = cs.reduce((s, c) => s + contractPaid(c.id), 0);
  const ov = document.getElementById("dataModal");
  ov.querySelector(".dmodal").innerHTML = `
    <div class="dmodal-head">
      <div><div class="dmodal-title">${esc(name || "Khách hàng")}</div><div class="muted">${esc(phone || "")} · ${cs.length} hợp đồng</div></div>
      <div class="row-gap"><button id="clNew" class="btn small primary">Tạo HĐ</button><button id="dmClose" class="btn small">Đóng</button></div>
    </div>
    <div class="dmodal-body">
      <p class="dtotals"><b>Tổng giá trị:</b> ${vnd(total)} · <b>Đã thu:</b> ${vnd(paid)} · <b>Còn:</b> ${vnd(Math.max(0, total - paid))}</p>
      ${cs.length ? `<table class="dtable"><thead><tr><th>Mã</th><th>Hợp đồng</th><th>Ngày</th><th>Trạng thái</th><th class="r">Giá trị</th></tr></thead><tbody>${cs.map((c) => `<tr data-open-contract="${c.id}" class="clickable"><td>${esc(c.code || "")}</td><td>${esc(c.title || "")}</td><td>${D(c.event_date)}</td><td>${CONTRACT_STATUS[c.status] || c.status || ""}</td><td class="r">${vnd(contractTotal(c.id))}</td></tr>`).join("")}</tbody></table>` : `<p class="muted">Chưa có hợp đồng.</p>`}
    </div>`;
  ov.classList.remove("hidden");
  const close = () => ov.classList.add("hidden");
  document.getElementById("dmClose").onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  document.getElementById("clNew").onclick = () => { close(); openContractEdit(null, { client_name: name, client_phone: phone }); };
  ov.querySelectorAll("[data-open-contract]").forEach((r) => r.onclick = () => { close(); openContract(r.dataset.openContract); });
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
  const body = rows.map((w) => `<tr data-crew="${w.id}" class="clickable"><td>${esc(w.name)}</td><td>${esc(w.role || "")}</td><td>${esc(w.c?.code || "")}</td><td>${D(w.c?.event_date)}</td><td class="r">${vnd(w.salary)}</td><td>${w.paid ? "<span class='badge ok'>Đã trả</span>" : "<span class='badge warn'>Chưa</span>"}</td></tr>`).join("");
  return `<div class="dcap">${rows.length} dòng · tổng ${vnd(total)} · chưa trả ${vnd(unpaid)}</div>` + table(["Tên", "Vai trò", "Mã HĐ", "Ngày chụp", "Lương", "Trạng thái"], body, "");
}

// Sửa lương / đánh dấu đã trả — chạy cục bộ (bảng con contract_crew).
function openCrew(id) {
  const w = T("contract_crew").find((x) => x.id === id);
  if (!w) return;
  const c = T("studio_contracts").find((x) => x.id === w.contract_id);
  const ov = document.getElementById("dataModal");
  ov.querySelector(".dmodal").innerHTML = `
    <div class="dmodal-head">
      <div><div class="dmodal-title">${esc(w.name || "Thợ")}</div><div class="muted">${esc(w.role || "")} · ${esc(c?.code || "")}</div></div>
      <button id="dmClose" class="btn small">Đóng</button>
    </div>
    <div class="dmodal-body dform">
      <label>Lương (VND)</label><input id="crSalary" type="number" value="${esc(w.salary ?? 0)}" />
      <label style="display:flex;align-items:center;gap:8px;margin-top:14px"><input id="crPaid" type="checkbox" ${w.paid ? "checked" : ""} style="width:auto;height:auto" /> Đã trả lương</label>
      <div class="dform-actions"><button id="crSave" class="btn small primary" style="margin-left:auto">Lưu</button></div>
    </div>`;
  ov.classList.remove("hidden");
  const close = () => ov.classList.add("hidden");
  document.getElementById("dmClose").onclick = close;
  ov.onclick = (e) => { if (e.target === ov) close(); };
  document.getElementById("crSave").onclick = async () => {
    const paid = document.getElementById("crPaid").checked;
    const row = { id, contract_id: w.contract_id, salary: Math.round(Number(document.getElementById("crSalary").value) || 0), paid, paid_at: paid ? (w.paid_at || new Date().toISOString().slice(0, 10)) : null };
    await window.localMutate("contract_crew", "update", row);
    close();
  };
}

function renderCalendar() {
  const ev = T("studio_events").map((e) => ({ id: e.id, d: e.event_date, t: e.event_time, title: e.title, note: e.note, kind: "event" }));
  const bk = T("studio_bookings").map((b) => ({ id: b.id, d: b.preferred_date, t: "", title: `${b.name || ""} · ${b.service || ""}`, status: b.status, kind: "booking" }));
  let rows = [...ev, ...bk].filter((r) => r.d).filter((r) => match(r, [r.title, r.note]));
  rows.sort((a, b) => String(b.d).localeCompare(String(a.d)));
  const bar = `<div class="dbar"><button class="btn small primary" id="addEvent">＋ Thêm lịch</button><span class="dcap" style="margin:0">${rows.length} mục</span></div>`;
  if (!rows.length) return bar + empty(dataQuery ? "Không có lịch khớp." : "Chưa có lịch. Bấm ＋ để thêm.");
  const body = rows.map((r) => {
    const right = r.kind === "booking"
      ? `<select class="dsel" data-status-booking="${r.id}">${statusOptions(BOOKING_STATUS, r.status)}</select>`
      : `<button class="btn small" data-event="${r.id}">Sửa</button>`;
    return `<tr><td>${D(r.d)}${r.t ? " · " + esc(r.t) : ""}</td><td><span class="badge">${r.kind === "booking" ? "Đặt lịch" : "Lịch"}</span></td><td>${esc(r.title)}</td><td style="text-align:right">${right}</td></tr>`;
  }).join("");
  return bar + table(["Ngày", "Loại", "Nội dung", ""], body, "");
}

// Thêm/sửa mục lịch (studio_events) — chạy cục bộ.
function openEvent(id) {
  const e = id ? T("studio_events").find((x) => x.id === id) : null;
  const v = e || { event_date: new Date().toISOString().slice(0, 10), title: "", event_time: "", note: "" };
  const ov = document.getElementById("dataModal");
  ov.querySelector(".dmodal").innerHTML = `
    <div class="dmodal-head">
      <div class="dmodal-title">${id ? "Sửa lịch" : "Thêm lịch"}</div>
      <button id="dmClose" class="btn small">Đóng</button>
    </div>
    <div class="dmodal-body dform">
      <label>Ngày</label><input id="evDate" type="date" value="${esc((v.event_date || "").slice(0, 10))}" />
      <label>Giờ (không bắt buộc)</label><input id="evTime" type="text" value="${esc(v.event_time || "")}" placeholder="VD: 08:00" />
      <label>Nội dung</label><input id="evTitle" type="text" value="${esc(v.title || "")}" placeholder="VD: Chụp ngoại cảnh" />
      <label>Ghi chú</label><input id="evNote" type="text" value="${esc(v.note || "")}" />
      <div class="dform-actions">
        ${id ? `<button id="evDelete" class="btn small danger">Xóa</button>` : ""}
        <button id="evSave" class="btn small primary" style="margin-left:auto">Lưu</button>
      </div>
    </div>`;
  ov.classList.remove("hidden");
  const close = () => ov.classList.add("hidden");
  document.getElementById("dmClose").onclick = close;
  ov.onclick = (ev2) => { if (ev2.target === ov) close(); };
  document.getElementById("evSave").onclick = async () => {
    const title = document.getElementById("evTitle").value.trim();
    if (!title) { document.getElementById("evTitle").focus(); return; }
    const row = { id: id || uuid(), title, event_date: document.getElementById("evDate").value || new Date().toISOString().slice(0, 10), event_time: document.getElementById("evTime").value.trim(), note: document.getElementById("evNote").value.trim(), remind: true };
    await window.localMutate("studio_events", id ? "update" : "insert", row);
    close();
  };
  if (id) document.getElementById("evDelete").onclick = async () => {
    if (!confirm("Xóa mục lịch này?")) return;
    await window.localMutate("studio_events", "delete", { id });
    close();
  };
}

function table(cols, body, caption) {
  return `<div class="dcap">${caption}</div><div class="dtable-wrap"><table class="dtable"><thead><tr>${cols.map((c, i) => `<th class="${i >= cols.length - 1 || /Giá|tiền|Lương|Tổng|thu|SL/.test(c) ? "" : ""}">${c}</th>`).join("")}</tr></thead><tbody>${body}</tbody></table></div>`;
}

/* MStudo Desktop — engine đồng bộ.
 * - Hợp đồng: tải bù từ mốc lần-đồng-bộ-cuối, mỗi hợp đồng 1 thư mục
 *   "Hop dong {mã} - {tên} - {SĐT}", lưu PDF (qua Edge headless) + Word;
 *   hợp đồng sửa/ký lại → lưu BẢN MỚI, không ghi đè.
 * - Excel: xuất mỗi mảng 1 file, hằng ngày + khi mở app; SaoLuu JSON đầy đủ;
 *   tự dọn file cũ hơn 30 ngày (không đụng thư mục hợp đồng).
 */

const invoke = window.__TAURI__.core.invoke;

const APP_VERSION = "0.2.1"; // giữ khớp với src-tauri/tauri.conf.json

// ─── Cấu hình (localStorage) ─────────────────────────────────────────────────
const cfg = JSON.parse(localStorage.getItem("cfg") || "{}");
const saveCfg = () => localStorage.setItem("cfg", JSON.stringify(cfg));

const SYNC_EVERY_MS = 3 * 60 * 1000;     // đồng bộ hợp đồng mỗi 3 phút
const KEEP_DAYS = 30;                     // giữ file xuất 30 ngày
const EXPORTS = [
  ["customers", "KhachHang"], ["quotes", "BaoGia"], ["expenses", "ChiTieu"],
  ["payroll", "Luong"], ["bookings", "LichHen"], ["staff", "NhanVien"],
];

// ─── Tiện ích ────────────────────────────────────────────────────────────────
const $ = (id) => document.getElementById(id);
const b64ToText = (b64) => new TextDecoder("utf-8").decode(Uint8Array.from(atob(b64), (c) => c.charCodeAt(0)));
const textToB64 = (t) => {
  const bytes = new TextEncoder().encode(t);
  let bin = "";
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode(...bytes.subarray(i, i + 0x8000));
  return btoa(bin);
};
const join = (...parts) => parts.filter(Boolean).join("\\").replace(/[\\/]+/g, "\\");
const cachePath = () => join(cfg.dir, "_offline-cache.json");
// Mốc cập nhật cache (cho trình duyệt dữ liệu offline hiển thị).
window.cacheStamp = () => (cfg.lastCache ? fmtTime(cfg.lastCache) : "chưa tải");
const today = () => new Date().toISOString().slice(0, 10);
const fmtTime = (iso) => {
  if (!iso) return "—";
  const d = new Date(iso);
  const p = (n) => String(n).padStart(2, "0");
  return `${p(d.getDate())}/${p(d.getMonth() + 1)}/${d.getFullYear()} ${p(d.getHours())}:${p(d.getMinutes())}`;
};

function log(msg, kind = "") {
  const item = { t: new Date().toISOString(), msg, kind };
  const list = JSON.parse(localStorage.getItem("log") || "[]");
  list.unshift(item);
  localStorage.setItem("log", JSON.stringify(list.slice(0, 100)));
  renderLog();
}
function renderLog() {
  const list = JSON.parse(localStorage.getItem("log") || "[]");
  $("log").innerHTML = list
    .map((l) => `<li><span class="t">${fmtTime(l.t)}</span><span class="${l.kind}">${l.msg.replace(/</g, "&lt;")}</span></li>`)
    .join("");
}

// ─── Gọi API mstudo (qua Rust để tránh CORS) ─────────────────────────────────
async function api(path) {
  const r = await invoke("http_get", { url: cfg.server + path, token: cfg.token });
  if (r.status === 401) { onRevoked(); throw new Error("device_revoked"); }
  if (r.status === 402) { setPlanLocked(true); throw new Error("plan_expired"); }
  if (r.status >= 400) {
    let detail = "";
    try { detail = JSON.parse(b64ToText(r.body_b64)).error || ""; } catch { /* body không phải JSON */ }
    throw new Error("HTTP " + r.status + (detail ? " · " + detail : ""));
  }
  setPlanLocked(false);
  return r;
}
const apiJson = async (path) => JSON.parse(b64ToText((await api(path)).body_b64));
const apiB64 = async (path) => (await api(path)).body_b64;

// ─── Màn hình ────────────────────────────────────────────────────────────────
function show(screen) {
  for (const s of ["setup", "folder", "main"]) $("screen-" + s).classList.toggle("hidden", s !== screen);
  $("topStatus").innerHTML = cfg.token ? `<span class="ok">● Đã kết nối</span> ${cfg.server || ""}` : "Chưa kết nối";
  // Nút "Mở ứng dụng quản lý" trên header chỉ hiện khi đã ở màn trạng thái.
  $("btnOpenAppTop").classList.toggle("hidden", screen !== "main");
}
function setPlanLocked(locked) {
  $("planBanner").classList.toggle("hidden", !locked);
}
function refreshStats() {
  $("stSync").textContent = fmtTime(cfg.lastSync);
  $("stContracts").textContent = String(Object.keys(cfg.saved || {}).length);
  $("stExport").textContent = cfg.lastExportDate || "—";
  $("mainFolderPath").textContent = cfg.dir || "";
  $("deviceInfo").textContent = `${cfg.deviceName || "Máy tính Windows"} · máy chủ ${cfg.server || ""}`;
}

// ─── Màn 1: Kết nối ──────────────────────────────────────────────────────────
$("btnConnect").onclick = async () => {
  const server = $("inServer").value.trim().replace(/\/+$/, "");
  const token = $("inToken").value.trim();
  const msg = $("setupMsg");
  msg.className = "msg";
  if (!/^https?:\/\//.test(server)) { msg.className = "msg err"; msg.textContent = "Địa chỉ máy chủ chưa đúng (bắt đầu bằng https://)."; return; }
  if (!token.startsWith("msd_")) { msg.className = "msg err"; msg.textContent = "Mã kết nối chưa đúng (bắt đầu bằng msd_)."; return; }
  msg.textContent = "Đang kiểm tra kết nối…";
  try {
    const r = await invoke("http_get", { url: `${server}/api/desktop/contracts?since=${encodeURIComponent(new Date().toISOString())}`, token });
    if (r.status === 401) throw new Error("Mã kết nối không hợp lệ hoặc thiết bị đã bị thu hồi.");
    if (r.status === 402) throw new Error("Gói Studio của tài khoản đã hết hạn.");
    if (r.status >= 400) throw new Error("Máy chủ trả lỗi HTTP " + r.status);
    cfg.server = server; cfg.token = token;
    cfg.deviceName = await invoke("hostname").catch(() => "Máy tính Windows");
    saveCfg();
    msg.className = "msg ok"; msg.textContent = "Kết nối thành công!";
    log("Kết nối thiết bị thành công");
    show("folder");
  } catch (e) {
    msg.className = "msg err";
    msg.textContent = e.message || "Không kết nối được — kiểm tra mạng và thử lại.";
  }
};

// ─── Màn 2: Chọn thư mục ─────────────────────────────────────────────────────
$("btnPickFolder").onclick = async () => {
  const p = await invoke("pick_folder");
  if (!p) return;
  $("folderPath").textContent = p;
  $("btnFolderNext").disabled = false;
};
$("btnFolderNext").onclick = async () => {
  const p = $("folderPath").textContent;
  if (!p || p === "Chưa chọn thư mục") return;
  cfg.dir = p; cfg.saved = cfg.saved || {}; saveCfg();
  log("Đã chọn thư mục lưu: " + p);
  show("main"); refreshStats(); renderLog(); showSub("data");
  bootSync(true); // lần đầu: tải TOÀN BỘ hợp đồng đã ký + xuất đủ bộ Excel
};

// ─── Mở ứng dụng quản lý studio đầy đủ ───────────────────────────────────────
// Mở trong TRÌNH DUYỆT MẶC ĐỊNH (Chrome/Edge) — nơi đã có sẵn phiên đăng nhập,
// nên mọi tính năng chạy đúng. (Webview nhúng có phiên riêng chưa đăng nhập nên
// bị lớp phủ mờ chặn thao tác — nên không dùng cách nhúng nữa.)
function openStudioApp() {
  if (!cfg.server) return;
  invoke("open_url", { url: cfg.server + "/dashboard/studio" }).catch((e) => log("Không mở được ứng dụng: " + e, "err"));
}
$("btnOpenApp").onclick = openStudioApp;
$("btnOpenAppTop").onclick = openStudioApp;

// Chuyển tab con: Dữ liệu (offline) ↔ Sao lưu & thiết bị.
function showSub(sub) {
  $("sub-data").classList.toggle("hidden", sub !== "data");
  $("sub-backup").classList.toggle("hidden", sub !== "backup");
  $("subData").classList.toggle("on", sub === "data");
  $("subBackup").classList.toggle("on", sub === "backup");
  if (sub === "data" && typeof renderData === "function") renderData();
}
$("subData").onclick = () => showSub("data");
$("subBackup").onclick = () => showSub("backup");
// "Tải dữ liệu mới": làm mới cache offline (dùng lại luồng xuất/sao lưu).
$("btnRefreshData").onclick = () => runExports(true);

// ─── Màn 3: hành động ────────────────────────────────────────────────────────
$("btnSyncNow").onclick = () => runSync(true);
$("btnExportNow").onclick = () => runExports(true);
$("btnOpenFolder").onclick = () => invoke("open_folder", { path: cfg.dir }).catch(() => {});
$("btnChangeFolder").onclick = async () => {
  const p = await invoke("pick_folder");
  if (!p || p === cfg.dir) return;
  const move = confirm("Di chuyển toàn bộ dữ liệu đã lưu sang thư mục mới?\n\nOK = di chuyển · Cancel = giữ nguyên dữ liệu cũ, chỉ lưu mới vào vị trí mới");
  if (move) {
    try {
      for (const sub of ["HopDong", "SaoLuu", ...EXPORTS.map(([, f]) => f)]) {
        if (await invoke("path_exists", { path: join(cfg.dir, sub) })) {
          await invoke("move_dir", { from: join(cfg.dir, sub), to: join(p, sub) });
        }
      }
      log("Đã di chuyển dữ liệu sang " + p);
    } catch (e) { log("Lỗi di chuyển dữ liệu: " + e, "err"); }
  }
  cfg.dir = p; saveCfg(); refreshStats();
  log("Đổi thư mục lưu thành " + p);
};
$("btnDisconnect").onclick = () => {
  if (!confirm("Ngắt kết nối thiết bị này? Dữ liệu đã lưu trên máy vẫn giữ nguyên.")) return;
  localStorage.removeItem("cfg");
  location.reload();
};
function onRevoked() {
  log("Thiết bị đã bị thu hồi từ trang quản trị — cần kết nối lại.", "err");
  delete cfg.token; saveCfg();
  show("setup");
}

// ─── Đồng bộ hợp đồng ────────────────────────────────────────────────────────
let syncing = false;
async function runSync(manual = false) {
  if (syncing || !cfg.token || !cfg.dir) return;
  syncing = true;
  try {
    const since = cfg.lastSync ? `?since=${encodeURIComponent(cfg.lastSync)}` : "";
    const r = await apiJson(`/api/desktop/contracts${since}`);
    if (r.contracts.length) log(`Có ${r.contracts.length} hợp đồng cần lưu…`);
    else if (manual) log("Không có hợp đồng mới.");
    let okAll = true;
    for (const c of r.contracts) {
      try { await saveContract(c); }
      catch (e) { okAll = false; log(`Lỗi lưu HĐ ${c.code || c.id}: ${e.message || e}`, "err"); }
    }
    // Chỉ dời mốc khi mọi hợp đồng lưu xong — hợp đồng lỗi sẽ được thử lại lần sau.
    if (okAll) { cfg.lastSync = r.now; saveCfg(); }
    refreshStats();
  } catch (e) {
    if (manual) log("Không đồng bộ được: " + (e.message || e), "err");
  }
  syncing = false;
}

async function saveContract(c) {
  const meta = await apiJson(`/api/desktop/contracts/${c.id}`);
  const folderRel = join("HopDong", meta.file_base);
  const manifestPath = join(cfg.dir, folderRel, "mstudo.json");
  let man = { updated_at: null, versions: [] };
  try { man = JSON.parse(await invoke("read_text", { path: manifestPath })); } catch { /* chưa có */ }
  if (man.updated_at === c.updated_at) return; // bản này đã lưu rồi

  // Bản mới khi sửa/ký lại: "(ban 2 - 2026-07-10)", bản đầu không hậu tố.
  const ver = (man.versions || []).length;
  const suffix = ver === 0 ? "" : ` (ban ${ver + 1} - ${today()})`;
  const baseRel = join(folderRel, meta.file_base + suffix);

  // Word
  const docx = await apiB64(`/api/desktop/contracts/${c.id}?format=docx`);
  await invoke("write_file_b64", { path: join(cfg.dir, baseRel + ".docx"), contentsB64: docx });

  // PDF: HTML bản in → Edge headless. Không có Edge → giữ file HTML làm dự phòng.
  const html = await apiB64(`/api/desktop/contracts/${c.id}?format=html`);
  const htmlTmp = join(cfg.dir, folderRel, "~print.html");
  await invoke("write_file_b64", { path: htmlTmp, contentsB64: html });
  try {
    await invoke("edge_pdf", { htmlPath: htmlTmp, pdfPath: join(cfg.dir, baseRel + ".pdf") });
    await invoke("delete_file", { path: htmlTmp }).catch(() => {});
  } catch {
    await invoke("write_file_b64", { path: join(cfg.dir, baseRel + ".html"), contentsB64: html });
    await invoke("delete_file", { path: htmlTmp }).catch(() => {});
    log(`Không tìm thấy Microsoft Edge — HĐ ${c.code || ""} lưu bản HTML thay PDF.`, "warn");
  }

  man.updated_at = c.updated_at;
  man.versions = [...(man.versions || []), { at: c.updated_at, saved: new Date().toISOString(), file: meta.file_base + suffix }];
  await invoke("write_file_b64", { path: manifestPath, contentsB64: textToB64(JSON.stringify(man, null, 2)) });
  cfg.saved = cfg.saved || {}; cfg.saved[c.id] = c.updated_at; saveCfg();
  log(`Đã lưu hợp đồng: ${meta.file_base}${suffix}`);
}

// ─── Xuất Excel + sao lưu JSON ───────────────────────────────────────────────
let exporting = false;
async function runExports(manual = false) {
  if (exporting || !cfg.token || !cfg.dir) return;
  exporting = true;
  try {
    for (const [type, folder] of EXPORTS) {
      const b64 = await apiB64(`/api/desktop/export?type=${type}`);
      await invoke("write_file_b64", { path: join(cfg.dir, folder, `${folder}_${today()}.xlsx`), contentsB64: b64 });
    }
    const backup = await apiB64(`/api/desktop/export?type=backup`);
    await invoke("write_file_b64", { path: join(cfg.dir, "SaoLuu", `mstudo-backup-${today()}.json`), contentsB64: backup });
    // Cache ổn định để trình duyệt dữ liệu offline đọc + nạp vào bộ nhớ ngay.
    await invoke("write_file_b64", { path: cachePath(), contentsB64: backup });
    setData(JSON.parse(b64ToText(backup)));
    cfg.lastCache = new Date().toISOString(); saveCfg();
    // Dọn file cũ hơn 30 ngày (KHÔNG đụng thư mục HopDong).
    for (const [, folder] of [...EXPORTS, ["", "SaoLuu"]]) {
      await invoke("cleanup_old", { dir: join(cfg.dir, folder), days: KEEP_DAYS }).catch(() => {});
    }
    cfg.lastExportDate = today(); saveCfg(); refreshStats();
    log("Đã xuất Excel + cập nhật dữ liệu offline.");
  } catch (e) {
    if (manual) log("Không xuất được dữ liệu: " + (e.message || e), "err");
  }
  exporting = false;
}

// ─── Kiểm tra bản cập nhật (khi mở app + mỗi ngày) ──────────────────────────
const verNewer = (a, b) => { // a > b ?
  const pa = String(a).split(".").map(Number), pb = String(b).split(".").map(Number);
  for (let i = 0; i < 3; i++) { if ((pa[i] || 0) > (pb[i] || 0)) return true; if ((pa[i] || 0) < (pb[i] || 0)) return false; }
  return false;
};
async function checkUpdate() {
  try {
    const r = await invoke("http_get", { url: cfg.server + "/api/desktop/version", token: null });
    if (r.status !== 200) return;
    const v = JSON.parse(b64ToText(r.body_b64));
    if (v.version && v.url && verNewer(v.version, APP_VERSION)) {
      $("updateText").textContent = `Đã có phiên bản ${v.version}${v.note ? " — " + v.note : ""} (bạn đang dùng ${APP_VERSION}).`;
      $("updateBanner").classList.remove("hidden");
      $("btnUpdate").onclick = () => invoke("open_url", { url: v.url }).catch(() => {});
    }
  } catch { /* mạng lỗi — thử lại lần sau */ }
}

// ─── Lịch chạy ───────────────────────────────────────────────────────────────
function bootSync(first = false) {
  runSync(first);
  if (cfg.lastExportDate !== today()) runExports(); // xuất bù khi mở app
  checkUpdate();
  setInterval(() => runSync(false), SYNC_EVERY_MS);
  setInterval(() => { if (cfg.lastExportDate !== today()) runExports(); }, 10 * 60 * 1000);
  setInterval(checkUpdate, 24 * 3600 * 1000);
}

// Nạp cache dữ liệu offline từ đĩa (để xem ngay khi mở app, kể cả chưa có mạng).
async function loadCacheFromDisk() {
  try {
    const t = await invoke("read_text", { path: cachePath() });
    setData(JSON.parse(t));
  } catch { /* chưa có cache */ }
}

// ─── Khởi động ───────────────────────────────────────────────────────────────
(async function init() {
  renderLog();
  if (!cfg.token) { show("setup"); return; }
  if (!cfg.dir) { show("folder"); return; }
  show("main"); refreshStats();
  await loadCacheFromDisk();  // hiển thị dữ liệu offline ngay lập tức
  showSub("data");            // mặc định mở tab Dữ liệu
  bootSync(false);
})();

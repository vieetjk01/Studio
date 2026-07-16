/* MStudo Desktop — engine đồng bộ.
 * - Hợp đồng: tải bù từ mốc lần-đồng-bộ-cuối, mỗi hợp đồng 1 thư mục
 *   "Hop dong {mã} - {tên} - {SĐT}", lưu PDF (qua Edge headless) + Word;
 *   hợp đồng sửa/ký lại → lưu BẢN MỚI, không ghi đè.
 * - Excel: xuất mỗi mảng 1 file, hằng ngày + khi mở app; SaoLuu JSON đầy đủ;
 *   tự dọn file cũ hơn 30 ngày (không đụng thư mục hợp đồng).
 */

const invoke = window.__TAURI__.core.invoke;

const APP_VERSION = "0.2.0"; // giữ khớp với src-tauri/tauri.conf.json

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
  const st = $("topStatus"); if (st) st.innerHTML = cfg.token ? `<span class="ok">● Đã kết nối</span> ${cfg.server || ""}` : "Chưa kết nối";
  // Màn chính có sidebar riêng (brand ở đó) → ẩn thanh tiêu đề trên cùng.
  const tb = $("topbar"); if (tb) tb.classList.toggle("hidden", screen === "main");
}
function setPlanLocked(locked) {
  $("planBanner").classList.toggle("hidden", !locked);
}
function refreshStats() {
  $("stSync").textContent = fmtTime(cfg.lastSync);
  $("stContracts").textContent = String(Object.keys(cfg.saved || {}).length);
  $("stExport").textContent = cfg.lastExportDate || "—";
  { const sd = $("stDrive"); if (sd) sd.textContent = fmtTime(cfg.lastDriveSync); }
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
  show("main"); refreshStats(); renderLog(); gotoNav("overview");
  bootSync(true); // lần đầu: tải TOÀN BỘ hợp đồng đã ký + xuất đủ bộ Excel
};

// ─── Mở TOÀN BỘ ứng dụng quản lý NGAY TRONG CLIENT (cửa sổ nhúng phóng to) ────
// Cửa sổ nhúng chính là web app thật → giao diện & tính năng y hệt. Đăng nhập
// một lần trong cửa sổ đó; phiên được lưu lại cho các lần sau.
function openStudioApp() {
  if (!cfg.server) return;
  invoke("open_app", { url: cfg.server + "/dashboard/studio" }).catch((e) => log("Không mở được ứng dụng: " + e, "err"));
}
// Dự phòng: mở trong trình duyệt ngoài (nếu cửa sổ nhúng gặp sự cố).
function openStudioBrowser() {
  if (!cfg.server) return;
  invoke("open_url", { url: cfg.server + "/dashboard/studio" }).catch(() => {});
}
$("btnOpenApp").onclick = openStudioApp;
const _obb = $("btnOpenAppBrowser"); if (_obb) _obb.onclick = (e) => { e.preventDefault(); openStudioBrowser(); };

// ─── Menu trái: điều hướng giữa các mục dữ liệu + Sao lưu & thiết bị ─────────
const NAV_TITLE = {
  overview: "Tổng quan", contracts: "Hợp đồng", quotes: "Báo giá", clients: "Khách hàng",
  pricelist: "Bảng giá", services: "Dịch vụ & điều khoản", equipment: "Thiết bị",
  expenses: "Thu chi", payroll: "Lương", calendar: "Lịch & đặt lịch", backup: "Sao lưu & thiết bị",
};
function gotoNav(nav) {
  document.querySelectorAll("#sideNav .side-item").forEach((b) => b.classList.toggle("on", b.dataset.nav === nav));
  const title = $("pageTitle"); if (title) title.textContent = NAV_TITLE[nav] || "";
  if (nav === "backup") { showSub("backup"); return; }
  showSub("data");
  if (typeof gotoTab === "function") gotoTab(nav); // đặt tab dữ liệu + vẽ lại
}
function showSub(sub) {
  $("sub-data").classList.toggle("hidden", sub !== "data");
  $("sub-backup").classList.toggle("hidden", sub !== "backup");
}
document.querySelectorAll("#sideNav .side-item").forEach((b) => b.onclick = () => gotoNav(b.dataset.nav));
// "Tải dữ liệu mới": làm mới cache offline (dùng lại luồng xuất/sao lưu).
$("btnRefreshData").onclick = () => runExports(true);
// Kiểm tra cập nhật thủ công (phòng khi app chưa tự báo).
{ const b = $("btnCheckUpdate"); if (b) b.onclick = () => checkUpdate(true); }
{ const v = $("appVer"); if (v) v.textContent = "Phiên bản " + APP_VERSION + " (beta)"; }

// ─── Màn 3: hành động ────────────────────────────────────────────────────────
$("btnSyncNow").onclick = () => runSync(true);
$("btnExportNow").onclick = () => runExports(true);
{ const b = $("btnDriveSync"); if (b) b.onclick = () => runDriveSync(true); }
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

// ─── Đồng bộ ảnh/video hợp đồng lên Google Drive (1 chiều: máy → Drive) ───────
// Khi hợp đồng đã ký: tạo cây thư mục trên máy (Photo/JPG Goc,Raw,File ChinhSua
// + Video nếu có quay) khớp cây trên Drive studio, rồi tải file MỚI lên. Server
// tự tạo "JPG Goc" → album chọn ảnh, "File ChinhSua" → gallery giao khách.
const DRIVE_SYNC_EVERY_MS = 5 * 60 * 1000;
let driveSyncing = false;
let driveTok = { v: null, exp: 0 };
let driveWarned = false;

const MIME_BY_EXT = {
  jpg: "image/jpeg", jpeg: "image/jpeg", png: "image/png", webp: "image/webp",
  gif: "image/gif", heic: "image/heic", tif: "image/tiff", tiff: "image/tiff",
  mp4: "video/mp4", mov: "video/quicktime", avi: "video/x-msvideo",
  mkv: "video/x-matroska", m4v: "video/x-m4v", webm: "video/webm",
};
const guessMime = (name) => MIME_BY_EXT[(name.split(".").pop() || "").toLowerCase()] || "application/octet-stream";
const safeJson = (b64) => { try { return JSON.parse(b64ToText(b64)); } catch { return {}; } };

// Access token tạm (server cấp) để tải file thẳng lên Drive; cache tới gần hết hạn.
async function getDriveToken() {
  const now = Date.now();
  if (driveTok.v && now < driveTok.exp - 60000) return driveTok.v;
  const r = await invoke("http_get", { url: cfg.server + "/api/desktop/drive/token", token: cfg.token });
  if (r.status === 409) return null;            // chưa kết nối Drive
  if (r.status >= 400) throw new Error("token HTTP " + r.status);
  const j = safeJson(r.body_b64);
  driveTok = { v: j.access_token, exp: j.expiry || now + 50 * 60 * 1000 };
  return driveTok.v;
}

// Tạo cây thư mục Drive + album cho 1 hợp đồng; resync=true → đồng bộ lại ảnh album.
async function prepareContract(id, resync = false) {
  const r = await invoke("http_post", { url: cfg.server + "/api/desktop/drive/prepare", token: cfg.token, bodyJson: JSON.stringify({ contractId: id, resync }) });
  if (r.status === 409) return { skip: safeJson(r.body_b64).error || "not_connected" };
  if (r.status >= 400) throw new Error("prepare HTTP " + r.status);
  return safeJson(r.body_b64);
}

async function runDriveSync(manual = false) {
  if (driveSyncing || !cfg.token || !cfg.dir) return;
  driveSyncing = true;
  try {
    let token;
    try { token = await getDriveToken(); } catch { token = null; }
    if (!token) {
      if (manual || !driveWarned) { log("Chưa kết nối Google Drive — vào mstudo (web) › MStudo Desktop để kết nối.", "warn"); driveWarned = true; }
      driveSyncing = false; return;
    }
    driveWarned = false;
    const list = await apiJson("/api/desktop/contracts"); // mặc định: hợp đồng đã ký
    let uploaded = 0;
    for (const c of list.contracts || []) {
      try { uploaded += await driveSyncContract(c); }
      catch (e) { if (manual) log(`Lỗi đồng bộ ảnh HĐ ${c.code || c.id}: ${e.message || e}`, "err"); }
    }
    cfg.lastDriveSync = new Date().toISOString(); saveCfg();
    if (manual) log(uploaded ? `Đã tải ${uploaded} file lên Drive.` : "Không có file mới để tải lên Drive.");
    refreshStats();
  } catch (e) {
    if (manual) log("Không đồng bộ được Drive: " + (e.message || e), "err");
  }
  driveSyncing = false;
}

async function driveSyncContract(c) {
  const plan = await prepareContract(c.id, false);
  if (plan.skip) throw new Error(plan.skip);
  const base = join(cfg.dir, "HopDong", plan.folderName);
  const manPath = join(base, "mstudo-drive.json");
  let man = { folderId: plan.folderId, uploaded: {} };
  try { man = JSON.parse(await invoke("read_text", { path: manPath })); } catch { /* chưa có */ }
  man.uploaded = man.uploaded || {};

  // Tạo thư mục local cho MỌI nút (kể cả loại trừ — để studio bỏ ảnh/raw vào).
  for (const node of plan.tree) {
    await invoke("create_dir", { path: join(base, node.path.replace(/\//g, "\\")) }).catch(() => {});
  }

  let uploaded = 0, needResync = false;
  for (const node of plan.tree) {
    if (node.excluded) continue; // thư mục loại trừ (VD Raw, Video gốc) → chỉ giữ ở máy
    const localDir = join(base, node.path.replace(/\//g, "\\"));
    let entries = [];
    try { entries = await invoke("list_dir", { path: localDir }); } catch { entries = []; }
    for (const e of entries) {
      if (e.is_dir || e.name.startsWith("~") || e.name.startsWith(".")) continue;
      const key = node.path + "/" + e.name;
      const prev = man.uploaded[key];
      if (prev && prev.size === e.size && prev.mtime === e.mtime_ms) continue; // đã tải, không đổi
      const token = await getDriveToken();
      if (!token) throw new Error("not_connected");
      const res = await invoke("drive_upload", { accessToken: token, folderId: node.id, filePath: join(localDir, e.name), name: e.name, mime: guessMime(e.name) });
      man.uploaded[key] = { size: e.size, mtime: e.mtime_ms, id: res.id };
      uploaded++;
      if (node.role === "selection" || node.role === "delivery") needResync = true;
    }
  }
  await invoke("write_file_b64", { path: manPath, contentsB64: textToB64(JSON.stringify(man, null, 2)) }).catch(() => {});
  // Có file mới vào JPG Goc / File ChinhSua → đồng bộ lại danh sách ảnh của album.
  if (needResync) { try { await prepareContract(c.id, true); } catch { /* thử lại lần sau */ } }
  return uploaded;
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

// ─── Ghi cục bộ + đồng bộ ngầm (các module chạy local trong client) ──────────
// Thao tác tạo/sửa/xóa áp dụng NGAY vào dữ liệu trên máy (tức thì) rồi xếp hàng
// gửi lên server. Mất mạng vẫn lưu được, có mạng tự đồng bộ lại.
const uuid = () => (crypto.randomUUID ? crypto.randomUUID()
  : "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => { const r = Math.random() * 16 | 0; return (c === "x" ? r : (r & 0x3 | 0x8)).toString(16); }));
const loadQueue = () => { try { return JSON.parse(localStorage.getItem("mstudo_pending") || "[]"); } catch { return []; } };
const saveQueue = (q) => { try { localStorage.setItem("mstudo_pending", JSON.stringify(q)); } catch { /* */ } };

// Áp thao tác vào bộ nhớ DB (data.js) + ghi cache đĩa + vẽ lại + xếp hàng đồng bộ.
window.localMutate = async function (table, op, row) {
  if (typeof DB === "undefined" || !DB.tables) return;
  const arr = DB.tables[table] || (DB.tables[table] = []);
  if (op === "insert") arr.unshift(row);
  else if (op === "update") { const i = arr.findIndex((x) => x.id === row.id); if (i >= 0) arr[i] = { ...arr[i], ...row }; else arr.unshift(row); }
  else if (op === "delete") { const i = arr.findIndex((x) => x.id === row.id); if (i >= 0) arr.splice(i, 1); }
  if (typeof renderData === "function") renderData();
  try { await invoke("write_file_b64", { path: cachePath(), contentsB64: textToB64(JSON.stringify(DB)) }); } catch { /* */ }
  const q = loadQueue(); q.push({ table, op, row, at: Date.now() }); saveQueue(q);
  flushQueue();
};

let flushing = false;
async function flushQueue() {
  if (flushing || !cfg.server || !cfg.token) return;
  flushing = true;
  let q = loadQueue();
  while (q.length) {
    const item = q[0];
    try {
      const r = await invoke("http_post", { url: cfg.server + "/api/desktop/mutate", token: cfg.token, bodyJson: JSON.stringify(item) });
      if (r.status >= 200 && r.status < 300) { q.shift(); saveQueue(q); }
      else if (r.status === 400 || r.status === 403 || r.status === 404) {
        // Lỗi dữ liệu (không phải mạng) → bỏ để không kẹt hàng đợi, ghi log.
        let d = ""; try { d = JSON.parse(b64ToText(r.body_b64)).error || ""; } catch { /* */ }
        log(`Bỏ đồng bộ 1 thay đổi (${item.table}): ${d || r.status}`, "warn");
        q.shift(); saveQueue(q);
      } else break; // lỗi mạng/khác → dừng, thử lại lần sau
    } catch { break; }
  }
  const left = loadQueue().length;
  if (left) log(`Còn ${left} thay đổi chờ đồng bộ.`, "warn");
  flushing = false;
}

// ─── In hợp đồng PDF (dùng bản in A4 chuẩn từ server: logo, chữ ký, định dạng) ──
window.printContract = async function (id) {
  if (!cfg.server || !cfg.token || !cfg.dir) { alert("Cần kết nối máy chủ và chọn thư mục lưu trước."); return; }
  try {
    await flushQueue(); // đảm bảo hợp đồng (kể cả vừa tạo cục bộ) đã lên server
    const r = await invoke("http_get", { url: cfg.server + "/api/desktop/contracts/" + id + "?format=html", token: cfg.token });
    if (r.status !== 200) { alert("Chưa in được — hợp đồng đang chờ đồng bộ lên máy chủ. Thử lại sau vài giây."); return; }
    const dir = join(cfg.dir, "HopDong", ".in");
    const htmlPath = join(dir, "hopdong-" + id + ".html");
    const pdfPath = join(dir, "hopdong-" + id + ".pdf");
    await invoke("write_file_b64", { path: htmlPath, contentsB64: r.body_b64 });
    try {
      await invoke("edge_pdf", { htmlPath, pdfPath });
      await invoke("open_file", { path: pdfPath });
      log("Đã tạo PDF hợp đồng — mở ra để in.");
    } catch {
      await invoke("open_file", { path: htmlPath });
      log("Mở bản in (HTML) — bấm Ctrl+P để in ra giấy.", "warn");
    }
  } catch (e) { alert("Không in được: " + (e.message || e)); }
};

// ─── Tự cập nhật: phát hiện bản mới trên GitHub Releases (nhãn desktop-dev) ──
// So sánh thời điểm cập nhật của file cài mới nhất với bản đã lưu; nếu khác →
// hiện banner, bấm "Cập nhật ngay" tải + chạy trình cài đặt (app tự thoát).
const RELEASE_API = "https://api.github.com/repos/vieetjk01/Studio/releases/tags/desktop-dev";
let _updateUrl = "";
async function checkUpdate(manual = false) {
  try {
    const r = await invoke("http_get", { url: RELEASE_API, token: null });
    if (r.status !== 200) { if (manual) alert("Không kiểm tra được (máy chủ trả lỗi). Thử lại sau."); return; }
    const rel = JSON.parse(b64ToText(r.body_b64));
    const asset = (rel.assets || []).find((a) => /-setup\.exe$/i.test(a.name));
    if (!asset) { if (manual) alert("Chưa tìm thấy bản phát hành."); return; }
    _updateUrl = asset.browser_download_url;
    const build = asset.updated_at || "";
    // baseline lần đầu (chỉ khi tự kiểm tra, không phải bấm tay).
    if (!cfg.installedBuild && !manual) { cfg.installedBuild = build; saveCfg(); return; }
    if (build && build !== cfg.installedBuild) {
      $("updateText").textContent = "Đã có bản cập nhật mới của MStudo Desktop.";
      $("updateBanner").classList.remove("hidden");
      $("btnUpdate").textContent = "Cập nhật ngay";
      $("btnUpdate").onclick = () => runSelfUpdate(build, false);
      if (manual) { runSelfUpdate(build, false); return; } // bấm tay → cập nhật luôn
      // TỰ CẬP NHẬT: chỉ cài tự động khi app đang RẢNH (không đồng bộ/tải/xuất/
      // còn hàng đợi) để không cắt ngang việc đang chạy; nếu bận thì để banner.
      if (!appBusy()) { log("Đang tự cập nhật MStudo Desktop…"); runSelfUpdate(build, true); }
      else log("Đã có bản cập nhật — sẽ tự cài khi rảnh (hoặc bấm “Cập nhật ngay”).", "warn");
    } else if (manual) {
      alert("Bạn đang dùng bản mới nhất.");
    }
  } catch (e) { if (manual) alert("Không kiểm tra được cập nhật: " + (e.message || e)); }
}
// App có đang bận không (chặn tự cập nhật giữa chừng để không hỏng việc đang chạy).
function appBusy() {
  return syncing || exporting || driveSyncing || loadQueue().length > 0;
}
async function runSelfUpdate(build, auto = false) {
  if (!_updateUrl) return;
  if (!auto && !confirm("Tải và cài bản cập nhật mới? Ứng dụng sẽ đóng lại để cài đặt, rồi mở lại.")) return;
  $("btnUpdate").textContent = "Đang tải…"; $("btnUpdate").disabled = true;
  cfg.installedBuild = build; saveCfg();
  try {
    await invoke("download_and_run", { url: _updateUrl }); // app sẽ tự thoát
  } catch (e) {
    $("btnUpdate").disabled = false; $("btnUpdate").textContent = "Cập nhật ngay";
    if (!auto) alert("Không tải được bản cập nhật: " + (e.message || e) + "\nBạn có thể tải thủ công từ trang phát hành.");
    else log("Không tải được bản cập nhật: " + (e.message || e), "err");
  }
}

// ─── Lịch chạy ───────────────────────────────────────────────────────────────
function bootSync(first = false) {
  runSync(first);
  if (cfg.lastExportDate !== today()) runExports(); // xuất bù khi mở app
  flushQueue(); // đẩy các thay đổi cục bộ còn tồn khi mở app
  checkUpdate();
  runDriveSync(false); // tải ảnh/video hợp đồng lên Drive (nếu đã kết nối)
  setInterval(() => runSync(false), SYNC_EVERY_MS);
  setInterval(flushQueue, 60 * 1000); // thử đồng bộ thay đổi cục bộ mỗi phút
  setInterval(() => { if (cfg.lastExportDate !== today()) runExports(); }, 10 * 60 * 1000);
  setInterval(() => runDriveSync(false), DRIVE_SYNC_EVERY_MS);
  setInterval(checkUpdate, 2 * 3600 * 1000); // kiểm tra + tự cập nhật (khi rảnh) mỗi 2 giờ
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
  gotoNav("overview");     // mặc định mở Tổng quan
  bootSync(false);
})();

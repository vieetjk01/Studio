"use client";

import { useEffect, useState } from "react";
import { HardDrive, Check, Loader2, AlertTriangle, Plus, Trash2, FolderTree, FolderPlus } from "lucide-react";

/**
 * Kết nối Google Drive của studio + cấu hình mẫu thư mục cho MStudo Desktop.
 * Khi hợp đồng đã ký, client tạo cây thư mục trên máy & Drive rồi tải ảnh/video
 * lên (1 chiều). "JPG Goc" → album chọn ảnh; "File ChinhSua" → gallery giao khách.
 */

type Role = "selection" | "delivery" | null;
type Node = { name: string; role?: Role; excluded?: boolean };
type Template = { photo: Node[]; video: Node[] };
type DriveRoot = { id: string; name: string; drive_folder_id: string | null; folder_template: unknown; position: number };
type ServiceRow = { id: string; name: string; drive_root_id: string | null };
type Status = {
  configured: boolean;
  connected: boolean;
  rootFolderName: string;
  rootCreated: boolean;
  template: Template;
  roots?: DriveRoot[];
  services?: ServiceRow[];
};

const ROLE_LABEL: Record<string, string> = { selection: "Album chọn ảnh", delivery: "Gallery giao khách", none: "Chỉ sao lưu" };

export default function StudioDriveCard() {
  const [state, setState] = useState<Status | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);
  const [rootName, setRootName] = useState("");
  const [roots, setRoots] = useState<DriveRoot[]>([]);
  const [services, setServices] = useState<ServiceRow[]>([]);
  const [newRoot, setNewRoot] = useState("");
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState("");

  function applyStatus(d: Status) {
    setState(d);
    setTpl(d.template);
    setRootName(d.rootFolderName || "MStudo");
    setRoots(d.roots ?? []);
    setServices(d.services ?? []);
  }

  useEffect(() => {
    fetch("/api/studio/drive/status")
      .then((r) => r.json())
      .then((d: Status) => applyStatus(d))
      .catch(() => setState({ configured: false, connected: false, rootFolderName: "MStudo", rootCreated: false, template: { photo: [], video: [] } }));
    // Thông báo sau khi quay lại từ Google.
    const q = new URLSearchParams(window.location.search).get("drive");
    if (q === "connected") setFlash("Đã kết nối Google Drive!");
    else if (q === "error") setFlash("Kết nối Drive không thành công — thử lại.");
  }, []);

  async function disconnect() {
    if (!confirm("Ngắt kết nối Drive? Ảnh/video đã tải lên vẫn còn trên Drive; hợp đồng mới sẽ ngừng tự đồng bộ.")) return;
    setBusy(true);
    await fetch("/api/studio/drive/status", { method: "DELETE" }).catch(() => {});
    setBusy(false);
    setState((s) => (s ? { ...s, connected: false } : s));
  }

  async function saveTemplate() {
    if (!tpl) return;
    setBusy(true);
    setSaved(false);
    try {
      const r = await fetch("/api/studio/drive/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ template: tpl, rootFolderName: rootName }),
      });
      const d: Status = await r.json();
      applyStatus(d);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* */
    }
    setBusy(false);
  }

  // ── Thư mục gốc theo loại dịch vụ ──────────────────────────────────────────
  async function rootAction(body: Record<string, unknown>) {
    setBusy(true);
    try {
      const r = await fetch("/api/studio/drive/status", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      applyStatus((await r.json()) as Status);
    } catch {
      /* */
    }
    setBusy(false);
  }
  async function addRoot() {
    const name = newRoot.trim();
    if (!name) return;
    setNewRoot("");
    await rootAction({ action: "addRoot", name });
  }
  async function deleteRoot(id: string) {
    if (!confirm("Xoá thư mục gốc này? (Thư mục trên Drive vẫn còn — chỉ bỏ khỏi app.)")) return;
    await rootAction({ action: "deleteRoot", id });
  }
  async function renameRoot(id: string, name: string) {
    await rootAction({ action: "renameRoot", id, name });
  }
  async function mapService(serviceId: string, rootId: string) {
    await rootAction({ action: "mapService", serviceId, rootId });
  }

  function editNode(group: "photo" | "video", i: number, patch: Partial<Node>) {
    setTpl((t) => {
      if (!t) return t;
      const arr = [...t[group]];
      arr[i] = { ...arr[i], ...patch };
      return { ...t, [group]: arr };
    });
  }
  function addNode(group: "photo" | "video") {
    setTpl((t) => (t ? { ...t, [group]: [...t[group], { name: "", role: null, excluded: false }] } : t));
  }
  function removeNode(group: "photo" | "video", i: number) {
    setTpl((t) => (t ? { ...t, [group]: t[group].filter((_, k) => k !== i) } : t));
  }

  const renderGroup = (group: "photo" | "video", label: string) =>
    tpl && (
      <div className="mt-4">
        <div className="mb-1.5 text-sm font-medium">{label}</div>
        <div className="space-y-2">
          {tpl[group].map((n, i) => (
            <div key={i} className="flex flex-wrap items-center gap-2">
              <input
                value={n.name}
                onChange={(e) => editNode(group, i, { name: e.target.value })}
                placeholder="Tên thư mục"
                className="min-w-0 flex-1 rounded-lg px-3 py-1.5 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              />
              <select
                value={n.role || "none"}
                onChange={(e) => editNode(group, i, { role: e.target.value === "none" ? null : (e.target.value as Role) })}
                className="rounded-lg px-2 py-1.5 text-sm"
                style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
              >
                {Object.entries(ROLE_LABEL).map(([v, l]) => (
                  <option key={v} value={v}>
                    {l}
                  </option>
                ))}
              </select>
              <label className="inline-flex items-center gap-1.5 text-xs" style={{ color: "var(--text2)" }}>
                <input type="checkbox" checked={!n.excluded} onChange={(e) => editNode(group, i, { excluded: !e.target.checked })} />
                Đồng bộ Drive
              </label>
              <button onClick={() => removeNode(group, i)} className="btn-ghost p-1.5" title="Xóa" style={{ color: "#c05050" }}>
                <Trash2 size={14} />
              </button>
            </div>
          ))}
        </div>
        <button onClick={() => addNode(group)} className="btn-ghost mt-2 inline-flex items-center gap-1.5 text-xs">
          <Plus size={13} /> Thêm thư mục
        </button>
      </div>
    );

  return (
    <div className="card p-6">
      <div className="flex items-center gap-2">
        <HardDrive size={18} style={{ color: "var(--brand)" }} />
        <h2 className="font-serif text-xl font-medium">Đồng bộ ảnh/video lên Google Drive</h2>
      </div>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
        Kết nối Drive của studio một lần. Khi hợp đồng đã ký, MStudo Desktop tự tạo thư mục theo tên hợp đồng
        (<code>Photo/JPG Goc · Raw · File ChinhSua</code>, và <code>Video</code> nếu studio chọn có quay)
        rồi tải ảnh/video lên Drive. <b>JPG Goc</b> tự thành album chọn ảnh, <b>File ChinhSua</b> tự thành gallery giao khách.
        Chọn tạo thư mục nào ngay khi <b>tạo hợp đồng</b>.
      </p>

      {flash && (
        <p className="mt-3 rounded-lg p-3 text-sm" style={{ background: "var(--surface2)", color: "var(--text)" }}>
          {flash}
        </p>
      )}

      <div className="mt-4">
        {state === null ? (
          <span className="inline-flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
            <Loader2 size={15} className="animate-spin" /> Đang kiểm tra…
          </span>
        ) : !state.configured ? (
          <div className="inline-flex items-start gap-2 rounded-md p-3 text-sm" style={{ border: "1px solid var(--border)", color: "var(--text2)" }}>
            <AlertTriangle size={15} className="mt-0.5" style={{ color: "#e0a34f" }} />
            <span>
              Máy chủ chưa cấu hình OAuth. Cần đặt <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>, <code>GOOGLE_CLIENT_SECRET</code>,{" "}
              <code>GOOGLE_STUDIO_DRIVE_REDIRECT_URI</code> (…/api/studio/drive/callback) và chạy migration{" "}
              <code>studio_drive_sync.sql</code>.
            </span>
          </div>
        ) : state.connected ? (
          <div className="flex items-center gap-3">
            <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#4caf72" }}>
              <Check size={16} /> Đã kết nối Google Drive
            </span>
            <button onClick={disconnect} disabled={busy} className="btn-ghost text-xs">
              Ngắt kết nối
            </button>
          </div>
        ) : (
          <a href="/api/studio/drive/connect" className="btn-primary inline-flex items-center gap-2">
            <HardDrive size={15} /> Kết nối Google Drive
          </a>
        )}
      </div>

      {state?.connected && tpl && (
        <div className="mt-6 border-t pt-5" style={{ borderColor: "var(--border)" }}>
          <div className="mb-5">
            <label className="text-sm font-medium">Thư mục gốc trên Drive</label>
            <input
              value={rootName}
              onChange={(e) => setRootName(e.target.value)}
              placeholder="MStudo"
              className="mt-1.5 w-full max-w-xs rounded-lg px-3 py-1.5 text-sm"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            />
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
              App tạo thư mục này trong Drive của bạn (tất cả ảnh/video hợp đồng nằm trong đó).
              Sau khi tạo, bạn có thể <b>tự kéo thư mục này vào bất kỳ đâu trong Drive</b> — app vẫn đồng bộ đúng.
              {state.rootCreated ? " Đổi tên ở đây sẽ đổi luôn trên Drive." : ""}
            </p>
          </div>
          <div className="flex items-center gap-2">
            <FolderTree size={16} style={{ color: "var(--brand)" }} />
            <h3 className="text-base font-medium">Mẫu thư mục mặc định</h3>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Áp dụng cho hợp đồng tạo cây SAU khi lưu. Bỏ chọn “Đồng bộ Drive” để giữ thư mục chỉ ở máy (VD Raw, Video gốc).
          </p>
          {renderGroup("photo", "📷 Photo/")}
          {renderGroup("video", "🎬 Video/ (khi hợp đồng có quay)")}
          <button onClick={saveTemplate} disabled={busy} className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saved ? "Đã lưu" : "Lưu mẫu thư mục"}
          </button>

          {/* Thư mục gốc theo loại dịch vụ (Cưới, Sự kiện, Kỷ yếu…) */}
          <div className="mt-8 border-t pt-5" style={{ borderColor: "var(--border)" }}>
            <div className="flex items-center gap-2">
              <FolderPlus size={16} style={{ color: "var(--brand)" }} />
              <h3 className="text-base font-medium">Thư mục gốc theo loại dịch vụ</h3>
            </div>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
              Tạo nhiều thư mục gốc riêng (VD <b>Cưới</b>, <b>Sự kiện</b>, <b>Kỷ yếu</b>) rồi gán mỗi loại dịch vụ vào một thư mục gốc.
              Khi tạo hợp đồng, thư mục hợp đồng sẽ nằm trong thư mục gốc của loại dịch vụ đó — <b>cả trên Drive lẫn trên máy tính</b>.
              Loại dịch vụ chưa gán sẽ dùng thư mục gốc mặc định (<b>{rootName || "MStudo"}</b>).
            </p>

            {/* Danh sách thư mục gốc */}
            <div className="mt-4 space-y-2">
              {roots.length === 0 ? (
                <p className="text-xs" style={{ color: "var(--text3)" }}>Chưa có thư mục gốc riêng nào.</p>
              ) : (
                roots.map((r) => (
                  <div key={r.id} className="flex flex-wrap items-center gap-2">
                    <input
                      defaultValue={r.name}
                      onBlur={(e) => { const v = e.target.value.trim(); if (v && v !== r.name) renameRoot(r.id, v); }}
                      className="min-w-0 flex-1 rounded-lg px-3 py-1.5 text-sm"
                      style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                    />
                    <span className="text-[11px]" style={{ color: r.drive_folder_id ? "#4caf72" : "var(--text3)" }}>
                      {r.drive_folder_id ? "Đã tạo trên Drive" : "Sẽ tạo khi có hợp đồng"}
                    </span>
                    <button onClick={() => deleteRoot(r.id)} disabled={busy} className="btn-ghost p-1.5" title="Xoá" style={{ color: "#c05050" }}>
                      <Trash2 size={14} />
                    </button>
                  </div>
                ))
              )}
              <div className="flex flex-wrap items-center gap-2 pt-1">
                <input
                  value={newRoot}
                  onChange={(e) => setNewRoot(e.target.value)}
                  onKeyDown={(e) => { if (e.key === "Enter") addRoot(); }}
                  placeholder="Tên thư mục gốc mới (VD: Cưới)"
                  className="min-w-0 flex-1 rounded-lg px-3 py-1.5 text-sm"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                />
                <button onClick={addRoot} disabled={busy || !newRoot.trim()} className="btn-ghost inline-flex items-center gap-1.5 text-xs">
                  <Plus size={13} /> Thêm thư mục gốc
                </button>
              </div>
            </div>

            {/* Ánh xạ loại dịch vụ → thư mục gốc */}
            {services.length > 0 && (
              <div className="mt-5">
                <div className="mb-1.5 text-sm font-medium">Gán loại dịch vụ vào thư mục gốc</div>
                <div className="space-y-2">
                  {services.map((s) => (
                    <div key={s.id} className="flex flex-wrap items-center gap-2">
                      <span className="min-w-0 flex-1 truncate text-sm">{s.name}</span>
                      <select
                        value={s.drive_root_id ?? ""}
                        onChange={(e) => mapService(s.id, e.target.value)}
                        className="rounded-lg px-2 py-1.5 text-sm"
                        style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                      >
                        <option value="">Thư mục gốc mặc định ({rootName || "MStudo"})</option>
                        {roots.map((r) => (
                          <option key={r.id} value={r.id}>{r.name}</option>
                        ))}
                      </select>
                    </div>
                  ))}
                </div>
                <p className="mt-2 text-xs" style={{ color: "var(--text3)" }}>
                  Quản lý loại dịch vụ ở <b>Dịch vụ &amp; mẫu HĐ</b>.
                </p>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

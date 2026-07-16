"use client";

import { useEffect, useState } from "react";
import { HardDrive, Check, Loader2, AlertTriangle, Plus, Trash2, FolderTree } from "lucide-react";

/**
 * Kết nối Google Drive của studio + cấu hình mẫu thư mục cho MStudo Desktop.
 * Khi hợp đồng đã ký, client tạo cây thư mục trên máy & Drive rồi tải ảnh/video
 * lên (1 chiều). "JPG Goc" → album chọn ảnh; "File ChinhSua" → gallery giao khách.
 */

type Role = "selection" | "delivery" | null;
type Node = { name: string; role?: Role; excluded?: boolean };
type Template = { photo: Node[]; video: Node[]; product: Node[] };
type Status = { configured: boolean; connected: boolean; template: Template };

const ROLE_LABEL: Record<string, string> = { selection: "Album chọn ảnh", delivery: "Gallery giao khách", none: "Chỉ sao lưu" };

export default function StudioDriveCard() {
  const [state, setState] = useState<Status | null>(null);
  const [tpl, setTpl] = useState<Template | null>(null);
  const [busy, setBusy] = useState(false);
  const [saved, setSaved] = useState(false);
  const [flash, setFlash] = useState("");

  useEffect(() => {
    fetch("/api/studio/drive/status")
      .then((r) => r.json())
      .then((d: Status) => {
        setState(d);
        setTpl(d.template);
      })
      .catch(() => setState({ configured: false, connected: false, template: { photo: [], video: [], product: [] } }));
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
        body: JSON.stringify({ template: tpl }),
      });
      const d: Status = await r.json();
      setState(d);
      setTpl(d.template);
      setSaved(true);
      setTimeout(() => setSaved(false), 2500);
    } catch {
      /* */
    }
    setBusy(false);
  }

  function editNode(group: "photo" | "video" | "product", i: number, patch: Partial<Node>) {
    setTpl((t) => {
      if (!t) return t;
      const arr = [...t[group]];
      arr[i] = { ...arr[i], ...patch };
      return { ...t, [group]: arr };
    });
  }
  function addNode(group: "photo" | "video" | "product") {
    setTpl((t) => (t ? { ...t, [group]: [...t[group], { name: "", role: null, excluded: false }] } : t));
  }
  function removeNode(group: "photo" | "video" | "product", i: number) {
    setTpl((t) => (t ? { ...t, [group]: t[group].filter((_, k) => k !== i) } : t));
  }

  const renderGroup = (group: "photo" | "video" | "product", label: string) =>
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
        (<code>Photo/JPG Goc · Raw · File ChinhSua</code>, <code>SanPham</code>, và <code>Video</code> nếu studio chọn có quay)
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
          <div className="flex items-center gap-2">
            <FolderTree size={16} style={{ color: "var(--brand)" }} />
            <h3 className="text-base font-medium">Mẫu thư mục mặc định</h3>
          </div>
          <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
            Áp dụng cho hợp đồng tạo cây SAU khi lưu. Bỏ chọn “Đồng bộ Drive” để giữ thư mục chỉ ở máy (VD Raw, Video gốc).
          </p>
          {renderGroup("photo", "📷 Photo/")}
          {renderGroup("video", "🎬 Video/ (khi hợp đồng có quay)")}
          {renderGroup("product", "📦 SanPham/ (thư mục sản phẩm)")}
          <button onClick={saveTemplate} disabled={busy} className="btn-primary mt-4 inline-flex items-center gap-2 text-sm">
            {busy ? <Loader2 size={14} className="animate-spin" /> : saved ? <Check size={14} /> : null}
            {saved ? "Đã lưu" : "Lưu mẫu thư mục"}
          </button>
        </div>
      )}
    </div>
  );
}

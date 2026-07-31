"use client";

import { useEffect, useState } from "react";
import { HardDrive, Check, Loader2, AlertTriangle } from "lucide-react";

/** Kết nối Google Drive của admin để lưu nội dung người dùng (thay Supabase). */
export default function AdminDriveCard() {
  type Status = { configured: boolean; connected: boolean; ok: boolean; error: string | null; lastUploadError: string | null };
  const [state, setState] = useState<Status | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    fetch("/api/admin/drive/status")
      .then((r) => r.json())
      .then((d) => setState({ configured: !!d.configured, connected: !!d.connected, ok: !!d.ok, error: d.error ?? null, lastUploadError: d.lastUploadError ?? null }))
      .catch(() => setState({ configured: false, connected: false, ok: false, error: null, lastUploadError: null }));
  }, []);

  async function disconnect() {
    if (!confirm("Ngắt kết nối Drive? Upload mới sẽ quay lại lưu trên Supabase.")) return;
    setBusy(true);
    await fetch("/api/admin/drive/status", { method: "DELETE" }).catch(() => {});
    setBusy(false);
    setState((s) => (s ? { ...s, connected: false, ok: false } : s));
  }

  return (
    <div className="card p-5">
      <div className="flex items-center gap-2">
        <HardDrive size={18} />
        <h2 className="text-base font-medium text-accent">Lưu trữ nội dung người dùng · Google Drive</h2>
      </div>
      <p className="mt-1 text-sm text-accent-muted">
        Khi bật, mọi ảnh/logo người dùng tải lên sẽ được lưu vào một thư mục riêng trên Google Drive của
        admin (<b>không tốn dung lượng Supabase</b>). Chưa kết nối thì hệ thống tự lưu trên Supabase.
      </p>

      <div className="mt-4">
        {state === null ? (
          <span className="inline-flex items-center gap-2 text-sm text-accent-muted"><Loader2 size={15} className="animate-spin" /> Đang kiểm tra…</span>
        ) : !state.configured ? (
          <div className="inline-flex items-start gap-2 rounded-md border border-ink-800 p-3 text-sm" style={{ color: "var(--text2)" }}>
            <AlertTriangle size={15} className="mt-0.5" style={{ color: "#e0a34f" }} />
            <span>
              Chưa cấu hình OAuth. Cần đặt biến môi trường <code>NEXT_PUBLIC_GOOGLE_CLIENT_ID</code>,{" "}
              <code>GOOGLE_CLIENT_SECRET</code>, <code>GOOGLE_ADMIN_DRIVE_REDIRECT_URI</code> (…/api/admin/drive/callback)
              và chạy migration <code>admin_drive.sql</code> (bảng <code>admin_drive</code>).
            </span>
          </div>
        ) : state.connected ? (
          <div className="space-y-3">
            <div className="flex items-center gap-3">
              {state.ok ? (
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#4caf72" }}><Check size={16} /> Đã kết nối Drive · file mới đang vào Drive</span>
              ) : (
                <span className="inline-flex items-center gap-1.5 text-sm" style={{ color: "#e0a34f" }}><AlertTriangle size={16} /> Có token nhưng Drive KHÔNG dùng được</span>
              )}
              <button onClick={disconnect} disabled={busy} className="btn-ghost text-xs">Ngắt kết nối</button>
            </div>
            {/* Kết nối hỏng mà vẫn báo xanh chính là cách dung lượng Supabase âm
                thầm phình lên — nói thẳng lỗi ra đây. */}
            {!state.ok && (
              <div className="rounded-md border border-ink-800 p-3 text-xs" style={{ color: "var(--text2)" }}>
                Mọi upload đang rơi về Supabase Storage. Bấm <b>Ngắt kết nối</b> rồi kết nối lại.
                {state.error && <div className="mt-1 font-mono" style={{ color: "var(--text3)" }}>{state.error}</div>}
              </div>
            )}
            {state.lastUploadError && (
              <div className="rounded-md border border-ink-800 p-3 text-xs" style={{ color: "var(--text3)" }}>
                Lỗi upload gần nhất: <span className="font-mono">{state.lastUploadError}</span>
              </div>
            )}
          </div>
        ) : (
          <a href="/api/admin/drive/connect" className="btn-primary inline-flex gap-2">
            <HardDrive size={15} /> Kết nối Google Drive
          </a>
        )}
      </div>
    </div>
  );
}

"use client";

import { useState } from "react";
import Link from "next/link";
import {
  Megaphone,
  DatabaseBackup,
  Users,
  Gift,
  Settings,
  Send,
  Download,
  Loader2,
  ShieldCheck,
} from "lucide-react";

type Target = "all" | "studio" | "booking";

const TARGET_LABEL: Record<Target, string> = {
  all: "Tất cả studio",
  studio: "Chỉ gói Studio",
  booking: "Chỉ Photographer / Basic",
};

const SHORTCUTS = [
  { href: "/dashboard/admin", label: "Quản trị studio", desc: "Tài khoản, gói, quyền, kích hoạt/khóa", icon: Users },
  { href: "/dashboard/admin/affiliate", label: "Quản lý Affiliate", desc: "Hoa hồng, tỉ lệ, thanh toán", icon: Gift },
  { href: "/dashboard/settings", label: "Cài đặt hệ thống", desc: "Thông tin studio, bảng giá, tính năng", icon: Settings },
];

export default function SystemPanel() {
  const [message, setMessage] = useState("");
  const [target, setTarget] = useState<Target>("all");
  const [sending, setSending] = useState(false);
  const [sendMsg, setSendMsg] = useState<string | null>(null);
  const [backing, setBacking] = useState(false);
  const [backupMsg, setBackupMsg] = useState<string | null>(null);

  async function sendBroadcast(e: React.FormEvent) {
    e.preventDefault();
    if (!message.trim() || sending) return;
    if (!window.confirm(`Gửi thông báo này tới "${TARGET_LABEL[target]}"?`)) return;
    setSending(true);
    setSendMsg(null);
    try {
      const res = await fetch("/api/admin/broadcast", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ message: message.trim(), target }),
      });
      const data = await res.json();
      if (!res.ok) {
        setSendMsg(data.error === "empty_message" ? "Chưa nhập nội dung." : `Lỗi: ${data.error ?? "không gửi được"}`);
      } else {
        setSendMsg(`Đã gửi tới ${data.sent} studio.`);
        setMessage("");
      }
    } catch {
      setSendMsg("Lỗi kết nối, thử lại.");
    } finally {
      setSending(false);
    }
  }

  async function downloadBackup() {
    if (backing) return;
    setBacking(true);
    setBackupMsg("Đang thu thập dữ liệu toàn hệ thống…");
    try {
      const res = await fetch("/api/admin/backup");
      if (!res.ok) {
        setBackupMsg("Không tạo được bản sao lưu.");
        return;
      }
      const blob = await res.blob();
      const cd = res.headers.get("Content-Disposition") || "";
      const m = cd.match(/filename="([^"]+)"/);
      const name = m?.[1] || "mstudo-backup.json";
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = name;
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      const mb = (blob.size / 1048576).toFixed(2);
      setBackupMsg(`Đã tải bản sao lưu (${mb} MB).`);
    } catch {
      setBackupMsg("Lỗi khi tải bản sao lưu.");
    } finally {
      setBacking(false);
    }
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6 flex items-center gap-3">
        <ShieldCheck size={22} style={{ color: "var(--brand)" }} />
        <h1 className="font-serif text-2xl font-medium">Bảng điều khiển hệ thống</h1>
      </div>

      {/* Quản lý nhanh */}
      <div className="mb-8 grid gap-3 sm:grid-cols-3">
        {SHORTCUTS.map((s) => (
          <Link
            key={s.href}
            href={s.href}
            className="card flex items-start gap-3 p-4 transition-colors hover:border-[var(--brand)]"
            style={{ borderColor: "var(--border)" }}
          >
            <s.icon size={20} style={{ color: "var(--brand)", flex: "none" }} className="mt-0.5" />
            <div>
              <div className="text-sm font-semibold">{s.label}</div>
              <div className="mt-0.5 text-[12px]" style={{ color: "var(--text3)" }}>{s.desc}</div>
            </div>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Thông báo tới studio */}
        <form onSubmit={sendBroadcast} className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <Megaphone size={18} style={{ color: "#c78bd1" }} />
            <h2 className="text-base font-semibold">Thông báo tới studio</h2>
          </div>
          <p className="mb-3 text-[12px]" style={{ color: "var(--text3)" }}>
            Thông báo hiển thị ngay trong webapp (chuông thông báo) của các studio được chọn.
          </p>
          <textarea
            className="input min-h-[110px] w-full resize-y"
            placeholder="Nội dung thông báo… ví dụ: Hệ thống bảo trì lúc 23h tối nay, vui lòng lưu công việc."
            maxLength={1000}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
          />
          <div className="mt-3 flex flex-wrap items-center gap-3">
            <select
              className="input px-3 py-2 text-sm"
              value={target}
              onChange={(e) => setTarget(e.target.value as Target)}
            >
              <option value="all">{TARGET_LABEL.all}</option>
              <option value="studio">{TARGET_LABEL.studio}</option>
              <option value="booking">{TARGET_LABEL.booking}</option>
            </select>
            <button type="submit" disabled={sending || !message.trim()} className="btn-primary gap-2">
              {sending ? <Loader2 size={15} className="animate-spin" /> : <Send size={15} />}
              Gửi thông báo
            </button>
            <span className="text-[11px]" style={{ color: "var(--text3)" }}>{message.length}/1000</span>
          </div>
          {sendMsg && (
            <div className="mt-3 rounded-md px-3 py-2 text-sm" style={{ background: "var(--brandSoft)", color: "var(--brand)" }}>
              {sendMsg}
            </div>
          )}
        </form>

        {/* Sao lưu toàn hệ thống */}
        <div className="card p-5">
          <div className="mb-3 flex items-center gap-2">
            <DatabaseBackup size={18} style={{ color: "var(--brand)" }} />
            <h2 className="text-base font-semibold">Sao lưu toàn hệ thống</h2>
          </div>
          <p className="mb-4 text-[12px]" style={{ color: "var(--text3)" }}>
            Tải về một file JSON chứa toàn bộ dữ liệu ứng dụng của mọi studio (hợp đồng, khách hàng,
            báo giá, thu chi, album, thông báo…). Dùng để lưu trữ an toàn hoặc khôi phục khi cần.
            <br />
            <span style={{ color: "var(--text3)" }}>
              Lưu ý: chỉ gồm dữ liệu ứng dụng — không chứa mật khẩu đăng nhập hay ảnh gốc trên Google Drive.
            </span>
          </p>
          <button onClick={downloadBackup} disabled={backing} className="btn-primary gap-2">
            {backing ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />}
            Tải bản sao lưu đầy đủ
          </button>
          {backupMsg && (
            <div className="mt-3 rounded-md px-3 py-2 text-sm" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
              {backupMsg}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

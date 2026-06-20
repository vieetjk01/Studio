"use client";

import { useState } from "react";
import { CalendarCheck, Check } from "lucide-react";

export default function BookingForm({ token, studioName }: { token: string; studioName: string }) {
  const [f, setF] = useState({ name: "", phone: "", service: "", preferred_date: "", note: "" });
  const [busy, setBusy] = useState(false);
  const [sent, setSent] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const set = (k: keyof typeof f, v: string) => setF((p) => ({ ...p, [k]: v }));

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    if (!f.name.trim() || !f.phone.trim()) {
      setErr("Vui lòng nhập tên và số điện thoại.");
      return;
    }
    setBusy(true);
    const res = await fetch(`/api/book/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(f),
    });
    setBusy(false);
    if (res.ok) setSent(true);
    else setErr("Có lỗi xảy ra, vui lòng thử lại.");
  }

  if (sent) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <div className="card max-w-sm p-8 text-center">
          <Check size={28} className="mx-auto" style={{ color: "#7bb38a" }} />
          <h1 className="mt-3 font-serif text-2xl font-medium">Đã gửi yêu cầu!</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            {studioName} sẽ liên hệ với bạn sớm để xác nhận lịch.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-md px-6 py-12">
      <p className="eyebrow mb-1.5">{studioName}</p>
      <h1 className="flex items-center gap-2 font-serif text-3xl font-medium">
        <CalendarCheck size={24} /> Đặt lịch chụp
      </h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
        Để lại thông tin, studio sẽ liên hệ xác nhận.
      </p>

      <form onSubmit={submit} className="card mt-6 space-y-4 p-6">
        <div>
          <label className="label">Họ và tên *</label>
          <input className="input" value={f.name} onChange={(e) => set("name", e.target.value)} />
        </div>
        <div>
          <label className="label">Số điện thoại *</label>
          <input className="input" value={f.phone} onChange={(e) => set("phone", e.target.value)} />
        </div>
        <div>
          <label className="label">Loại dịch vụ</label>
          <input className="input" placeholder="VD: chụp cưới, sự kiện…" value={f.service} onChange={(e) => set("service", e.target.value)} />
        </div>
        <div>
          <label className="label">Ngày mong muốn</label>
          <input type="date" className="input" value={f.preferred_date} onChange={(e) => set("preferred_date", e.target.value)} />
        </div>
        <div>
          <label className="label">Ghi chú</label>
          <textarea className="input min-h-[80px]" value={f.note} onChange={(e) => set("note", e.target.value)} />
        </div>
        {err && <p className="text-sm text-red-400">{err}</p>}
        <button type="submit" disabled={busy} className="btn-primary w-full">
          {busy ? "Đang gửi…" : "Gửi yêu cầu đặt lịch"}
        </button>
      </form>
    </div>
  );
}

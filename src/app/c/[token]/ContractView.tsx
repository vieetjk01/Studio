"use client";

import { useState } from "react";
import { Lock, FileText, MapPin, Calendar, Send, Check } from "lucide-react";
import {
  contractTotal,
  vnd,
  SHOOT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  type ShootType,
  type ContractStatus,
} from "@/lib/types";

type Contract = {
  code: string | null;
  title: string;
  client_name: string | null;
  shoot_type: ShootType;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  status: ContractStatus;
  deposit: number;
  note: string | null;
  updated_at: string;
};
type Item = { id: string; name: string; qty: number; unit_price: number };

export default function ContractView({ token }: { token: string }) {
  const [phone, setPhone] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [items, setItems] = useState<Item[]>([]);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editMsg, setEditMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone }),
    });
    setLoading(false);
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      setErr(
        j.error === "wrong_phone"
          ? "Số điện thoại không khớp. Vui lòng kiểm tra lại."
          : j.error === "not_found"
          ? "Không tìm thấy hợp đồng."
          : "Có lỗi xảy ra."
      );
      return;
    }
    const j = await res.json();
    setContract(j.contract);
    setItems(j.items ?? []);
  }

  async function sendEdit() {
    if (!editMsg.trim()) return;
    setSending(true);
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "edit_request", phone, message: editMsg.trim() }),
    });
    setSending(false);
    if (res.ok) {
      setSent(true);
      setEditMsg("");
      setTimeout(() => setSent(false), 4000);
    }
  }

  if (!contract) {
    return (
      <div className="flex min-h-screen items-center justify-center px-6">
        <form onSubmit={unlock} className="card w-full max-w-sm p-8 text-center">
          <Lock size={22} className="mx-auto" style={{ color: "var(--text3)" }} />
          <h1 className="mt-4 font-serif text-2xl font-medium">Hợp đồng của bạn</h1>
          <p className="mt-2 text-sm" style={{ color: "var(--text2)" }}>
            Nhập số điện thoại đã đăng ký để xem hợp đồng.
          </p>
          <input
            className="input mt-5 text-center"
            placeholder="Số điện thoại"
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
          />
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
            {loading ? "Đang mở…" : "Xem hợp đồng"}
          </button>
        </form>
      </div>
    );
  }

  const total = contractTotal(items);
  const balance = total - (contract.deposit || 0);

  return (
    <div className="mx-auto max-w-2xl px-6 py-10">
      <p className="eyebrow mb-1.5">{contract.code || "Hợp đồng dịch vụ"}</p>
      <h1 className="font-serif text-3xl font-medium">{contract.title}</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
        {SHOOT_TYPE_LABEL[contract.shoot_type]} · {CONTRACT_STATUS_LABEL[contract.status]}
      </p>

      {/* Details */}
      <div className="card mt-6 space-y-3 p-6 text-sm">
        {contract.client_name && (
          <div className="flex items-center gap-2"><FileText size={15} style={{ color: "var(--text3)" }} /> Khách hàng: <b>{contract.client_name}</b></div>
        )}
        {(contract.event_date || contract.event_time) && (
          <div className="flex items-center gap-2">
            <Calendar size={15} style={{ color: "var(--text3)" }} />
            {contract.event_date}{contract.event_time ? ` · ${contract.event_time}` : ""}
          </div>
        )}
        {contract.location && (
          <div className="flex items-center gap-2"><MapPin size={15} style={{ color: "var(--text3)" }} /> {contract.location}</div>
        )}
      </div>

      {/* Items */}
      <div className="card mt-6 p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Hạng mục dịch vụ</h2>
        {items.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có hạng mục.</p>
        ) : (
          <table className="w-full text-sm">
            <tbody>
              {items.map((it) => (
                <tr key={it.id} className="border-b last:border-0" style={{ borderColor: "var(--border)" }}>
                  <td className="py-2.5">{it.name}</td>
                  <td className="py-2.5 text-center" style={{ color: "var(--text3)" }}>×{it.qty}</td>
                  <td className="py-2.5 text-right">{vnd(it.qty * it.unit_price)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
        <dl className="mt-4 space-y-2 border-t pt-4 text-sm" style={{ borderColor: "var(--border)" }}>
          <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>Tổng giá trị</dt><dd className="font-serif text-lg font-medium">{vnd(total)}</dd></div>
          <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>Đã cọc</dt><dd>{vnd(contract.deposit || 0)}</dd></div>
          <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>Còn lại</dt><dd className="font-medium">{vnd(balance)}</dd></div>
        </dl>
      </div>

      {contract.note && (
        <div className="card mt-6 p-6">
          <h2 className="mb-2 font-serif text-lg font-medium">Ghi chú</h2>
          <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text2)" }}>{contract.note}</p>
        </div>
      )}

      {/* Edit request */}
      <div className="card mt-6 p-6">
        <h2 className="mb-2 font-serif text-lg font-medium">Yêu cầu chỉnh sửa</h2>
        <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>
          Nếu có điểm chưa phù hợp, hãy gửi yêu cầu cho studio.
        </p>
        {sent ? (
          <p className="flex items-center gap-2 text-sm" style={{ color: "#7bb38a" }}>
            <Check size={15} /> Đã gửi yêu cầu. Studio sẽ liên hệ với bạn.
          </p>
        ) : (
          <>
            <textarea
              className="input min-h-[90px]"
              placeholder="Nội dung muốn chỉnh sửa…"
              value={editMsg}
              onChange={(e) => setEditMsg(e.target.value)}
            />
            <button onClick={sendEdit} disabled={sending || !editMsg.trim()} className="btn-primary mt-3">
              <Send size={15} /> {sending ? "Đang gửi…" : "Gửi yêu cầu"}
            </button>
          </>
        )}
      </div>

      <p className="mt-8 text-center text-xs" style={{ color: "var(--text3)" }}>
        Cập nhật: {new Date(contract.updated_at).toLocaleString("vi-VN")}
      </p>
    </div>
  );
}

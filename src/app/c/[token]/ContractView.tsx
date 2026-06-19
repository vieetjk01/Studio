"use client";

import { useState } from "react";
import { Lock, FileText, MapPin, Calendar, Send, Check, Printer, PenLine, Images } from "lucide-react";
import SignaturePad from "@/components/SignaturePad";
import { mainUrl } from "@/lib/hosts";
import {
  contractTotal,
  vnd,
  sumAmounts,
  SHOOT_TYPE_LABEL,
  CONTRACT_STATUS_LABEL,
  PAYMENT_KIND_LABEL,
  type ShootType,
  type ContractStatus,
  type PaymentKind,
} from "@/lib/types";

type Contract = {
  code: string | null;
  title: string;
  client_name: string | null;
  client_email: string | null;
  shoot_type: ShootType;
  event_date: string | null;
  event_time: string | null;
  location: string | null;
  status: ContractStatus;
  note: string | null;
  client_signed_name: string | null;
  client_signature: string | null;
  client_signed_at: string | null;
  updated_at: string;
};
type Item = { id: string; name: string; qty: number; unit_price: number };
type Payment = { id: string; amount: number; kind: PaymentKind; paid_at: string };
type Gallery = { slug: string; title: string };

export default function ContractView({ token }: { token: string }) {
  const [phone, setPhone] = useState("");
  const [contract, setContract] = useState<Contract | null>(null);
  const [studioName, setStudioName] = useState("Studio");
  const [items, setItems] = useState<Item[]>([]);
  const [payments, setPayments] = useState<Payment[]>([]);
  const [gallery, setGallery] = useState<Gallery | null>(null);
  const [loading, setLoading] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const [editMsg, setEditMsg] = useState("");
  const [sending, setSending] = useState(false);
  const [sent, setSent] = useState(false);

  // signing
  const [signName, setSignName] = useState("");
  const [signature, setSignature] = useState("");
  const [signing, setSigning] = useState(false);

  async function fetchContract(pw: string) {
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ phone: pw }),
    });
    if (!res.ok) {
      const j = await res.json().catch(() => ({}));
      return { ok: false, error: j.error as string };
    }
    const j = await res.json();
    setContract(j.contract);
    setStudioName(j.studio_name || "Studio");
    setItems(j.items ?? []);
    setPayments(j.payments ?? []);
    setGallery(j.gallery ?? null);
    return { ok: true };
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setErr(null);
    setLoading(true);
    const r = await fetchContract(phone);
    setLoading(false);
    if (!r.ok) {
      setErr(
        r.error === "wrong_phone"
          ? "Số điện thoại không khớp. Vui lòng kiểm tra lại."
          : r.error === "not_found"
          ? "Không tìm thấy hợp đồng."
          : "Có lỗi xảy ra."
      );
    }
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

  async function sign() {
    if (!signName.trim()) {
      setErr("Nhập họ tên người ký.");
      return;
    }
    setSigning(true);
    const res = await fetch(`/api/c/${token}`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "sign", phone, name: signName.trim(), signature }),
    });
    setSigning(false);
    if (res.ok) await fetchContract(phone);
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
          <input className="input mt-5 text-center" placeholder="Số điện thoại" value={phone} onChange={(e) => setPhone(e.target.value)} />
          {err && <p className="mt-3 text-sm text-red-400">{err}</p>}
          <button type="submit" disabled={loading} className="btn-primary mt-4 w-full">
            {loading ? "Đang mở…" : "Xem hợp đồng"}
          </button>
        </form>
      </div>
    );
  }

  const total = contractTotal(items);
  const collected = sumAmounts(payments);
  const balance = total - collected;
  const signed = !!contract.client_signed_at;

  return (
    <>
      {/* On-screen view (hidden when printing) */}
      <div className="no-print mx-auto max-w-2xl px-6 py-10">
        <div className="mb-4 flex items-center justify-between">
          <p className="eyebrow">{contract.code || "Hợp đồng dịch vụ"}</p>
          <button onClick={() => window.print()} className="btn-ghost px-3 py-1.5 text-xs">
            <Printer size={14} /> Tải PDF / In
          </button>
        </div>
        <h1 className="font-serif text-3xl font-medium">{contract.title}</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          {SHOOT_TYPE_LABEL[contract.shoot_type]} · {CONTRACT_STATUS_LABEL[contract.status]}
        </p>

        <div className="card mt-6 space-y-3 p-6 text-sm">
          {contract.client_name && (
            <div className="flex items-center gap-2"><FileText size={15} style={{ color: "var(--text3)" }} /> Khách hàng: <b>{contract.client_name}</b></div>
          )}
          {(contract.event_date || contract.event_time) && (
            <div className="flex items-center gap-2"><Calendar size={15} style={{ color: "var(--text3)" }} />{contract.event_date}{contract.event_time ? ` · ${contract.event_time}` : ""}</div>
          )}
          {contract.location && (
            <div className="flex items-center gap-2"><MapPin size={15} style={{ color: "var(--text3)" }} /> {contract.location}</div>
          )}
        </div>

        {gallery && (
          <a
            href={mainUrl(`/album/${gallery.slug}`)}
            target="_blank"
            rel="noreferrer"
            className="card mt-6 flex items-center gap-3 p-5 transition-colors hover:bg-[var(--surface2)]"
          >
            <Images size={20} style={{ color: "var(--accent)" }} />
            <div className="flex-1">
              <p className="font-serif text-lg font-medium">Xem ảnh của bạn</p>
              <p className="text-xs" style={{ color: "var(--text3)" }}>{gallery.title} · mật khẩu là SĐT của bạn</p>
            </div>
            <span className="text-sm" style={{ color: "var(--accent)" }}>Mở →</span>
          </a>
        )}

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
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>Đã thanh toán</dt><dd style={{ color: "#7bb38a" }}>{vnd(collected)}</dd></div>
            <div className="flex justify-between"><dt style={{ color: "var(--text2)" }}>Còn lại</dt><dd className="font-medium">{vnd(balance)}</dd></div>
          </dl>
          {payments.length > 0 && (
            <ul className="mt-3 space-y-1 text-xs" style={{ color: "var(--text3)" }}>
              {payments.map((p) => (
                <li key={p.id} className="flex justify-between">
                  <span>{PAYMENT_KIND_LABEL[p.kind]} · {p.paid_at}</span>
                  <span>{vnd(p.amount)}</span>
                </li>
              ))}
            </ul>
          )}
        </div>

        {contract.note && (
          <div className="card mt-6 p-6">
            <h2 className="mb-2 font-serif text-lg font-medium">Ghi chú / Điều khoản</h2>
            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text2)" }}>{contract.note}</p>
          </div>
        )}

        {/* Signing */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-medium">
            <PenLine size={17} /> Xác nhận &amp; ký hợp đồng
          </h2>
          {signed ? (
            <div>
              <p className="flex items-center gap-2 text-sm" style={{ color: "#7bb38a" }}>
                <Check size={15} /> Bạn đã ký ngày {new Date(contract.client_signed_at!).toLocaleString("vi-VN")}.
              </p>
              {contract.client_signature && (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={contract.client_signature} alt="Chữ ký" className="mt-3 h-20 rounded bg-white p-1" />
              )}
            </div>
          ) : (
            <>
              <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>
                Ký xác nhận đồng ý với nội dung hợp đồng trên.
              </p>
              <input className="input" placeholder="Họ tên người ký" value={signName} onChange={(e) => setSignName(e.target.value)} />
              <div className="mt-3">
                <label className="label">Chữ ký</label>
                <SignaturePad onChange={setSignature} />
              </div>
              {err && <p className="mt-2 text-sm text-red-400">{err}</p>}
              <button onClick={sign} disabled={signing} className="btn-primary mt-3">
                <PenLine size={15} /> {signing ? "Đang ký…" : "Đồng ý & ký"}
              </button>
            </>
          )}
        </div>

        {/* Edit request */}
        <div className="card mt-6 p-6">
          <h2 className="mb-2 font-serif text-lg font-medium">Yêu cầu chỉnh sửa</h2>
          <p className="mb-3 text-sm" style={{ color: "var(--text2)" }}>
            Nếu có điểm chưa phù hợp, hãy gửi yêu cầu cho studio trước khi ký.
          </p>
          {sent ? (
            <p className="flex items-center gap-2 text-sm" style={{ color: "#7bb38a" }}>
              <Check size={15} /> Đã gửi yêu cầu. Studio sẽ liên hệ với bạn.
            </p>
          ) : (
            <>
              <textarea className="input min-h-[90px]" placeholder="Nội dung muốn chỉnh sửa…" value={editMsg} onChange={(e) => setEditMsg(e.target.value)} />
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

      {/* Print-only formal document (black on white) */}
      <PrintDoc
        contract={contract}
        studioName={studioName}
        items={items}
        total={total}
        collected={collected}
        balance={balance}
      />
    </>
  );
}

function PrintDoc({
  contract,
  studioName,
  items,
  total,
  collected,
  balance,
}: {
  contract: Contract;
  studioName: string;
  items: Item[];
  total: number;
  collected: number;
  balance: number;
}) {
  return (
    <div className="print-doc" style={{ display: "none", padding: "32px", maxWidth: 720, margin: "0 auto", fontFamily: "Georgia, serif", color: "#111" }}>
      <h1 style={{ textAlign: "center", fontSize: 22, fontWeight: 700, margin: 0 }}>HỢP ĐỒNG DỊCH VỤ</h1>
      <p style={{ textAlign: "center", fontSize: 13, margin: "4px 0 24px" }}>
        {contract.title}{contract.code ? ` · ${contract.code}` : ""}
      </p>

      <table style={{ width: "100%", fontSize: 13, marginBottom: 16, borderCollapse: "collapse" }}>
        <tbody>
          <tr><td style={{ padding: "3px 0", width: 130 }}>Bên A (Studio):</td><td><b>{studioName}</b></td></tr>
          <tr><td style={{ padding: "3px 0" }}>Bên B (Khách hàng):</td><td><b>{contract.client_name || "—"}</b>{contract.client_email ? ` · ${contract.client_email}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Loại dịch vụ:</td><td>{SHOOT_TYPE_LABEL[contract.shoot_type]}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Thời gian:</td><td>{contract.event_date || "—"}{contract.event_time ? ` · ${contract.event_time}` : ""}</td></tr>
          <tr><td style={{ padding: "3px 0" }}>Địa điểm:</td><td>{contract.location || "—"}</td></tr>
        </tbody>
      </table>

      <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>1. Hạng mục dịch vụ</h2>
      <table style={{ width: "100%", fontSize: 13, borderCollapse: "collapse" }}>
        <thead>
          <tr style={{ borderBottom: "1px solid #333" }}>
            <th style={{ textAlign: "left", padding: "5px 0" }}>Hạng mục</th>
            <th style={{ textAlign: "center", padding: "5px 0", width: 50 }}>SL</th>
            <th style={{ textAlign: "right", padding: "5px 0", width: 110 }}>Đơn giá</th>
            <th style={{ textAlign: "right", padding: "5px 0", width: 120 }}>Thành tiền</th>
          </tr>
        </thead>
        <tbody>
          {items.map((it) => (
            <tr key={it.id} style={{ borderBottom: "1px solid #ddd" }}>
              <td style={{ padding: "5px 0" }}>{it.name}</td>
              <td style={{ textAlign: "center" }}>{it.qty}</td>
              <td style={{ textAlign: "right" }}>{vnd(it.unit_price)}</td>
              <td style={{ textAlign: "right" }}>{vnd(it.qty * it.unit_price)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <table style={{ width: "100%", fontSize: 13, marginTop: 12 }}>
        <tbody>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Tổng giá trị hợp đồng:</td><td style={{ textAlign: "right", width: 140, fontWeight: 700 }}>{vnd(total)}</td></tr>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Đã thanh toán:</td><td style={{ textAlign: "right" }}>{vnd(collected)}</td></tr>
          <tr><td style={{ textAlign: "right", padding: "2px 0" }}>Còn lại:</td><td style={{ textAlign: "right", fontWeight: 700 }}>{vnd(balance)}</td></tr>
        </tbody>
      </table>

      {contract.note && (
        <>
          <h2 style={{ fontSize: 15, margin: "16px 0 8px" }}>2. Điều khoản / Ghi chú</h2>
          <p style={{ fontSize: 13, whiteSpace: "pre-wrap", margin: 0 }}>{contract.note}</p>
        </>
      )}

      <table style={{ width: "100%", marginTop: 48, fontSize: 13, textAlign: "center" }}>
        <tbody>
          <tr>
            <td style={{ width: "50%" }}>
              <b>BÊN A (STUDIO)</b>
              <div style={{ height: 70 }} />
              <div>{studioName}</div>
            </td>
            <td style={{ width: "50%" }}>
              <b>BÊN B (KHÁCH HÀNG)</b>
              <div style={{ height: 70, display: "flex", alignItems: "center", justifyContent: "center" }}>
                {contract.client_signature && (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={contract.client_signature} alt="" style={{ height: 64 }} />
                )}
              </div>
              <div>{contract.client_signed_name || contract.client_name || ""}</div>
              {contract.client_signed_at && (
                <div style={{ fontSize: 11, color: "#555" }}>Ký ngày {new Date(contract.client_signed_at).toLocaleDateString("vi-VN")}</div>
              )}
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  );
}

"use client";

import { useState } from "react";
import { Check, MessageSquare, ShieldCheck, Lock, Facebook, Phone, Mail, User as UserIcon, Sparkles } from "lucide-react";
import {
  vnd,
  QUOTE_STATUS_LABEL,
  quoteSelectedTotal,
  type StudioQuote,
  type QuoteItem,
  type QuoteAdjustment,
} from "@/lib/types";
import { computeRoundedDeposit, depositRatio } from "@/lib/quote-deposit";

export default function QuoteClientView({
  quote,
  initialItems,
  initialAdjustments,
  studioName,
  studioCanContract,
}: {
  quote: StudioQuote;
  initialItems: QuoteItem[];
  initialAdjustments: QuoteAdjustment[];
  studioName: string;
  studioCanContract: boolean;
}) {
  const [items, setItems] = useState(initialItems);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [message, setMessage] = useState("");
  const [sending, setSending] = useState(false);
  const [accepting, setAccepting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [accepted, setAccepted] = useState(quote.status === "accepted" || quote.status === "converted");
  const [autoContractCreated, setAutoContractCreated] = useState(quote.status === "converted");

  // Client-info form (pre-filled with whatever the studio already entered).
  const [clientName, setClientName] = useState(quote.client_name || "");
  const [clientPhone, setClientPhone] = useState(quote.client_phone || "");
  const [clientEmail, setClientEmail] = useState(quote.client_email || "");
  const [clientFacebook, setClientFacebook] = useState(quote.client_facebook || "");
  const [autoCreate, setAutoCreate] = useState(studioCanContract);

  const locked = accepted || quote.status === "cancelled" || quote.status === "expired";
  const total = quoteSelectedTotal(items);
  const deposit = computeRoundedDeposit(total);
  const depositPct = depositRatio(total, deposit);

  const phoneDigits = clientPhone.replace(/\s+/g, "");
  const phoneValid = /^[0-9]{9,11}$/.test(phoneDigits);
  const formValid = clientName.trim().length > 0 && phoneValid;

  async function toggleItem(it: QuoteItem) {
    if (!it.is_optional || locked) return;
    const next = !it.selected;
    setItems((arr) => arr.map((i) => (i.id === it.id ? { ...i, selected: next } : i)));
    setError(null);
    try {
      const r = await fetch(`/api/quote/${quote.client_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "toggle", item_id: it.id, selected: next }),
      });
      if (!r.ok) throw new Error((await r.json()).error || "Lỗi");
    } catch (e) {
      setItems((arr) => arr.map((i) => (i.id === it.id ? { ...i, selected: it.selected } : i)));
      setError(e instanceof Error ? e.message : "Lỗi");
    }
  }

  async function sendAdjustment() {
    if (!message.trim() || locked) return;
    setSending(true);
    setError(null);
    try {
      const r = await fetch(`/api/quote/${quote.client_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "adjust", message: message.trim() }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Lỗi gửi");
      setAdjustments((arr) => [...arr, data.adjustment as QuoteAdjustment]);
      setMessage("");
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setSending(false);
    }
  }

  async function accept() {
    if (locked || !formValid) return;
    const confirmMsg =
      `Xác nhận đồng ý báo giá này?\n\n` +
      `Tổng tiền: ${vnd(total)}\n` +
      `Cọc đề xuất: ${vnd(deposit)}\n` +
      (autoCreate && studioCanContract
        ? "✅ Studio sẽ TỰ ĐỘNG tạo hợp đồng cho bạn ngay sau khi xác nhận.\n"
        : "Studio sẽ liên hệ riêng để gửi hợp đồng.\n");
    if (!confirm(confirmMsg)) return;
    setAccepting(true);
    setError(null);
    try {
      const r = await fetch(`/api/quote/${quote.client_token}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          action: "accept",
          client_name: clientName.trim(),
          client_phone: phoneDigits,
          client_email: clientEmail.trim(),
          client_facebook: clientFacebook.trim(),
          auto_create_contract: autoCreate && studioCanContract,
        }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error || "Lỗi");
      setAccepted(true);
      setAutoContractCreated(!!data.auto_created);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi");
    } finally {
      setAccepting(false);
    }
  }

  return (
    <main className="min-h-screen px-4 py-8 md:px-6 md:py-12" data-testid="quote-client-page">
      <div className="mx-auto max-w-3xl space-y-6">
        <header className="text-center">
          <p className="text-xs uppercase tracking-widest" style={{ color: "var(--text3)" }}>{studioName}</p>
          <h1 className="mt-2 font-serif text-3xl font-medium md:text-4xl">{quote.title}</h1>
          {quote.code && <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>Mã: {quote.code}</p>}
          <span
            className="mt-3 inline-block rounded-full px-3 py-1 text-xs"
            style={{ background: "var(--surface2)", color: accepted ? "#34d399" : "var(--text2)" }}
            data-testid="quote-status-badge"
          >
            {QUOTE_STATUS_LABEL[accepted ? "accepted" : quote.status]}
          </span>
        </header>

        {quote.intro && (
          <section className="card p-5">
            <p className="whitespace-pre-wrap text-sm" style={{ color: "var(--text2)" }}>{quote.intro}</p>
          </section>
        )}

        {(quote.event_date || quote.location) && (
          <section className="card p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>Sự kiện</h2>
            <dl className="mt-2 grid gap-2 text-sm md:grid-cols-2">
              {quote.event_date && (
                <div><dt className="opacity-60">Ngày:</dt><dd>{new Date(quote.event_date).toLocaleDateString("vi-VN")}</dd></div>
              )}
              {quote.location && (
                <div><dt className="opacity-60">Địa điểm:</dt><dd>{quote.location}</dd></div>
              )}
            </dl>
          </section>
        )}

        <section className="card p-5">
          <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>Hạng mục báo giá</h2>
          <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
            Bấm vào hạng mục có ô vuông để chọn/bỏ. Hạng mục khoá <Lock size={10} className="inline" /> là bắt buộc.
          </p>
          <div className="mt-3 space-y-2">
            {items.map((it) => {
              const isOn = !it.is_optional || it.selected;
              return (
                <button
                  key={it.id}
                  onClick={() => toggleItem(it)}
                  disabled={!it.is_optional || locked}
                  className="w-full rounded-lg border p-3 text-left transition"
                  style={{
                    borderColor: isOn ? "var(--accent)" : "var(--border)",
                    background: isOn ? "rgba(199,167,107,0.06)" : "transparent",
                    cursor: it.is_optional && !locked ? "pointer" : "default",
                    opacity: isOn ? 1 : 0.55,
                  }}
                  data-testid={`quote-item-${it.id}`}
                >
                  <div className="flex items-start gap-3">
                    <div
                      className="mt-0.5 grid h-5 w-5 flex-shrink-0 place-items-center rounded border"
                      style={{ borderColor: isOn ? "var(--accent)" : "var(--text3)", background: isOn ? "var(--accent)" : "transparent" }}
                    >
                      {!it.is_optional ? <Lock size={11} color="#000" /> : isOn ? <Check size={12} color="#000" /> : null}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium">{it.name}</p>
                      {it.description && <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>{it.description}</p>}
                      <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>{it.qty} × {vnd(it.unit_price)}</p>
                    </div>
                    <p className="text-sm font-medium text-accent">{vnd((it.qty || 0) * (it.unit_price || 0))}</p>
                  </div>
                </button>
              );
            })}
          </div>
          <div className="mt-4 space-y-1 border-t pt-4 text-right" style={{ borderColor: "var(--border)" }}>
            <p className="text-2xl font-medium text-accent" data-testid="quote-client-total">{vnd(total)}</p>
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              Cọc đề xuất (~{depositPct.toFixed(0)}%, làm tròn 500K): <b style={{ color: "var(--text2)" }}>{vnd(deposit)}</b>
            </p>
          </div>
        </section>

        {!locked && (
          <section className="card p-5" data-testid="quote-adjust-section">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              <MessageSquare size={12} className="inline" /> Yêu cầu chỉnh sửa
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
              Nếu cần thay đổi giá / thêm bớt hạng mục / điều khác, ghi rõ ở đây.
            </p>
            <textarea
              className="input mt-2"
              rows={3}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Vd: Em muốn bớt khoản makeup, thêm 1 photographer phụ…"
              data-testid="quote-adjust-input"
            />
            <button onClick={sendAdjustment} disabled={sending || !message.trim()} className="btn-ghost mt-2 text-xs" data-testid="quote-adjust-send">
              {sending ? "Đang gửi…" : "Gửi yêu cầu"}
            </button>
          </section>
        )}

        {adjustments.length > 0 && (
          <section className="card p-5">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>Trao đổi</h2>
            <div className="mt-3 space-y-2">
              {adjustments.map((a) => (
                <div
                  key={a.id}
                  className="rounded-md p-3 text-sm"
                  style={{ background: a.author === "client" ? "var(--surface2)" : "rgba(199,167,107,0.08)" }}
                >
                  <p className="text-xs" style={{ color: "var(--text3)" }}>
                    {a.author === "client" ? "Bạn" : studioName} · {new Date(a.created_at).toLocaleString("vi-VN")}
                  </p>
                  <p className="mt-1 whitespace-pre-wrap">{a.message}</p>
                </div>
              ))}
            </div>
          </section>
        )}

        {!locked && (
          <section className="card p-5" data-testid="quote-accept-form">
            <h2 className="text-xs font-medium uppercase tracking-wider" style={{ color: "var(--text3)" }}>
              <ShieldCheck size={12} className="inline" /> Thông tin của bạn
            </h2>
            <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
              Vui lòng điền để studio liên hệ và (nếu chọn) tự tạo hợp đồng.
            </p>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
              <ClientField icon={<UserIcon size={14} />} label="Họ và tên *">
                <input
                  className="input"
                  value={clientName}
                  onChange={(e) => setClientName(e.target.value)}
                  placeholder="Nguyễn Văn A"
                  data-testid="accept-name"
                />
              </ClientField>
              <ClientField icon={<Phone size={14} />} label="Số điện thoại *">
                <input
                  className="input"
                  value={clientPhone}
                  onChange={(e) => setClientPhone(e.target.value)}
                  placeholder="0901234567"
                  inputMode="numeric"
                  data-testid="accept-phone"
                />
                {clientPhone && !phoneValid && (
                  <p className="mt-1 text-[11px] text-red-400">SĐT phải có 9–11 chữ số.</p>
                )}
              </ClientField>
              <ClientField icon={<Mail size={14} />} label="Email">
                <input className="input" type="email" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} placeholder="abc@gmail.com" data-testid="accept-email" />
              </ClientField>
              <ClientField icon={<Facebook size={14} />} label="Link Facebook">
                <input className="input" value={clientFacebook} onChange={(e) => setClientFacebook(e.target.value)} placeholder="https://facebook.com/..." data-testid="accept-facebook" />
              </ClientField>
            </div>

            {studioCanContract && (
              <label className="mt-4 flex cursor-pointer items-start gap-3 rounded-lg border p-3" style={{ borderColor: autoCreate ? "var(--accent)" : "var(--border)", background: autoCreate ? "rgba(199,167,107,0.06)" : "transparent" }}>
                <input
                  type="checkbox"
                  checked={autoCreate}
                  onChange={(e) => setAutoCreate(e.target.checked)}
                  className="mt-0.5 h-4 w-4 accent-current"
                  style={{ accentColor: "var(--accent)" }}
                  data-testid="accept-auto-create"
                />
                <div className="text-sm">
                  <p className="font-medium">
                    <Sparkles size={12} className="mr-1 inline text-accent" />
                    Tự động tạo hợp đồng cho mình
                  </p>
                  <p className="mt-0.5 text-xs" style={{ color: "var(--text3)" }}>
                    Khi xác nhận, hệ thống sẽ tự tạo hợp đồng dựa trên báo giá này (kèm hạng mục đã chọn và mức cọc đề xuất). Studio có thể chỉnh thêm điều khoản trước khi gửi cho bạn ký.
                  </p>
                </div>
              </label>
            )}
          </section>
        )}

        {error && <p className="text-sm text-red-400" data-testid="quote-error">{error}</p>}

        {!locked ? (
          <button
            onClick={accept}
            disabled={accepting || items.length === 0 || !formValid}
            className="btn-primary w-full py-4 text-base"
            data-testid="quote-accept-btn"
          >
            <ShieldCheck size={18} /> {accepting ? "Đang xử lý…" : "Tôi đồng ý với báo giá này"}
          </button>
        ) : accepted ? (
          <div className="rounded-lg p-5 text-center" style={{ background: "rgba(52,211,153,0.12)", border: "1px solid rgba(52,211,153,0.3)" }} data-testid="quote-accepted-banner">
            <Check size={32} className="mx-auto text-green-400" />
            <p className="mt-2 font-medium text-green-400">Bạn đã đồng ý với báo giá này</p>
            <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>
              {autoContractCreated
                ? `Hợp đồng đã được tạo. ${studioName} sẽ gửi cho bạn ký trong thời gian sớm nhất.`
                : `${studioName} sẽ liên hệ để gửi hợp đồng. Cảm ơn bạn!`}
            </p>
          </div>
        ) : (
          <p className="text-center text-sm" style={{ color: "var(--text3)" }}>Báo giá này không thể thao tác.</p>
        )}

        <footer className="pt-6 text-center text-xs" style={{ color: "var(--text3)" }}>
          Báo giá tạo bởi <b>{studioName}</b> · Vieetjk
        </footer>
      </div>
    </main>
  );
}

function ClientField({ icon, label, children }: { icon: React.ReactNode; label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="label flex items-center gap-1.5">{icon}{label}</span>
      {children}
    </label>
  );
}

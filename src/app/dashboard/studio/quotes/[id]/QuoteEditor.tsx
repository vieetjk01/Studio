"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink, Plus, Trash2, Lock, LockOpen, Send, FileSignature, X, Check } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mainUrl } from "@/lib/hosts";
import {
  vnd,
  QUOTE_STATUS_LABEL,
  quoteSelectedTotal,
  type StudioQuote,
  type QuoteItem,
  type QuoteAdjustment,
} from "@/lib/types";

export default function QuoteEditor({
  quote: initialQuote,
  initialItems,
  initialAdjustments,
}: {
  quote: StudioQuote;
  initialItems: QuoteItem[];
  initialAdjustments: QuoteAdjustment[];
}) {
  const router = useRouter();
  const supabase = createClient();
  const [quote, setQuote] = useState(initialQuote);
  const [items, setItems] = useState(initialItems);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shareUrl = mainUrl(`/q/${quote.client_token}`);
  const total = quoteSelectedTotal(items);
  const grossTotal = items.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0);
  const locked = quote.status === "accepted" || quote.status === "converted";

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2200);
  }

  async function patchQuote(patch: Partial<StudioQuote>) {
    setQuote({ ...quote, ...patch });
    const { error } = await supabase.from("studio_quotes").update(patch).eq("id", quote.id);
    if (error) setErr(error.message);
  }

  async function patchItem(id: string, patch: Partial<QuoteItem>) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
    const { error } = await supabase.from("quote_items").update(patch).eq("id", id);
    if (error) setErr(error.message);
  }

  async function addItem() {
    const position = items.length;
    const { data, error } = await supabase
      .from("quote_items")
      .insert({ quote_id: quote.id, name: "Hạng mục mới", qty: 1, unit_price: 0, is_optional: true, selected: true, position })
      .select("*")
      .single();
    if (error || !data) {
      setErr(error?.message || "Không thêm được");
      return;
    }
    setItems((arr) => [...arr, data as QuoteItem]);
  }

  async function deleteItem(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    await supabase.from("quote_items").delete().eq("id", id);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    flash("Đã copy link!");
  }

  async function markSent() {
    setBusy(true);
    await patchQuote({ status: "sent" });
    setBusy(false);
    flash("Đã đánh dấu là 'Đã gửi'.");
  }

  async function cancel() {
    if (!confirm("Hủy báo giá này?")) return;
    await patchQuote({ status: "cancelled" });
    flash("Đã hủy báo giá.");
  }

  async function convertToContract() {
    if (!confirm(`Tạo hợp đồng từ báo giá này?\n\nTổng tiền: ${vnd(total)}\nCọc đề xuất: ${vnd(Math.round((total * quote.deposit_percent) / 100))}`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/quote/${quote.id}/convert`, { method: "POST" });
      const data = await r.json();
      if (!r.ok || !data.contract_id) throw new Error(data.error || "Tạo hợp đồng thất bại");
      flash("Đã tạo hợp đồng. Đang chuyển trang…");
      setTimeout(() => router.push(`/dashboard/studio/contracts/${data.contract_id}`), 600);
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi không xác định");
      setBusy(false);
    }
  }

  async function resolveAdjustment(id: string, resolved: boolean) {
    setAdjustments((arr) => arr.map((a) => (a.id === id ? { ...a, resolved } : a)));
    await supabase.from("quote_adjustments").update({ resolved }).eq("id", id);
  }

  const pendingAdj = adjustments.filter((a) => !a.resolved && a.author === "client");

  return (
    <div className="space-y-6" data-testid="quote-edit-page">
      <header className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Link href="/dashboard/studio/quotes" className="btn-ghost px-2 py-1.5"><ArrowLeft size={14} /></Link>
          <div>
            <h1 className="font-serif text-2xl font-medium">{quote.title}</h1>
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              {quote.code || "—"} • <span className="text-accent">{QUOTE_STATUS_LABEL[quote.status]}</span>
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button onClick={copyLink} className="btn-ghost px-3 py-2 text-xs" data-testid="quote-copy-link">
            <Copy size={12} /> Copy link khách
          </button>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">
            <ExternalLink size={12} /> Xem trang khách
          </a>
          {quote.status === "draft" && (
            <button onClick={markSent} disabled={busy} className="btn-primary text-xs" data-testid="quote-mark-sent">
              <Send size={12} /> Đánh dấu đã gửi
            </button>
          )}
          {quote.status === "accepted" && !quote.contract_id && (
            <button onClick={convertToContract} disabled={busy} className="btn-primary text-xs" data-testid="quote-convert">
              <FileSignature size={12} /> Tạo hợp đồng
            </button>
          )}
          {quote.contract_id && (
            <Link href={`/dashboard/studio/contracts/${quote.contract_id}`} className="btn-primary text-xs">
              <FileSignature size={12} /> Mở hợp đồng
            </Link>
          )}
        </div>
      </header>

      {msg && <p className="rounded-md px-3 py-2 text-xs" style={{ background: "#10b98122", color: "#34d399" }}>{msg}</p>}
      {err && <p className="rounded-md px-3 py-2 text-xs" style={{ background: "#ef444422", color: "#fca5a5" }}>{err}</p>}

      {pendingAdj.length > 0 && (
        <section className="card border-l-4 p-5" style={{ borderLeftColor: "#f59e0b" }} data-testid="quote-adjustments">
          <h2 className="text-sm font-medium" style={{ color: "#f59e0b" }}>Khách yêu cầu chỉnh sửa ({pendingAdj.length})</h2>
          <div className="mt-3 space-y-2">
            {pendingAdj.map((a) => (
              <div key={a.id} className="rounded-md p-3" style={{ background: "var(--surface2)" }}>
                <p className="text-sm whitespace-pre-wrap">{a.message}</p>
                <div className="mt-2 flex items-center justify-between text-xs" style={{ color: "var(--text3)" }}>
                  <span>{new Date(a.created_at).toLocaleString("vi-VN")}</span>
                  <button onClick={() => resolveAdjustment(a.id, true)} className="btn-ghost px-2 py-1 text-xs">
                    <Check size={10} /> Đã xử lý
                  </button>
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      <section className="card p-5">
        <h2 className="text-sm font-medium" style={{ color: "var(--text2)" }}>Thông tin chung</h2>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Tiêu đề báo giá">
            <input className="input" value={quote.title} disabled={locked} onChange={(e) => patchQuote({ title: e.target.value })} />
          </Field>
          <Field label="Tên khách">
            <input className="input" value={quote.client_name || ""} disabled={locked} onChange={(e) => patchQuote({ client_name: e.target.value })} />
          </Field>
          <Field label="SĐT">
            <input className="input" value={quote.client_phone || ""} disabled={locked} onChange={(e) => patchQuote({ client_phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={quote.client_email || ""} disabled={locked} onChange={(e) => patchQuote({ client_email: e.target.value })} />
          </Field>
          <Field label="Ngày sự kiện">
            <input type="date" className="input" value={quote.event_date || ""} disabled={locked} onChange={(e) => patchQuote({ event_date: e.target.value || null })} />
          </Field>
          <Field label="Địa điểm">
            <input className="input" value={quote.location || ""} disabled={locked} onChange={(e) => patchQuote({ location: e.target.value })} />
          </Field>
          <Field label="Tỷ lệ cọc (%)">
            <input type="number" min={0} max={100} className="input" value={quote.deposit_percent} disabled={locked} onChange={(e) => patchQuote({ deposit_percent: Number(e.target.value) || 0 })} />
          </Field>
        </div>
        <Field label="Lời chào / Giới thiệu" className="mt-3">
          <textarea className="input" rows={3} value={quote.intro || ""} disabled={locked} onChange={(e) => patchQuote({ intro: e.target.value })} />
        </Field>
      </section>

      <section className="card p-5">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-medium" style={{ color: "var(--text2)" }}>Hạng mục</h2>
          {!locked && (
            <button onClick={addItem} className="btn-ghost px-2.5 py-1.5 text-xs"><Plus size={12} /> Thêm</button>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-lg border p-3"
              style={{ borderColor: "var(--border)", opacity: it.is_optional && !it.selected ? 0.5 : 1 }}
              data-testid={`quote-edit-item-${it.id}`}
            >
              <div className="grid gap-2 md:grid-cols-12">
                <input
                  className="input md:col-span-5"
                  value={it.name}
                  disabled={locked}
                  onChange={(e) => patchItem(it.id, { name: e.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  className="input md:col-span-2"
                  value={it.qty}
                  disabled={locked}
                  onChange={(e) => patchItem(it.id, { qty: Number(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  min={0}
                  className="input md:col-span-3"
                  value={it.unit_price}
                  disabled={locked}
                  onChange={(e) => patchItem(it.id, { unit_price: Number(e.target.value) || 0 })}
                />
                <div className="flex items-center gap-1 md:col-span-2">
                  <button
                    onClick={() => patchItem(it.id, { is_optional: !it.is_optional })}
                    className="btn-ghost flex-1 px-2 py-1.5 text-xs"
                    disabled={locked}
                  >
                    {it.is_optional ? <LockOpen size={12} /> : <Lock size={12} />}
                    {it.is_optional ? "Tuỳ chọn" : "Bắt buộc"}
                  </button>
                  {!locked && (
                    <button onClick={() => deleteItem(it.id)} className="btn-ghost px-2 py-1.5" title="Xoá">
                      <Trash2 size={12} />
                    </button>
                  )}
                </div>
              </div>
              <input
                className="input mt-2"
                value={it.description || ""}
                disabled={locked}
                placeholder="Mô tả (tuỳ chọn)"
                onChange={(e) => patchItem(it.id, { description: e.target.value })}
              />
              <p className="mt-1 flex items-center justify-between text-xs" style={{ color: "var(--text3)" }}>
                <span>
                  {it.is_optional ? (it.selected ? "✓ Khách đã chọn" : "✗ Khách bỏ chọn") : "Bắt buộc"}
                </span>
                <span>Thành tiền: <b style={{ color: "var(--text)" }}>{vnd((it.qty || 0) * (it.unit_price || 0))}</b></span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-end gap-1 text-sm" style={{ color: "var(--text2)" }}>
          <p>Tổng gốc (tất cả): {vnd(grossTotal)}</p>
          <p>
            <b className="text-base text-accent">Khách đang chọn: {vnd(total)}</b>
          </p>
          <p className="text-xs">Cọc đề xuất ({quote.deposit_percent}%): {vnd(Math.round((total * quote.deposit_percent) / 100))}</p>
        </div>
      </section>

      {!locked && quote.status !== "cancelled" && (
        <button onClick={cancel} className="btn-ghost text-xs" style={{ color: "var(--text3)" }}>
          <X size={12} /> Hủy báo giá này
        </button>
      )}
    </div>
  );
}

function Field({ label, className = "", children }: { label: string; className?: string; children: React.ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowLeft, Copy, ExternalLink, Plus, Trash2, Lock, LockOpen, Send, FileSignature, X, Check, Save, Tag, CloudOff } from "lucide-react";
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
import { computeRoundedDeposit, depositRatio } from "@/lib/quote-deposit";

type EditableQuoteFields = Pick<
  StudioQuote,
  "title" | "client_name" | "client_phone" | "client_email" | "client_facebook" | "event_date" | "location" | "intro"
>;

const FIELD_KEYS: (keyof EditableQuoteFields)[] = [
  "title", "client_name", "client_phone", "client_email", "client_facebook", "event_date", "location", "intro",
];

function pickFields(q: StudioQuote): EditableQuoteFields {
  return {
    title: q.title,
    client_name: q.client_name,
    client_phone: q.client_phone,
    client_email: q.client_email,
    client_facebook: q.client_facebook,
    event_date: q.event_date,
    location: q.location,
    intro: q.intro,
  };
}

export default function QuoteEditor({
  quote: initialQuote,
  initialItems,
  initialAdjustments,
  canConvert,
}: {
  quote: StudioQuote;
  initialItems: QuoteItem[];
  initialAdjustments: QuoteAdjustment[];
  canConvert: boolean;
}) {
  const router = useRouter();
  const supabase = createClient();
  const [quote, setQuote] = useState(initialQuote);
  const [items, setItems] = useState(initialItems);
  const [savedFields, setSavedFields] = useState<EditableQuoteFields>(pickFields(initialQuote));
  const [savedItems, setSavedItems] = useState<QuoteItem[]>(initialItems);
  const [adjustments, setAdjustments] = useState(initialAdjustments);
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);
  const [err, setErr] = useState<string | null>(null);

  const shareUrl = mainUrl(`/q/${quote.client_token}`);
  const total = quoteSelectedTotal(items);
  const grossTotal = items.reduce(
    (s, i) => (i.is_discount ? s : s + (i.qty || 0) * (i.unit_price || 0)),
    0,
  );
  const discountTotal = items.reduce(
    (s, i) => (i.is_discount ? s + (i.qty || 0) * (i.unit_price || 0) : s),
    0,
  );
  const deposit = computeRoundedDeposit(total);
  const depositPct = depositRatio(total, deposit);
  const locked = quote.status === "accepted" || quote.status === "converted";

  // Dirty = any editable field differs from its last-saved snapshot, or any
  // item field differs from the matching saved item.
  const fieldsDirty = FIELD_KEYS.some((k) => (quote[k] ?? "") !== (savedFields[k] ?? ""));
  const itemsDirty = items.some((it) => {
    const saved = savedItems.find((s) => s.id === it.id);
    if (!saved) return true; // newly inserted but not yet round-tripped? shouldn't happen
    return (
      it.name !== saved.name ||
      it.description !== saved.description ||
      it.qty !== saved.qty ||
      it.unit_price !== saved.unit_price ||
      it.is_optional !== saved.is_optional ||
      it.is_discount !== saved.is_discount ||
      it.position !== saved.position
    );
  });
  const dirty = fieldsDirty || itemsDirty;

  // Warn before navigating away with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const handler = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = "";
    };
    window.addEventListener("beforeunload", handler);
    return () => window.removeEventListener("beforeunload", handler);
  }, [dirty]);

  function flash(text: string) {
    setMsg(text);
    setTimeout(() => setMsg(null), 2200);
  }

  function patchLocal(patch: Partial<StudioQuote>) {
    setQuote((q) => ({ ...q, ...patch }));
  }
  function patchItemLocal(id: string, patch: Partial<QuoteItem>) {
    setItems((arr) => arr.map((it) => (it.id === id ? { ...it, ...patch } : it)));
  }

  async function saveAll() {
    if (locked || saving) return;
    setSaving(true);
    setErr(null);
    try {
      // 1) Field-level patch on studio_quotes if any field changed.
      if (fieldsDirty) {
        const patch: Partial<StudioQuote> = {};
        FIELD_KEYS.forEach((k) => {
          // Send null for empty strings on optional text columns.
          patch[k] = (quote[k] ?? null) as never;
        });
        const { error } = await supabase.from("studio_quotes").update(patch).eq("id", quote.id);
        if (error) throw new Error(error.message);
      }
      // 2) Per-item patch for any dirty items.
      const tasks: Promise<{ error: unknown } | null>[] = [];
      items.forEach((it) => {
        const saved = savedItems.find((s) => s.id === it.id);
        if (
          saved &&
          it.name === saved.name &&
          it.description === saved.description &&
          it.qty === saved.qty &&
          it.unit_price === saved.unit_price &&
          it.is_optional === saved.is_optional &&
          it.is_discount === saved.is_discount &&
          it.position === saved.position
        ) {
          return;
        }
        tasks.push(
          supabase
            .from("quote_items")
            .update({
              name: it.name,
              description: it.description,
              qty: it.qty,
              unit_price: it.unit_price,
              is_optional: it.is_optional,
              is_discount: it.is_discount,
              position: it.position,
            })
            .eq("id", it.id) as unknown as Promise<{ error: unknown }>,
        );
      });
      const results = await Promise.all(tasks);
      const firstErr = results.find((r) => r && (r as { error: unknown }).error);
      if (firstErr) throw new Error(String((firstErr as { error: { message?: string } }).error?.message ?? "Lỗi lưu hạng mục"));

      setSavedFields(pickFields(quote));
      setSavedItems(items);
      flash("✓ Đã lưu thay đổi");
    } catch (e) {
      setErr(e instanceof Error ? e.message : "Lỗi không xác định");
    } finally {
      setSaving(false);
    }
  }

  async function patchQuoteImmediate(patch: Partial<StudioQuote>) {
    // Used for status changes — don't get batched with editable fields.
    setQuote((q) => ({ ...q, ...patch }));
    const { error } = await supabase.from("studio_quotes").update(patch).eq("id", quote.id);
    if (error) setErr(error.message);
  }

  async function addItem(asDiscount: boolean) {
    const position = items.length;
    const { data, error } = await supabase
      .from("quote_items")
      .insert({
        quote_id: quote.id,
        name: asDiscount ? "Giảm giá combo" : "Hạng mục mới",
        qty: 1,
        unit_price: asDiscount ? 500000 : 0,
        is_optional: !asDiscount,        // discounts are mandatory by default
        is_discount: asDiscount,
        selected: true,
        position,
      })
      .select("*")
      .single();
    if (error || !data) {
      setErr(error?.message || "Không thêm được");
      return;
    }
    setItems((arr) => [...arr, data as QuoteItem]);
    setSavedItems((arr) => [...arr, data as QuoteItem]);
  }

  async function deleteItem(id: string) {
    setItems((arr) => arr.filter((it) => it.id !== id));
    setSavedItems((arr) => arr.filter((it) => it.id !== id));
    await supabase.from("quote_items").delete().eq("id", id);
  }

  async function copyLink() {
    await navigator.clipboard.writeText(shareUrl);
    flash("Đã copy link!");
  }

  async function markSent() {
    setBusy(true);
    await patchQuoteImmediate({ status: "sent" });
    setBusy(false);
    flash("Đã đánh dấu là 'Đã gửi'.");
  }

  async function cancel() {
    if (!confirm("Hủy báo giá này?")) return;
    await patchQuoteImmediate({ status: "cancelled" });
    flash("Đã hủy báo giá.");
  }

  async function convertToContract() {
    if (!confirm(`Tạo hợp đồng từ báo giá này?\n\nTổng tiền: ${vnd(total)}\nCọc đề xuất: ${vnd(deposit)}`)) return;
    setBusy(true);
    setErr(null);
    try {
      const r = await fetch(`/api/quote-convert/${quote.id}`, { method: "POST" });
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
              {dirty && !locked && (
                <span className="ml-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#f59e0b22", color: "#f59e0b" }}>
                  <CloudOff size={10} /> Chưa lưu
                </span>
              )}
            </p>
          </div>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          {!locked && (
            <button
              onClick={saveAll}
              disabled={!dirty || saving}
              className="btn-primary text-xs"
              data-testid="quote-save-btn"
            >
              <Save size={12} /> {saving ? "Đang lưu…" : dirty ? "Lưu thay đổi" : "Đã lưu"}
            </button>
          )}
          <button onClick={copyLink} className="btn-ghost px-3 py-2 text-xs" data-testid="quote-copy-link">
            <Copy size={12} /> Copy link khách
          </button>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">
            <ExternalLink size={12} /> Xem trang khách
          </a>
          {quote.status === "draft" && !dirty && (
            <button onClick={markSent} disabled={busy} className="btn-primary text-xs" data-testid="quote-mark-sent">
              <Send size={12} /> Đánh dấu đã gửi
            </button>
          )}
          {quote.status === "accepted" && !quote.contract_id && canConvert && (
            <button onClick={convertToContract} disabled={busy} className="btn-primary text-xs" data-testid="quote-convert">
              <FileSignature size={12} /> Tạo hợp đồng
            </button>
          )}
          {quote.status === "accepted" && !quote.contract_id && !canConvert && (
            <span className="rounded-md px-2 py-1.5 text-xs" style={{ background: "var(--surface2)", color: "var(--text3)" }} data-testid="quote-convert-upsell">
              Khách đã đồng ý — nâng cấp gói Studio để tạo hợp đồng
            </span>
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
        <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
          {locked ? "Báo giá đã chốt — không thể chỉnh sửa." : "Bạn có thể chỉnh sửa thoải mái khi khách chưa đồng ý. Nhớ bấm Lưu sau khi sửa."}
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Tiêu đề báo giá">
            <input className="input" value={quote.title} disabled={locked} onChange={(e) => patchLocal({ title: e.target.value })} />
          </Field>
          <Field label="Tên khách">
            <input className="input" value={quote.client_name || ""} disabled={locked} onChange={(e) => patchLocal({ client_name: e.target.value })} />
          </Field>
          <Field label="SĐT">
            <input className="input" value={quote.client_phone || ""} disabled={locked} onChange={(e) => patchLocal({ client_phone: e.target.value })} />
          </Field>
          <Field label="Email">
            <input className="input" type="email" value={quote.client_email || ""} disabled={locked} onChange={(e) => patchLocal({ client_email: e.target.value })} />
          </Field>
          <Field label="Link Facebook">
            <input className="input" value={quote.client_facebook || ""} disabled={locked} placeholder="https://facebook.com/..." onChange={(e) => patchLocal({ client_facebook: e.target.value })} />
          </Field>
          <Field label="Ngày sự kiện">
            <input type="date" className="input" value={quote.event_date || ""} disabled={locked} onChange={(e) => patchLocal({ event_date: e.target.value || null })} />
          </Field>
          <Field label="Địa điểm">
            <input className="input" value={quote.location || ""} disabled={locked} onChange={(e) => patchLocal({ location: e.target.value })} />
          </Field>
        </div>
        <Field label="Lời chào / Giới thiệu" className="mt-3">
          <textarea className="input" rows={3} value={quote.intro || ""} disabled={locked} onChange={(e) => patchLocal({ intro: e.target.value })} />
        </Field>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium" style={{ color: "var(--text2)" }}>Hạng mục</h2>
          {!locked && (
            <div className="flex items-center gap-1.5">
              <button onClick={() => addItem(false)} className="btn-ghost px-2.5 py-1.5 text-xs">
                <Plus size={12} /> Thêm hạng mục
              </button>
              <button onClick={() => addItem(true)} className="btn-ghost px-2.5 py-1.5 text-xs" style={{ color: "#fb923c" }} data-testid="quote-add-discount">
                <Tag size={12} /> Thêm giảm giá
              </button>
            </div>
          )}
        </div>
        <div className="mt-3 space-y-2">
          {items.map((it) => (
            <div
              key={it.id}
              className="rounded-lg border p-3"
              style={{
                borderColor: it.is_discount ? "#fb923c55" : "var(--border)",
                background: it.is_discount ? "rgba(251,146,60,0.04)" : "transparent",
                opacity: it.is_optional && !it.selected ? 0.5 : 1,
              }}
              data-testid={`quote-edit-item-${it.id}`}
            >
              {it.is_discount && (
                <p className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#fb923c22", color: "#fb923c" }}>
                  <Tag size={10} /> Khoản giảm giá — trừ vào tổng
                </p>
              )}
              <div className="grid gap-2 md:grid-cols-12">
                <input
                  className="input md:col-span-5"
                  value={it.name}
                  disabled={locked}
                  onChange={(e) => patchItemLocal(it.id, { name: e.target.value })}
                />
                <input
                  type="number"
                  min={1}
                  className="input md:col-span-2"
                  value={it.qty}
                  disabled={locked}
                  onChange={(e) => patchItemLocal(it.id, { qty: Number(e.target.value) || 0 })}
                />
                <input
                  type="number"
                  min={0}
                  className="input md:col-span-3"
                  value={it.unit_price}
                  disabled={locked}
                  onChange={(e) => patchItemLocal(it.id, { unit_price: Number(e.target.value) || 0 })}
                />
                <div className="flex items-center gap-1 md:col-span-2">
                  <button
                    onClick={() => patchItemLocal(it.id, { is_optional: !it.is_optional })}
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
                onChange={(e) => patchItemLocal(it.id, { description: e.target.value })}
              />
              <p className="mt-1 flex items-center justify-between text-xs" style={{ color: "var(--text3)" }}>
                <span>
                  {it.is_optional ? (it.selected ? "✓ Khách đã chọn" : "✗ Khách bỏ chọn") : "Bắt buộc"}
                </span>
                <span style={{ color: it.is_discount ? "#fb923c" : "var(--text3)" }}>
                  {it.is_discount ? "Giảm: " : "Thành tiền: "}
                  <b style={{ color: it.is_discount ? "#fb923c" : "var(--text)" }}>
                    {it.is_discount ? "−" : ""}{vnd((it.qty || 0) * (it.unit_price || 0))}
                  </b>
                </span>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-end gap-1 text-sm" style={{ color: "var(--text2)" }}>
          <p>Tổng hạng mục: {vnd(grossTotal)}</p>
          {discountTotal > 0 && <p style={{ color: "#fb923c" }}>Giảm giá: −{vnd(discountTotal)}</p>}
          <p>
            <b className="text-base text-accent">Khách đang chọn: {vnd(total)}</b>
          </p>
          <p className="text-xs">Cọc đề xuất (~{depositPct.toFixed(0)}%, làm tròn 500K): {vnd(deposit)}</p>
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
    <label className={`field ${className}`}>
      <span className="label">{label}</span>
      {children}
    </label>
  );
}

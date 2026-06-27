"use client";

import { useRouter } from "next/navigation";
import DateInput from "@/components/DateInput";
import { useState } from "react";
import { Plus, Trash2, Lock, LockOpen, ArrowLeft, Tag } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { nextQuoteCode, newShareToken } from "@/lib/contract-code";
import { computeRoundedDeposit, depositRatio } from "@/lib/quote-deposit";
import { fmtDate } from "@/lib/date";
import { vnd } from "@/lib/types";

type Draft = { name: string; description: string; qty: number; unit_price: number; is_optional: boolean; is_discount: boolean; package_group: string };

export default function NewQuoteForm({ ownerId, services = [] }: { ownerId: string; services?: { id: string; name: string }[] }) {
  const router = useRouter();
  const supabase = createClient();
  const [title, setTitle] = useState("");
  const [serviceId, setServiceId] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [clientEmail, setClientEmail] = useState("");
  const [clientFacebook, setClientFacebook] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [location, setLocation] = useState("");
  const [intro, setIntro] = useState("Cảm ơn bạn đã quan tâm. Dưới đây là báo giá chi tiết — bạn có thể chọn/bỏ các hạng mục tuỳ chọn hoặc gửi yêu cầu chỉnh sửa cho mình.");
  const [items, setItems] = useState<Draft[]>([
    { name: "", description: "", qty: 1, unit_price: 0, is_optional: false, is_discount: false, package_group: "" },
  ]);
  const [bulkDiscountAmount, setBulkDiscountAmount] = useState(0);
  const [discountPackageGroup, setDiscountPackageGroup] = useState("");
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const grossTotal = items.reduce((s, i) => (i.is_discount ? s : s + (i.qty || 0) * (i.unit_price || 0)), 0);
  const discountTotal = items.reduce((s, i) => (i.is_discount ? s + (i.qty || 0) * (i.unit_price || 0) : s), 0);
  const total = grossTotal - discountTotal;
  const deposit = computeRoundedDeposit(total);
  const depositPct = depositRatio(total, deposit);
  const packageGroups = Array.from(new Set(items.map((i) => i.package_group.trim()).filter(Boolean)));

  function update(idx: number, patch: Partial<Draft>) {
    setItems((arr) => arr.map((it, i) => (i === idx ? { ...it, ...patch } : it)));
  }
  function add(asDiscount = false) {
    setItems((arr) => [
      ...arr,
      asDiscount
        ? { name: "Giảm giá combo", description: "", qty: 1, unit_price: 500000, is_optional: false, is_discount: true, package_group: "" }
        : { name: "", description: "", qty: 1, unit_price: 0, is_optional: true, is_discount: false, package_group: "" },
    ]);
  }
  function remove(idx: number) {
    setItems((arr) => arr.filter((_, i) => i !== idx));
  }

  async function save() {
    setError(null);
    const cleaned = items.filter((i) => i.name.trim());
    if (cleaned.length === 0) {
      setError("Cần ít nhất 1 hạng mục có tên.");
      return;
    }
    setSaving(true);
    try {
      const code = await nextQuoteCode(supabase, ownerId);
      const token = newShareToken();
      // Auto-title from service + chosen date when the studio didn't type one.
      const svcName = services.find((s) => s.id === serviceId)?.name;
      const autoTitle = `Báo giá${svcName ? ` ${svcName}` : ""} ${fmtDate(eventDate || new Date())}`;
      const { data: quote, error: qErr } = await supabase
        .from("studio_quotes")
        .insert({
          owner_id: ownerId,
          code,
          title: title.trim() || autoTitle,
          client_name: clientName.trim() || null,
          client_phone: clientPhone.trim() || null,
          client_email: clientEmail.trim() || null,
          client_facebook: clientFacebook.trim() || null,
          event_date: eventDate || null,
          location: location.trim() || null,
          intro: intro.trim() || null,
          ...(serviceId ? { service_id: serviceId } : {}),
          client_token: token,
          status: "draft",
          bulk_discount_amount: bulkDiscountAmount || 0,
          discount_package_group: discountPackageGroup.trim() || null,
        })
        .select("id")
        .single();
      if (qErr || !quote) throw new Error(qErr?.message || "Tạo báo giá thất bại");

      const rows = cleaned.map((it, idx) => ({
        quote_id: quote.id,
        name: it.name.trim(),
        description: it.description.trim() || null,
        qty: it.qty || 1,
        unit_price: it.unit_price || 0,
        is_optional: it.is_optional,
        is_discount: it.is_discount,
        package_group: it.package_group.trim() || null,
        selected: true,
        position: idx,
      }));
      const { error: iErr } = await supabase.from("quote_items").insert(rows);
      if (iErr) throw new Error(iErr.message);

      router.push(`/dashboard/studio/quotes/${quote.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Lỗi không xác định");
      setSaving(false);
    }
  }

  return (
    <div className="space-y-6" data-testid="quote-new-page">
      <header className="flex items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <button onClick={() => router.back()} className="btn-ghost px-2 py-1.5"><ArrowLeft size={14} /></button>
          <h1 className="font-serif text-2xl font-medium">Tạo báo giá mới</h1>
        </div>
        <button onClick={save} disabled={saving} className="btn-primary" data-testid="quote-save-btn">
          {saving ? "Đang lưu…" : "Lưu báo giá"}
        </button>
      </header>

      <section className="card p-5">
        <h2 className="text-sm font-medium" style={{ color: "var(--text2)" }}>Thông tin chung</h2>
        <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
          Bạn có thể để trống các ô khách hàng — khách sẽ tự điền khi xác nhận báo giá.
        </p>
        <div className="mt-3 grid gap-3 md:grid-cols-2">
          <Field label="Tiêu đề báo giá">
            <input
              className="input"
              placeholder={`Báo giá${services.find((s) => s.id === serviceId)?.name ? ` ${services.find((s) => s.id === serviceId)?.name}` : ""} ${fmtDate(eventDate || new Date())}`}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              data-testid="quote-title"
            />
          </Field>
          {services.length > 0 && (
            <Field label="Dịch vụ (điều khoản riêng)">
              <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                <option value="">— Không chọn —</option>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </Field>
          )}
          <Field label="Tên khách (nếu đã biết)">
            <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} data-testid="quote-client-name" />
          </Field>
          <Field label="Số điện thoại">
            <input className="input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} inputMode="numeric" data-testid="quote-client-phone" />
          </Field>
          <Field label="Email">
            <input className="input" value={clientEmail} onChange={(e) => setClientEmail(e.target.value)} type="email" />
          </Field>
          <Field label="Link Facebook">
            <input className="input" value={clientFacebook} onChange={(e) => setClientFacebook(e.target.value)} placeholder="https://facebook.com/..." />
          </Field>
          <Field label="Ngày sự kiện">
            <DateInput value={eventDate} onChange={(v) => setEventDate(v)} />
          </Field>
          <Field label="Địa điểm" className="md:col-span-2">
            <input className="input" value={location} onChange={(e) => setLocation(e.target.value)} />
          </Field>
        </div>
        <Field label="Lời chào / Giới thiệu" className="mt-3">
          <textarea className="input" rows={3} value={intro} onChange={(e) => setIntro(e.target.value)} />
        </Field>
        <div className="mt-4 rounded-lg p-3" style={{ background: "var(--surface2)" }}>
          <p className="mb-1 text-xs font-medium" style={{ color: "var(--text2)" }}>Giảm giá theo gói chỉ định (tuỳ chọn)</p>
          <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>
            Đặt “Nhóm gói” cho các hạng mục tuỳ chọn bên dưới để tạo gói (khách chỉ chọn 1 gói). Nếu khách chọn đúng gói chỉ định thì tự động giảm thêm.
          </p>
          <div className="grid gap-2 md:grid-cols-2">
            <Field label="Gói được giảm">
              <select className="input" value={discountPackageGroup} onChange={(e) => setDiscountPackageGroup(e.target.value)}>
                <option value="">— Không áp dụng —</option>
                {packageGroups.map((g) => (
                  <option key={g} value={g}>{g}</option>
                ))}
              </select>
            </Field>
            <Field label="Số tiền giảm (VND)">
              <input type="number" min={0} className="input" value={bulkDiscountAmount} onChange={(e) => setBulkDiscountAmount(Number(e.target.value) || 0)} />
            </Field>
          </div>
          {packageGroups.length === 0 && (
            <p className="mt-2 text-xs" style={{ color: "var(--text3)" }}>Chưa có gói nào — thêm “Nhóm gói” cho hạng mục tuỳ chọn để tạo gói.</p>
          )}
        </div>
      </section>

      <section className="card p-5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h2 className="text-sm font-medium" style={{ color: "var(--text2)" }}>Hạng mục báo giá</h2>
          <div className="flex items-center gap-1.5">
            <button onClick={() => add(false)} className="btn-ghost px-2.5 py-1.5 text-xs" data-testid="quote-item-add"><Plus size={12} /> Thêm hạng mục</button>
            <button onClick={() => add(true)} className="btn-ghost px-2.5 py-1.5 text-xs" style={{ color: "#fb923c" }} data-testid="quote-add-discount"><Tag size={12} /> Thêm giảm giá</button>
          </div>
        </div>
        <p className="mt-1 text-xs" style={{ color: "var(--text3)" }}>
          Bấm <Lock size={10} className="inline" /> để khoá hạng mục bắt buộc (khách không bỏ chọn được), <LockOpen size={10} className="inline" /> cho hạng mục tuỳ chọn.
        </p>
        <div className="mt-3 space-y-2">
          {items.map((it, idx) => (
            <div
              key={idx}
              className="rounded-lg border p-3"
              style={{
                borderColor: it.is_discount ? "#fb923c55" : "var(--border)",
                background: it.is_discount ? "rgba(251,146,60,0.04)" : "transparent",
              }}
              data-testid={`quote-item-${idx}`}
            >
              {it.is_discount && (
                <p className="mb-2 inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-[10px]" style={{ background: "#fb923c22", color: "#fb923c" }}>
                  <Tag size={10} /> Khoản giảm giá — trừ vào tổng
                </p>
              )}
              <div className="grid gap-2 md:grid-cols-12">
                <input className="input md:col-span-5" placeholder={it.is_discount ? "Tên giảm giá" : "Tên hạng mục"} value={it.name} onChange={(e) => update(idx, { name: e.target.value })} data-testid={`quote-item-name-${idx}`} />
                <input type="number" min={1} className="input md:col-span-2" placeholder="SL" value={it.qty} onChange={(e) => update(idx, { qty: Number(e.target.value) || 0 })} />
                <input type="number" min={0} className="input md:col-span-3" placeholder="Đơn giá" value={it.unit_price} onChange={(e) => update(idx, { unit_price: Number(e.target.value) || 0 })} data-testid={`quote-item-price-${idx}`} />
                <div className="flex items-center gap-1 md:col-span-2">
                  <button onClick={() => update(idx, { is_optional: !it.is_optional })} className="btn-ghost flex-1 px-2 py-1.5 text-xs" data-testid={`quote-item-toggle-${idx}`}>
                    {it.is_optional ? <LockOpen size={12} /> : <Lock size={12} />}
                    {it.is_optional ? "Tuỳ chọn" : "Bắt buộc"}
                  </button>
                  <button onClick={() => remove(idx)} className="btn-ghost px-2 py-1.5" title="Xoá"><Trash2 size={12} /></button>
                </div>
              </div>
              <input className="input mt-2" placeholder="Mô tả ngắn (tuỳ chọn)" value={it.description} onChange={(e) => update(idx, { description: e.target.value })} />
              {it.is_optional && !it.is_discount && (
                <input className="input mt-1.5" placeholder="Nhóm gói (VD: goi-co-ban) — để trống nếu không thuộc gói" value={it.package_group} onChange={(e) => update(idx, { package_group: e.target.value })} />
              )}
              <p className="mt-1 text-right text-xs" style={{ color: "var(--text3)" }}>
                {it.is_discount ? "Giảm: " : "Thành tiền: "}
                <b style={{ color: it.is_discount ? "#fb923c" : "var(--text)" }}>
                  {it.is_discount ? "−" : ""}{vnd((it.qty || 0) * (it.unit_price || 0))}
                </b>
              </p>
            </div>
          ))}
        </div>
        <div className="mt-4 flex flex-col items-end gap-1 text-sm">
          <p style={{ color: "var(--text2)" }}>Tổng hạng mục: {vnd(grossTotal)}</p>
          {discountTotal > 0 && <p style={{ color: "#fb923c" }}>Giảm giá: −{vnd(discountTotal)}</p>}
          <p style={{ color: "var(--text2)" }}>Tổng tạm tính: <span className="text-lg font-medium text-accent" data-testid="quote-total">{vnd(total)}</span></p>
          <p className="text-xs" style={{ color: "var(--text3)" }}>
            Cọc đề xuất (~{depositPct.toFixed(0)}%, làm tròn 500K): <b style={{ color: "var(--text2)" }}>{vnd(deposit)}</b>
          </p>
        </div>
      </section>

      {error && <p className="text-sm text-red-400" data-testid="quote-save-error">{error}</p>}
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

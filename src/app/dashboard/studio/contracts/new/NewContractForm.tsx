"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SHOOT_TYPE_LABEL, SHOOT_TYPES, type ShootType } from "@/lib/types";
import { nextContractCode, DEFAULT_TASKS } from "@/lib/contract-code";
import { fullClauseText } from "@/lib/contract-clauses";

export type TemplateOption = {
  id: string;
  name: string;
  shoot_type: ShootType;
  note: string | null;
  contract_template_items: { name: string; qty: number; unit_price: number; position: number }[];
};

export default function NewContractForm({
  ownerId,
  assignTo,
  templates,
}: {
  ownerId: string;
  assignTo: string | null;
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [shootType, setShootType] = useState<ShootType>("photo");
  const [eventDate, setEventDate] = useState("");
  const [depositPct, setDepositPct] = useState(30);
  const [includeClauses, setIncludeClauses] = useState(true);
  const [addChecklist, setAddChecklist] = useState(true);
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  function applyTemplate(id: string) {
    setTemplateId(id);
    const t = templates.find((x) => x.id === id);
    if (t) setShootType(t.shoot_type);
  }

  async function create() {
    setErr(null);
    if (!/^\d{10}$/.test(clientPhone.replace(/\D/g, ""))) {
      setErr("SĐT khách phải đủ 10 số (dùng làm mật khẩu để khách mở cổng hợp đồng).");
      return;
    }
    setSaving(true);
    const supabase = createClient();
    const token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const tpl = templates.find((x) => x.id === templateId);
    const code = await nextContractCode(supabase, ownerId);
    const note = tpl?.note || (includeClauses ? fullClauseText() : null);
    const { data, error } = await supabase
      .from("studio_contracts")
      .insert({
        owner_id: ownerId,
        code,
        title: title.trim() || "Hợp đồng",
        client_name: clientName.trim() || null,
        client_phone: clientPhone.replace(/\D/g, "") || null,
        shoot_type: shootType,
        event_date: eventDate || null,
        note,
        client_token: token,
        ...(assignTo ? { assigned_to: assignTo } : {}),
      })
      .select("id")
      .single();
    if (error || !data) {
      setSaving(false);
      setErr(error?.message || "Không tạo được hợp đồng.");
      return;
    }
    // Copy template line items into the new contract.
    if (tpl && tpl.contract_template_items?.length) {
      const rows = [...tpl.contract_template_items]
        .sort((a, b) => a.position - b.position)
        .map((i, idx) => ({ contract_id: data.id, name: i.name, qty: i.qty, unit_price: i.unit_price, position: idx }));
      await supabase.from("contract_items").insert(rows);
    }
    // Auto-create a deposit instalment from the template total.
    const tplTotal = tpl?.contract_template_items?.reduce((s, i) => s + (i.qty || 0) * (i.unit_price || 0), 0) || 0;
    if (depositPct > 0 && tplTotal > 0) {
      await supabase.from("contract_payment_plan").insert({
        contract_id: data.id,
        label: `Cọc ${depositPct}%`,
        amount: Math.round((tplTotal * depositPct) / 100),
        position: 0,
      });
    }
    // Default post-production checklist.
    if (addChecklist) {
      await supabase.from("contract_tasks").insert(
        DEFAULT_TASKS.map((label, position) => ({ contract_id: data.id, label, position }))
      );
    }
    setSaving(false);
    // Sync to Google Calendar if a date is set (fire-and-forget).
    if (eventDate) {
      fetch("/api/gcal/sync", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ kind: "contract", id: data.id, action: "upsert" }),
      }).catch(() => {});
    }
    router.push(`/dashboard/studio/contracts/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl animate-[vkFade_.5s_ease_both]">
      <Link href="/dashboard/studio/contracts" className="mb-6 inline-flex items-center gap-1.5 text-sm" style={{ color: "var(--text3)" }}>
        <ArrowLeft size={15} /> Hợp đồng
      </Link>
      <h1 className="font-serif text-3xl font-medium">Hợp đồng mới</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
        Tạo nhanh rồi thêm hạng mục, giá &amp; photographer ở bước sau.
      </p>

      <div className="card mt-6 space-y-4 p-6">
        {templates.length > 0 && (
          <div>
            <div className="field">
              <label className="label">Tạo từ mẫu</label>
              <select className="input" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
                <option value="">— Không dùng mẫu —</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.contract_template_items?.length || 0} hạng mục)</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] sm:pl-44" style={{ color: "var(--text3)" }}>
              Chọn mẫu để tự điền hạng mục, giá &amp; điều khoản.
            </p>
          </div>
        )}
        <div className="field">
          <label className="label">Tên hợp đồng</label>
          <input className="input" placeholder="VD: Phóng sự cưới Anh & Hằng" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Tên khách hàng</label>
          <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">SĐT khách (mật khẩu xem HĐ)</label>
          <input className="input" inputMode="numeric" maxLength={15} placeholder="0901234567" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">Loại dịch vụ</label>
          <select className="input" value={shootType} onChange={(e) => setShootType(e.target.value as ShootType)}>
            {SHOOT_TYPES.map((k) => (
              <option key={k} value={k}>{SHOOT_TYPE_LABEL[k]}</option>
            ))}
          </select>
        </div>
        <div className="field">
          <label className="label">Ngày chụp / quay</label>
          <input type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
        </div>
        <div>
          <div className="field">
            <label className="label">Đặt cọc (% giá trị mẫu)</label>
            <input type="number" min={0} max={100} className="input" value={depositPct} onChange={(e) => setDepositPct(Math.max(0, Math.min(100, Number(e.target.value) || 0)))} />
          </div>
          <p className="mt-1 text-[11px] sm:pl-44" style={{ color: "var(--text3)" }}>
            Khi dùng mẫu, tự tạo sẵn đợt &ldquo;Cọc {depositPct}%&rdquo; trong mục Thanh toán. Đặt 0 để bỏ qua.
          </p>
        </div>

        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
            <input type="checkbox" checked={includeClauses} onChange={(e) => setIncludeClauses(e.target.checked)} />
            Kèm điều khoản mẫu (nếu không chọn mẫu HĐ có sẵn điều khoản)
          </label>
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
            <input type="checkbox" checked={addChecklist} onChange={(e) => setAddChecklist(e.target.checked)} />
            Thêm checklist hậu kỳ mặc định ({DEFAULT_TASKS.join(" → ")})
          </label>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button onClick={create} disabled={saving} className="btn-primary w-full">
          {saving ? "Đang tạo…" : "Tạo hợp đồng"}
        </button>
      </div>
    </div>
  );
}

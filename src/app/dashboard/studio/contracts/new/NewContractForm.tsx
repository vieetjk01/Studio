"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SHOOT_TYPE_LABEL, type ShootType } from "@/lib/types";

export type TemplateOption = {
  id: string;
  name: string;
  shoot_type: ShootType;
  note: string | null;
  contract_template_items: { name: string; qty: number; unit_price: number; position: number }[];
};

export default function NewContractForm({
  ownerId,
  templates,
}: {
  ownerId: string;
  templates: TemplateOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [shootType, setShootType] = useState<ShootType>("photo");
  const [eventDate, setEventDate] = useState("");
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
    setSaving(true);
    const supabase = createClient();
    const token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const tpl = templates.find((x) => x.id === templateId);
    const { data, error } = await supabase
      .from("studio_contracts")
      .insert({
        owner_id: ownerId,
        title: title.trim() || "Hợp đồng",
        client_name: clientName.trim() || null,
        client_phone: clientPhone.trim() || null,
        shoot_type: shootType,
        event_date: eventDate || null,
        note: tpl?.note || null,
        client_token: token,
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
    setSaving(false);
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

      <div className="card mt-6 space-y-5 p-6">
        {templates.length > 0 && (
          <div>
            <label className="label">Tạo từ mẫu</label>
            <select className="input" value={templateId} onChange={(e) => applyTemplate(e.target.value)}>
              <option value="">— Không dùng mẫu —</option>
              {templates.map((t) => (
                <option key={t.id} value={t.id}>{t.name} ({t.contract_template_items?.length || 0} hạng mục)</option>
              ))}
            </select>
            <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>
              Chọn mẫu để tự điền hạng mục, giá &amp; điều khoản.
            </p>
          </div>
        )}
        <div>
          <label className="label">Tên hợp đồng</label>
          <input className="input" placeholder="VD: Phóng sự cưới Anh & Hằng" value={title} onChange={(e) => setTitle(e.target.value)} />
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tên khách hàng</label>
            <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
          </div>
          <div>
            <label className="label">SĐT khách (mật khẩu xem HĐ)</label>
            <input className="input" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
          </div>
        </div>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Loại dịch vụ</label>
            <select className="input" value={shootType} onChange={(e) => setShootType(e.target.value as ShootType)}>
              {(Object.keys(SHOOT_TYPE_LABEL) as ShootType[]).map((k) => (
                <option key={k} value={k}>{SHOOT_TYPE_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ngày chụp / quay</label>
            <input type="date" className="input" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
        </div>

        {err && <p className="text-sm text-red-400">{err}</p>}

        <button onClick={create} disabled={saving} className="btn-primary w-full">
          {saving ? "Đang tạo…" : "Tạo hợp đồng"}
        </button>
      </div>
    </div>
  );
}

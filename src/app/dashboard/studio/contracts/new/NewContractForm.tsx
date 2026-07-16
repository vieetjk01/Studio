"use client";

import { useState } from "react";
import DateInput from "@/components/DateInput";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SHOOT_TYPE_LABEL, SHOOT_TYPES, type ShootType } from "@/lib/types";
import { nextContractCode, DEFAULT_TASKS } from "@/lib/contract-code";
import { fullClauseText } from "@/lib/contract-clauses";
import { fmtDate } from "@/lib/date";

export type TemplateOption = {
  id: string;
  name: string;
  shoot_type: ShootType;
  note: string | null;
  contract_template_items: { name: string; qty: number; unit_price: number; position: number }[];
};

export type ServiceOption = { id: string; name: string; clauses: string };

export default function NewContractForm({
  ownerId,
  assignTo,
  templates,
  services = [],
}: {
  ownerId: string;
  assignTo: string | null;
  templates: TemplateOption[];
  services?: ServiceOption[];
}) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [shootType, setShootType] = useState<ShootType>("photo");
  const [serviceId, setServiceId] = useState(services[0]?.id ?? "");
  const [eventDate, setEventDate] = useState("");
  const [addChecklist, setAddChecklist] = useState(true);
  // Thư mục ảnh/video/sản phẩm cho MStudo Desktop (tạo khi hợp đồng đã ký).
  const [makePhoto, setMakePhoto] = useState(true);
  const [makeVideo, setMakeVideo] = useState(false);
  const [templateId, setTemplateId] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const selectedService = services.find((s) => s.id === serviceId) || null;

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
    // Clauses are fixed by the chosen service; fall back to template/default only
    // when no service is selected.
    const note = selectedService?.clauses || tpl?.note || fullClauseText();
    // Default title: "Hợp đồng {loại dịch vụ} {ngày tạo}".
    const autoTitle = selectedService
      ? `Hợp đồng ${selectedService.name} ${fmtDate(new Date())}`
      : `Hợp đồng ${fmtDate(new Date())}`;
    const { data, error } = await supabase
      .from("studio_contracts")
      .insert({
        owner_id: ownerId,
        code,
        title: title.trim() || autoTitle,
        client_name: clientName.trim() || null,
        client_phone: clientPhone.replace(/\D/g, "") || null,
        shoot_type: shootType,
        ...(serviceId ? { service_id: serviceId } : {}),
        event_date: eventDate || null,
        note,
        client_token: token,
        drive_make_photo: makePhoto,
        drive_make_video: makeVideo,
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
          <input
            className="input"
            placeholder={selectedService ? `Hợp đồng ${selectedService.name} ${fmtDate(new Date())}` : "Để trống để tự đặt tên"}
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
          <p className="mt-1 text-[11px] sm:pl-44" style={{ color: "var(--text3)" }}>
            Để trống sẽ tự đặt: <b>Hợp đồng {selectedService?.name || "{loại dịch vụ}"} {fmtDate(new Date())}</b>
          </p>
        </div>
        <div className="field">
          <label className="label">Tên khách hàng</label>
          <input className="input" value={clientName} onChange={(e) => setClientName(e.target.value)} />
        </div>
        <div className="field">
          <label className="label">SĐT khách (mật khẩu xem HĐ)</label>
          <input className="input" inputMode="numeric" maxLength={15} placeholder="0901234567" value={clientPhone} onChange={(e) => setClientPhone(e.target.value)} />
        </div>
        {services.length > 0 ? (
          <div>
            <div className="field">
              <label className="label">Loại dịch vụ</label>
              <select className="input" value={serviceId} onChange={(e) => setServiceId(e.target.value)}>
                {services.map((s) => (
                  <option key={s.id} value={s.id}>{s.name}</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] sm:pl-44" style={{ color: "var(--text3)" }}>
              Điều khoản cố định theo dịch vụ này.{" "}
              <Link href="/dashboard/studio/services" className="hover:underline" style={{ color: "var(--brand, var(--accent))" }}>Sửa điều khoản dịch vụ</Link>
            </p>
          </div>
        ) : (
          <div>
            <div className="field">
              <label className="label">Loại dịch vụ</label>
              <select className="input" value={shootType} onChange={(e) => setShootType(e.target.value as ShootType)}>
                {SHOOT_TYPES.map((k) => (
                  <option key={k} value={k}>{SHOOT_TYPE_LABEL[k]}</option>
                ))}
              </select>
            </div>
            <p className="mt-1 text-[11px] sm:pl-44" style={{ color: "var(--text3)" }}>
              Chưa có dịch vụ nào.{" "}
              <Link href="/dashboard/studio/services" className="hover:underline" style={{ color: "var(--brand, var(--accent))" }}>Tạo dịch vụ &amp; điều khoản</Link>
            </p>
          </div>
        )}
        <div className="field">
          <label className="label">Ngày chụp / quay</label>
          <DateInput value={eventDate} onChange={(v) => setEventDate(v)} />
        </div>
        <div className="space-y-2">
          <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
            <input type="checkbox" checked={addChecklist} onChange={(e) => setAddChecklist(e.target.checked)} />
            Thêm checklist hậu kỳ mặc định ({DEFAULT_TASKS.join(" → ")})
          </label>
        </div>

        <div className="rounded-xl p-4" style={{ background: "var(--surface2)" }}>
          <div className="text-sm font-medium">Thư mục ảnh/video (MStudo Desktop)</div>
          <p className="mt-0.5 text-[11px]" style={{ color: "var(--text3)" }}>
            Khi hợp đồng đã ký, MStudo Desktop tạo thư mục theo tên hợp đồng và tự đồng bộ lên Google Drive.
          </p>
          <div className="mt-2 space-y-2">
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
              <input type="checkbox" checked={makePhoto} onChange={(e) => setMakePhoto(e.target.checked)} />
              Tạo thư mục ảnh (Photo → JPG Goc · Raw · File ChinhSua)
            </label>
            <label className="flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
              <input type="checkbox" checked={makeVideo} onChange={(e) => setMakeVideo(e.target.checked)} />
              Có quay phim — tạo thư mục Video (Video Goc · Video HoanThien)
            </label>
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

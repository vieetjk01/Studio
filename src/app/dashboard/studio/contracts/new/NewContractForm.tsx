"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SHOOT_TYPE_LABEL, type ShootType } from "@/lib/types";

export default function NewContractForm({ ownerId }: { ownerId: string }) {
  const router = useRouter();
  const [title, setTitle] = useState("");
  const [clientName, setClientName] = useState("");
  const [clientPhone, setClientPhone] = useState("");
  const [shootType, setShootType] = useState<ShootType>("photo");
  const [eventDate, setEventDate] = useState("");
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function create() {
    setErr(null);
    setSaving(true);
    const supabase = createClient();
    const token =
      typeof crypto !== "undefined" && crypto.randomUUID
        ? crypto.randomUUID().replace(/-/g, "")
        : Math.random().toString(36).slice(2) + Date.now().toString(36);
    const { data, error } = await supabase
      .from("studio_contracts")
      .insert({
        owner_id: ownerId,
        title: title.trim() || "Hợp đồng",
        client_name: clientName.trim() || null,
        client_phone: clientPhone.trim() || null,
        shoot_type: shootType,
        event_date: eventDate || null,
        client_token: token,
      })
      .select("id")
      .single();
    setSaving(false);
    if (error || !data) {
      setErr(error?.message || "Không tạo được hợp đồng.");
      return;
    }
    router.push(`/dashboard/studio/contracts/${data.id}`);
  }

  return (
    <div className="mx-auto max-w-xl animate-[vkFade_.5s_ease_both]">
      <Link
        href="/dashboard/studio/contracts"
        className="mb-6 inline-flex items-center gap-1.5 text-sm"
        style={{ color: "var(--text3)" }}
      >
        <ArrowLeft size={15} /> Hợp đồng
      </Link>
      <h1 className="font-serif text-3xl font-medium">Hợp đồng mới</h1>
      <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
        Tạo nhanh rồi thêm hạng mục, giá &amp; photographer ở bước sau.
      </p>

      <div className="card mt-6 space-y-5 p-6">
        <div>
          <label className="label">Tên hợp đồng</label>
          <input
            className="input"
            placeholder="VD: Phóng sự cưới Anh & Hằng"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
          />
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
            <select
              className="input"
              value={shootType}
              onChange={(e) => setShootType(e.target.value as ShootType)}
            >
              {(Object.keys(SHOOT_TYPE_LABEL) as ShootType[]).map((k) => (
                <option key={k} value={k}>{SHOOT_TYPE_LABEL[k]}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="label">Ngày chụp / quay</label>
            <input
              type="date"
              className="input"
              value={eventDate}
              onChange={(e) => setEventDate(e.target.value)}
            />
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

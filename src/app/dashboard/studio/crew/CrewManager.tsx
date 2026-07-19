"use client";

import { useState } from "react";
import { Plus, Trash2, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mainUrl } from "@/lib/hosts";
import { CREW_ROLE_LABEL, type StudioCrew, type CrewRole } from "@/lib/types";

export default function CrewManager({
  ownerId,
  initial,
  stats,
}: {
  ownerId: string;
  initial: StudioCrew[];
  stats: Record<string, { total: number; accepted: number; declined: number }>;
}) {
  const supabase = createClient();
  const statFor = (phone: string) => stats[(phone || "").replace(/\D/g, "")] || null;
  const [list, setList] = useState<StudioCrew[]>(initial);
  const [name, setName] = useState("");
  const [phone, setPhone] = useState("");
  const [role, setRole] = useState<CrewRole>("photographer");
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  async function add() {
    setErr(null);
    if (!phone.trim()) {
      setErr("Cần nhập số điện thoại.");
      return;
    }
    setBusy(true);
    const { data, error } = await supabase
      .from("studio_crew")
      .insert({
        owner_id: ownerId,
        name: name.trim(),
        phone: phone.trim(),
        role,
        note: note.trim() || null,
      })
      .select("*")
      .single();
    setBusy(false);
    if (error) {
      setErr(error.code === "23505" ? "Số điện thoại này đã có trong sổ thợ." : error.message);
      return;
    }
    if (data) {
      setList((p) => [...p, data as StudioCrew].sort((a, b) => a.name.localeCompare(b.name)));
      setName("");
      setPhone("");
      setNote("");
      setRole("photographer");
    }
  }

  async function remove(id: string) {
    await supabase.from("studio_crew").delete().eq("id", id);
    setList((p) => p.filter((c) => c.id !== id));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-4">
        <h1 className="font-serif text-2xl font-medium">Sổ thợ</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>
          Lưu photographer / cameramen theo số điện thoại để gán nhanh vào hợp đồng.
          Thợ tự xem việc của mình tại <span style={{ color: "var(--text)" }}>{mainUrl("/crew")}</span>.
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        {/* Add form */}
        <div className="card h-fit p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Thêm thợ</h2>
          <div className="space-y-3">
            <div className="field">
              <label className="label">Tên</label>
              <input className="input" value={name} onChange={(e) => setName(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Số điện thoại</label>
              <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
            </div>
            <div className="field">
              <label className="label">Vai trò</label>
              <select className="input" value={role} onChange={(e) => setRole(e.target.value as CrewRole)}>
                {(Object.keys(CREW_ROLE_LABEL) as CrewRole[]).map((k) => (
                  <option key={k} value={k}>{CREW_ROLE_LABEL[k]}</option>
                ))}
              </select>
            </div>
            <div className="field">
              <label className="label">Ghi chú</label>
              <input className="input" value={note} onChange={(e) => setNote(e.target.value)} />
            </div>
            {err && <p className="text-sm" style={{ color: "var(--danger)" }}>{err}</p>}
            <button onClick={add} disabled={busy} className="btn-primary w-full">
              <Plus size={15} /> {busy ? "Đang thêm…" : "Thêm vào sổ"}
            </button>
          </div>
        </div>

        {/* List */}
        <div className="lg:col-span-2">
          {list.length === 0 ? (
            <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--text3)" }}>
              Chưa có thợ nào trong sổ.
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((c) => (
                <div key={c.id} className="card flex items-center justify-between p-4">
                  <div>
                    <p className="font-medium">{c.name || "(chưa đặt tên)"}</p>
                    <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                      <Phone size={12} /> {c.phone} · {CREW_ROLE_LABEL[c.role] ?? c.role}
                      {c.note ? ` · ${c.note}` : ""}
                    </p>
                    {(() => {
                      const s = statFor(c.phone);
                      if (!s || s.total === 0) return null;
                      const rate = Math.round((s.accepted / s.total) * 100);
                      return (
                        <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>
                          <span style={{ color: "var(--s-green)" }}>{s.accepted} buổi đã nhận</span> · {s.total} lời mời · nhận {rate}%
                          {s.declined ? ` · từ chối ${s.declined}` : ""}
                        </p>
                      );
                    })()}
                  </div>
                  <button onClick={() => remove(c.id)} aria-label="Xoá thợ" className="btn-ghost px-2.5 py-1.5 text-xs">
                    <Trash2 size={14} />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

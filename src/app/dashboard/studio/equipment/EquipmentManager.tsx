"use client";

import { useState } from "react";
import { Plus, Trash2, Camera } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import type { StudioEquipment } from "@/lib/types";

export default function EquipmentManager({
  ownerId,
  initial,
}: {
  ownerId: string;
  initial: StudioEquipment[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<StudioEquipment[]>(initial);
  const [f, setF] = useState({ name: "", category: "", note: "" });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!f.name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("studio_equipment")
      .insert({ owner_id: ownerId, name: f.name.trim(), category: f.category.trim() || null, note: f.note.trim() || null })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setList((p) => [...p, data as StudioEquipment].sort((a, b) => a.name.localeCompare(b.name)));
      setF({ name: "", category: "", note: "" });
    }
  }

  async function remove(id: string) {
    await supabase.from("studio_equipment").delete().eq("id", id);
    setList((p) => p.filter((e) => e.id !== id));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Thiết bị</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Máy, lens, đèn… để gán nhanh vào hợp đồng &amp; tránh trùng buổi.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-fit p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Thêm thiết bị</h2>
          <div className="space-y-3">
            <div><label className="label">Tên</label><input className="input" placeholder="VD: Sony A7IV #1" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></div>
            <div><label className="label">Loại</label><input className="input" placeholder="Body / Lens / Đèn…" value={f.category} onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))} /></div>
            <div><label className="label">Ghi chú</label><input className="input" value={f.note} onChange={(e) => setF((p) => ({ ...p, note: e.target.value }))} /></div>
            <button onClick={add} disabled={busy} className="btn-primary w-full"><Plus size={15} /> {busy ? "Đang thêm…" : "Thêm vào sổ"}</button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {list.length === 0 ? (
            <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--text3)" }}>Chưa có thiết bị nào.</div>
          ) : (
            <div className="space-y-2">
              {list.map((e) => (
                <div key={e.id} className="card flex items-center justify-between p-4">
                  <div className="flex items-center gap-3">
                    <Camera size={16} style={{ color: "var(--text3)" }} />
                    <div>
                      <p className="font-medium">{e.name}</p>
                      <p className="text-xs" style={{ color: "var(--text3)" }}>{e.category || "—"}{e.note ? ` · ${e.note}` : ""}</p>
                    </div>
                  </div>
                  <button onClick={() => remove(e.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

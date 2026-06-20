"use client";

import { useState } from "react";
import { Plus, Trash2, Minus, RotateCcw, Phone } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { vnd, type StudioPackage } from "@/lib/types";

export default function PackagesManager({
  ownerId,
  initial,
}: {
  ownerId: string;
  initial: StudioPackage[];
}) {
  const supabase = createClient();
  const [list, setList] = useState<StudioPackage[]>(initial);
  const [f, setF] = useState({ client_name: "", client_phone: "", name: "Thẻ buổi", total_sessions: 1, price: 0 });
  const [busy, setBusy] = useState(false);

  async function add() {
    if (!f.client_name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("studio_packages")
      .insert({
        owner_id: ownerId,
        client_name: f.client_name.trim(),
        client_phone: f.client_phone.trim() || null,
        name: f.name.trim() || "Thẻ buổi",
        total_sessions: Math.max(1, Math.round(Number(f.total_sessions) || 1)),
        price: Math.max(0, Math.round(Number(f.price) || 0)),
      })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setList((p) => [data as StudioPackage, ...p]);
      setF({ client_name: "", client_phone: "", name: "Thẻ buổi", total_sessions: 1, price: 0 });
    }
  }

  async function setUsed(p: StudioPackage, delta: number) {
    const next = Math.max(0, Math.min(p.total_sessions, p.used_sessions + delta));
    if (next === p.used_sessions) return;
    await supabase.from("studio_packages").update({ used_sessions: next }).eq("id", p.id);
    setList((l) => l.map((x) => (x.id === p.id ? { ...x, used_sessions: next } : x)));
  }

  async function togglePaid(p: StudioPackage) {
    await supabase.from("studio_packages").update({ paid: !p.paid }).eq("id", p.id);
    setList((l) => l.map((x) => (x.id === p.id ? { ...x, paid: !x.paid } : x)));
  }

  async function remove(id: string) {
    if (!confirm("Xoá thẻ buổi này?")) return;
    await supabase.from("studio_packages").delete().eq("id", id);
    setList((l) => l.filter((x) => x.id !== id));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-8">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Thẻ buổi / Gói combo</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Khách mua gói nhiều buổi trả trước — trừ dần mỗi lần chụp.</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-fit p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Tạo thẻ buổi</h2>
          <div className="space-y-3">
            <div><label className="label">Khách hàng</label><input className="input" value={f.client_name} onChange={(e) => setF((p) => ({ ...p, client_name: e.target.value }))} /></div>
            <div><label className="label">SĐT</label><input className="input" value={f.client_phone} onChange={(e) => setF((p) => ({ ...p, client_phone: e.target.value }))} /></div>
            <div><label className="label">Tên gói</label><input className="input" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Số buổi</label><input type="number" className="input" value={f.total_sessions} onChange={(e) => setF((p) => ({ ...p, total_sessions: Number(e.target.value) }))} /></div>
              <div><label className="label">Giá</label><input type="number" className="input" value={f.price || ""} onChange={(e) => setF((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
            </div>
            <button onClick={add} disabled={busy} className="btn-primary w-full"><Plus size={15} /> {busy ? "Đang tạo…" : "Tạo thẻ"}</button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {list.length === 0 ? (
            <div className="card flex items-center justify-center py-16 text-sm" style={{ color: "var(--text3)" }}>Chưa có thẻ buổi nào.</div>
          ) : (
            <div className="space-y-2">
              {list.map((p) => {
                const remaining = p.total_sessions - p.used_sessions;
                return (
                  <div key={p.id} className="card p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="font-medium">{p.client_name} · {p.name}</p>
                        <p className="flex items-center gap-1.5 text-xs" style={{ color: "var(--text3)" }}>
                          {p.client_phone && <><Phone size={12} /> {p.client_phone} · </>}
                          {vnd(p.price)} ·{" "}
                          <button onClick={() => togglePaid(p)} style={{ color: p.paid ? "#7bb38a" : "#c7a76b" }}>
                            {p.paid ? "đã thanh toán" : "chưa thanh toán"}
                          </button>
                        </p>
                      </div>
                      <button onClick={() => remove(p.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                    </div>
                    <div className="mt-3 flex items-center justify-between">
                      <div>
                        <p className="font-serif text-lg font-medium" style={{ color: remaining > 0 ? "var(--text)" : "#c77b7b" }}>
                          Còn {remaining}/{p.total_sessions} buổi
                        </p>
                        <div className="mt-1 h-1.5 w-40 overflow-hidden rounded-full" style={{ background: "var(--surface2)" }}>
                          <div className="h-full rounded-full" style={{ width: `${(p.used_sessions / p.total_sessions) * 100}%`, background: "#6ba3c7" }} />
                        </div>
                      </div>
                      <div className="flex items-center gap-2">
                        <button onClick={() => setUsed(p, -1)} disabled={p.used_sessions === 0} className="btn-ghost px-2.5 py-1.5 text-xs"><RotateCcw size={13} /> Hoàn</button>
                        <button onClick={() => setUsed(p, 1)} disabled={remaining === 0} className="btn-primary px-2.5 py-1.5 text-xs"><Minus size={13} /> Dùng 1 buổi</button>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

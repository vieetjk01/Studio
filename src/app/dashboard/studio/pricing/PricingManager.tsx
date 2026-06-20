"use client";

import { useState } from "react";
import { Plus, Trash2, Link as LinkIcon, Copy, Check, Eye, EyeOff, Sparkles, Pencil, X, Home, GripVertical } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import MoneyInput from "@/components/MoneyInput";
import { PRICE_LISTS, WEDDING_SEED, ENGAGEMENT_SEED, type SeedItem } from "@/lib/pricelist-seeds";
import { vnd, type PricelistItem } from "@/lib/types";

type Contact = { pl_phone: string; pl_facebook: string; pl_bank_holder: string; pl_bank_account: string; pl_bank_name: string };

export default function PricingManager({
  ownerId,
  initial,
  shareUrl,
  contact,
}: {
  ownerId: string;
  initial: PricelistItem[];
  shareUrl: string; // base /gia/<token>
  contact: Contact;
}) {
  const supabase = createClient();
  const [list, setList] = useState<PricelistItem[]>(initial);
  const [activeList, setActiveList] = useState(PRICE_LISTS[0].key);
  const [f, setF] = useState({ name: "", price: 0, unit: "", category: "", description: "" });
  const [c, setC] = useState<Contact>(contact);
  const [savedContact, setSavedContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);
  const [editId, setEditId] = useState<string | null>(null);
  const [edit, setEdit] = useState({ name: "", price: 0, unit: "", category: "", description: "" });
  const [note, setNote] = useState({ name: "", description: "" });
  const [dragId, setDragId] = useState<string | null>(null);

  function startEdit(it: PricelistItem) {
    setEditId(it.id);
    setEdit({ name: it.name, price: it.price, unit: it.unit || "", category: it.category || "", description: it.description || "" });
  }
  async function saveEdit(id: string) {
    const patch = {
      name: edit.name.trim() || "(chưa đặt tên)",
      price: Math.max(0, Math.round(Number(edit.price) || 0)),
      unit: edit.unit.trim() || null,
      category: edit.category.trim() || null,
      description: edit.description.trim() || null,
    };
    await supabase.from("studio_pricelist").update(patch).eq("id", id);
    setList((p) => p.map((x) => (x.id === id ? { ...x, ...patch } : x)));
    setEditId(null);
  }

  const visible = list.filter((it) => (it.list_key || "cuoi") === activeList);
  const pkgs = visible.filter((it) => it.price > 0).sort((a, b) => a.position - b.position);
  const notes = visible.filter((it) => it.price === 0).sort((a, b) => a.position - b.position);
  const listUrl = shareUrl ? `${shareUrl}?list=${activeList}` : "";

  // Drag-to-reorder packages within the active list. Reorders the package cards
  // and reassigns the same set of position slots so notes/other lists stay put.
  async function reorderPkg(targetId: string) {
    const src = dragId;
    setDragId(null);
    if (!src || src === targetId) return;
    const from = pkgs.findIndex((p) => p.id === src);
    const to = pkgs.findIndex((p) => p.id === targetId);
    if (from < 0 || to < 0) return;
    const reordered = [...pkgs];
    const [moved] = reordered.splice(from, 1);
    reordered.splice(to, 0, moved);
    const slots = pkgs.map((p) => p.position).sort((a, b) => a - b);
    const updates = reordered
      .map((p, i) => ({ id: p.id, position: slots[i] }))
      .filter((u) => pkgs.find((p) => p.id === u.id)?.position !== u.position);
    if (updates.length === 0) return;
    setList((prev) => prev.map((x) => { const u = updates.find((y) => y.id === x.id); return u ? { ...x, position: u.position } : x; }));
    await Promise.all(updates.map((u) => supabase.from("studio_pricelist").update({ position: u.position }).eq("id", u.id)));
  }

  async function seedActive() {
    const rows: SeedItem[] = activeList === "dinh-hon" ? ENGAGEMENT_SEED : WEDDING_SEED;
    setBusy(true);
    const payload = rows.map((s, i) => ({ ...s, owner_id: ownerId, position: list.length + i }));
    const { data, error } = await supabase.from("studio_pricelist").insert(payload).select("*");
    setBusy(false);
    if (!error && data) setList((p) => [...p, ...(data as PricelistItem[])]);
  }

  async function saveContact() {
    await supabase.from("profiles").update(c).eq("id", ownerId);
    setSavedContact(true);
    setTimeout(() => setSavedContact(false), 1500);
  }

  async function add() {
    if (!f.name.trim()) return;
    setBusy(true);
    const { data, error } = await supabase
      .from("studio_pricelist")
      .insert({
        owner_id: ownerId,
        list_key: activeList,
        name: f.name.trim(),
        price: Math.max(0, Math.round(Number(f.price) || 0)),
        unit: f.unit.trim() || null,
        category: f.category.trim() || null,
        description: f.description.trim() || null,
        position: list.length,
      })
      .select("*")
      .single();
    setBusy(false);
    if (!error && data) {
      setList((p) => [...p, data as PricelistItem]);
      setF({ name: "", price: 0, unit: "", category: "", description: "" });
    }
  }

  async function toggleActive(it: PricelistItem) {
    await supabase.from("studio_pricelist").update({ active: !it.active }).eq("id", it.id);
    setList((p) => p.map((x) => (x.id === it.id ? { ...x, active: !x.active } : x)));
  }
  async function toggleHome(it: PricelistItem) {
    const next = !it.show_on_home;
    await supabase.from("studio_pricelist").update({ show_on_home: next }).eq("id", it.id);
    setList((p) => p.map((x) => (x.id === it.id ? { ...x, show_on_home: next } : x)));
  }
  async function addNote() {
    if (!note.name.trim() && !note.description.trim()) return;
    const { data, error } = await supabase
      .from("studio_pricelist")
      .insert({ owner_id: ownerId, list_key: activeList, name: note.name.trim() || "Ghi chú", price: 0, category: note.name.trim() || "Ghi chú", description: note.description.trim() || null, position: list.length })
      .select("*")
      .single();
    if (!error && data) {
      setList((p) => [...p, data as PricelistItem]);
      setNote({ name: "", description: "" });
    }
  }
  async function remove(id: string) {
    await supabase.from("studio_pricelist").delete().eq("id", id);
    setList((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Bảng giá</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Mỗi loại có 1 bảng giá &amp; link riêng để gửi khách.</p>
      </div>

      {/* List tabs */}
      <div className="mb-6 flex gap-2">
        {PRICE_LISTS.map((l) => (
          <button
            key={l.key}
            onClick={() => setActiveList(l.key)}
            className="rounded-full px-4 py-2 text-sm font-medium"
            style={{ background: activeList === l.key ? "var(--surface2)" : "transparent", border: "1px solid var(--border2)", color: activeList === l.key ? "var(--accent)" : "var(--text2)" }}
          >
            Bảng giá {l.label}
          </button>
        ))}
      </div>

      {listUrl && (
        <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
          <LinkIcon size={16} style={{ color: "var(--text3)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Link bảng giá {PRICE_LISTS.find((l) => l.key === activeList)?.label} gửi khách</p>
            <p className="truncate text-sm" style={{ color: "var(--text2)" }}>{listUrl}</p>
          </div>
          <a href={listUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">Xem thử</a>
          <button onClick={() => { navigator.clipboard?.writeText(listUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost px-3 py-2 text-xs">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Đã chép" : "Chép link"}
          </button>
        </div>
      )}

      {/* Contact + bank (shared across both lists) */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Liên hệ &amp; chuyển khoản (hiện trên bảng giá)</h2>
        <div className="grid gap-3 sm:grid-cols-2">
          <div><label className="label">Số điện thoại</label><input className="input" value={c.pl_phone} onChange={(e) => setC((p) => ({ ...p, pl_phone: e.target.value }))} /></div>
          <div><label className="label">Facebook</label><input className="input" placeholder="fb.com/…" value={c.pl_facebook} onChange={(e) => setC((p) => ({ ...p, pl_facebook: e.target.value }))} /></div>
          <div><label className="label">Chủ tài khoản</label><input className="input" value={c.pl_bank_holder} onChange={(e) => setC((p) => ({ ...p, pl_bank_holder: e.target.value }))} /></div>
          <div><label className="label">Số tài khoản</label><input className="input" value={c.pl_bank_account} onChange={(e) => setC((p) => ({ ...p, pl_bank_account: e.target.value }))} /></div>
          <div><label className="label">Ngân hàng</label><input className="input" value={c.pl_bank_name} onChange={(e) => setC((p) => ({ ...p, pl_bank_name: e.target.value }))} /></div>
        </div>
        <button onClick={saveContact} className="btn-primary mt-4">{savedContact ? <Check size={15} /> : null} {savedContact ? "Đã lưu" : "Lưu liên hệ"}</button>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="card h-fit p-6">
          <h2 className="mb-4 font-serif text-lg font-medium">Thêm mục</h2>
          <div className="space-y-3">
            <div><label className="label">Tên dịch vụ</label><input className="input" value={f.name} onChange={(e) => setF((p) => ({ ...p, name: e.target.value }))} /></div>
            <div className="grid grid-cols-2 gap-3">
              <div><label className="label">Giá</label><MoneyInput value={f.price} onChange={(n) => setF((p) => ({ ...p, price: n }))} /></div>
              <div><label className="label">Đơn vị</label><input className="input" placeholder="/ gói" value={f.unit} onChange={(e) => setF((p) => ({ ...p, unit: e.target.value }))} /></div>
            </div>
            <div><label className="label">Nhóm</label><input className="input" placeholder="Gói chụp / Gói quay…" value={f.category} onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))} /></div>
            <div><label className="label">Mô tả (mỗi dòng 1 ý)</label><textarea className="input min-h-[70px]" value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} /></div>
            <button onClick={add} disabled={busy} className="btn-primary w-full"><Plus size={15} /> {busy ? "Đang thêm…" : "Thêm vào bảng giá"}</button>
          </div>
        </div>

        <div className="lg:col-span-2 space-y-6">
          {visible.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center text-sm" style={{ color: "var(--text3)" }}>
              <p>Bảng giá {PRICE_LISTS.find((l) => l.key === activeList)?.label} đang trống.</p>
              <button onClick={seedActive} disabled={busy} className="btn-primary"><Sparkles size={15} /> Dùng mẫu giá {PRICE_LISTS.find((l) => l.key === activeList)?.label}</button>
            </div>
          ) : (
            <>
              <div className="space-y-2">
                <h2 className="font-serif text-lg font-medium">Các gói dịch vụ</h2>
                {pkgs.length > 1 && <p className="text-xs" style={{ color: "var(--text3)" }}>Kéo thả <GripVertical size={12} className="inline" /> để đổi vị trí các gói.</p>}
                {pkgs.length === 0 && <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có gói nào.</p>}
                {pkgs.map((it) =>
                  editId === it.id ? (
                    <div key={it.id} className="card space-y-2 p-4">
                      <div className="grid gap-2 sm:grid-cols-2">
                        <input className="input" placeholder="Tên" value={edit.name} onChange={(e) => setEdit((p) => ({ ...p, name: e.target.value }))} />
                        <div className="grid grid-cols-2 gap-2">
                          <MoneyInput placeholder="Giá" value={edit.price} onChange={(n) => setEdit((p) => ({ ...p, price: n }))} />
                          <input className="input" placeholder="Đơn vị" value={edit.unit} onChange={(e) => setEdit((p) => ({ ...p, unit: e.target.value }))} />
                        </div>
                      </div>
                      <input className="input" placeholder="Nhóm" value={edit.category} onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value }))} />
                      <textarea className="input min-h-[70px]" placeholder="Mô tả (mỗi dòng 1 ý)" value={edit.description} onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(it.id)} className="btn-primary px-3 py-1.5 text-xs"><Check size={14} /> Lưu</button>
                        <button onClick={() => setEditId(null)} className="btn-ghost px-3 py-1.5 text-xs"><X size={14} /> Huỷ</button>
                      </div>
                    </div>
                  ) : (
                    <div
                      key={it.id}
                      draggable
                      onDragStart={() => setDragId(it.id)}
                      onDragOver={(e) => e.preventDefault()}
                      onDrop={() => reorderPkg(it.id)}
                      onDragEnd={() => setDragId(null)}
                      className="card flex items-start gap-3 p-4"
                      style={{ opacity: dragId === it.id ? 0.4 : it.active ? 1 : 0.5, cursor: "grab" }}
                    >
                      <GripVertical size={16} className="mt-0.5 shrink-0" style={{ color: "var(--text3)" }} />
                      <div className="min-w-0 flex-1">
                        <p className="font-medium">
                          {it.name} {it.category && <span className="text-[11px]" style={{ color: "var(--text3)" }}>· {it.category}</span>}
                        </p>
                        <p className="font-serif text-lg font-medium" style={{ color: "var(--accent)" }}>{vnd(it.price)}<span className="text-xs" style={{ color: "var(--text3)" }}>{it.unit ? ` ${it.unit}` : ""}</span></p>
                        {it.description && <p className="whitespace-pre-line text-xs" style={{ color: "var(--text3)" }}>{it.description}</p>}
                        {!it.show_on_home && <p className="mt-1 text-[11px]" style={{ color: "var(--text3)" }}>Ẩn ở trang chủ</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => toggleHome(it)} className="btn-ghost px-2.5 py-1.5 text-xs" title={it.show_on_home ? "Đang hiện ở trang chủ — bấm để ẩn" : "Đang ẩn ở trang chủ — bấm để hiện"} style={{ color: it.show_on_home ? "var(--accent)" : "var(--text3)" }}>
                          <Home size={14} />
                        </button>
                        <button onClick={() => startEdit(it)} className="btn-ghost px-2.5 py-1.5 text-xs" title="Sửa"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive(it)} className="btn-ghost px-2.5 py-1.5 text-xs" title={it.active ? "Đang hiện" : "Đang ẩn"}>
                          {it.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => remove(it.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )
                )}
              </div>

              <div className="space-y-2">
                <h2 className="font-serif text-lg font-medium">Chi phí phát sinh &amp; lưu ý</h2>
                <p className="text-xs" style={{ color: "var(--text3)" }}>Các mục ghi chú riêng, hiển thị tách khỏi gói ở cuối bảng giá.</p>
                {notes.map((it) =>
                  editId === it.id ? (
                    <div key={it.id} className="card space-y-2 p-4">
                      <input className="input" placeholder="Tiêu đề (vd: Phát sinh thêm)" value={edit.category} onChange={(e) => setEdit((p) => ({ ...p, category: e.target.value, name: e.target.value }))} />
                      <textarea className="input min-h-[70px]" placeholder="Nội dung (mỗi dòng 1 ý)" value={edit.description} onChange={(e) => setEdit((p) => ({ ...p, description: e.target.value }))} />
                      <div className="flex gap-2">
                        <button onClick={() => saveEdit(it.id)} className="btn-primary px-3 py-1.5 text-xs"><Check size={14} /> Lưu</button>
                        <button onClick={() => setEditId(null)} className="btn-ghost px-3 py-1.5 text-xs"><X size={14} /> Huỷ</button>
                      </div>
                    </div>
                  ) : (
                    <div key={it.id} className="card flex items-start justify-between gap-3 p-4" style={{ opacity: it.active ? 1 : 0.5 }}>
                      <div>
                        <p className="font-medium">{it.category || it.name}</p>
                        {it.description && <p className="whitespace-pre-line text-xs" style={{ color: "var(--text3)" }}>{it.description}</p>}
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => startEdit(it)} className="btn-ghost px-2.5 py-1.5 text-xs" title="Sửa"><Pencil size={14} /></button>
                        <button onClick={() => toggleActive(it)} className="btn-ghost px-2.5 py-1.5 text-xs" title={it.active ? "Đang hiện" : "Đang ẩn"}>
                          {it.active ? <Eye size={14} /> : <EyeOff size={14} />}
                        </button>
                        <button onClick={() => remove(it.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                      </div>
                    </div>
                  )
                )}
                <div className="card space-y-2 p-4">
                  <input className="input" placeholder="Tiêu đề mục (vd: Phát sinh thêm, Lưu ý…)" value={note.name} onChange={(e) => setNote((p) => ({ ...p, name: e.target.value }))} />
                  <textarea className="input min-h-[60px]" placeholder="Nội dung (mỗi dòng 1 ý)" value={note.description} onChange={(e) => setNote((p) => ({ ...p, description: e.target.value }))} />
                  <button onClick={addNote} className="btn-ghost w-full px-3 py-2 text-xs"><Plus size={14} /> Thêm mục ghi chú</button>
                </div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

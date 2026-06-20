"use client";

import { useState } from "react";
import { Plus, Trash2, Link as LinkIcon, Copy, Check, Eye, EyeOff, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { vnd, type PricelistItem } from "@/lib/types";

// Mẫu bảng giá cưới (tham khảo) — studio chỉnh sửa sau.
const WEDDING_SEED: { name: string; price: number; unit: string; category: string; description: string }[] = [
  { category: "Gói chụp cơ bản", name: "Truyền thống", price: 2500000, unit: "/ gói", description: "Giao toàn bộ file gốc\nChỉnh sửa 100 file" },
  { category: "Gói chụp cơ bản", name: "Phóng sự x1", price: 4000000, unit: "/ gói", description: "1 thợ chụp nhà gái\nGiao toàn bộ file gốc\n150–200 hình chỉnh sửa" },
  { category: "Gói chụp cơ bản", name: "Phóng sự x2", price: 6000000, unit: "/ gói", description: "1 thợ nhà gái, 1 thợ nhà trai\nGiao toàn bộ file gốc\nChỉnh sửa 300–400 hình" },
  { category: "Gói quay phóng sự", name: "Gói quay cơ bản", price: 4000000, unit: "/ gói", description: "1 thợ quay (Sáng → trưa)\nGiao toàn bộ file\nVideo chỉnh sửa 3–5 phút" },
  { category: "Gói quay phóng sự", name: "Gói quay Plus", price: 7500000, unit: "/ gói", description: "2 thợ quay nhà gái & nhà trai (Sáng → trưa)\n1 flycam (nếu khu vực cho phép bay)\nVideo chỉnh sửa 5–7 phút (có thể yêu cầu)" },
  { category: "Gói quay phóng sự", name: "Gói Combo", price: 13500000, unit: "/ gói", description: "2 thợ chụp, 2 thợ quay, 1 flycam (Sáng → trưa)\nGiao toàn bộ file gốc\nChỉnh sửa 300–400 hình\nVideo 5–7 phút (theo yêu cầu)\nTặng Album 150 ảnh" },
  { category: "Phát sinh thêm", name: "Chi phí phát sinh", price: 0, unit: "", description: "In album: trợ giá 500k/album 100 hình, in thêm 8.000đ/hình\nĐãi trước 1 ngày: +1.000.000đ\nPhát sinh tiệc tối: +500.000đ cho gói chụp\nChưa gồm phí đi lại nếu ở xa / ngoại tỉnh" },
  { category: "Lưu ý", name: "Điều khoản", price: 0, unit: "", description: "Cọc trước 20% hợp đồng sau khi chốt gói\nThanh toán toàn bộ sau khi giao file gốc\nFile gốc được lưu trữ trong 30 ngày kể từ ngày giao" },
];

const ENGAGEMENT_SEED: { name: string; price: number; unit: string; category: string; description: string }[] = [
  { category: "Đính hôn · Gói chụp", name: "Truyền thống", price: 1800000, unit: "/ gói", description: "Giao toàn bộ file gốc\nChỉnh sửa 50 file" },
  { category: "Đính hôn · Gói chụp", name: "Phóng sự x1", price: 2500000, unit: "/ gói", description: "1 thợ chụp nhà gái\nGiao toàn bộ file gốc\n100 hình chỉnh sửa" },
  { category: "Đính hôn · Gói chụp", name: "Phóng sự x2", price: 5000000, unit: "/ gói", description: "1 thợ nhà gái, 1 thợ nhà trai\nGiao toàn bộ file gốc\nChỉnh sửa 200 hình" },
  { category: "Đính hôn · Gói quay", name: "Gói quay cơ bản", price: 3500000, unit: "/ gói", description: "1 thợ quay (Sáng → trưa)\nGiao toàn bộ file\nVideo chỉnh sửa 3–5 phút" },
  { category: "Đính hôn · Gói quay", name: "Gói quay Plus", price: 7500000, unit: "/ gói", description: "2 thợ quay nhà gái & nhà trai (Sáng → trưa)\n1 flycam (nếu khu vực cho phép bay)\nVideo chỉnh sửa 5–7 phút (có thể yêu cầu)" },
  { category: "Đính hôn · Gói quay", name: "Gói Combo", price: 11500000, unit: "/ gói", description: "2 thợ chụp, 2 thợ quay, 1 flycam (Sáng → trưa)\nGiao toàn bộ file gốc\nChỉnh sửa 300–400 hình\nVideo 5–7 phút (theo yêu cầu)\nTặng Album 100 ảnh" },
];

type Contact = { pl_phone: string; pl_facebook: string; pl_bank_holder: string; pl_bank_account: string; pl_bank_name: string };

export default function PricingManager({
  ownerId,
  initial,
  shareUrl,
  contact,
}: {
  ownerId: string;
  initial: PricelistItem[];
  shareUrl: string;
  contact: Contact;
}) {
  const supabase = createClient();
  const [list, setList] = useState<PricelistItem[]>(initial);
  const [f, setF] = useState({ name: "", price: 0, unit: "", category: "", description: "" });
  const [c, setC] = useState<Contact>(contact);
  const [savedContact, setSavedContact] = useState(false);
  const [busy, setBusy] = useState(false);
  const [copied, setCopied] = useState(false);

  async function seed(rows: typeof WEDDING_SEED) {
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
  async function remove(id: string) {
    await supabase.from("studio_pricelist").delete().eq("id", id);
    setList((p) => p.filter((x) => x.id !== id));
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      <div className="mb-6">
        <p className="eyebrow mb-1.5">Quản lý studio</p>
        <h1 className="font-serif text-3xl font-medium">Bảng giá</h1>
        <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Soạn bảng giá dịch vụ rồi gửi link cho khách xem.</p>
      </div>

      {shareUrl && (
        <div className="card mb-6 flex flex-wrap items-center gap-3 p-4">
          <LinkIcon size={16} style={{ color: "var(--text3)" }} />
          <div className="min-w-0 flex-1">
            <p className="text-[11px] uppercase tracking-wide" style={{ color: "var(--text3)" }}>Link bảng giá gửi khách</p>
            <p className="truncate text-sm" style={{ color: "var(--text2)" }}>{shareUrl}</p>
          </div>
          <a href={shareUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs">Xem thử</a>
          <button onClick={() => { navigator.clipboard?.writeText(shareUrl); setCopied(true); setTimeout(() => setCopied(false), 1500); }} className="btn-ghost px-3 py-2 text-xs">
            {copied ? <Check size={14} /> : <Copy size={14} />} {copied ? "Đã chép" : "Chép link"}
          </button>
        </div>
      )}

      <div className="mb-6 flex flex-wrap gap-2">
        <button onClick={() => seed(WEDDING_SEED)} disabled={busy} className="btn-ghost px-3 py-2 text-xs"><Sparkles size={14} /> Thêm mẫu cưới</button>
        <button onClick={() => seed(ENGAGEMENT_SEED)} disabled={busy} className="btn-ghost px-3 py-2 text-xs"><Sparkles size={14} /> Thêm mẫu đính hôn</button>
      </div>

      {/* Contact + bank shown on the public price list */}
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
              <div><label className="label">Giá</label><input type="number" className="input" value={f.price || ""} onChange={(e) => setF((p) => ({ ...p, price: Number(e.target.value) }))} /></div>
              <div><label className="label">Đơn vị</label><input className="input" placeholder="/ buổi" value={f.unit} onChange={(e) => setF((p) => ({ ...p, unit: e.target.value }))} /></div>
            </div>
            <div><label className="label">Nhóm</label><input className="input" placeholder="Cưới / Sự kiện…" value={f.category} onChange={(e) => setF((p) => ({ ...p, category: e.target.value }))} /></div>
            <div><label className="label">Mô tả</label><textarea className="input min-h-[70px]" value={f.description} onChange={(e) => setF((p) => ({ ...p, description: e.target.value }))} /></div>
            <button onClick={add} disabled={busy} className="btn-primary w-full"><Plus size={15} /> {busy ? "Đang thêm…" : "Thêm vào bảng giá"}</button>
          </div>
        </div>

        <div className="lg:col-span-2">
          {list.length === 0 ? (
            <div className="card flex flex-col items-center justify-center gap-4 py-16 text-center text-sm" style={{ color: "var(--text3)" }}>
              <p>Chưa có mục nào trong bảng giá.</p>
              <div className="flex flex-wrap justify-center gap-2">
                <button onClick={() => seed(WEDDING_SEED)} disabled={busy} className="btn-primary"><Sparkles size={15} /> Dùng mẫu giá cưới</button>
                <button onClick={() => seed(ENGAGEMENT_SEED)} disabled={busy} className="btn-ghost"><Sparkles size={15} /> Mẫu giá đính hôn</button>
              </div>
            </div>
          ) : (
            <div className="space-y-2">
              {list.map((it) => (
                <div key={it.id} className="card flex items-start justify-between gap-3 p-4" style={{ opacity: it.active ? 1 : 0.5 }}>
                  <div>
                    <p className="font-medium">
                      {it.name} {it.category && <span className="text-[11px]" style={{ color: "var(--text3)" }}>· {it.category}</span>}
                    </p>
                    {it.price > 0 && (
                      <p className="font-serif text-lg font-medium" style={{ color: "var(--accent)" }}>{vnd(it.price)}<span className="text-xs" style={{ color: "var(--text3)" }}>{it.unit ? ` ${it.unit}` : ""}</span></p>
                    )}
                    {it.description && <p className="whitespace-pre-line text-xs" style={{ color: "var(--text3)" }}>{it.description}</p>}
                  </div>
                  <div className="flex shrink-0 items-center gap-2">
                    <button onClick={() => toggleActive(it)} className="btn-ghost px-2.5 py-1.5 text-xs" title={it.active ? "Đang hiện" : "Đang ẩn"}>
                      {it.active ? <Eye size={14} /> : <EyeOff size={14} />}
                    </button>
                    <button onClick={() => remove(it.id)} className="btn-ghost px-2.5 py-1.5 text-xs"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}

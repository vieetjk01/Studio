"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, ChevronUp, ChevronDown, Check, ExternalLink, Globe } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SITE_BLOCK_LABEL,
  RESERVED_SUBDOMAINS,
  type Site,
  type SiteBlock,
  type SiteBlockType,
  type SiteTheme,
} from "@/lib/types";

const BLOCK_TYPES: SiteBlockType[] = ["hero", "gallery", "about", "pricing", "testimonials", "contact"];

// Which config fields each block type exposes in the editor.
const BLOCK_FIELDS: Record<SiteBlockType, { key: string; label: string; area?: boolean }[]> = {
  hero: [
    { key: "heading", label: "Tiêu đề lớn" },
    { key: "subheading", label: "Mô tả ngắn" },
    { key: "image", label: "Ảnh nền (URL)" },
  ],
  about: [
    { key: "heading", label: "Tiêu đề" },
    { key: "text", label: "Nội dung (mỗi dòng 1 đoạn)", area: true },
    { key: "image", label: "Ảnh (URL)" },
  ],
  gallery: [{ key: "heading", label: "Tiêu đề" }],
  pricing: [{ key: "heading", label: "Tiêu đề" }],
  testimonials: [{ key: "heading", label: "Tiêu đề" }],
  contact: [
    { key: "heading", label: "Tiêu đề" },
    { key: "email", label: "Email" },
    { key: "address", label: "Địa chỉ" },
  ],
};

export default function SiteManager({
  site,
  initialBlocks,
  plan,
  isAdmin,
  mainHost,
}: {
  site: Site;
  initialBlocks: SiteBlock[];
  plan: string;
  isAdmin: boolean;
  mainHost: string;
}) {
  const supabase = createClient();
  const [subdomain, setSubdomain] = useState(site.subdomain ?? "");
  const [published, setPublished] = useState(site.published);
  const [theme, setTheme] = useState<SiteTheme>(site.theme || {});
  const [blocks, setBlocks] = useState<SiteBlock[]>(initialBlocks);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const studioPro = plan === "studio" || isAdmin;
  const liveUrl = subdomain && mainHost ? `https://${subdomain}.${mainHost}` : "";

  function toast(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  function validSubdomain(s: string): string | null {
    const v = s.trim().toLowerCase();
    if (!v) return null; // allowed: empty (unpublished)
    if (!/^[a-z0-9-]{3,30}$/.test(v)) return "Tên miền phụ chỉ gồm a-z, 0-9, dấu gạch ngang (3–30 ký tự).";
    if (v.startsWith("-") || v.endsWith("-")) return "Không bắt đầu/kết thúc bằng dấu gạch ngang.";
    if (RESERVED_SUBDOMAINS.has(v)) return "Tên miền phụ này đã được hệ thống giữ.";
    return null;
  }

  async function saveSite() {
    const v = subdomain.trim().toLowerCase();
    const err = validSubdomain(v);
    if (err) { toast(err); return; }
    if (published && !v) { toast("Cần đặt tên miền phụ trước khi xuất bản."); return; }
    setBusy(true);
    const { error } = await supabase
      .from("sites")
      .update({ subdomain: v || null, published, theme, updated_at: new Date().toISOString() })
      .eq("id", site.id);
    setBusy(false);
    if (error) {
      toast(error.message.includes("duplicate") ? "Tên miền phụ đã có người dùng." : `Lỗi: ${error.message}`);
      return;
    }
    setSubdomain(v);
    toast("Đã lưu trang.");
  }

  async function addBlock(type: SiteBlockType) {
    const { data } = await supabase
      .from("site_blocks")
      .insert({ site_id: site.id, type, position: blocks.length, config: {} })
      .select("*")
      .single();
    if (data) setBlocks((p) => [...p, data as SiteBlock]);
  }

  function setConfig(id: string, key: string, value: string) {
    setBlocks((p) => p.map((b) => (b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b)));
  }

  async function saveBlock(b: SiteBlock) {
    await supabase.from("site_blocks").update({ config: b.config, visible: b.visible }).eq("id", b.id);
    toast("Đã lưu khối.");
  }

  async function toggleVisible(b: SiteBlock) {
    const next = !b.visible;
    setBlocks((p) => p.map((x) => (x.id === b.id ? { ...x, visible: next } : x)));
    await supabase.from("site_blocks").update({ visible: next }).eq("id", b.id);
  }

  async function removeBlock(id: string) {
    setBlocks((p) => p.filter((b) => b.id !== id));
    await supabase.from("site_blocks").delete().eq("id", id);
  }

  async function move(i: number, dir: -1 | 1) {
    const j = i + dir;
    if (j < 0 || j >= blocks.length) return;
    const arr = [...blocks];
    [arr[i], arr[j]] = [arr[j], arr[i]];
    setBlocks(arr);
    await Promise.all([
      supabase.from("site_blocks").update({ position: i }).eq("id", arr[i].id),
      supabase.from("site_blocks").update({ position: j }).eq("id", arr[j].id),
    ]);
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]">
      {msg && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>{msg}</div>
      )}

      <div className="mb-6 flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="eyebrow mb-1.5">Trang web riêng</p>
          <h1 className="font-serif text-3xl font-medium">Trang giới thiệu của bạn</h1>
          <p className="mt-1 text-sm" style={{ color: "var(--text2)" }}>Tạo trang portfolio riêng trên tên miền phụ, kéo nội dung từ album & bảng giá sẵn có.</p>
        </div>
        {liveUrl && published && (
          <a href={liveUrl} target="_blank" rel="noreferrer" className="btn-ghost px-3 py-2 text-xs"><ExternalLink size={14} /> Xem trang</a>
        )}
      </div>

      {/* Site settings */}
      <div className="card mb-6 p-6">
        <h2 className="mb-4 font-serif text-lg font-medium">Cài đặt trang</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Tên miền phụ</label>
            <div className="flex items-center gap-2">
              <input className="input" placeholder="ten-cua-ban" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase())} />
              <span className="shrink-0 text-sm" style={{ color: "var(--text3)" }}>.{mainHost || "vieetjk.com"}</span>
            </div>
          </div>
          <div>
            <label className="label">Màu nhấn</label>
            <input type="color" className="input h-[42px] p-1" value={theme.accent || "#c7a76b"} onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))} />
          </div>
          <div>
            <label className="label">Màu nền</label>
            <input type="color" className="input h-[42px] p-1" value={theme.bg || "#0c0c0d"} onChange={(e) => setTheme((t) => ({ ...t, bg: e.target.value }))} />
          </div>
          <div>
            <label className="label">Phông chữ</label>
            <select className="input" value={theme.font || "serif"} onChange={(e) => setTheme((t) => ({ ...t, font: e.target.value as "serif" | "sans" }))}>
              <option value="serif">Cổ điển (serif)</option>
              <option value="sans">Hiện đại (sans)</option>
            </select>
          </div>
        </div>
        <label className="mt-4 flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
          <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
          Xuất bản trang (cho phép mọi người truy cập)
        </label>
        <button onClick={saveSite} disabled={busy} className="btn-primary mt-4"><Check size={15} /> {busy ? "Đang lưu…" : "Lưu cài đặt"}</button>
        {!studioPro && (
          <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
            <Globe size={12} /> Tên miền riêng (vd: studio-cua-ban.com) dành cho gói Studio — sẽ mở ở giai đoạn sau.
          </p>
        )}
      </div>

      {/* Blocks */}
      <div className="card p-6">
        <div className="mb-2 flex items-center justify-between">
          <h2 className="font-serif text-lg font-medium">Nội dung trang</h2>
        </div>
        <div className="mb-4 flex flex-wrap gap-1.5">
          {BLOCK_TYPES.map((tp) => (
            <button key={tp} onClick={() => addBlock(tp)} className="rounded-full px-2.5 py-1 text-xs" style={{ border: "1px dashed var(--border2)", color: "var(--text2)" }}>
              <Plus size={12} className="inline" /> {SITE_BLOCK_LABEL[tp]}
            </button>
          ))}
        </div>

        {blocks.length === 0 ? (
          <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có khối nào. Bấm thêm khối ở trên (vd: Ảnh bìa → Bộ sưu tập → Bảng giá → Liên hệ).</p>
        ) : (
          <div className="space-y-3">
            {blocks.map((b, i) => (
              <div key={b.id} className="rounded-xl p-4" style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: b.visible ? 1 : 0.55 }}>
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="font-medium">{SITE_BLOCK_LABEL[b.type]}</p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => move(i, -1)} disabled={i === 0} className="btn-ghost px-2 py-1" title="Lên"><ChevronUp size={14} /></button>
                    <button onClick={() => move(i, 1)} disabled={i === blocks.length - 1} className="btn-ghost px-2 py-1" title="Xuống"><ChevronDown size={14} /></button>
                    <button onClick={() => toggleVisible(b)} className="btn-ghost px-2 py-1" title={b.visible ? "Đang hiện" : "Đang ẩn"}>{b.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button onClick={() => removeBlock(b.id)} className="btn-ghost px-2 py-1"><Trash2 size={14} /></button>
                  </div>
                </div>
                {(b.type === "gallery" || b.type === "pricing" || b.type === "testimonials") && (
                  <p className="mb-2 text-[11px]" style={{ color: "var(--text3)" }}>
                    {b.type === "gallery" ? "Tự lấy các album đã xuất bản của bạn." : b.type === "pricing" ? "Tự lấy bảng giá đang bật." : "Tự lấy đánh giá đã duyệt."}
                  </p>
                )}
                <div className="grid gap-2 sm:grid-cols-2">
                  {BLOCK_FIELDS[b.type].map((f) =>
                    f.area ? (
                      <textarea key={f.key} className="input min-h-[70px] sm:col-span-2" placeholder={f.label} value={String(b.config[f.key] ?? "")} onChange={(e) => setConfig(b.id, f.key, e.target.value)} />
                    ) : (
                      <input key={f.key} className="input" placeholder={f.label} value={String(b.config[f.key] ?? "")} onChange={(e) => setConfig(b.id, f.key, e.target.value)} />
                    )
                  )}
                </div>
                <button onClick={() => saveBlock(b)} className="btn-ghost mt-2 px-3 py-1.5 text-xs"><Check size={13} /> Lưu khối</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}

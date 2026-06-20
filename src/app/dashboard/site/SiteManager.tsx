"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, GripVertical, Check, ExternalLink, Globe, Sparkles, RefreshCw } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SITE_BLOCK_LABEL,
  RESERVED_SUBDOMAINS,
  type Site,
  type SiteBlock,
  type SiteBlockType,
  type SiteTheme,
} from "@/lib/types";
import { SITE_TEMPLATES } from "@/lib/site-templates";

const BLOCK_TYPES: SiteBlockType[] = ["hero", "gallery", "about", "pricing", "testimonials", "services", "stats", "video", "social", "faq", "contact"];

type AlbumLite = { id: string; slug: string; title: string; cover_url: string | null };

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
  video: [
    { key: "heading", label: "Tiêu đề" },
    { key: "url", label: "Link YouTube / Vimeo" },
  ],
  social: [
    { key: "heading", label: "Tiêu đề" },
    { key: "facebook", label: "Facebook (URL)" },
    { key: "instagram", label: "Instagram (URL)" },
    { key: "tiktok", label: "TikTok (URL)" },
    { key: "youtube", label: "YouTube (URL)" },
  ],
  faq: [
    { key: "heading", label: "Tiêu đề" },
    { key: "items", label: "Mỗi dòng: Câu hỏi | Câu trả lời", area: true },
  ],
  services: [
    { key: "heading", label: "Tiêu đề" },
    { key: "items", label: "Mỗi dòng: Tên dịch vụ | Mô tả", area: true },
  ],
  stats: [
    { key: "heading", label: "Tiêu đề (tuỳ chọn)" },
    { key: "items", label: "Mỗi dòng: Con số | Nhãn (vd: 8 năm | Kinh nghiệm)", area: true },
  ],
};

export default function SiteManager({
  site,
  initialBlocks,
  albums,
  plan,
  isAdmin,
  mainHost,
}: {
  site: Site;
  initialBlocks: SiteBlock[];
  albums: AlbumLite[];
  plan: string;
  isAdmin: boolean;
  mainHost: string;
}) {
  const supabase = createClient();
  const [subdomain, setSubdomain] = useState(site.subdomain ?? "");
  const [published, setPublished] = useState(site.published);
  const [theme, setTheme] = useState<SiteTheme>(site.theme || {});
  const [blocks, setBlocks] = useState<SiteBlock[]>(initialBlocks);
  const [dragId, setDragId] = useState<string | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const refreshPreview = () => setPreviewKey((k) => k + 1);
  const mode = theme.mode || "dark";
  function setMode(m: "light" | "dark") {
    setTheme((t) => ({ ...t, mode: m, bg: m === "light" ? "#ffffff" : "#0c0c0d", text: m === "light" ? "#161616" : "#ececec" }));
  }

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
    refreshPreview();
  }

  async function addBlock(type: SiteBlockType) {
    const { data } = await supabase
      .from("site_blocks")
      .insert({ site_id: site.id, type, position: blocks.length, config: {} })
      .select("*")
      .single();
    if (data) { setBlocks((p) => [...p, data as SiteBlock]); refreshPreview(); }
  }

  function setConfig(id: string, key: string, value: unknown) {
    setBlocks((p) => p.map((b) => (b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b)));
  }
  function toggleAlbum(blockId: string, albumId: string) {
    setBlocks((p) =>
      p.map((b) => {
        if (b.id !== blockId) return b;
        const cur = Array.isArray(b.config.album_ids) ? (b.config.album_ids as string[]) : [];
        const next = cur.includes(albumId) ? cur.filter((x) => x !== albumId) : [...cur, albumId];
        return { ...b, config: { ...b.config, album_ids: next } };
      })
    );
  }

  async function saveBlock(b: SiteBlock) {
    await supabase.from("site_blocks").update({ config: b.config, visible: b.visible }).eq("id", b.id);
    toast("Đã lưu khối.");
    refreshPreview();
  }

  async function toggleVisible(b: SiteBlock) {
    const next = !b.visible;
    setBlocks((p) => p.map((x) => (x.id === b.id ? { ...x, visible: next } : x)));
    await supabase.from("site_blocks").update({ visible: next }).eq("id", b.id);
    refreshPreview();
  }

  async function removeBlock(id: string) {
    setBlocks((p) => p.filter((b) => b.id !== id));
    await supabase.from("site_blocks").delete().eq("id", id);
    refreshPreview();
  }

  async function reorder(targetId: string) {
    const src = dragId;
    setDragId(null);
    if (!src || src === targetId) return;
    const from = blocks.findIndex((b) => b.id === src);
    const to = blocks.findIndex((b) => b.id === targetId);
    if (from < 0 || to < 0) return;
    const arr = [...blocks];
    const [moved] = arr.splice(from, 1);
    arr.splice(to, 0, moved);
    setBlocks(arr);
    await Promise.all(arr.map((b, i) => supabase.from("site_blocks").update({ position: i }).eq("id", b.id)));
    refreshPreview();
  }

  async function applyTemplate(key: string) {
    const tpl = SITE_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    if (blocks.length && !confirm("Áp dụng mẫu sẽ đổi màu sắc và thêm các khối của mẫu vào trang. Tiếp tục?")) return;
    setTheme(tpl.theme);
    await supabase.from("sites").update({ theme: tpl.theme }).eq("id", site.id);
    const base = blocks.length;
    const rows = tpl.blocks.map((b, i) => ({ site_id: site.id, type: b.type, position: base + i, config: b.config }));
    const { data } = await supabase.from("site_blocks").insert(rows).select("*");
    if (data) setBlocks((p) => [...p, ...(data as SiteBlock[])]);
    toast("Đã áp dụng mẫu.");
    refreshPreview();
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both]" style={{ width: "100vw", marginLeft: "calc(50% - 50vw)", paddingLeft: 16, paddingRight: 16 }}>
      {msg && (
        <div className="fixed left-1/2 top-6 z-50 -translate-x-1/2 rounded-full px-4 py-2 text-sm" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>{msg}</div>
      )}

      <div className="mb-4">
        <h1 className="font-serif text-2xl font-medium">Trang giới thiệu của bạn</h1>
        <p className="mt-1 text-xs" style={{ color: "var(--text2)" }}>Chọn mẫu, đổi nội dung — xem kết quả ngay bên phải.</p>
      </div>

      <div className="flex flex-col gap-5 lg:flex-row lg:items-start">
        {/* LEFT — controls (≈1/4) */}
        <div className="space-y-6 lg:w-1/4 lg:min-w-[280px] lg:shrink-0">
          {/* Step 1: pick a template */}
          <div className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium"><Sparkles size={16} /> 1. Chọn mẫu (1 chạm)</h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>Bấm một mẫu để áp dụng ngay; nội dung &amp; ảnh chỉ là mẫu, bạn đổi lại sau.</p>
            <div className="grid grid-cols-2 gap-2">
              {SITE_TEMPLATES.map((tp) => (
                <button key={tp.key} onClick={() => applyTemplate(tp.key)} className="overflow-hidden rounded-xl text-left transition-transform hover:scale-[1.02]" style={{ border: "1px solid var(--border)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={tp.thumb} alt={tp.name} className="aspect-[3/2] w-full object-cover" />
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="text-xs font-medium">{tp.name}</span>
                    <span className="rounded-full px-1.5 py-0.5 text-[9px]" style={{ background: "var(--surface2)", color: "var(--text3)" }}>{tp.theme.mode === "light" ? "Sáng" : "Tối"}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* Step 2: look & feel */}
          <div className="card p-5">
            <h2 className="mb-3 font-serif text-lg font-medium">2. Giao diện</h2>
            <div className="grid grid-cols-2 gap-2">
              {(["light", "dark"] as const).map((m) => (
                <button key={m} onClick={() => setMode(m)} className="rounded-xl px-3 py-2.5 text-sm font-medium" style={{ border: "1px solid var(--border2)", background: mode === m ? "var(--surface2)" : "transparent", color: mode === m ? "var(--accent)" : "var(--text2)" }}>
                  {m === "light" ? "☀ Sáng" : "🌙 Tối"}
                </button>
              ))}
            </div>
            <div className="mt-3 flex items-center gap-3">
              <label className="label mb-0">Màu nhấn</label>
              <input type="color" className="input h-9 w-16 p-1" value={theme.accent || "#c7a76b"} onChange={(e) => setTheme((t) => ({ ...t, accent: e.target.value }))} />
            </div>
            <div className="mt-3">
              <label className="label">Logo (tuỳ chọn)</label>
              <input className="input" placeholder="Dán link logo, hoặc chọn ảnh bên dưới" value={theme.logo || ""} onChange={(e) => setTheme((t) => ({ ...t, logo: e.target.value }))} />
              {albums.length > 0 && (
                <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
                  {albums.filter((a) => a.cover_url).slice(0, 8).map((a) => (
                    <button key={a.id} type="button" onClick={() => setTheme((t) => ({ ...t, logo: a.cover_url || "" }))} title={a.title} className="h-8 w-10 overflow-hidden rounded" style={{ border: theme.logo === a.cover_url ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={a.cover_url as string} alt={a.title} className="h-full w-full object-cover" />
                    </button>
                  ))}
                  {theme.logo && <button type="button" onClick={() => setTheme((t) => ({ ...t, logo: "" }))} className="text-[11px]" style={{ color: "var(--text3)" }}>bỏ logo</button>}
                </div>
              )}
            </div>
            <details className="mt-3">
              <summary className="cursor-pointer text-xs" style={{ color: "var(--text3)" }}>Tuỳ chỉnh nâng cao</summary>
              <div className="mt-2 grid grid-cols-2 gap-2">
                <div>
                  <label className="label">Vị trí menu</label>
                  <select className="input" value={theme.navPosition || "top"} onChange={(e) => setTheme((t) => ({ ...t, navPosition: e.target.value as "top" | "left" | "right" }))}>
                    <option value="top">Menu trên</option>
                    <option value="left">Menu bên trái</option>
                    <option value="right">Menu bên phải</option>
                  </select>
                </div>
                <div>
                  <label className="label">Cỡ ảnh bìa</label>
                  <select className="input" value={theme.heroSize || "medium"} onChange={(e) => setTheme((t) => ({ ...t, heroSize: e.target.value as "small" | "medium" | "large" }))}>
                    <option value="small">Nhỏ</option>
                    <option value="medium">Vừa</option>
                    <option value="large">Lớn</option>
                  </select>
                </div>
                <div>
                  <label className="label">Bề rộng trang</label>
                  <select className="input" value={theme.contentWidth || "compact"} onChange={(e) => setTheme((t) => ({ ...t, contentWidth: e.target.value as "full" | "compact" }))}>
                    <option value="compact">Thu gọn</option>
                    <option value="full">Toàn màn hình</option>
                  </select>
                </div>
                <div>
                  <label className="label">Phông chữ</label>
                  <select className="input" value={theme.font || "serif"} onChange={(e) => setTheme((t) => ({ ...t, font: e.target.value as "serif" | "sans" }))}>
                    <option value="serif">Cổ điển</option>
                    <option value="sans">Hiện đại</option>
                  </select>
                </div>
                <div>
                  <label className="label">Canh chữ Hero</label>
                  <select className="input" value={theme.heroAlign || "center"} onChange={(e) => setTheme((t) => ({ ...t, heroAlign: e.target.value as "center" | "left" }))}>
                    <option value="center">Giữa</option>
                    <option value="left">Trái</option>
                  </select>
                </div>
                <div>
                  <label className="label">Số cột ảnh</label>
                  <select className="input" value={String(theme.galleryCols || 3)} onChange={(e) => setTheme((t) => ({ ...t, galleryCols: Number(e.target.value) }))}>
                    <option value="2">2 cột</option>
                    <option value="3">3 cột</option>
                    <option value="4">4 cột</option>
                  </select>
                </div>
                <div>
                  <label className="label">Góc bo</label>
                  <select className="input" value={theme.radius || "rounded"} onChange={(e) => setTheme((t) => ({ ...t, radius: e.target.value as "rounded" | "sharp" }))}>
                    <option value="rounded">Bo tròn</option>
                    <option value="sharp">Vuông</option>
                  </select>
                </div>
                <div>
                  <label className="label">Màu nền</label>
                  <input type="color" className="input h-9 p-1" value={theme.bg || "#0c0c0d"} onChange={(e) => setTheme((t) => ({ ...t, bg: e.target.value }))} />
                </div>
              </div>
            </details>
          </div>

          {/* Step 3: content blocks */}
          <div className="card p-5">
            <h2 className="mb-1 font-serif text-lg font-medium">3. Nội dung</h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>Kéo thả <GripVertical size={12} className="inline" /> để đổi thứ tự. Bấm để thêm khối:</p>
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
            {blocks.map((b) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => setDragId(b.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={() => reorder(b.id)}
                onDragEnd={() => setDragId(null)}
                className="rounded-xl p-4"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: dragId === b.id ? 0.4 : b.visible ? 1 : 0.55 }}
              >
                <div className="mb-2 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-medium">
                    <GripVertical size={15} style={{ color: "var(--text3)", cursor: "grab" }} /> {SITE_BLOCK_LABEL[b.type]}
                  </p>
                  <div className="flex items-center gap-1">
                    <button onClick={() => toggleVisible(b)} className="btn-ghost px-2 py-1" title={b.visible ? "Đang hiện" : "Đang ẩn"}>{b.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button onClick={() => removeBlock(b.id)} className="btn-ghost px-2 py-1"><Trash2 size={14} /></button>
                  </div>
                </div>
                {b.type !== "hero" && (
                  <select className="input mb-2 py-1 text-xs" value={String(b.config.width || "full")} onChange={(e) => setConfig(b.id, "width", e.target.value)}>
                    <option value="full">Khối toàn phần</option>
                    <option value="half">Khối một nửa (xếp ngang)</option>
                  </select>
                )}
                {(b.type === "pricing" || b.type === "testimonials") && (
                  <p className="mb-2 text-[11px]" style={{ color: "var(--text3)" }}>
                    {b.type === "pricing" ? "Tự lấy bảng giá đang bật." : "Tự lấy đánh giá đã duyệt."}
                  </p>
                )}
                <div className="grid gap-2">
                  {BLOCK_FIELDS[b.type].map((f) => {
                    const isImage = f.key === "image";
                    if (f.area) {
                      return <textarea key={f.key} className="input min-h-[70px] sm:col-span-2" placeholder={f.label} value={String(b.config[f.key] ?? "")} onChange={(e) => setConfig(b.id, f.key, e.target.value)} />;
                    }
                    return (
                      <div key={f.key} className={isImage ? "sm:col-span-2" : ""}>
                        <input className="input" placeholder={f.label} value={String(b.config[f.key] ?? "")} onChange={(e) => setConfig(b.id, f.key, e.target.value)} />
                        {isImage && albums.length > 0 && (
                          <div className="mt-1.5 flex flex-wrap gap-1.5">
                            <span className="text-[11px]" style={{ color: "var(--text3)" }}>hoặc chọn từ album:</span>
                            {albums.filter((a) => a.cover_url).slice(0, 12).map((a) => (
                              <button key={a.id} type="button" onClick={() => setConfig(b.id, "image", a.cover_url)} title={a.title} className="h-8 w-10 overflow-hidden rounded" style={{ border: b.config.image === a.cover_url ? "2px solid var(--accent)" : "1px solid var(--border)" }}>
                                {/* eslint-disable-next-line @next/next/no-img-element */}
                                <img src={a.cover_url as string} alt={a.title} className="h-full w-full object-cover" />
                              </button>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>

                {/* Gallery: pick which albums to feature */}
                {b.type === "gallery" && (
                  <div className="mt-2">
                    <p className="mb-1.5 text-[11px]" style={{ color: "var(--text3)" }}>Chọn album để hiện (bỏ trống = hiện tất cả album đã xuất bản):</p>
                    {albums.length === 0 ? (
                      <p className="text-[11px]" style={{ color: "var(--text3)" }}>Chưa có album đã xuất bản nào.</p>
                    ) : (
                      <div className="flex flex-wrap gap-1.5">
                        {albums.map((a) => {
                          const picked = Array.isArray(b.config.album_ids) && (b.config.album_ids as string[]).includes(a.id);
                          return (
                            <button key={a.id} type="button" onClick={() => toggleAlbum(b.id, a.id)} className="rounded-full px-2.5 py-1 text-xs" style={{ border: "1px solid var(--border2)", background: picked ? "var(--surface)" : "transparent", color: picked ? "var(--accent)" : "var(--text2)" }}>
                              {picked ? "✓ " : ""}{a.title}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                )}

                <button onClick={() => saveBlock(b)} className="btn-ghost mt-2 px-3 py-1.5 text-xs"><Check size={13} /> Lưu khối</button>
              </div>
            ))}
          </div>
        )}
          </div>

          {/* Step 4: domain + publish */}
          <div className="card p-5">
            <h2 className="mb-3 font-serif text-lg font-medium">4. Tên miền &amp; xuất bản</h2>
            <label className="label">Tên miền phụ</label>
            <div className="flex items-center gap-2">
              <input className="input" placeholder="ten-cua-ban" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase())} />
              <span className="shrink-0 text-sm" style={{ color: "var(--text3)" }}>.{mainHost || "vieetjk.com"}</span>
            </div>
            <label className="mt-3 flex items-center gap-2 text-sm" style={{ color: "var(--text2)" }}>
              <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} />
              Xuất bản (cho mọi người xem)
            </label>
            <button onClick={saveSite} disabled={busy} className="btn-primary mt-4 w-full"><Check size={15} /> {busy ? "Đang lưu…" : "Lưu & cập nhật trang"}</button>
            {!studioPro && (
              <p className="mt-3 flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
                <Globe size={12} /> Tên miền riêng (vd: studio-cua-ban.com) dành cho gói Studio — giai đoạn sau.
              </p>
            )}
          </div>
        </div>

        {/* RIGHT — live preview (≈3/4) */}
        <div className="lg:min-w-0 lg:flex-1">
          <div className="lg:sticky lg:top-20">
            <div className="card p-3">
              <div className="mb-2 flex items-center justify-between">
                <h2 className="flex items-center gap-2 px-1 font-serif text-base font-medium"><Eye size={15} /> Xem trực tiếp</h2>
                <div className="flex gap-1.5">
                  <button onClick={refreshPreview} className="btn-ghost px-2.5 py-1 text-xs"><RefreshCw size={13} /> Làm mới</button>
                  <a href="/site-preview" target="_blank" rel="noreferrer" className="btn-ghost px-2.5 py-1 text-xs" title="Mở tab mới"><ExternalLink size={13} /></a>
                </div>
              </div>
              <div className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
                <iframe key={previewKey} src="/site-preview" title="Xem trước" className="w-full" style={{ height: "86vh", border: 0, background: "#fff" }} />
              </div>
              {liveUrl && published && (
                <a href={liveUrl} target="_blank" rel="noreferrer" className="mt-2 block truncate text-center text-xs text-accent hover:underline">Trang thật: {liveUrl}</a>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

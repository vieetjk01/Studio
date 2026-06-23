"use client";

import { useState } from "react";
import { Plus, Trash2, Eye, EyeOff, GripVertical, Check, ExternalLink, Globe, Sparkles, RefreshCw, Monitor, Smartphone, RotateCcw, X, Wand2, CheckCircle2, Circle } from "lucide-react";
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

const BLOCK_TYPES: SiteBlockType[] = ["hero", "gallery", "about", "pricing", "testimonials", "services", "stats", "team", "quote", "cta", "logos", "video", "social", "faq", "map", "contact"];

// One-click colour schemes for people who don't want to fiddle with hex codes.
const PALETTES: { name: string; mode: "light" | "dark"; bg: string; text: string; accent: string }[] = [
  { name: "Champagne", mode: "dark", bg: "#0c0c0d", text: "#ececec", accent: "#c7a76b" },
  { name: "Đen trắng", mode: "dark", bg: "#0b0b0b", text: "#eaeaea", accent: "#eaeaea" },
  { name: "Xanh đêm", mode: "dark", bg: "#0a0d14", text: "#e8ecf4", accent: "#6f8fd0" },
  { name: "Xanh rêu", mode: "dark", bg: "#0e1311", text: "#e7efe9", accent: "#83b08f" },
  { name: "Kem sáng", mode: "light", bg: "#faf7f2", text: "#1f1a14", accent: "#b07a36" },
  { name: "Trắng tối giản", mode: "light", bg: "#ffffff", text: "#161616", accent: "#111111" },
  { name: "Hồng pastel", mode: "light", bg: "#fdf6f4", text: "#2a1f1f", accent: "#c08585" },
  { name: "Be ấm", mode: "light", bg: "#f4efe7", text: "#241d15", accent: "#9c6b3f" },
];

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
  cta: [
    { key: "heading", label: "Tiêu đề lớn" },
    { key: "text", label: "Mô tả ngắn" },
    { key: "button", label: "Chữ trên nút (mặc định: Đặt lịch)" },
  ],
  team: [
    { key: "heading", label: "Tiêu đề" },
    { key: "items", label: "Mỗi dòng: Tên | Vai trò | Ảnh (URL)", area: true },
  ],
  quote: [
    { key: "text", label: "Nội dung trích dẫn", area: true },
    { key: "author", label: "Tác giả / khách hàng" },
  ],
  logos: [
    { key: "heading", label: "Tiêu đề (tuỳ chọn)" },
    { key: "items", label: "Mỗi dòng 1 link logo (URL ảnh)", area: true },
  ],
  map: [
    { key: "heading", label: "Tiêu đề (tuỳ chọn)" },
    { key: "address", label: "Địa chỉ studio (hiện bản đồ)" },
  ],
};

// Short, plain-language hint shown under each block in the editor.
const BLOCK_TIP: Partial<Record<SiteBlockType, string>> = {
  hero: "Ảnh lớn đầu trang kèm tên & câu giới thiệu.",
  gallery: "Lưới album ảnh của bạn.",
  about: "Đoạn giới thiệu ngắn + 1 ảnh.",
  pricing: "Tự hiển thị bảng giá đang bật.",
  testimonials: "Tự hiển thị đánh giá khách đã duyệt.",
  contact: "Thông tin liên hệ + nút đặt lịch.",
  video: "Nhúng 1 video YouTube/Vimeo.",
  social: "Các nút mạng xã hội.",
  faq: "Danh sách câu hỏi – trả lời.",
  services: "Danh sách dịch vụ / quy trình làm việc.",
  stats: "Vài con số nổi bật (năm KN, số album…).",
  cta: "Dải kêu gọi khách đặt lịch.",
  team: "Ảnh + tên các thành viên ekip.",
  quote: "Một câu trích dẫn nổi bật.",
  logos: "Hàng logo đối tác / báo chí.",
  map: "Bản đồ địa chỉ studio.",
};

// One-click sample content so non-designers see a finished-looking block.
const sImg = (s: string, w = 1200, h = 800) => `https://picsum.photos/seed/${s}/${w}/${h}`;
const BLOCK_SAMPLE: Partial<Record<SiteBlockType, Record<string, unknown>>> = {
  hero: { heading: "", subheading: "Nhiếp ảnh gia cưới & chân dung", image: sImg("vk-s-hero", 1600, 900) },
  about: { heading: "Về tôi", text: "Mình kể chuyện qua từng khung hình.\nMỗi buổi chụp là một kỷ niệm được lưu giữ trọn vẹn.", image: sImg("vk-s-about") },
  services: { heading: "Dịch vụ", items: "Chụp cưới | Phóng sự trọn ngày\nPrewedding | Concept theo yêu cầu\nGia đình | Studio & ngoại cảnh" },
  stats: { items: "8 năm | Kinh nghiệm\n300+ | Album\n100% | Khách hài lòng" },
  faq: { heading: "Câu hỏi thường gặp", items: "Đặt cọc bao nhiêu? | Studio giữ lịch khi cọc 30%.\nKhi nào nhận ảnh? | Ảnh chỉnh giao trong 15–20 ngày." },
  video: { heading: "Video highlight", url: "" },
  social: { heading: "Theo dõi", facebook: "", instagram: "" },
  cta: { heading: "Sẵn sàng cho buổi chụp của bạn?", text: "Liên hệ ngay để giữ ngày đẹp và nhận tư vấn miễn phí.", button: "Đặt lịch ngay" },
  team: { heading: "Đội ngũ", items: `Minh Anh | Photographer | ${sImg("vk-s-t1", 400, 400)}\nQuốc Bảo | Quay phim | ${sImg("vk-s-t2", 400, 400)}\nThu Hà | Trang điểm | ${sImg("vk-s-t3", 400, 400)}` },
  quote: { text: "Chúng tôi không chỉ chụp ảnh — chúng tôi kể lại câu chuyện ngày trọng đại của bạn.", author: "Vieetjk Studio" },
  logos: { heading: "Được tin tưởng bởi", items: "https://dummyimage.com/160x40/cccccc/333333&text=Brand+1\nhttps://dummyimage.com/160x40/cccccc/333333&text=Brand+2\nhttps://dummyimage.com/160x40/cccccc/333333&text=Brand+3" },
  map: { heading: "Ghé studio", address: "Hồ Gươm, Hà Nội" },
  contact: { heading: "Liên hệ & đặt lịch" },
  gallery: { heading: "Bộ sưu tập nổi bật" },
  pricing: { heading: "Bảng giá dịch vụ" },
  testimonials: { heading: "Khách hàng nói gì" },
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
  const [paletteType, setPaletteType] = useState<SiteBlockType | null>(null);
  const [msg, setMsg] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [previewKey, setPreviewKey] = useState(0);
  const [device, setDevice] = useState<"desktop" | "mobile">("desktop");
  const [previewTpl, setPreviewTpl] = useState<string | null>(null);
  const refreshPreview = () => setPreviewKey((k) => k + 1);
  const mode = theme.mode || "dark";
  function setMode(m: "light" | "dark") {
    setTheme((t) => ({ ...t, mode: m, bg: m === "light" ? "#ffffff" : "#0c0c0d", text: m === "light" ? "#161616" : "#ececec" }));
  }

  async function resetSite() {
    if (!confirm("Xoá toàn bộ khối nội dung và cài đặt giao diện để làm lại từ đầu? (Không xoá album/bảng giá của bạn.)")) return;
    setBusy(true);
    await supabase.from("site_blocks").delete().eq("site_id", site.id);
    await supabase.from("sites").update({ theme: {} }).eq("id", site.id);
    setBusy(false);
    setBlocks([]);
    setTheme({});
    toast("Đã xoá — bắt đầu lại từ đầu.");
    refreshPreview();
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

  // Insert a new block at a given index (drag a palette chip into the list).
  async function addBlockAt(type: SiteBlockType, index: number) {
    const { data } = await supabase
      .from("site_blocks")
      .insert({ site_id: site.id, type, position: index, config: {} })
      .select("*")
      .single();
    if (!data) return;
    const next = [...blocks];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, data as SiteBlock);
    setBlocks(next);
    await Promise.all(next.map((b, i) => supabase.from("site_blocks").update({ position: i }).eq("id", b.id)));
    refreshPreview();
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

  // Fill a block with ready-made sample content (keeps anything already typed).
  async function fillSample(b: SiteBlock) {
    const sample = BLOCK_SAMPLE[b.type];
    if (!sample) return;
    const next = { ...sample, ...b.config }; // don't overwrite what the user already wrote
    setBlocks((p) => p.map((x) => (x.id === b.id ? { ...x, config: next } : x)));
    await supabase.from("site_blocks").update({ config: next }).eq("id", b.id);
    toast("Đã điền nội dung mẫu.");
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

      {/* Top toolbar: domain + publish + save + preview controls */}
      <div className="mb-4 flex flex-wrap items-center gap-2">
        <h1 className="mr-auto font-serif text-xl font-medium">Trang web của bạn</h1>

        <div className="flex items-center gap-1.5 rounded-lg px-2 py-1" style={{ background: "var(--surface2)", border: "1px solid var(--border)" }}>
          <input className="input h-8 w-32 text-xs" placeholder="ten-cua-ban" value={subdomain} onChange={(e) => setSubdomain(e.target.value.toLowerCase())} />
          <span className="text-xs" style={{ color: "var(--text3)" }}>.{mainHost || "mstudo.com"}</span>
          <label className="flex items-center gap-1 whitespace-nowrap text-xs" style={{ color: "var(--text2)" }}>
            <input type="checkbox" checked={published} onChange={(e) => setPublished(e.target.checked)} /> Xuất bản
          </label>
        </div>
        <button onClick={saveSite} disabled={busy} className="btn-primary px-3 py-2 text-xs"><Check size={14} /> {busy ? "Đang lưu…" : "Lưu & cập nhật"}</button>

        <span className="mx-1 hidden h-6 w-px sm:block" style={{ background: "var(--border)" }} />

        <div className="flex overflow-hidden rounded-lg" style={{ border: "1px solid var(--border)" }}>
          <button onClick={() => setDevice("desktop")} className="px-2.5 py-2" title="Xem máy tính" style={{ background: device === "desktop" ? "var(--surface2)" : "transparent", color: device === "desktop" ? "var(--accent)" : "var(--text2)" }}><Monitor size={14} /></button>
          <button onClick={() => setDevice("mobile")} className="px-2.5 py-2" title="Xem điện thoại" style={{ background: device === "mobile" ? "var(--surface2)" : "transparent", color: device === "mobile" ? "var(--accent)" : "var(--text2)" }}><Smartphone size={14} /></button>
        </div>
        <button onClick={refreshPreview} className="btn-ghost px-2.5 py-2 text-xs"><RefreshCw size={13} /> Làm mới</button>
        {liveUrl && published && (
          <a href={liveUrl} target="_blank" rel="noreferrer" className="btn-ghost px-2.5 py-2 text-xs"><ExternalLink size={13} /> Trang thật</a>
        )}
        <button onClick={resetSite} disabled={busy} className="btn-ghost px-2.5 py-2 text-xs" style={{ color: "#c77b7b" }}><RotateCcw size={13} /> Làm lại</button>
      </div>

      <div className="flex flex-col gap-5 lg:h-[calc(100vh-170px)] lg:flex-row lg:items-stretch lg:overflow-hidden">
        {/* LEFT — controls (≈1/4), scrolls on its own */}
        <div className="space-y-6 lg:w-1/4 lg:min-w-[280px] lg:shrink-0 lg:h-full lg:overflow-y-auto lg:pr-2">
          {/* Completion checklist */}
          <div className="card p-5">
            <h2 className="mb-2 flex items-center gap-2 font-serif text-lg font-medium"><CheckCircle2 size={16} /> Sẵn sàng xuất bản?</h2>
            <ul className="space-y-1.5 text-sm">
              {[
                { ok: !!subdomain.trim() && !validSubdomain(subdomain), label: "Đặt tên miền phụ" },
                { ok: blocks.length > 0, label: "Thêm khối nội dung" },
                { ok: blocks.some((b) => b.type === "hero"), label: "Có ảnh bìa (Hero)" },
                { ok: blocks.some((b) => ["contact", "cta", "social"].includes(b.type)), label: "Có liên hệ / đặt lịch" },
                { ok: published, label: "Bật Xuất bản" },
              ].map((it, i) => (
                <li key={i} className="flex items-center gap-2" style={{ color: it.ok ? "var(--text)" : "var(--text3)" }}>
                  {it.ok ? <CheckCircle2 size={15} style={{ color: "#5fd29a" }} /> : <Circle size={15} />}
                  {it.label}
                </li>
              ))}
            </ul>
          </div>

          {/* Step 1: pick a template */}
          <div className="card p-5">
            <h2 className="mb-1 flex items-center gap-2 font-serif text-lg font-medium"><Sparkles size={16} /> 1. Chọn mẫu</h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>Bấm ảnh để <b>xem trước trang hoàn chỉnh</b>, rồi “Dùng”. Nội dung &amp; ảnh là mẫu, bạn đổi sau.</p>
            <div className="grid grid-cols-2 gap-2">
              {SITE_TEMPLATES.map((tp) => (
                <div key={tp.key} className="overflow-hidden rounded-xl" style={{ border: "1px solid var(--border)" }}>
                  <button onClick={() => setPreviewTpl(tp.key)} className="relative block w-full" title="Xem trước">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img src={tp.thumb} alt={tp.name} className="aspect-[3/2] w-full object-cover" />
                    <span className="absolute bottom-1 right-1 rounded px-1.5 py-0.5 text-[9px]" style={{ background: "rgba(0,0,0,.6)", color: "#fff" }}><Eye size={9} className="mr-0.5 inline" />Xem</span>
                  </button>
                  <div className="flex items-center justify-between gap-1 p-2">
                    <span className="truncate text-xs font-medium">{tp.name} <span style={{ color: "var(--text3)" }}>· {tp.theme.mode === "light" ? "Sáng" : "Tối"}</span></span>
                    <button onClick={() => applyTemplate(tp.key)} className="btn-primary shrink-0 px-2 py-0.5 text-[10px]">Dùng</button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Step 2: look & feel */}
          <div className="card p-5">
            <h2 className="mb-1 font-serif text-lg font-medium">2. Giao diện</h2>
            <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>Không cần rành thiết kế — chọn một <b>bảng màu có sẵn</b> bên dưới.</p>
            <div className="mb-4 grid grid-cols-4 gap-2">
              {PALETTES.map((p) => {
                const active = (theme.bg || "").toLowerCase() === p.bg && (theme.accent || "").toLowerCase() === p.accent;
                return (
                  <button
                    key={p.name}
                    onClick={() => setTheme((t) => ({ ...t, mode: p.mode, bg: p.bg, text: p.text, accent: p.accent }))}
                    title={p.name}
                    className="overflow-hidden rounded-lg text-left"
                    style={{ border: active ? "2px solid var(--accent)" : "1px solid var(--border)" }}
                  >
                    <div className="flex h-8 items-center justify-center" style={{ background: p.bg }}>
                      <span className="h-3.5 w-3.5 rounded-full" style={{ background: p.accent, border: `1px solid ${p.text}33` }} />
                    </div>
                    <div className="truncate px-1 py-0.5 text-[9px]" style={{ color: "var(--text3)" }}>{p.name}</div>
                  </button>
                );
              })}
            </div>
            <label className="label mb-1.5 block">Hoặc tự chỉnh</label>
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
            <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}><b>Kéo</b> khối thả vào danh sách dưới (hoặc bấm để thêm). Kéo <GripVertical size={12} className="inline" /> để đổi thứ tự.</p>
            <div className="mb-4 flex flex-wrap gap-1.5">
              {BLOCK_TYPES.map((tp) => (
                <button
                  key={tp}
                  draggable
                  onDragStart={() => setPaletteType(tp)}
                  onDragEnd={() => setPaletteType(null)}
                  onClick={() => addBlock(tp)}
                  className="cursor-grab rounded-full px-2.5 py-1 text-xs active:cursor-grabbing"
                  style={{ border: "1px dashed var(--border2)", color: "var(--text2)" }}
                >
                  <Plus size={12} className="inline" /> {SITE_BLOCK_LABEL[tp]}
                </button>
              ))}
            </div>

        <div
          onDragOver={(e) => { if (paletteType) e.preventDefault(); }}
          onDrop={() => { if (paletteType) { addBlockAt(paletteType, blocks.length); setPaletteType(null); } }}
          className="space-y-3 rounded-xl"
          style={{ minHeight: 70, padding: paletteType ? 6 : 0, outline: paletteType ? "2px dashed var(--accent)" : "none", outlineOffset: 2 }}
        >
          {blocks.length === 0 && (
            <div className="rounded-xl border border-dashed p-5 text-center text-sm" style={{ borderColor: "var(--border2)", color: "var(--text3)" }}>
              <p className="mb-1">Chưa có khối nào.</p>
              <p>Cách nhanh nhất: chọn một <b>mẫu</b> ở Bước 1 — trang sẽ có sẵn đầy đủ khối, bạn chỉ cần sửa chữ &amp; ảnh.</p>
              <p className="mt-1">Hoặc bấm/kéo nút khối ở trên (vd: Ảnh bìa → Bộ sưu tập → Bảng giá → Liên hệ), rồi bấm <Wand2 size={12} className="inline" /> để điền nội dung mẫu.</p>
            </div>
          )}
            {blocks.map((b, idx) => (
              <div
                key={b.id}
                draggable
                onDragStart={() => setDragId(b.id)}
                onDragOver={(e) => e.preventDefault()}
                onDrop={(e) => { e.stopPropagation(); if (paletteType) { addBlockAt(paletteType, idx); setPaletteType(null); } else { reorder(b.id); } }}
                onDragEnd={() => setDragId(null)}
                className="rounded-xl p-4"
                style={{ background: "var(--surface2)", border: "1px solid var(--border)", opacity: dragId === b.id ? 0.4 : b.visible ? 1 : 0.55 }}
              >
                <div className="mb-1 flex items-center justify-between gap-2">
                  <p className="flex items-center gap-2 font-medium">
                    <GripVertical size={15} style={{ color: "var(--text3)", cursor: "grab" }} /> {SITE_BLOCK_LABEL[b.type]}
                  </p>
                  <div className="flex items-center gap-1">
                    {BLOCK_SAMPLE[b.type] && (
                      <button onClick={() => fillSample(b)} className="btn-ghost px-2 py-1" title="Điền nội dung mẫu"><Wand2 size={14} /></button>
                    )}
                    <button onClick={() => toggleVisible(b)} className="btn-ghost px-2 py-1" title={b.visible ? "Đang hiện" : "Đang ẩn"}>{b.visible ? <Eye size={14} /> : <EyeOff size={14} />}</button>
                    <button onClick={() => removeBlock(b.id)} className="btn-ghost px-2 py-1"><Trash2 size={14} /></button>
                  </div>
                </div>
                {BLOCK_TIP[b.type] && (
                  <p className="mb-2 text-[11px]" style={{ color: "var(--text3)" }}>{BLOCK_TIP[b.type]}</p>
                )}
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
          </div>

          {!studioPro && (
            <p className="flex items-center gap-1.5 text-[11px]" style={{ color: "var(--text3)" }}>
              <Globe size={12} /> Tên miền riêng (vd: studio-cua-ban.com) dành cho gói Studio — giai đoạn sau.
            </p>
          )}
        </div>

        {/* RIGHT — live preview (≈3/4), fixed; the site scrolls inside the iframe */}
        <div className="lg:h-full lg:min-w-0 lg:flex-1">
          <div className="card flex flex-col p-2 lg:h-full">
            <div className="flex justify-center overflow-hidden rounded-xl lg:flex-1" style={{ border: "1px solid var(--border)", background: device === "mobile" ? "var(--surface2)" : "#fff", padding: device === "mobile" ? 10 : 0 }}>
              <iframe
                key={previewKey}
                src="/site-preview"
                title="Xem trước"
                className="h-[82vh] lg:h-full"
                style={{ width: device === "mobile" ? 390 : "100%", maxWidth: "100%", border: 0, background: "#fff", borderRadius: device === "mobile" ? 12 : 0 }}
              />
            </div>
          </div>
        </div>
      </div>

      {/* Template full-page preview modal */}
      {previewTpl && (
        <div className="fixed inset-0 z-50 flex flex-col p-3" style={{ background: "rgba(0,0,0,.7)" }} onClick={() => setPreviewTpl(null)}>
          <div className="mx-auto flex w-full max-w-5xl flex-1 flex-col overflow-hidden rounded-xl" style={{ background: "var(--surface)", border: "1px solid var(--border)" }} onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between gap-2 border-b px-3 py-2" style={{ borderColor: "var(--border)" }}>
              <span className="text-sm font-medium">Xem trước mẫu: {SITE_TEMPLATES.find((t) => t.key === previewTpl)?.name}</span>
              <div className="flex gap-2">
                <button onClick={() => { const k = previewTpl; setPreviewTpl(null); if (k) applyTemplate(k); }} className="btn-primary px-3 py-1.5 text-xs">Dùng mẫu này</button>
                <button onClick={() => setPreviewTpl(null)} className="btn-ghost px-2.5 py-1.5 text-xs"><X size={14} /></button>
              </div>
            </div>
            <iframe src={`/site-preview?template=${previewTpl}`} title="Xem trước mẫu" className="w-full flex-1" style={{ border: 0, background: "#fff" }} />
          </div>
        </div>
      )}
    </div>
  );
}

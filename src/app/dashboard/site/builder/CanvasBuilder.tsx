"use client";

import { Fragment, useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import {
  Monitor, Smartphone, Undo2, Redo2, Eye, Rocket, ArrowLeft, Plus,
  LayoutTemplate, Blocks, GripVertical, ChevronUp, ChevronDown, Copy,
  Trash2, ImagePlus, X, Type as TypeIcon, Check, ExternalLink,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import {
  SITE_BLOCK_LABEL,
  vnd,
  type Site,
  type SiteBlock,
  type SiteBlockType,
  type SiteTheme,
} from "@/lib/types";
import { SITE_TEMPLATES, personalizeBlocks, EMPTY_INTAKE } from "@/lib/site-templates";
import { compressImage } from "@/lib/image";
import { useTheme } from "@/lib/theme";

/* ─────────────────────────────────────────────────────────────────────────
   Trình tạo website kéo-thả (canvas + inline edit + inspector).
   Chrome (giao diện công cụ) dùng bộ token đất nung theo handoff; canvas dùng
   theme thật của trang (sites.theme) nên giống hệt trang xuất bản.
   ───────────────────────────────────────────────────────────────────────── */

type Device = "desktop" | "mobile";
type AlbumLite = { id: string; slug: string; title: string; cover_url: string | null };

// Bộ màu nhấn người dùng có thể chọn nhanh (theo handoff §5).
const ACCENTS = ["#1A1815", "#C9A24B", "#E0533D", "#C0837D", "#3E6F63", "#5566B5"];

// Các loại khối hiện trong palette — trùng với SiteRenderer/quản lý cũ.
const PALETTE: SiteBlockType[] = [
  "hero", "gallery", "about", "services", "stats", "pricing",
  "testimonials", "quote", "cta", "team", "logos", "video",
  "social", "faq", "map", "contact", "html",
];

// Nội dung mặc định khi thêm 1 khối mới (đúng config key của SiteRenderer).
const DEFAULTS: Partial<Record<SiteBlockType, Record<string, unknown>>> = {
  hero: { heading: "Tên studio của bạn", subheading: "Nhiếp ảnh cưới & chân dung" },
  about: { heading: "Về chúng tôi", text: "Mỗi khung hình là một câu chuyện.\nChúng tôi lưu giữ khoảnh khắc trọn vẹn nhất của bạn." },
  gallery: { heading: "Bộ sưu tập" },
  services: { heading: "Dịch vụ", items: "Chụp cưới | Phóng sự trọn ngày\nPre-wedding | Concept theo yêu cầu\nGia đình | Studio & ngoại cảnh" },
  stats: { items: "8 năm | Kinh nghiệm\n300+ | Album\n100% | Khách hài lòng" },
  pricing: { heading: "Bảng giá" },
  testimonials: { heading: "Khách hàng nói gì" },
  quote: { text: "Chúng tôi không chỉ chụp ảnh — chúng tôi kể lại câu chuyện của bạn.", author: "Studio" },
  cta: { heading: "Sẵn sàng cho buổi chụp của bạn?", text: "Liên hệ ngay để giữ ngày đẹp.", button: "Đặt lịch ngay" },
  team: { heading: "Đội ngũ", items: "Minh Anh | Photographer | \nQuốc Bảo | Quay phim | " },
  logos: { heading: "Đối tác", items: "" },
  video: { heading: "Video highlight", url: "" },
  social: { heading: "Theo dõi", facebook: "", instagram: "" },
  faq: { heading: "Câu hỏi thường gặp", items: "Đặt cọc bao nhiêu? | Studio giữ lịch khi cọc 30%.\nKhi nào nhận ảnh? | Trong 15–20 ngày." },
  map: { heading: "Ghé studio", address: "" },
  contact: { heading: "Liên hệ & đặt lịch", email: "", address: "" },
  html: { heading: "", html: "<!-- Dán mã HTML / nhúng của bạn vào đây -->" },
};

function uid() {
  return (crypto.randomUUID?.() ?? Math.random().toString(36).slice(2) + Date.now().toString(36)).replace(/-/g, "");
}

function isLightHex(hex?: string): boolean {
  if (!hex) return false;
  const m = hex.replace("#", "");
  if (m.length < 6) return false;
  const r = parseInt(m.slice(0, 2), 16), g = parseInt(m.slice(2, 4), 16), b = parseInt(m.slice(4, 6), 16);
  return (0.299 * r + 0.587 * g + 0.114 * b) / 255 > 0.6;
}
function contrastInk(hex: string): string {
  return isLightHex(hex) ? "#171717" : "#ffffff";
}

const lines = (v: unknown) => String(v ?? "").split("\n").map((s) => s.trim()).filter(Boolean);

export type PriceItem = { id: string; name: string; price: number; unit: string | null; category: string | null; description: string | null; list_key: string | null };

export default function CanvasBuilder({
  site,
  initialBlocks,
  albums,
  pricelist = [],
  priceLists = [],
  canPublish,
  mainHost,
}: {
  site: Site;
  initialBlocks: SiteBlock[];
  albums: AlbumLite[];
  pricelist?: PriceItem[];
  priceLists?: { key: string; label: string }[];
  canPublish: boolean;
  mainHost: string;
}) {
  const supabase = createClient();
  const { theme: uiTheme } = useTheme(); // studio light/dark, to sync the builder chrome

  const [mounted, setMounted] = useState(false);
  useEffect(() => setMounted(true), []);

  const [blocks, setBlocks] = useState<SiteBlock[]>(initialBlocks);
  const [theme, setTheme] = useState<SiteTheme>(site.theme || {});
  const [published, setPublished] = useState(site.published);
  const [subdomain, setSubdomain] = useState(site.subdomain ?? "");
  const [savedSub, setSavedSub] = useState(site.subdomain ?? "");
  const [savingDomain, setSavingDomain] = useState(false);
  const [selId, setSelId] = useState<string | null>(null);
  const [leftTab, setLeftTab] = useState<"blocks" | "templates">("blocks");
  const [device, setDevice] = useState<Device>("desktop");
  const [preview, setPreview] = useState(false);
  const [busy, setBusy] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // drag state
  const [dragType, setDragType] = useState<SiteBlockType | null>(null);
  const [dragId, setDragId] = useState<string | null>(null);
  const [dropIndex, setDropIndex] = useState<number | null>(null);

  // undo / redo (snapshots of {blocks, theme})
  const undoStack = useRef<{ blocks: SiteBlock[]; theme: SiteTheme }[]>([]);
  const redoStack = useRef<{ blocks: SiteBlock[]; theme: SiteTheme }[]>([]);
  const [, force] = useState(0);

  const liveUrl = savedSub && mainHost ? `https://${savedSub}.${mainHost}` : "";

  function validSubdomain(s: string): string | null {
    const v = s.trim().toLowerCase();
    if (!v) return null;
    if (!/^[a-z0-9-]{3,30}$/.test(v)) return "Tên miền phụ chỉ gồm a-z, 0-9, gạch ngang (3–30 ký tự).";
    if (v.startsWith("-") || v.endsWith("-")) return "Không bắt đầu/kết thúc bằng gạch ngang.";
    return null;
  }

  async function saveDomain() {
    const v = subdomain.trim().toLowerCase();
    const err = validSubdomain(v);
    if (err) { flash(err); return; }
    setSavingDomain(true);
    const { error } = await supabase.from("sites").update({ subdomain: v || null, updated_at: new Date().toISOString() }).eq("id", site.id);
    setSavingDomain(false);
    if (error) { flash(error.message.includes("duplicate") ? "Tên miền phụ đã có người dùng." : `Lỗi: ${error.message}`); return; }
    setSubdomain(v);
    setSavedSub(v);
    flash("Đã lưu tên miền.");
  }

  function flash(m: string) {
    setToast(m);
    setTimeout(() => setToast(null), 2200);
  }

  const snapshot = useCallback(() => {
    undoStack.current.push({ blocks: blocks.map((b) => ({ ...b, config: { ...b.config } })), theme: { ...theme } });
    if (undoStack.current.length > 50) undoStack.current.shift();
    redoStack.current = [];
    force((n) => n + 1);
  }, [blocks, theme]);

  function undo() {
    const prev = undoStack.current.pop();
    if (!prev) return;
    redoStack.current.push({ blocks, theme });
    setBlocks(prev.blocks);
    setTheme(prev.theme);
    persistAll(prev.blocks, prev.theme);
    force((n) => n + 1);
  }
  function redo() {
    const next = redoStack.current.pop();
    if (!next) return;
    undoStack.current.push({ blocks, theme });
    setBlocks(next.blocks);
    setTheme(next.theme);
    persistAll(next.blocks, next.theme);
    force((n) => n + 1);
  }

  // ── Persistence ───────────────────────────────────────────────────────
  const persistTheme = useCallback(async (th: SiteTheme) => {
    await supabase.from("sites").update({ theme: th, updated_at: new Date().toISOString() }).eq("id", site.id);
  }, [site.id, supabase]);

  const persistBlock = useCallback(async (b: SiteBlock) => {
    await supabase.from("site_blocks").update({ config: b.config, visible: b.visible }).eq("id", b.id);
  }, [supabase]);

  // Full rewrite of positions/blocks — used by reorder/template/undo.
  const persistAll = useCallback(async (bl: SiteBlock[], th: SiteTheme) => {
    await persistTheme(th);
    await supabase.from("site_blocks").delete().eq("site_id", site.id);
    if (bl.length) {
      await supabase.from("site_blocks").insert(
        bl.map((b, i) => ({ id: b.id, site_id: site.id, type: b.type, position: i, visible: b.visible, config: b.config }))
      );
    }
  }, [persistTheme, site.id, supabase]);

  // ── Block mutations ───────────────────────────────────────────────────
  const newBlock = (type: SiteBlockType): SiteBlock => ({
    id: uid(),
    site_id: site.id,
    type,
    position: 0,
    visible: true,
    config: { ...(DEFAULTS[type] || {}) },
    created_at: new Date().toISOString(),
  });

  function insertBlock(type: SiteBlockType, index: number) {
    snapshot();
    const b = newBlock(type);
    const next = [...blocks];
    next.splice(Math.max(0, Math.min(index, next.length)), 0, b);
    setBlocks(next);
    setSelId(b.id);
    persistAll(next, theme);
    flash(`Đã thêm khối ${SITE_BLOCK_LABEL[type]}`);
  }

  function moveDir(id: string, dir: -1 | 1) {
    const i = blocks.findIndex((b) => b.id === id);
    const j = i + dir;
    if (i < 0 || j < 0 || j >= blocks.length) return;
    snapshot();
    const next = [...blocks];
    [next[i], next[j]] = [next[j], next[i]];
    setBlocks(next);
    persistAll(next, theme);
  }

  function reorderTo(targetIndex: number) {
    if (dragId == null) return;
    const from = blocks.findIndex((b) => b.id === dragId);
    if (from < 0) return;
    snapshot();
    const next = [...blocks];
    const [moved] = next.splice(from, 1);
    const to = from < targetIndex ? targetIndex - 1 : targetIndex;
    next.splice(Math.max(0, Math.min(to, next.length)), 0, moved);
    setBlocks(next);
    persistAll(next, theme);
  }

  function dupBlock(id: string) {
    const i = blocks.findIndex((b) => b.id === id);
    if (i < 0) return;
    snapshot();
    const copy: SiteBlock = { ...blocks[i], id: uid(), config: { ...blocks[i].config } };
    const next = [...blocks];
    next.splice(i + 1, 0, copy);
    setBlocks(next);
    setSelId(copy.id);
    persistAll(next, theme);
    flash("Đã nhân bản khối");
  }

  function delBlock(id: string) {
    snapshot();
    const next = blocks.filter((b) => b.id !== id);
    setBlocks(next);
    if (selId === id) setSelId(null);
    persistAll(next, theme);
    flash("Đã xoá khối");
  }

  // Update a config key on a block (live), persist on commit=true.
  function setConfig(id: string, key: string, value: unknown, commit = false) {
    setBlocks((p) => {
      const next = p.map((b) => (b.id === id ? { ...b, config: { ...b.config, [key]: value } } : b));
      if (commit) {
        const b = next.find((x) => x.id === id);
        if (b) persistBlock(b);
      }
      return next;
    });
  }

  function patchTheme(patch: Partial<SiteTheme>) {
    snapshot();
    setTheme((t) => {
      const next = { ...t, ...patch };
      persistTheme(next);
      return next;
    });
  }

  async function applyTemplate(key: string) {
    const tpl = SITE_TEMPLATES.find((t) => t.key === key);
    if (!tpl) return;
    if (blocks.length && !confirm("Áp dụng mẫu sẽ thay toàn bộ khối hiện tại. Tiếp tục?")) return;
    snapshot();
    const built = personalizeBlocks(tpl.blocks, EMPTY_INTAKE);
    const rows: SiteBlock[] = built.map((b, i) => ({
      id: uid(), site_id: site.id, type: b.type, position: i, visible: true,
      config: b.config, created_at: new Date().toISOString(),
    }));
    setTheme(tpl.theme);
    setBlocks(rows);
    setSelId(null);
    await persistAll(rows, tpl.theme);
    flash(`Đã áp dụng mẫu ${tpl.name}`);
    setLeftTab("blocks");
  }

  async function togglePublish() {
    if (!canPublish) return;
    // Auto-save the domain typed in the bar before publishing.
    let sub = savedSub;
    if (!published && subdomain.trim().toLowerCase() !== savedSub) {
      const v = subdomain.trim().toLowerCase();
      const err = validSubdomain(v);
      if (err) { flash(err); return; }
      const { error } = await supabase.from("sites").update({ subdomain: v || null }).eq("id", site.id);
      if (error) { flash(error.message.includes("duplicate") ? "Tên miền phụ đã có người dùng." : `Lỗi: ${error.message}`); return; }
      setSavedSub(v); setSubdomain(v); sub = v;
    }
    if (!published && !sub) { flash("Nhập tên miền phụ trước khi xuất bản."); return; }
    setBusy(true);
    const next = !published;
    await supabase.from("sites").update({ published: next, updated_at: new Date().toISOString() }).eq("id", site.id);
    setPublished(next);
    setBusy(false);
    flash(next ? "Đã xuất bản trang!" : "Đã gỡ xuất bản.");
  }

  // Keyboard: undo/redo, delete selected, escape.
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      const tag = (e.target as HTMLElement)?.tagName;
      const editing = tag === "INPUT" || tag === "TEXTAREA" || (e.target as HTMLElement)?.isContentEditable;
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "z" && !e.shiftKey) { e.preventDefault(); undo(); }
      else if ((e.metaKey || e.ctrlKey) && (e.key.toLowerCase() === "y" || (e.shiftKey && e.key.toLowerCase() === "z"))) { e.preventDefault(); redo(); }
      else if (e.key === "Escape") setSelId(null);
      else if ((e.key === "Delete" || e.key === "Backspace") && selId && !editing) { e.preventDefault(); delBlock(selId); }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selId, blocks, theme]);

  const selected = blocks.find((b) => b.id === selId) || null;
  const dragging = dragType !== null || dragId !== null;
  const accent = theme.accent || "#1A1815";
  const canvasMax: number | string = device === "mobile" ? 402 : (theme.contentWidth === "full" ? "100%" : 1080);

  // Canvas theme variables (mirror SiteRenderer).
  const dark = (theme.mode ?? (isLightHex(theme.bg) ? "light" : "dark")) === "dark";
  const canvasVars = {
    "--s-bg": theme.bg || "#FBFAF8",
    "--s-text": theme.text || "#1A1815",
    "--s-accent": accent,
    "--s-border": dark ? "rgba(255,255,255,0.14)" : "rgba(0,0,0,0.12)",
    "--s-card": dark ? "rgba(255,255,255,.05)" : "rgba(0,0,0,.03)",
    "--s-radius": theme.radius === "sharp" ? "0px" : "14px",
  } as React.CSSProperties;
  const fontHead = theme.font === "sans" ? "var(--font-hanken), system-ui, sans-serif" : "var(--font-cormorant), Georgia, serif";

  const ui = (
    <div className="studio-shell" data-theme={uiTheme} style={{ position: "fixed", inset: 0, zIndex: 60, display: "flex", flexDirection: "column", background: "var(--bg)", color: "var(--text)", fontFamily: "var(--font-manrope), system-ui, sans-serif" }}>
      {/* TOP BAR */}
      <header style={{ height: 58, flexShrink: 0, display: "flex", alignItems: "center", gap: 10, padding: "0 14px", background: "var(--surface)", borderBottom: "1px solid var(--border)" }}>
        <a href="/dashboard/studio" title="Quay lại bảng điều khiển" style={chipBtn(false)}><ArrowLeft size={16} /></a>
        <span style={{ fontWeight: 800, letterSpacing: "-.02em", fontSize: 15 }}>Trình tạo website</span>

        {!preview && (
          <>
            <span style={{ width: 1, height: 26, background: "var(--border)", margin: "0 4px" }} />
            <div style={{ display: "flex", borderRadius: 999, overflow: "hidden", border: "1px solid var(--border)" }}>
              <button onClick={() => setDevice("desktop")} title="Máy tính" style={segBtn(device === "desktop")}><Monitor size={15} /></button>
              <button onClick={() => setDevice("mobile")} title="Điện thoại" style={segBtn(device === "mobile")}><Smartphone size={15} /></button>
            </div>
            <button onClick={undo} disabled={!undoStack.current.length} title="Hoàn tác" style={chipBtn(false, !undoStack.current.length)}><Undo2 size={16} /></button>
            <button onClick={redo} disabled={!redoStack.current.length} title="Làm lại" style={chipBtn(false, !redoStack.current.length)}><Redo2 size={16} /></button>
          </>
        )}

        {!preview && (
          <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 0, border: "1px solid var(--border)", borderRadius: 999, padding: "3px 4px 3px 12px", background: "var(--surface2)" }}>
            <input
              value={subdomain}
              onChange={(e) => setSubdomain(e.target.value.toLowerCase())}
              onKeyDown={(e) => { if (e.key === "Enter") saveDomain(); }}
              placeholder="ten-cua-ban"
              spellCheck={false}
              style={{ width: 110, border: 0, background: "transparent", outline: "none", fontSize: 13, fontWeight: 600, color: "var(--text)" }}
            />
            <span style={{ fontSize: 12, color: "var(--text3)", marginRight: 6 }}>.{mainHost || "mstudo.com"}</span>
            <button onClick={saveDomain} disabled={savingDomain || subdomain.trim().toLowerCase() === savedSub} title="Lưu tên miền" style={{ ...chipBtn(false, savingDomain || subdomain.trim().toLowerCase() === savedSub), height: 28, padding: "0 10px" }}>
              <Check size={14} /> Lưu
            </button>
          </div>
        )}

        <div style={{ marginLeft: preview ? "auto" : 0, display: "flex", alignItems: "center", gap: 8 }}>
          {liveUrl && published && (
            <a href={liveUrl} target="_blank" rel="noreferrer" style={chipBtn(false)} title="Mở trang thật"><ExternalLink size={15} /></a>
          )}
          <button onClick={() => { setPreview((p) => !p); setSelId(null); }} style={chipBtn(preview)}>
            {preview ? <><ArrowLeft size={15} /> Quay lại chỉnh sửa</> : <><Eye size={15} /> Xem trước</>}
          </button>
          <button onClick={togglePublish} disabled={busy || !canPublish} style={{ ...primaryBtn, opacity: canPublish ? 1 : 0.5 }} title={canPublish ? "" : "Nâng cấp để xuất bản"}>
            <Rocket size={15} /> {published ? "Đã xuất bản" : "Xuất bản"}
          </button>
        </div>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* LEFT PANEL */}
        {!preview && (
          <aside style={{ width: 284, flexShrink: 0, background: "var(--surface)", borderRight: "1px solid var(--border)", display: "flex", flexDirection: "column" }}>
            <div style={{ display: "flex", padding: 10, gap: 6, borderBottom: "1px solid var(--border)" }}>
              <button onClick={() => setLeftTab("blocks")} style={tabBtn(leftTab === "blocks")}><Blocks size={15} /> Khối</button>
              <button onClick={() => setLeftTab("templates")} style={tabBtn(leftTab === "templates")}><LayoutTemplate size={15} /> Mẫu trang</button>
            </div>

            <div style={{ flex: 1, overflowY: "auto", padding: 12 }}>
              {leftTab === "blocks" ? (
                <>
                  <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 10 }}>Kéo khối thả vào trang, hoặc bấm để thêm vào cuối.</p>
                  <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                    {PALETTE.map((type) => (
                      <button
                        key={type}
                        draggable
                        onDragStart={() => { setDragType(type); setDragId(null); }}
                        onDragEnd={() => { setDragType(null); setDropIndex(null); }}
                        onClick={() => insertBlock(type, blocks.length)}
                        style={paletteCard}
                      >
                        <Plus size={14} style={{ color: "var(--brand)" }} />
                        <span style={{ fontSize: 11.5, fontWeight: 600, lineHeight: 1.2 }}>{SITE_BLOCK_LABEL[type]}</span>
                      </button>
                    ))}
                  </div>
                </>
              ) : (
                <div style={{ display: "grid", gap: 10 }}>
                  {SITE_TEMPLATES.map((tp) => (
                    <button key={tp.key} onClick={() => applyTemplate(tp.key)} style={tplCard}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={tp.thumb} alt={tp.name} style={{ width: "100%", aspectRatio: "3/2", objectFit: "cover", display: "block" }} />
                      <div style={{ padding: "7px 9px" }}>
                        <div style={{ fontSize: 12.5, fontWeight: 700 }}>{tp.name}</div>
                        <div style={{ fontSize: 10.5, color: "var(--text3)", marginTop: 1 }}>{tp.tag}</div>
                      </div>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </aside>
        )}

        {/* CANVAS */}
        <main
          style={{ flex: 1, overflowY: "auto", background: preview ? "var(--s-bg)" : "var(--bg2)", padding: preview ? 0 : "26px 20px", ...canvasVars }}
          onClick={() => setSelId(null)}
        >
          <div
            style={{
              maxWidth: canvasMax,
              margin: "0 auto",
              background: "var(--s-bg)",
              color: "var(--s-text)",
              minHeight: preview ? "100vh" : "calc(100vh - 110px)",
              borderRadius: preview ? 0 : 16,
              overflow: "hidden",
              boxShadow: preview ? "none" : "0 8px 30px rgba(20,24,33,.12)",
              transition: "max-width .25s ease",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {blocks.length === 0 ? (
              <div style={{ padding: "120px 24px", textAlign: "center", color: "var(--s-text)", opacity: 0.6 }}>
                <p style={{ fontFamily: fontHead, fontSize: 30 }}>Trang trống</p>
                <p style={{ marginTop: 8, fontSize: 14 }}>Chọn một <b>Mẫu trang</b> hoặc kéo khối từ bên trái vào đây.</p>
              </div>
            ) : (
              <div style={{ display: "flex", flexWrap: "wrap", alignItems: "flex-start" }}>
                {blocks.map((b, i) => {
                  const isHero = b.type === "hero";
                  const half = b.config?.width === "half" && !isHero;
                  return (
                    <Fragment key={b.id}>
                      {!preview && <DropZone dragging={dragging} active={dropIndex === i} onOver={() => setDropIndex(i)} onDrop={() => {
                        if (dragType) insertBlock(dragType, i);
                        else if (dragId) reorderTo(i);
                        setDropIndex(null); setDragType(null); setDragId(null);
                      }} />}
                      <div style={{ flex: half ? "1 1 calc(50% - 0.5px)" : "1 1 100%", minWidth: half ? 240 : 0 }}>
                        <BlockShell
                          block={b}
                          selected={selId === b.id}
                          preview={preview}
                          first={i === 0}
                          last={i === blocks.length - 1}
                          fontHead={fontHead}
                          accent={accent}
                          albums={albums}
                          pricelist={pricelist}
                          onSelect={() => setSelId(b.id)}
                          onDragStart={() => { setDragId(b.id); setDragType(null); }}
                          onDragEnd={() => { setDragId(null); setDropIndex(null); }}
                          onMove={(d) => moveDir(b.id, d)}
                          onDup={() => dupBlock(b.id)}
                          onDel={() => delBlock(b.id)}
                          onEdit={(k, v, commit) => setConfig(b.id, k, v, commit)}
                          onBeforeEdit={snapshot}
                        />
                      </div>
                    </Fragment>
                  );
                })}
                {!preview && (
                  <DropZone dragging={dragging} active={dropIndex === blocks.length} onOver={() => setDropIndex(blocks.length)} onDrop={() => {
                    if (dragType) insertBlock(dragType, blocks.length);
                    else if (dragId) reorderTo(blocks.length);
                    setDropIndex(null); setDragType(null); setDragId(null);
                  }} tall />
                )}
              </div>
            )}
          </div>
        </main>

        {/* RIGHT INSPECTOR */}
        {!preview && (
          <aside style={{ width: 300, flexShrink: 0, background: "var(--surface)", borderLeft: "1px solid var(--border)", overflowY: "auto" }}>
            {selected ? (
              <Inspector
                key={selected.id}
                block={selected}
                albums={albums}
                priceLists={priceLists}
                accent={accent}
                onEdit={(k, v, commit) => setConfig(selected.id, k, v, commit)}
                onBeforeEdit={snapshot}
              />
            ) : (
              <div style={{ padding: 16 }}>
                <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 4 }}>Giao diện trang</h3>
                <p style={{ fontSize: 12, color: "var(--text3)", marginBottom: 16 }}>Áp dụng cho toàn bộ trang. Bấm một khối để chỉnh riêng khối đó.</p>

                <label style={insLabel}>Màu nhấn</label>
                <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 8 }}>
                  {ACCENTS.map((c) => (
                    <button key={c} onClick={() => patchTheme({ accent: c })} title={c}
                      style={{ width: 30, height: 30, borderRadius: 999, background: c, border: accent.toLowerCase() === c.toLowerCase() ? "2px solid var(--text)" : "1px solid var(--border)", cursor: "pointer" }} />
                  ))}
                  <label style={{ width: 30, height: 30, borderRadius: 999, border: "1px solid var(--border)", overflow: "hidden", cursor: "pointer", position: "relative" }}>
                    <input type="color" value={accent} onChange={(e) => patchTheme({ accent: e.target.value })} style={{ position: "absolute", inset: -4, width: 40, height: 40, border: 0, cursor: "pointer" }} />
                  </label>
                </div>

                <label style={insLabel}>Kiểu chữ tiêu đề</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {(["serif", "sans"] as const).map((f) => (
                    <button key={f} onClick={() => patchTheme({ font: f })} style={segWide((theme.font || "serif") === f)}>
                      <TypeIcon size={13} /> {f === "serif" ? "Serif" : "Sans"}
                    </button>
                  ))}
                </div>

                <label style={insLabel}>Nền trang</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {(["light", "dark"] as const).map((m) => (
                    <button key={m} onClick={() => patchTheme({ mode: m, bg: m === "light" ? "#FBFAF8" : "#15110D", text: m === "light" ? "#1A1815" : "#F2EADD" })} style={segWide((theme.mode || (dark ? "dark" : "light")) === m)}>
                      {m === "light" ? "☀ Sáng" : "🌙 Tối"}
                    </button>
                  ))}
                </div>

                <label style={insLabel}>Bố cục trang</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {([["compact", "Thu nhỏ"], ["full", "Toàn màn hình"]] as const).map(([w, lbl]) => (
                    <button key={w} onClick={() => patchTheme({ contentWidth: w })} style={segWide((theme.contentWidth || "compact") === w)}>{lbl}</button>
                  ))}
                </div>

                <label style={insLabel}>Vị trí menu</label>
                <div style={{ display: "flex", gap: 8, marginBottom: 16 }}>
                  {([["top", "Trên"], ["left", "Trái"], ["bottom", "Dưới"]] as const).map(([np, lbl]) => (
                    <button key={np} onClick={() => patchTheme({ navPosition: np })} style={segWide((theme.navPosition || "top") === np)}>{lbl}</button>
                  ))}
                </div>

                <label style={insLabel}>Logo studio</label>
                <div style={{ marginBottom: 16 }}>
                  {theme.logo ? (
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={theme.logo} alt="logo" style={{ height: 36, width: "auto", maxWidth: 140, objectFit: "contain", borderRadius: 6, border: "1px solid var(--border)" }} />
                      <button onClick={() => patchTheme({ logo: "" })} style={{ ...segWide(false), flex: "0 0 auto", padding: "0 10px", height: 30 }}>Gỡ</button>
                    </div>
                  ) : null}
                  <label style={{ ...insInput, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: "var(--surface2)" }}>
                    <ImagePlus size={15} /> Tải logo lên
                    <input type="file" accept="image/*" hidden onChange={async (e) => {
                      const file = e.target.files?.[0]; e.target.value = "";
                      if (!file) return;
                      const url = await compressImage(file, { maxDim: 400, quality: 0.9, mime: "image/png" });
                      patchTheme({ logo: url });
                    }} />
                  </label>
                </div>

                <label style={insLabel}>CSS tùy chỉnh (nâng cao)</label>
                <textarea
                  style={{ ...insInput, minHeight: 140, fontFamily: "monospace", fontSize: 12, marginBottom: 8 }}
                  placeholder={".site-block { } \n/* CSS riêng áp cho toàn trang */"}
                  value={String(theme.customCss ?? "")}
                  onChange={(e) => patchTheme({ customCss: e.target.value })}
                />
                <p style={{ fontSize: 11, color: "var(--text3)", lineHeight: 1.5, marginBottom: 16 }}>
                  CSS này chỉ áp trên <b>trang đã xuất bản</b> (không hiện trong khung soạn này để khỏi ảnh hưởng trình tạo). Bấm Xuất bản rồi mở trang để xem. Sai cú pháp có thể làm trang lệch.
                </p>

                <div style={{ marginTop: 8, padding: 12, borderRadius: 12, background: "var(--surface2)", border: "1px solid var(--border)", fontSize: 12, color: "var(--text3)", lineHeight: 1.6 }}>
                  💡 Mẹo: bấm thẳng vào chữ trên trang để sửa. Dùng thanh công cụ nổi trên mỗi khối để di chuyển, nhân bản hay xoá.
                </div>
              </div>
            )}
          </aside>
        )}
      </div>

      {toast && (
        <div style={{ position: "fixed", bottom: 22, left: "50%", transform: "translateX(-50%)", zIndex: 80, background: "#23201B", color: "#fff", padding: "10px 18px", borderRadius: 999, fontSize: 13, fontWeight: 600, boxShadow: "0 8px 24px rgba(0,0,0,.25)" }}>
          {toast}
        </div>
      )}
    </div>
  );

  // Render through a portal to <body> so the fixed overlay escapes the studio
  // shell's transformed ancestors (the .page-in animation creates a containing
  // block that would otherwise trap position:fixed and let chrome show through).
  return mounted ? createPortal(ui, document.body) : null;
}

/* ── Drop zone between blocks ──────────────────────────────────────────────
   Only present while dragging, so it never breaks the half-block flex row in
   normal editing. As a full-row flex item it marks a clear insertion line. */
function DropZone({ dragging, active, onOver, onDrop, tall }: { dragging: boolean; active: boolean; onOver: () => void; onDrop: () => void; tall?: boolean }) {
  if (!dragging) return null;
  return (
    <div
      onDragOver={(e) => { e.preventDefault(); onOver(); }}
      onDrop={(e) => { e.preventDefault(); onDrop(); }}
      style={{ flex: "1 1 100%", height: active ? 36 : tall ? 40 : 14, transition: "height .12s ease", display: "flex", alignItems: "center", padding: "0 24px" }}
    >
      <div style={{ width: "100%", height: active ? 4 : 2, borderRadius: 999, background: active ? "var(--brand)" : "var(--border)", transition: "all .12s ease" }} />
    </div>
  );
}

/* ── Block shell: floating toolbar + selection border + editable content ── */
function BlockShell({
  block, selected, preview, first, last, fontHead, accent, albums, pricelist,
  onSelect, onDragStart, onDragEnd, onMove, onDup, onDel, onEdit, onBeforeEdit,
}: {
  block: SiteBlock;
  selected: boolean;
  preview: boolean;
  first: boolean;
  last: boolean;
  fontHead: string;
  accent: string;
  albums: AlbumLite[];
  pricelist: PriceItem[];
  onSelect: () => void;
  onDragStart: () => void;
  onDragEnd: () => void;
  onMove: (d: -1 | 1) => void;
  onDup: () => void;
  onDel: () => void;
  onEdit: (k: string, v: unknown, commit?: boolean) => void;
  onBeforeEdit: () => void;
}) {
  const [hover, setHover] = useState(false);
  const showTools = !preview && (hover || selected);

  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      onClick={(e) => { e.stopPropagation(); if (!preview) onSelect(); }}
      style={{
        position: "relative",
        outline: preview ? "none" : selected ? `2px solid ${accent}` : hover ? "2px solid rgba(184,92,59,.45)" : "2px solid transparent",
        outlineOffset: -2,
        cursor: preview ? "default" : "pointer",
      }}
    >
      {showTools && (
        <div style={{ position: "absolute", top: 8, right: 8, zIndex: 5, display: "flex", gap: 4, background: "#23201B", borderRadius: 10, padding: 4, boxShadow: "0 4px 14px rgba(0,0,0,.25)" }}>
          <span draggable onDragStart={(e) => { e.stopPropagation(); onDragStart(); }} onDragEnd={onDragEnd} title="Kéo để di chuyển" style={toolBtn}><GripVertical size={15} /></span>
          <button disabled={first} onClick={(e) => { e.stopPropagation(); onMove(-1); }} title="Lên" style={toolBtn}><ChevronUp size={15} /></button>
          <button disabled={last} onClick={(e) => { e.stopPropagation(); onMove(1); }} title="Xuống" style={toolBtn}><ChevronDown size={15} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDup(); }} title="Nhân bản" style={toolBtn}><Copy size={14} /></button>
          <button onClick={(e) => { e.stopPropagation(); onDel(); }} title="Xoá" style={{ ...toolBtn, color: "#f0a39e" }}><Trash2 size={14} /></button>
        </div>
      )}
      {showTools && (
        <span style={{ position: "absolute", top: 8, left: 8, zIndex: 5, background: accent, color: contrastInk(accent), fontSize: 10.5, fontWeight: 700, padding: "2px 8px", borderRadius: 999 }}>
          {SITE_BLOCK_LABEL[block.type]}
        </span>
      )}
      <BlockBody block={block} fontHead={fontHead} accent={accent} albums={albums} pricelist={pricelist} preview={preview} onEdit={onEdit} onBeforeEdit={onBeforeEdit} />
    </div>
  );
}

/* ── Editable inline text ─────────────────────────────────────────────── */
function Editable({ value, onCommit, onBeforeEdit, preview, style, placeholder, multiline }: {
  value: string;
  onCommit: (v: string) => void;
  onBeforeEdit: () => void;
  preview: boolean;
  style?: React.CSSProperties;
  placeholder?: string;
  multiline?: boolean;
}) {
  const ref = useRef<HTMLDivElement>(null);
  const started = useRef(false);
  return (
    <div
      ref={ref}
      contentEditable={!preview}
      suppressContentEditableWarning
      onFocusCapture={() => { if (!started.current) { started.current = true; onBeforeEdit(); } }}
      onBlur={(e) => { started.current = false; onCommit(multiline ? e.currentTarget.innerText : e.currentTarget.innerText.replace(/\n/g, " ").trim()); }}
      onClick={(e) => { if (!preview) e.stopPropagation(); }}
      style={{ outline: "none", cursor: preview ? "inherit" : "text", whiteSpace: multiline ? "pre-wrap" : "normal", minWidth: 20, ...style }}
    >
      {value || (preview ? "" : placeholder || "")}
    </div>
  );
}

/* ── Block body: WYSIWYG canvas render of each block type ──────────────── */
function BlockBody({ block, fontHead, accent, albums, pricelist, preview, onEdit, onBeforeEdit }: {
  block: SiteBlock;
  fontHead: string;
  accent: string;
  albums: AlbumLite[];
  pricelist: PriceItem[];
  preview: boolean;
  onEdit: (k: string, v: unknown, commit?: boolean) => void;
  onBeforeEdit: () => void;
}) {
  const c = block.config || {};
  const S = (k: string) => String(c[k] ?? "");
  const ed = (k: string, v: string) => onEdit(k, v, true);
  const sec: React.CSSProperties = { maxWidth: 1040, margin: "0 auto", padding: "clamp(40px,7vw,80px) clamp(20px,5vw,64px)" };
  const heading = (k = "heading", fallback = "") => (
    <Editable value={S(k) || (preview ? "" : "")} placeholder={fallback} preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed(k, v)} style={{ fontFamily: fontHead, fontSize: "clamp(26px,3.4vw,40px)", marginBottom: 24 }} />
  );

  switch (block.type) {
    case "hero": {
      const img = S("image");
      return (
        <section style={{ position: "relative", minHeight: 360, display: "flex", alignItems: "center", justifyContent: "center", textAlign: "center", padding: 32, backgroundImage: img ? `linear-gradient(rgba(0,0,0,.45),rgba(0,0,0,.5)),url(${img})` : undefined, backgroundSize: "cover", backgroundPosition: "center", color: img ? "#fff" : "var(--s-text)" }}>
          <div style={{ maxWidth: 760 }}>
            <Editable value={S("heading")} placeholder="Tiêu đề lớn" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("heading", v)} style={{ fontFamily: fontHead, fontSize: "clamp(34px,5.4vw,68px)", lineHeight: 1.05 }} />
            <Editable value={S("subheading")} placeholder="Mô tả ngắn" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("subheading", v)} style={{ marginTop: 14, fontSize: 18, opacity: 0.9 }} />
            <span style={ctaPill(accent)}>Đặt lịch</span>
          </div>
        </section>
      );
    }
    case "about": {
      const img = S("image");
      return (
        <section style={sec}>
          {heading("heading", "Giới thiệu")}
          <div style={{ display: "grid", gap: 28, gridTemplateColumns: img ? "1fr 1fr" : "1fr", alignItems: "center" }}>
            <Editable multiline value={S("text")} placeholder="Nội dung giới thiệu…" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("text", v)} style={{ lineHeight: 1.7, opacity: 0.9 }} />
            {img && <img src={img} alt="" style={{ width: "100%", borderRadius: "var(--s-radius)", objectFit: "cover" }} />}
          </div>
        </section>
      );
    }
    case "gallery": {
      const covers = albums.filter((a) => a.cover_url).slice(0, 6);
      return (
        <section style={sec}>
          {heading("heading", "Bộ sưu tập")}
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))" }}>
            {(covers.length ? covers : Array.from({ length: 6 })).map((a, i) => (
              <div key={i} style={{ aspectRatio: "4/3", borderRadius: "var(--s-radius)", overflow: "hidden", background: "var(--s-card)" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={(a as AlbumLite)?.cover_url || `https://picsum.photos/seed/g${i}/600/450`} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
              </div>
            ))}
          </div>
          {!covers.length && !preview && <p style={{ marginTop: 10, fontSize: 12, opacity: 0.5 }}>(Ảnh mẫu — sẽ thay bằng album đã xuất bản của bạn)</p>}
        </section>
      );
    }
    case "services": {
      const items = lines(c.items).map((l) => { const [t, ...d] = l.split("|"); return { t: t.trim(), d: d.join("|").trim() }; });
      return (
        <section style={sec}>
          {heading("heading", "Dịch vụ")}
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
            {items.map((it, i) => (
              <div key={i} style={cardBox}>
                <span style={{ color: accent, fontFamily: fontHead, fontSize: 22 }}>{String(i + 1).padStart(2, "0")}</span>
                <p style={{ fontFamily: fontHead, fontSize: 19, marginTop: 4 }}>{it.t}</p>
                {it.d && <p style={{ marginTop: 6, opacity: 0.85, lineHeight: 1.6, fontSize: 14 }}>{it.d}</p>}
              </div>
            ))}
          </div>
          {!preview && <p style={editHint}>Sửa danh sách dịch vụ ở bảng bên phải →</p>}
        </section>
      );
    }
    case "stats": {
      const items = lines(c.items).map((l) => { const [v, ...x] = l.split("|"); return { v: v.trim(), l: x.join("|").trim() }; });
      return (
        <section style={sec}>
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: `repeat(${Math.min(items.length || 1, 4)},1fr)`, textAlign: "center" }}>
            {items.map((it, i) => (
              <div key={i}>
                <p style={{ fontFamily: fontHead, fontSize: "clamp(28px,5vw,48px)", color: accent }}>{it.v}</p>
                {it.l && <p style={{ opacity: 0.8, fontSize: 14 }}>{it.l}</p>}
              </div>
            ))}
          </div>
          {!preview && <p style={editHint}>Sửa con số ở bảng bên phải →</p>}
        </section>
      );
    }
    case "pricing": {
      const plKey = S("list_key");
      const shown = plKey ? pricelist.filter((p) => (p.list_key || "cuoi") === plKey) : pricelist;
      return (
        <section style={sec}>
          {heading("heading", "Bảng giá")}
          {shown.length > 0 ? (
            <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(220px,1fr))" }}>
              {shown.map((p) => (
                <div key={p.id} style={cardBox}>
                  {p.category && <p style={{ fontSize: 11, textTransform: "uppercase", letterSpacing: 1, opacity: 0.6 }}>{p.category}</p>}
                  <p style={{ fontFamily: fontHead, fontSize: 20, marginTop: 2 }}>{p.name}</p>
                  <p style={{ fontFamily: fontHead, fontSize: 24, color: accent, marginTop: 4 }}>{vnd(p.price)}{p.unit ? ` ${p.unit}` : ""}</p>
                  {p.description && <ul style={{ marginTop: 10, paddingLeft: 16, fontSize: 13, opacity: 0.85 }}>{lines(p.description).map((l, i) => <li key={i}>{l}</li>)}</ul>}
                </div>
              ))}
            </div>
          ) : (
            <p style={{ opacity: 0.6, fontSize: 14 }}>Chưa có gói nào trong bảng giá này. Thêm ở trang Bảng giá.</p>
          )}
        </section>
      );
    }
    case "testimonials":
      return (
        <section style={sec}>
          {heading("heading", "Khách hàng nói gì")}
          <div style={{ display: "grid", gap: 14, gridTemplateColumns: "repeat(auto-fit,minmax(260px,1fr))" }}>
            {[0, 1].map((i) => (
              <div key={i} style={cardBox}>
                <p style={{ color: accent }}>★★★★★</p>
                <p style={{ marginTop: 6, fontSize: 14, opacity: 0.85 }}>Đánh giá khách hàng…</p>
              </div>
            ))}
          </div>
          {!preview && <p style={editHint}>Tự lấy đánh giá đã duyệt khi xuất bản.</p>}
        </section>
      );
    case "quote":
      return (
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: "56px 24px", textAlign: "center" }}>
          <Editable multiline value={S("text")} placeholder="Câu trích dẫn nổi bật…" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("text", v)} style={{ fontFamily: fontHead, fontSize: "clamp(22px,3.4vw,34px)", lineHeight: 1.4, fontStyle: "italic" }} />
          <Editable value={S("author")} placeholder="— Tác giả" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("author", v)} style={{ marginTop: 16, color: accent, fontWeight: 600 }} />
        </section>
      );
    case "cta":
      return (
        <section style={{ maxWidth: 1040, margin: "0 auto", padding: 24 }}>
          <div style={{ borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: "clamp(28px,6vw,56px)", textAlign: "center", background: `color-mix(in srgb, ${accent} 8%, transparent)` }}>
            <Editable value={S("heading")} placeholder="Tiêu đề kêu gọi" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("heading", v)} style={{ fontFamily: fontHead, fontSize: "clamp(26px,4vw,40px)" }} />
            <Editable value={S("text")} placeholder="Mô tả ngắn" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("text", v)} style={{ marginTop: 10, opacity: 0.85 }} />
            <span style={ctaPill(accent)}>{S("button") || "Đặt lịch"}</span>
          </div>
        </section>
      );
    case "team": {
      const items = lines(c.items).map((l) => { const [n, r, img] = l.split("|"); return { n: (n || "").trim(), r: (r || "").trim(), img: (img || "").trim() }; });
      return (
        <section style={sec}>
          {heading("heading", "Đội ngũ")}
          <div style={{ display: "grid", gap: 18, gridTemplateColumns: "repeat(auto-fit,minmax(150px,1fr))", textAlign: "center" }}>
            {items.map((it, i) => (
              <div key={i}>
                <div style={{ width: 110, height: 110, margin: "0 auto", borderRadius: 999, overflow: "hidden", border: "1px solid var(--s-border)", background: "var(--s-card)" }}>
                  {it.img && <img src={it.img} alt={it.n} style={{ width: "100%", height: "100%", objectFit: "cover" }} />}
                </div>
                <p style={{ fontFamily: fontHead, fontSize: 17, marginTop: 10 }}>{it.n}</p>
                {it.r && <p style={{ opacity: 0.75, fontSize: 13 }}>{it.r}</p>}
              </div>
            ))}
          </div>
          {!preview && <p style={editHint}>Sửa thành viên ở bảng bên phải →</p>}
        </section>
      );
    }
    case "logos": {
      const items = lines(c.items);
      return (
        <section style={sec}>
          {heading("heading", "Đối tác")}
          <div style={{ display: "flex", flexWrap: "wrap", gap: 32, alignItems: "center", justifyContent: "center" }}>
            {(items.length ? items : ["", "", ""]).map((src, i) => src ? <img key={i} src={src} alt="" style={{ height: 36, maxWidth: 150, objectFit: "contain", opacity: 0.7 }} /> : <div key={i} style={{ width: 120, height: 32, background: "var(--s-card)", borderRadius: 6 }} />)}
          </div>
        </section>
      );
    }
    case "video":
      return (
        <section style={sec}>
          {heading("heading", "Video")}
          <div style={{ aspectRatio: "16/9", borderRadius: "var(--s-radius)", background: "var(--s-card)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.6 }}>
            {S("url") ? "▶ " + S("url") : "Dán link YouTube/Vimeo ở bảng bên phải →"}
          </div>
        </section>
      );
    case "social":
      return (
        <section style={sec}>
          {heading("heading", "Theo dõi")}
          <div style={{ display: "flex", gap: 12, flexWrap: "wrap" }}>
            {["Facebook", "Instagram", "TikTok", "YouTube"].map((l) => (
              <span key={l} style={{ padding: "10px 20px", borderRadius: 999, border: `1px solid ${accent}` }}>{l}</span>
            ))}
          </div>
        </section>
      );
    case "faq": {
      const items = lines(c.items).map((l) => { const [q, ...a] = l.split("|"); return { q: q.trim(), a: a.join("|").trim() }; });
      return (
        <section style={sec}>
          {heading("heading", "Câu hỏi thường gặp")}
          <div style={{ display: "grid", gap: 12 }}>
            {items.map((it, i) => (
              <div key={i} style={{ ...cardBox, padding: 18 }}>
                <p style={{ fontWeight: 600 }}>{it.q}</p>
                {it.a && <p style={{ marginTop: 6, opacity: 0.85 }}>{it.a}</p>}
              </div>
            ))}
          </div>
          {!preview && <p style={editHint}>Sửa câu hỏi ở bảng bên phải →</p>}
        </section>
      );
    }
    case "map":
      return (
        <section style={sec}>
          {heading("heading", "Địa chỉ")}
          <Editable value={S("address")} placeholder="Nhập địa chỉ studio…" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("address", v)} style={{ opacity: 0.85 }} />
          <div style={{ marginTop: 12, height: 240, borderRadius: "var(--s-radius)", background: "var(--s-card)", display: "flex", alignItems: "center", justifyContent: "center", opacity: 0.5 }}>🗺 Bản đồ</div>
        </section>
      );
    case "contact":
      return (
        <section style={sec}>
          {heading("heading", "Liên hệ & đặt lịch")}
          <div style={{ fontSize: 16, lineHeight: 2, opacity: 0.9 }}>
            <Editable value={S("email")} placeholder="Email liên hệ" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("email", v)} />
            <Editable value={S("address")} placeholder="Địa chỉ" preview={preview} onBeforeEdit={onBeforeEdit} onCommit={(v) => ed("address", v)} />
          </div>
          <span style={ctaPill(accent)}>Đặt lịch ngay</span>
        </section>
      );
    case "html": {
      const raw = S("html");
      return (
        <section style={sec}>
          {S("heading") && heading("heading", "")}
          {raw ? (
            <div dangerouslySetInnerHTML={{ __html: raw }} />
          ) : (
            <div style={{ padding: 24, borderRadius: "var(--s-radius)", background: "var(--s-card)", textAlign: "center", opacity: 0.6, fontSize: 13 }}>
              {"</>"} Dán mã HTML / nhúng ở khung bên phải
            </div>
          )}
        </section>
      );
    }
    default:
      return null;
  }
}

/* ── Inspector (right panel for the selected block) ───────────────────── */
function Inspector({ block, albums, priceLists = [], accent, onEdit, onBeforeEdit }: {
  block: SiteBlock;
  albums: AlbumLite[];
  priceLists?: { key: string; label: string }[];
  accent: string;
  onEdit: (k: string, v: unknown, commit?: boolean) => void;
  onBeforeEdit: () => void;
}) {
  const c = block.config || {};
  const S = (k: string) => String(c[k] ?? "");
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadKey, setUploadKey] = useState<string>("image");

  function pickFile(key: string) {
    setUploadKey(key);
    fileRef.current?.click();
  }
  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const f = e.target.files?.[0];
    e.target.value = "";
    if (!f) return;
    const url = await compressImage(f);
    onBeforeEdit();
    onEdit(uploadKey, url, true);
  }

  const hasImage = ["hero", "about"].includes(block.type);
  const hasItems = ["services", "stats", "team", "faq", "logos"].includes(block.type);
  const itemHint: Record<string, string> = {
    services: "Mỗi dòng: Tên dịch vụ | Mô tả",
    stats: "Mỗi dòng: Con số | Nhãn",
    team: "Mỗi dòng: Tên | Vai trò | Link ảnh",
    faq: "Mỗi dòng: Câu hỏi | Câu trả lời",
    logos: "Mỗi dòng: 1 link logo",
  };

  return (
    <div style={{ padding: 16 }}>
      <input ref={fileRef} type="file" accept="image/*" hidden onChange={onFile} />
      <h3 style={{ fontSize: 14, fontWeight: 800, marginBottom: 2 }}>{SITE_BLOCK_LABEL[block.type]}</h3>
      <p style={{ fontSize: 11.5, color: "var(--text3)", marginBottom: 16 }}>Chỉnh nội dung & bố cục khối này.</p>

      {/* Text fields */}
      {"heading" in DEFAULTS[block.type]! || ["hero", "about", "cta", "quote", "map", "contact"].includes(block.type) ? (
        <Field label="Tiêu đề"><input style={insInput} value={S("heading")} onFocus={onBeforeEdit} onChange={(e) => onEdit("heading", e.target.value)} onBlur={(e) => onEdit("heading", e.target.value, true)} /></Field>
      ) : null}

      {block.type === "hero" && (
        <Field label="Mô tả ngắn"><input style={insInput} value={S("subheading")} onFocus={onBeforeEdit} onChange={(e) => onEdit("subheading", e.target.value)} onBlur={(e) => onEdit("subheading", e.target.value, true)} /></Field>
      )}
      {(block.type === "about") && (
        <Field label="Nội dung"><textarea style={{ ...insInput, minHeight: 90 }} value={S("text")} onFocus={onBeforeEdit} onChange={(e) => onEdit("text", e.target.value)} onBlur={(e) => onEdit("text", e.target.value, true)} /></Field>
      )}
      {block.type === "cta" && (
        <>
          <Field label="Mô tả ngắn"><input style={insInput} value={S("text")} onFocus={onBeforeEdit} onChange={(e) => onEdit("text", e.target.value)} onBlur={(e) => onEdit("text", e.target.value, true)} /></Field>
          <Field label="Chữ trên nút"><input style={insInput} value={S("button")} onFocus={onBeforeEdit} onChange={(e) => onEdit("button", e.target.value)} onBlur={(e) => onEdit("button", e.target.value, true)} /></Field>
        </>
      )}
      {block.type === "quote" && (
        <>
          <Field label="Trích dẫn"><textarea style={{ ...insInput, minHeight: 70 }} value={S("text")} onFocus={onBeforeEdit} onChange={(e) => onEdit("text", e.target.value)} onBlur={(e) => onEdit("text", e.target.value, true)} /></Field>
          <Field label="Tác giả"><input style={insInput} value={S("author")} onFocus={onBeforeEdit} onChange={(e) => onEdit("author", e.target.value)} onBlur={(e) => onEdit("author", e.target.value, true)} /></Field>
        </>
      )}
      {block.type === "video" && (
        <Field label="Link YouTube / Vimeo"><input style={insInput} value={S("url")} onFocus={onBeforeEdit} onChange={(e) => onEdit("url", e.target.value)} onBlur={(e) => onEdit("url", e.target.value, true)} /></Field>
      )}
      {block.type === "social" && (["facebook", "instagram", "tiktok", "youtube"] as const).map((k) => (
        <Field key={k} label={k[0].toUpperCase() + k.slice(1)}><input style={insInput} value={S(k)} onFocus={onBeforeEdit} onChange={(e) => onEdit(k, e.target.value)} onBlur={(e) => onEdit(k, e.target.value, true)} /></Field>
      ))}
      {block.type === "contact" && (
        <>
          <Field label="Email"><input style={insInput} value={S("email")} onFocus={onBeforeEdit} onChange={(e) => onEdit("email", e.target.value)} onBlur={(e) => onEdit("email", e.target.value, true)} /></Field>
          <Field label="Địa chỉ"><input style={insInput} value={S("address")} onFocus={onBeforeEdit} onChange={(e) => onEdit("address", e.target.value)} onBlur={(e) => onEdit("address", e.target.value, true)} /></Field>
        </>
      )}
      {block.type === "map" && (
        <Field label="Địa chỉ (hiện bản đồ)"><input style={insInput} value={S("address")} onFocus={onBeforeEdit} onChange={(e) => onEdit("address", e.target.value)} onBlur={(e) => onEdit("address", e.target.value, true)} /></Field>
      )}

      {block.type === "html" && (
        <Field label="Mã HTML / nhúng (tự thiết kế)">
          <textarea
            style={{ ...insInput, minHeight: 200, fontFamily: "monospace", fontSize: 12 }}
            placeholder="<div>...</div>  hoặc dán mã nhúng (YouTube, form, widget...)"
            value={S("html")}
            onFocus={onBeforeEdit}
            onChange={(e) => onEdit("html", e.target.value)}
            onBlur={(e) => onEdit("html", e.target.value, true)}
          />
          <p style={{ marginTop: 6, fontSize: 11, color: "var(--text3)" }}>
            Dán HTML của riêng bạn. Mã nhúng từ nguồn lạ có thể bị chặn vì lý do bảo mật.
          </p>
        </Field>
      )}

      {hasItems && (
        <Field label={itemHint[block.type]}>
          <textarea style={{ ...insInput, minHeight: 120, fontFamily: "monospace", fontSize: 12 }} value={S("items")} onFocus={onBeforeEdit} onChange={(e) => onEdit("items", e.target.value)} onBlur={(e) => onEdit("items", e.target.value, true)} />
        </Field>
      )}

      {/* Image */}
      {hasImage && (
        <Field label="Ảnh">
          {S("image") ? (
            <div style={{ position: "relative", marginBottom: 8 }}>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={S("image")} alt="" style={{ width: "100%", borderRadius: 10, display: "block" }} />
              <button onClick={() => { onBeforeEdit(); onEdit("image", "", true); }} style={{ position: "absolute", top: 6, right: 6, background: "var(--text)", color: "var(--bg)", border: 0, borderRadius: 999, width: 26, height: 26, cursor: "pointer" }}><X size={14} /></button>
            </div>
          ) : null}
          <button onClick={() => pickFile("image")} style={{ ...insInput, display: "flex", alignItems: "center", justifyContent: "center", gap: 6, cursor: "pointer", background: "var(--surface2)" }}>
            <ImagePlus size={15} /> Tải ảnh lên
          </button>
          <input style={{ ...insInput, marginTop: 6 }} placeholder="hoặc dán link ảnh" value={S("image").startsWith("data:") ? "" : S("image")} onFocus={onBeforeEdit} onChange={(e) => onEdit("image", e.target.value)} onBlur={(e) => onEdit("image", e.target.value, true)} />
          {albums.filter((a) => a.cover_url).length > 0 && (
            <div style={{ display: "flex", flexWrap: "wrap", gap: 6, marginTop: 8 }}>
              {albums.filter((a) => a.cover_url).slice(0, 9).map((a) => (
                <button key={a.id} onClick={() => { onBeforeEdit(); onEdit("image", a.cover_url, true); }} title={a.title} style={{ width: 44, height: 32, borderRadius: 6, overflow: "hidden", border: S("image") === a.cover_url ? `2px solid ${accent}` : "1px solid var(--border)", padding: 0, cursor: "pointer" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={a.cover_url as string} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} />
                </button>
              ))}
            </div>
          )}
        </Field>
      )}

      {/* Pricing: choose which price list (loại bảng giá) to show */}
      {block.type === "pricing" && (
        <Field label="Hiển thị bảng giá">
          <select
            style={insInput}
            value={S("list_key")}
            onChange={(e) => { onBeforeEdit(); onEdit("list_key", e.target.value, true); }}
          >
            <option value="">Tất cả bảng giá</option>
            {priceLists.map((l) => (
              <option key={l.key} value={l.key}>{l.label}</option>
            ))}
          </select>
        </Field>
      )}

      {/* Layout: width (half/full) for non-hero blocks */}
      {block.type !== "hero" && (
        <Field label="Bố cục">
          <div style={{ display: "flex", gap: 8 }}>
            {(["full", "half"] as const).map((w) => (
              <button key={w} onClick={() => { onBeforeEdit(); onEdit("width", w, true); }} style={segWide((c.width || "full") === w)}>
                {w === "full" ? "Toàn phần" : "Một nửa"}
              </button>
            ))}
          </div>
        </Field>
      )}

      {(block.type === "pricing" || block.type === "testimonials") && (
        <p style={{ fontSize: 12, color: "var(--text3)", marginTop: 8, lineHeight: 1.5 }}>
          {block.type === "pricing" ? "Khối này tự lấy bảng giá đang bật của bạn khi xuất bản." : "Khối này tự lấy đánh giá khách đã duyệt khi xuất bản."}
        </p>
      )}
    </div>
  );
}

function Field({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div style={{ marginBottom: 14 }}>
      <label style={insLabel}>{label}</label>
      {children}
    </div>
  );
}

/* ── Inline style helpers ─────────────────────────────────────────────── */
const insLabel: React.CSSProperties = { display: "block", fontSize: 11.5, fontWeight: 700, color: "var(--text3)", marginBottom: 5, letterSpacing: ".01em" };
const insInput: React.CSSProperties = { width: "100%", border: "1px solid var(--border)", borderRadius: 9, padding: "8px 10px", fontSize: 13, color: "var(--text)", background: "var(--surface)", outline: "none", boxSizing: "border-box", resize: "vertical" };
const cardBox: React.CSSProperties = { borderRadius: "var(--s-radius)", border: "1px solid var(--s-border)", padding: 20 };
const editHint: React.CSSProperties = { marginTop: 12, fontSize: 11.5, opacity: 0.5, fontStyle: "italic" };
const toolBtn: React.CSSProperties = { display: "flex", alignItems: "center", justifyContent: "center", width: 26, height: 26, borderRadius: 7, border: 0, background: "transparent", color: "#fff", cursor: "pointer" };

function chipBtn(active: boolean, disabled = false): React.CSSProperties {
  return { display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 12px", borderRadius: 999, border: "1px solid var(--border)", background: active ? "var(--brand)" : "var(--surface)", color: active ? "var(--brandFg)" : "var(--text)", fontSize: 13, fontWeight: 600, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.4 : 1, textDecoration: "none" };
}
function segBtn(active: boolean): React.CSSProperties {
  return { display: "flex", alignItems: "center", justifyContent: "center", width: 38, height: 32, border: 0, background: active ? "var(--brand)" : "var(--surface)", color: active ? "var(--brandFg)" : "var(--text3)", cursor: "pointer" };
}
const primaryBtn: React.CSSProperties = { display: "inline-flex", alignItems: "center", gap: 6, height: 34, padding: "0 16px", borderRadius: 999, border: 0, background: "var(--brand)", color: "var(--brandFg)", fontSize: 13, fontWeight: 700, cursor: "pointer" };
function tabBtn(active: boolean): React.CSSProperties {
  return { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 34, borderRadius: 9, border: 0, background: active ? "var(--brand)" : "var(--surface2)", color: active ? "var(--brandFg)" : "var(--text3)", fontSize: 12.5, fontWeight: 700, cursor: "pointer" };
}
const paletteCard: React.CSSProperties = { display: "flex", flexDirection: "column", alignItems: "flex-start", gap: 6, padding: "10px 11px", borderRadius: 11, border: "1px solid var(--border)", background: "var(--surface2)", color: "var(--text)", cursor: "grab", textAlign: "left" };
const tplCard: React.CSSProperties = { display: "block", width: "100%", textAlign: "left", padding: 0, borderRadius: 12, overflow: "hidden", border: "1px solid var(--border)", background: "var(--surface)", color: "var(--text)", cursor: "pointer" };
function segWide(active: boolean): React.CSSProperties {
  return { flex: 1, display: "inline-flex", alignItems: "center", justifyContent: "center", gap: 6, height: 36, borderRadius: 9, border: active ? "1px solid var(--brand)" : "1px solid var(--border)", background: active ? "var(--brand)" : "var(--surface)", color: active ? "var(--brandFg)" : "var(--text)", fontSize: 12.5, fontWeight: 600, cursor: "pointer" };
}
function ctaPill(accent: string): React.CSSProperties {
  return { display: "inline-block", marginTop: 22, padding: "12px 28px", borderRadius: 999, background: accent, color: contrastInk(accent), fontWeight: 600 };
}

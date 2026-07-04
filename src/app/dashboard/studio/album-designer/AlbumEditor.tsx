"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Wand2, Undo2, Redo2, Plus, Trash2, Shuffle, Loader2, Download, ImagePlus, ArrowLeft, Copy } from "lucide-react";

/* ── Types ──────────────────────────────────────────────────────────────── */
export type ADSize = { name: string; w: number; h: number };
export type ADTpl = { id: string; name: string; page: string; ink: string; font: string };
type Lib = { id: string; thumb: string; full: string; name: string; w?: number | null; h?: number | null };
type Orient = "l" | "p" | "s";
type Cell = {
  uid: number; type: "photo" | "text"; x: number; y: number; w: number; h: number;
  photo: string | null; full: string | null; scale: number; posX: number; posY: number; filter: string;
  text: string; role: "title" | "sub" | "body" | "deco"; align: "left" | "center" | "right";
  size: number | null; color: string | null; overlay: boolean; upper: boolean;
};
type Spread = { id: number; layout: string; cells: Cell[] };

/* ── Constants ──────────────────────────────────────────────────────────── */
const FILTERS = [
  { k: "none", label: "Gốc", css: "none" },
  { k: "bright", label: "Sáng", css: "brightness(1.08) contrast(1.02)" },
  { k: "warm", label: "Ấm", css: "saturate(1.18) sepia(.12)" },
  { k: "bw", label: "Đen trắng", css: "grayscale(1) contrast(1.05)" },
  { k: "cine", label: "Điện ảnh", css: "contrast(1.12) saturate(1.12) brightness(.98)" },
  { k: "dream", label: "Mơ", css: "brightness(1.05) contrast(.94) saturate(1.05)" },
];
type Rect = [number, number, number, number];
type TextDef = { x: number; y: number; w: number; h: number; role: Cell["role"]; align?: Cell["align"]; overlay?: boolean };
const LAYOUTS: Record<string, { label: string; photos: Rect[]; texts?: TextDef[] }> = {
  full: { label: "Toàn cảnh", photos: [[2, 2, 96, 96]] },
  duo: { label: "Đôi", photos: [[2, 3, 47, 94], [51, 3, 47, 94]] },
  trio: { label: "Bộ ba", photos: [[2, 3, 47, 94], [51, 3, 47, 45.5], [51, 51.5, 47, 45.5]] },
  quad: { label: "Lưới 4", photos: [[2, 3, 47, 45.5], [51, 3, 47, 45.5], [2, 51.5, 47, 45.5], [51, 51.5, 47, 45.5]] },
  focus: { label: "Tiêu điểm", photos: [[2, 3, 62, 94], [66, 3, 32, 45.5], [66, 51.5, 32, 45.5]] },
  mag: { label: "Tạp chí", photos: [[2, 3, 48, 94]], texts: [{ x: 56, y: 20, w: 40, h: 14, role: "title" }, { x: 56, y: 40, w: 40, h: 36, role: "body" }] },
  pano: { label: "Toàn ảnh", photos: [[2, 24, 96, 52]], texts: [{ x: 2, y: 82, w: 96, h: 7, role: "sub", align: "center" }] },
  cover: { label: "Bìa", photos: [[0, 0, 100, 100]], texts: [{ x: 10, y: 58, w: 80, h: 12, role: "title", align: "center", overlay: true }, { x: 10, y: 75, w: 80, h: 6, role: "sub", align: "center", overlay: true }] },
};
const SEED_PLAN = ["cover", "duo", "focus", "trio", "mag", "quad", "pano", "full"];
const DECOS: { label: string; text: string; size: number }[] = [
  { label: "Đường kẻ", text: "———", size: 22 }, { label: "Dấu &", text: "&", size: 40 },
  { label: "Ngày cưới", text: "12 · 10 · 2025", size: 16 }, { label: "Save the date", text: "Save the date", size: 20 },
  { label: "Hoa văn", text: "❧", size: 30 }, { label: "Điểm nhấn", text: "✦", size: 24 },
];
const ROLE_SIZE = { title: 26, sub: 12, body: 13, deco: 24 } as const;

/* ── Helpers ────────────────────────────────────────────────────────────── */
const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));
const filterCss = (k: string) => FILTERS.find((f) => f.k === k)?.css || "none";
let UID = 1;

function buildSpread(layout: string, id: number): Spread {
  const L = LAYOUTS[layout] || LAYOUTS.full;
  const cells: Cell[] = [];
  for (const [x, y, w, h] of L.photos) {
    cells.push({ uid: UID++, type: "photo", x, y, w, h, photo: null, full: null, scale: 1, posX: 50, posY: 50, filter: "none", text: "", role: "body", align: "center", size: null, color: null, overlay: false, upper: false });
  }
  for (const t of L.texts || []) {
    cells.push({
      uid: UID++, type: "text", x: t.x, y: t.y, w: t.w, h: t.h, photo: null, full: null, scale: 1, posX: 50, posY: 50, filter: "none",
      text: t.role === "title" ? "Bảo Hân & Hoàng Phú" : t.role === "sub" ? "12 · 10 · 2025" : "Chuyện của chúng mình…",
      role: t.role, align: t.align || "left", size: null, color: null, overlay: !!t.overlay, upper: t.role === "sub",
    });
  }
  return { id, layout, cells };
}

export default function AlbumEditor({ size, tpl, onBack }: { size: ADSize; tpl: ADTpl; onBack: () => void }) {
  const aspect = (2 * size.w) / size.h; // spread = two pages wide
  const [spreads, setSpreads] = useState<Spread[]>(() => SEED_PLAN.map((l, i) => buildSpread(l, i + 1)));
  const [cur, setCur] = useState(0);
  const [sel, setSel] = useState<number | null>(null);
  const [tab, setTab] = useState<"layout" | "photo" | "text" | "deco">("layout");
  const [zoom, setZoom] = useState(1);
  const [lib, setLib] = useState<Lib[]>([]);
  const [folder, setFolder] = useState("");
  const [loadingLib, setLoadingLib] = useState(false);
  const [toast, setToast] = useState<string | null>(null);
  const [exporting, setExporting] = useState(false);
  const [fmt, setFmt] = useState<"jpg" | "png">("jpg");
  const [canvasW, setCanvasW] = useState(700);
  const stageRef = useRef<HTMLDivElement | null>(null);
  const dims = useRef<Record<string, { w: number; h: number; approx?: boolean }>>({});
  const hist = useRef<string[]>([]);
  const fut = useRef<string[]>([]);
  const [, force] = useState(0);

  const spread = spreads[cur];
  const selCell = spread?.cells.find((c) => c.uid === sel) || null;

  const showToast = (m: string) => { setToast(m); setTimeout(() => setToast(null), 2400); };
  const snapshot = useCallback(() => { hist.current.push(JSON.stringify(spreads)); if (hist.current.length > 40) hist.current.shift(); fut.current = []; force((n) => n + 1); }, [spreads]);
  const undo = () => { const s = hist.current.pop(); if (!s) return; fut.current.push(JSON.stringify(spreads)); setSpreads(JSON.parse(s)); force((n) => n + 1); };
  const redo = () => { const s = fut.current.pop(); if (!s) return; hist.current.push(JSON.stringify(spreads)); setSpreads(JSON.parse(s)); force((n) => n + 1); };

  const patchCell = (uid: number, p: Partial<Cell>) => setSpreads((sp) => sp.map((s, i) => i !== cur ? s : { ...s, cells: s.cells.map((c) => c.uid === uid ? { ...c, ...p } : c) }));

  // Measure canvas width.
  useEffect(() => {
    const el = stageRef.current; if (!el) return;
    const ro = new ResizeObserver(() => setCanvasW(el.clientWidth));
    ro.observe(el); setCanvasW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  // Real pixel dimensions come from Drive metadata (accurate for the print DPI
  // check). Fall back to loading the thumbnail only for orientation if missing.
  useEffect(() => {
    lib.forEach((p) => {
      if (dims.current[p.id]) return;
      if (p.w && p.h) { dims.current[p.id] = { w: p.w, h: p.h }; return; }
      const img = new Image();
      img.onload = () => { dims.current[p.id] = { w: img.naturalWidth, h: img.naturalHeight, approx: true }; };
      img.src = p.thumb;
    });
  }, [lib]);

  const orient = (id: string): Orient => {
    const d = dims.current[id]; if (!d) return "s";
    const r = d.w / d.h; return r > 1.15 ? "l" : r < 0.87 ? "p" : "s";
  };

  async function loadLibrary() {
    if (!folder.trim()) return;
    setLoadingLib(true);
    try {
      const res = await fetch(`/api/album-designer/photos?folder=${encodeURIComponent(folder.trim())}`);
      const d = await res.json();
      setLib(d.photos || []);
      if (d.error === "no_api_key") showToast("Máy chủ chưa cấu hình GOOGLE_API_KEY để đọc Drive.");
      else if (!d.photos?.length) showToast("Không đọc được ảnh — kiểm tra link folder đã chia sẻ công khai chưa.");
    } finally { setLoadingLib(false); }
  }

  // Base spread geometry.
  const baseH = 500, baseW = 500 * aspect;
  const scale = Math.min(1, (canvasW - 40) / baseW) * zoom;
  const spreadPxW = baseW * scale, spreadPxH = baseH * scale;

  /* ── Drag / resize ──────────────────────────────────────────────────── */
  const drag = useRef<{ uid: number; mode: string; sx: number; sy: number; c0: Cell; moved: boolean } | null>(null);
  const onCellDown = (e: React.PointerEvent, c: Cell, mode: string) => {
    e.stopPropagation();
    setSel(c.uid);
    drag.current = { uid: c.uid, mode, sx: e.clientX, sy: e.clientY, c0: { ...c }, moved: false };
    window.addEventListener("pointermove", onMove);
    window.addEventListener("pointerup", onUp);
  };
  const onMove = useCallback((e: PointerEvent) => {
    const d = drag.current; if (!d) return;
    const dxp = ((e.clientX - d.sx) / spreadPxW) * 100;
    const dyp = ((e.clientY - d.sy) / spreadPxH) * 100;
    if (!d.moved && Math.hypot(e.clientX - d.sx, e.clientY - d.sy) > 2) { d.moved = true; snapshot(); }
    if (!d.moved) return;
    const c = d.c0;
    let { x, y, w, h } = c;
    if (d.mode === "move") { x = clamp(c.x + dxp, 0, 100 - c.w); y = clamp(c.y + dyp, 0, 100 - c.h); }
    else {
      if (d.mode.includes("e")) w = clamp(c.w + dxp, 6, 100 - c.x);
      if (d.mode.includes("s")) h = clamp(c.h + dyp, 6, 100 - c.y);
      if (d.mode.includes("w")) { const nx = clamp(c.x + dxp, 0, c.x + c.w - 6); w = c.w + (c.x - nx); x = nx; }
      if (d.mode.includes("n")) { const ny = clamp(c.y + dyp, 0, c.y + c.h - 6); h = c.h + (c.y - ny); y = ny; }
    }
    patchCell(d.uid, { x, y, w, h });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [spreadPxW, spreadPxH, snapshot, cur]);
  const onUp = useCallback(() => { drag.current = null; window.removeEventListener("pointermove", onMove); window.removeEventListener("pointerup", onUp); }, [onMove]);

  /* ── Fill photo ─────────────────────────────────────────────────────── */
  const fillCell = (uid: number, p: Lib) => { snapshot(); patchCell(uid, { photo: p.thumb, full: p.full, scale: 1, posX: 50, posY: 50 }); };
  const onThumbClick = (p: Lib) => {
    const target = selCell?.type === "photo" ? selCell.uid : spread?.cells.find((c) => c.type === "photo" && !c.photo)?.uid;
    if (target) fillCell(target, p);
  };
  const usedIds = useMemo(() => new Set(spreads.flatMap((s) => s.cells.map((c) => c.photo).filter(Boolean))), [spreads]);

  /* ── Layout / cells ops ─────────────────────────────────────────────── */
  function applyLayout(key: string) {
    snapshot();
    const placed = spread.cells.filter((c) => c.type === "photo" && c.photo);
    const fresh = buildSpread(key, spread.id);
    let pi = 0;
    fresh.cells.forEach((c) => { if (c.type === "photo" && placed[pi]) { const s = placed[pi++]; c.photo = s.photo; c.full = s.full; c.scale = s.scale; c.posX = s.posX; c.posY = s.posY; c.filter = s.filter; } });
    setSpreads((sp) => sp.map((s, i) => i === cur ? fresh : s)); setSel(null);
  }
  const addText = () => { snapshot(); const c = buildSpread("full", spread.id).cells[0]; setSpreads((sp) => sp.map((s, i) => i !== cur ? s : { ...s, cells: [...s.cells, { ...c, uid: UID++, type: "text", x: 20, y: 40, w: 60, h: 12, text: "Dòng chữ mới", role: "body", align: "center" }] })); };
  const addDeco = (d: typeof DECOS[number]) => { snapshot(); setSpreads((sp) => sp.map((s, i) => i !== cur ? s : { ...s, cells: [...s.cells, { uid: UID++, type: "text", x: 30, y: 45, w: 40, h: 12, photo: null, full: null, scale: 1, posX: 50, posY: 50, filter: "none", text: d.text, role: "deco", align: "center", size: d.size, color: null, overlay: false, upper: false }] })); };
  const delCell = (uid: number) => { snapshot(); setSpreads((sp) => sp.map((s, i) => i !== cur ? s : { ...s, cells: s.cells.filter((c) => c.uid !== uid) })); setSel(null); };
  const clearPhoto = (uid: number) => { snapshot(); patchCell(uid, { photo: null, full: null }); };
  const shuffle = () => {
    snapshot();
    const photos = spread.cells.filter((c) => c.type === "photo" && c.photo).map((c) => ({ photo: c.photo, full: c.full }));
    for (let i = photos.length - 1; i > 0; i--) { const j = (i * 7 + 3) % (i + 1); [photos[i], photos[j]] = [photos[j], photos[i]]; }
    let pi = 0;
    setSpreads((sp) => sp.map((s, i) => i !== cur ? s : { ...s, cells: s.cells.map((c) => c.type === "photo" && c.photo && photos[pi] ? { ...c, ...photos[pi++] } : c) }));
  };
  const delSpread = () => { if (spreads.length <= 1) return; snapshot(); setSpreads((sp) => sp.filter((_, i) => i !== cur)); setCur((c) => Math.max(0, c - 1)); setSel(null); };
  const addSpread = () => { snapshot(); setSpreads((sp) => [...sp, buildSpread("duo", (sp.at(-1)?.id ?? 0) + 1)]); setCur(spreads.length); };
  const dupSpread = () => { snapshot(); const clone: Spread = { ...spread, id: (spreads.at(-1)?.id ?? 0) + 1, cells: spread.cells.map((c) => ({ ...c, uid: UID++ })) }; setSpreads((sp) => { const n = sp.slice(); n.splice(cur + 1, 0, clone); return n; }); setCur(cur + 1); setSel(null); };
  const moveSpread = (dir: -1 | 1) => { const j = cur + dir; if (j < 0 || j >= spreads.length) return; snapshot(); setSpreads((sp) => { const n = sp.slice(); [n[cur], n[j]] = [n[j], n[cur]]; return n; }); setCur(j); };
  // Drag a photo from the library onto a cell (fill / replace).
  const dragLib = useRef<Lib | null>(null);

  /* ── AI auto-fill ───────────────────────────────────────────────────── */
  // Fill every empty photo cell in `base`, matching cell↔photo orientation and
  // preferring least-used photos. Pure — returns new spreads.
  function fillEmpty(base: Spread[]): Spread[] {
    const use: Record<string, number> = {};
    base.forEach((s) => s.cells.forEach((c) => { const id = c.photo?.match(/id=([^&]+)/)?.[1]; if (id) use[id] = (use[id] || 0) + 1; }));
    return base.map((s) => ({
      ...s,
      cells: s.cells.map((c) => {
        if (c.type !== "photo" || c.photo) return c;
        const cellOrient: Orient = (c.w / c.h) * aspect > 1.15 ? "l" : (c.w / c.h) * aspect < 0.87 ? "p" : "s";
        const cand = [...lib].sort((a, b) => {
          const ma = orient(a.id) === cellOrient ? 0 : 1, mb = orient(b.id) === cellOrient ? 0 : 1;
          if (ma !== mb) return ma - mb;
          return (use[a.id] || 0) - (use[b.id] || 0);
        })[0];
        if (!cand) return c;
        use[cand.id] = (use[cand.id] || 0) + 1;
        return { ...c, photo: cand.thumb, full: cand.full, scale: 1, posX: 50, posY: 50 };
      }),
    }));
  }
  function autoFill() {
    if (!lib.length) { showToast("Hãy nạp thư viện ảnh trước."); return; }
    snapshot();
    const before = spreads.flatMap((s) => s.cells).filter((c) => c.photo).length;
    const next = fillEmpty(spreads);
    setSpreads(next);
    showToast(`AI đã rải ${Math.max(0, next.flatMap((s) => s.cells).filter((c) => c.photo).length - before)} ảnh — khớp hướng ảnh`);
  }
  // SmartAlbum-style "tự thiết kế cả album": tạo đủ số trang cho toàn bộ ảnh rồi
  // rải tự động — một chạm ra album hoàn chỉnh.
  function autoDesignAll() {
    if (!lib.length) { showToast("Hãy nạp thư viện ảnh trước."); return; }
    snapshot();
    const perSpread = 3;
    const needed = Math.max(spreads.length, Math.ceil(lib.length / perSpread));
    const next = spreads.slice();
    while (next.length < needed) next.push(buildSpread(SEED_PLAN[next.length % SEED_PLAN.length], (next.at(-1)?.id ?? 0) + 1));
    setSpreads(fillEmpty(next));
    showToast(`Đã tự thiết kế ${needed} trang từ ${lib.length} ảnh.`);
  }

  /* ── DPI ────────────────────────────────────────────────────────────── */
  function cellDpi(c: Cell): number | null {
    if (!c.photo) return null;
    // dims keyed by drive id; the thumb URL carries an id= param.
    const id = c.photo.match(/id=([^&]+)/)?.[1] || "";
    const dd = dims.current[id]; if (!dd || dd.approx) return null; // need true pixel size
    const cellWcm = (c.w / 100) * (2 * size.w), cellHcm = (c.h / 100) * size.h;
    const cellCm = Math.min(cellWcm, cellHcm);
    return Math.round((Math.min(dd.w, dd.h) / c.scale) / (cellCm / 2.54));
  }

  /* ── Export per-page PNG ────────────────────────────────────────────── */
  const loadImg = (src: string) => new Promise<HTMLImageElement>((res, rej) => { const im = new Image(); im.crossOrigin = "anonymous"; im.onload = () => res(im); im.onerror = rej; im.src = src; });
  async function exportSpread(s: Spread, idx: number) {
    const DPI = 300, W = Math.round((2 * size.w) * DPI / 2.54), H = Math.round(size.h * DPI / 2.54);
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H;
    const ctx = cv.getContext("2d")!; ctx.fillStyle = tpl.page; ctx.fillRect(0, 0, W, H);
    for (const c of s.cells) {
      const cx = (c.x / 100) * W, cy = (c.y / 100) * H, cw = (c.w / 100) * W, ch = (c.h / 100) * H;
      if (c.type === "photo" && c.full) {
        try {
          const im = await loadImg(c.full);
          ctx.save(); ctx.beginPath(); ctx.rect(cx, cy, cw, ch); ctx.clip(); ctx.filter = filterCss(c.filter);
          const s0 = Math.max(cw / im.width, ch / im.height) * c.scale, dw = im.width * s0, dh = im.height * s0;
          const dx = cx + (cw - dw) * (c.posX / 100), dy = cy + (ch - dh) * (c.posY / 100);
          ctx.drawImage(im, dx, dy, dw, dh); ctx.restore();
        } catch { /* skip broken image */ }
      } else if (c.type === "text" && c.text) {
        ctx.save(); ctx.fillStyle = c.color || (c.overlay ? "#fff" : tpl.ink);
        const fs = (c.size || ROLE_SIZE[c.role]) * (H / baseH);
        ctx.font = `${fs}px ${c.role === "body" ? "Manrope, sans-serif" : "'Cormorant Garamond', serif"}`;
        ctx.textAlign = c.align; ctx.textBaseline = "middle";
        const tx = c.align === "center" ? cx + cw / 2 : c.align === "right" ? cx + cw : cx;
        (c.upper ? c.text.toUpperCase() : c.text).split("\n").forEach((line, li) => ctx.fillText(line, tx, cy + ch / 2 + li * fs * 1.2));
        ctx.restore();
      }
    }
    // toBlob is far more memory-friendly than toDataURL for large print canvases.
    const mime = fmt === "png" ? "image/png" : "image/jpeg";
    const ext = fmt === "png" ? "png" : "jpg";
    const blob: Blob = await new Promise((res) => cv.toBlob((b) => res(b!), mime, fmt === "png" ? undefined : 0.95));
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a"); a.href = url; a.download = `album-${size.name}-trang-${idx + 1}.${ext}`; a.click();
    setTimeout(() => URL.revokeObjectURL(url), 4000);
  }
  async function exportAll() {
    if (!spreads.some((s) => s.cells.some((c) => c.type === "photo" && c.full))) { showToast("Chưa có ảnh để xuất — hãy nạp thư viện & đặt ảnh."); return; }
    setExporting(true);
    try { for (let i = 0; i < spreads.length; i++) { await exportSpread(spreads[i], i); await new Promise((r) => setTimeout(r, 450)); } showToast(`Đã xuất ${spreads.length} trang (${fmt.toUpperCase()} · 300 DPI · ảnh gốc).`); }
    catch { showToast("Xuất file gặp lỗi — thử lại hoặc giảm số trang."); }
    finally { setExporting(false); }
  }

  /* ── Render ─────────────────────────────────────────────────────────── */
  const panel: React.CSSProperties = { background: "var(--panel)", border: "1px solid var(--border)" };
  const scenesUsed = usedIds.size;

  return (
    <div className="animate-[vkFade_.4s_ease_both]">
      {/* Top toolbar */}
      <div className="mb-3 flex flex-wrap items-center gap-2">
        <button onClick={onBack} className="btn-ghost gap-1"><ArrowLeft size={15} /> Đổi khổ/mẫu</button>
        <span className="text-sm font-semibold" style={{ color: "var(--text2)" }}>{size.name} · {tpl.name} · {spreads.length} trang</span>
        <span className="flex-1" />
        <button onClick={undo} disabled={!hist.current.length} className="btn-ghost px-2 disabled:opacity-40"><Undo2 size={15} /></button>
        <button onClick={redo} disabled={!fut.current.length} className="btn-ghost px-2 disabled:opacity-40"><Redo2 size={15} /></button>
        <div className="flex items-center gap-1 rounded-lg px-1" style={panel}>
          <button onClick={() => setZoom((z) => clamp(+(z - 0.1).toFixed(1), 0.5, 1.6))} className="px-2 text-lg">−</button>
          <span className="w-12 text-center text-xs">{Math.round(zoom * 100)}%</span>
          <button onClick={() => setZoom((z) => clamp(+(z + 0.1).toFixed(1), 0.5, 1.6))} className="px-2 text-lg">+</button>
        </div>
        <div className="flex overflow-hidden rounded-lg text-xs font-semibold" style={panel}>
          {(["jpg", "png"] as const).map((f) => (
            <button key={f} onClick={() => setFmt(f)} className="px-2.5 py-2" style={{ background: fmt === f ? "var(--brandSoft)" : "transparent", color: fmt === f ? "var(--brand)" : "var(--text2)" }}>{f.toUpperCase()}</button>
          ))}
        </div>
        <button onClick={exportAll} disabled={exporting} className="btn-primary gap-1.5">{exporting ? <Loader2 size={15} className="animate-spin" /> : <Download size={15} />} Xuất file</button>
      </div>

      <div className="grid gap-3 lg:grid-cols-[220px_1fr_300px]">
        {/* Library */}
        <div className="rounded-2xl p-3" style={panel}>
          <p className="text-sm font-extrabold">Thư viện ảnh</p>
          <p className="mb-2 text-[11.5px]" style={{ color: "var(--text2)" }}>{lib.length} ảnh · {scenesUsed} đã dùng</p>
          <div className="mb-2 flex gap-1">
            <input value={folder} onChange={(e) => setFolder(e.target.value)} placeholder="Dán link folder Drive…" className="input flex-1 text-xs" />
            <button onClick={loadLibrary} disabled={loadingLib} className="btn-ghost px-2">{loadingLib ? <Loader2 size={14} className="animate-spin" /> : <ImagePlus size={14} />}</button>
          </div>
          <div className="grid max-h-[52vh] grid-cols-2 gap-1.5 overflow-y-auto">
            {lib.map((p) => (
              <button key={p.id} onClick={() => onThumbClick(p)} draggable onDragStart={() => { dragLib.current = p; }} className="relative aspect-square overflow-hidden rounded-lg" style={{ cursor: "grab" }}>
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img src={p.thumb} alt="" className="h-full w-full object-cover" loading="lazy" draggable={false} />
                {usedIds.has(p.thumb) && <span className="absolute right-1 top-1 flex h-4 w-4 items-center justify-center rounded-full text-[10px] text-white" style={{ background: "var(--brand)" }}>✓</span>}
              </button>
            ))}
          </div>
          <button onClick={autoDesignAll} className="btn-primary mt-2 w-full gap-1.5"><Wand2 size={15} /> Tự thiết kế cả album</button>
          <button onClick={autoFill} className="btn-ghost mt-1.5 w-full gap-1.5 text-sm"><Wand2 size={14} /> Rải vào ô trống</button>
          <p className="mt-1 text-center text-[11px]" style={{ color: "var(--text3)" }}>Kéo ảnh vào ô · tự khớp hướng ảnh</p>
        </div>

        {/* Canvas */}
        <div>
          <div ref={stageRef} className="flex items-center justify-center overflow-hidden rounded-2xl p-4" style={{ ...panel, minHeight: 420 }}>
            <div onClick={() => setSel(null)} style={{ position: "relative", width: spreadPxW, height: spreadPxH, background: tpl.page, boxShadow: "0 10px 40px rgba(0,0,0,.18)" }}>
              <div style={{ position: "absolute", left: "50%", top: 0, bottom: 0, width: 1, background: "rgba(0,0,0,.08)" }} />
              {spread?.cells.map((c) => {
                const selected = c.uid === sel;
                const dpi = c.type === "photo" ? cellDpi(c) : null;
                return (
                  <div key={c.uid} onPointerDown={(e) => onCellDown(e, c, "move")}
                    onDragOver={c.type === "photo" ? (e) => e.preventDefault() : undefined}
                    onDrop={c.type === "photo" ? () => { if (dragLib.current) { fillCell(c.uid, dragLib.current); dragLib.current = null; } } : undefined}
                    onDoubleClick={() => { if (c.type === "photo" && c.photo) patchCell(c.uid, { scale: 1, posX: 50, posY: 50 }); }}
                    style={{ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%`, outline: selected ? "2.5px solid var(--brand)" : "none", cursor: "grab", overflow: "visible" }}>
                    <div style={{ position: "absolute", inset: 0, overflow: "hidden" }}>
                      {c.type === "photo" ? (c.photo ? (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={c.photo} alt="" draggable={false} style={{ width: "100%", height: "100%", objectFit: "cover", objectPosition: `${c.posX}% ${c.posY}%`, transform: `scale(${c.scale})`, filter: filterCss(c.filter) }} />
                      ) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, color: "var(--text3)", background: "repeating-linear-gradient(45deg,var(--surface),var(--surface) 6px,var(--surface2) 6px,var(--surface2) 12px)" }}>＋ Kéo ảnh</div>
                      )) : (
                        <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: c.align === "center" ? "center" : c.align === "right" ? "flex-end" : "flex-start", textAlign: c.align, padding: 4, fontFamily: c.role === "body" ? "var(--font-manrope), sans-serif" : "var(--font-cormorant), serif", fontSize: (c.size || ROLE_SIZE[c.role]) * scale, color: c.color || (c.overlay ? "#fff" : tpl.ink), textTransform: c.upper ? "uppercase" : "none", letterSpacing: c.role === "sub" ? ".18em" : undefined, lineHeight: c.role === "body" ? 1.7 : 1.2, textShadow: c.overlay ? "0 1px 6px rgba(0,0,0,.5)" : undefined, whiteSpace: "pre-wrap" }}>{c.text}</div>
                      )}
                    </div>
                    {dpi != null && dpi < 230 && <span style={{ position: "absolute", left: 4, bottom: 4, fontSize: 9, fontWeight: 700, padding: "1px 4px", borderRadius: 4, color: "#fff", background: dpi < 150 ? "#cc4b4b" : "#c08a1e" }}>{dpi < 150 ? "⚠ " : ""}{dpi} DPI</span>}
                    {selected && (["nw", "ne", "sw", "se"] as const).map((m) => (
                      <span key={m} onPointerDown={(e) => onCellDown(e, c, m)} style={{ position: "absolute", width: 12, height: 12, background: "var(--brand)", borderRadius: 2, cursor: `${m}-resize`, left: m.includes("w") ? -6 : undefined, right: m.includes("e") ? -6 : undefined, top: m.includes("n") ? -6 : undefined, bottom: m.includes("s") ? -6 : undefined }} />
                    ))}
                  </div>
                );
              })}
            </div>
          </div>
          {/* Spread rail */}
          <div className="mt-2 flex items-center gap-2 overflow-x-auto rounded-2xl p-2" style={panel}>
            {spreads.map((s, i) => (
              <button key={s.id} onClick={() => { setCur(i); setSel(null); }} className="flex-none rounded-lg p-1" style={{ border: `2px solid ${i === cur ? "var(--brand)" : "transparent"}` }}>
                <div style={{ width: 64, height: 64 / aspect, background: tpl.page, borderRadius: 4, position: "relative", overflow: "hidden" }}>
                  {s.cells.filter((c) => c.type === "photo").slice(0, 4).map((c, k) => <span key={k} style={{ position: "absolute", left: `${c.x}%`, top: `${c.y}%`, width: `${c.w}%`, height: `${c.h}%`, background: c.photo ? "var(--brand)" : "var(--surface2)", opacity: c.photo ? 0.55 : 1, borderRadius: 1 }} />)}
                </div>
                <span className="text-[10px]" style={{ color: "var(--text3)" }}>{i === 0 ? "Bìa" : i + 1}</span>
              </button>
            ))}
            <button onClick={addSpread} className="flex-none rounded-lg px-3 py-4 text-lg" style={{ border: "1px dashed var(--border)", color: "var(--text3)" }}>＋</button>
          </div>
        </div>

        {/* Properties */}
        <div className="rounded-2xl p-3" style={panel}>
          <div className="mb-3 flex gap-1 border-b" style={{ borderColor: "var(--border)" }}>
            {([["layout", "Bố cục"], ["photo", "Ảnh"], ["text", "Chữ"], ["deco", "Trang trí"]] as const).map(([k, l]) => (
              <button key={k} onClick={() => setTab(k)} className="px-2 py-1.5 text-[12.5px] font-semibold" style={{ color: tab === k ? "var(--brand)" : "var(--text2)", borderBottom: `2px solid ${tab === k ? "var(--brand)" : "transparent"}` }}>{l}</button>
            ))}
          </div>

          {tab === "layout" && (<div className="space-y-3">
            <div className="grid grid-cols-2 gap-2">
              {Object.entries(LAYOUTS).map(([k, L]) => (
                <button key={k} onClick={() => applyLayout(k)} className="rounded-lg p-2 text-left" style={{ border: `1px solid ${spread?.layout === k ? "var(--brand)" : "var(--border)"}` }}>
                  <div style={{ position: "relative", width: "100%", aspectRatio: `${aspect}`, background: "var(--surface2)", borderRadius: 4, overflow: "hidden" }}>
                    {L.photos.map((r, i) => <span key={i} style={{ position: "absolute", left: `${r[0]}%`, top: `${r[1]}%`, width: `${r[2]}%`, height: `${r[3]}%`, background: "var(--brand)", opacity: 0.5, borderRadius: 1 }} />)}
                  </div>
                  <span className="mt-1 block text-[11.5px] font-semibold">{L.label}</span>
                </button>
              ))}
            </div>
            <button onClick={addText} className="btn-ghost w-full justify-start gap-2 text-sm"><Plus size={14} /> Thêm dòng chữ</button>
            <button onClick={shuffle} className="btn-ghost w-full justify-start gap-2 text-sm"><Shuffle size={14} /> Đổi vị trí ảnh</button>
            <div className="flex gap-1.5">
              <button onClick={() => moveSpread(-1)} disabled={cur === 0} className="btn-ghost flex-1 gap-1 text-sm disabled:opacity-40"><ArrowLeft size={14} /> Trước</button>
              <button onClick={() => moveSpread(1)} disabled={cur === spreads.length - 1} className="btn-ghost flex-1 gap-1 text-sm disabled:opacity-40">Sau <ArrowLeft size={14} className="rotate-180" /></button>
            </div>
            <button onClick={dupSpread} className="btn-ghost w-full justify-start gap-2 text-sm"><Copy size={14} /> Nhân đôi trang</button>
            <button onClick={delSpread} className="btn-ghost w-full justify-start gap-2 text-sm" style={{ color: "#cc4b4b" }}><Trash2 size={14} /> Xoá trang này</button>
          </div>)}

          {tab === "photo" && (selCell?.type === "photo" ? (<div className="space-y-3">
            <Slider label="Phóng to" min={1} max={2.6} step={0.05} value={selCell.scale} onChange={(v) => patchCell(selCell.uid, { scale: v })} />
            <Slider label="Dời ngang" min={0} max={100} step={1} value={selCell.posX} onChange={(v) => patchCell(selCell.uid, { posX: v })} />
            <Slider label="Dời dọc" min={0} max={100} step={1} value={selCell.posY} onChange={(v) => patchCell(selCell.uid, { posY: v })} />
            <div>
              <p className="mb-1 text-xs font-semibold" style={{ color: "var(--text2)" }}>Bộ lọc màu</p>
              <div className="grid grid-cols-3 gap-1.5">
                {FILTERS.map((f) => (
                  <button key={f.k} onClick={() => patchCell(selCell.uid, { filter: f.k })} className="overflow-hidden rounded-md" style={{ border: `1.5px solid ${selCell.filter === f.k ? "var(--brand)" : "var(--border)"}` }}>
                    {selCell.photo && (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={selCell.photo} alt="" className="h-10 w-full object-cover" style={{ filter: f.css }} />
                    )}
                    <span className="block py-0.5 text-center text-[10px]">{f.label}</span>
                  </button>
                ))}
              </div>
            </div>
            {(() => { const dpi = cellDpi(selCell); return dpi != null ? <p className="text-[11.5px]" style={{ color: dpi < 150 ? "#cc4b4b" : dpi < 230 ? "#c08a1e" : "var(--text2)" }}>~{dpi} DPI · {dpi < 150 ? "quá thấp để in" : dpi < 230 ? "hơi thấp" : "tốt để in"}</p> : null; })()}
            <button onClick={() => clearPhoto(selCell.uid)} className="btn-ghost w-full text-sm">Bỏ ảnh khỏi ô</button>
          </div>) : <p className="py-6 text-center text-xs" style={{ color: "var(--text3)" }}>Chọn một ô ảnh để chỉnh.</p>)}

          {tab === "text" && (selCell?.type === "text" ? (<div className="space-y-3">
            <textarea value={selCell.text} onChange={(e) => patchCell(selCell.uid, { text: e.target.value })} rows={2} className="input w-full text-sm" />
            <Slider label="Cỡ chữ" min={10} max={72} step={1} value={selCell.size || ROLE_SIZE[selCell.role]} onChange={(v) => patchCell(selCell.uid, { size: v })} />
            <div className="flex flex-wrap gap-1.5">
              {["#ffffff", "#1a1a1a", "#8a6d3b", "#b08968", "#7a5c5c", "#3f5a4a"].map((col) => (
                <button key={col} onClick={() => patchCell(selCell.uid, { color: col })} className="h-6 w-6 rounded-full" style={{ background: col, border: `2px solid ${selCell.color === col ? "var(--brand)" : "var(--border)"}` }} />
              ))}
            </div>
            <div className="flex gap-1">
              {(["left", "center", "right"] as const).map((a) => <button key={a} onClick={() => patchCell(selCell.uid, { align: a })} className="flex-1 rounded-md py-1.5 text-xs" style={{ background: selCell.align === a ? "var(--brandSoft)" : "var(--surface)", color: selCell.align === a ? "var(--brand)" : "var(--text2)" }}>{a === "left" ? "Trái" : a === "center" ? "Giữa" : "Phải"}</button>)}
            </div>
            <button onClick={() => delCell(selCell.uid)} className="btn-ghost w-full text-sm" style={{ color: "#cc4b4b" }}>Xoá dòng chữ</button>
          </div>) : <div className="py-6 text-center"><button onClick={addText} className="btn-ghost gap-1 text-sm"><Plus size={14} /> Thêm dòng chữ</button></div>)}

          {tab === "deco" && (<div className="grid grid-cols-2 gap-2">
            {DECOS.map((d) => <button key={d.label} onClick={() => addDeco(d)} className="rounded-lg py-3 text-center" style={{ border: "1px solid var(--border)" }}><div style={{ fontFamily: "var(--font-cormorant), serif", fontSize: 20 }}>{d.text}</div><span className="text-[11px]" style={{ color: "var(--text2)" }}>{d.label}</span></button>)}
          </div>)}
        </div>
      </div>

      {toast && <div style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", zIndex: 60, background: "var(--brand)", color: "#fff", padding: "10px 20px", borderRadius: 999, fontSize: 13, fontWeight: 600 }}>{toast}</div>}
    </div>
  );
}

function Slider({ label, min, max, step, value, onChange }: { label: string; min: number; max: number; step: number; value: number; onChange: (v: number) => void }) {
  return (
    <label className="block">
      <span className="mb-1 flex justify-between text-xs font-semibold" style={{ color: "var(--text2)" }}>{label}<span style={{ color: "var(--text3)" }}>{value}</span></span>
      <input type="range" min={min} max={max} step={step} value={value} onChange={(e) => onChange(+e.target.value)} className="w-full accent-[var(--brand)]" />
    </label>
  );
}

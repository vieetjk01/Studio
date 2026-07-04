"use client";

import { useEffect, useRef, useState } from "react";

/**
 * Slide cưới — trình tạo video slideshow ảnh cưới (canvas 1920×1080): slide tựa
 * đề → ảnh với hiệu ứng chuyển cảnh + Ken Burns → slide chữ/câu chuyện → kết.
 * Port trực tiếp từ thiết kế "Video slide ảnh cưới" của studio (đang Sắp ra mắt;
 * sẽ chỉnh sau). Xuất video bằng MediaRecorder (webm/mp4 tuỳ trình duyệt).
 */

type Photo = { id: string; name: string; url: string };
type Slide = { type: string; photos: Photo[]; trans: string; text?: string; side?: number; t0?: number; dur?: number };
type Theme = { name: string; bg: string; ink: string; sub: string; accent: string; title: string; body: string; radius: number; dark: boolean; letterbox: boolean; titleItalic: boolean; c1: string; c2: string; trans: string[]; tr: number; kb: number; pace: number; bag: string[]; bagText: string[] };

const THEMES: Record<string, Theme> = {
  luxe: { name: "Tối giản sang trọng", bg: "#f7f4ef", ink: "#2b2723", sub: "#8a8378", accent: "#a98b5d", title: "Cormorant Garamond", body: "Be Vietnam Pro", radius: 6, dark: false, letterbox: false, titleItalic: false, c1: "#f7f4ef", c2: "#a98b5d", trans: ["fade", "zoomsoft", "fade", "wipe"], tr: 0.95, kb: 0.07, pace: 1.12, bag: ["FULL", "FRAME", "FULL", "DUO", "FRAME", "FULL", "TRIPLE", "FRAME"], bagText: ["FULL", "SPLIT", "FRAME", "FULL", "SPLIT", "DUO", "FRAME", "FULL", "TRIPLE", "SPLIT"] },
  romantic: { name: "Lãng mạn ấm áp", bg: "#f6ece7", ink: "#5a4038", sub: "#9c8078", accent: "#c98a7d", title: "Playfair Display", body: "Be Vietnam Pro", radius: 16, dark: false, letterbox: false, titleItalic: true, c1: "#f6ece7", c2: "#c98a7d", trans: ["fade", "slideup", "zoomsoft", "slide"], tr: 0.8, kb: 0.11, pace: 1.0, bag: ["FULL", "DUO", "FULL", "QUAD", "DUO", "FULL", "TRIPLE", "DUO"], bagText: ["FULL", "SPLIT", "DUO", "FULL", "SPLIT", "QUAD", "DUO", "SPLIT", "FULL", "TRIPLE"] },
  cinematic: { name: "Điện ảnh hiện đại", bg: "#131317", ink: "#f4f1ec", sub: "#b7b2a9", accent: "#c9a24a", title: "Playfair Display", body: "Manrope", radius: 0, dark: true, letterbox: true, titleItalic: false, c1: "#131317", c2: "#c9a24a", trans: ["push", "zoom", "pushup", "slide"], tr: 0.55, kb: 0.17, pace: 0.9, bag: ["FULL", "FULL", "TRIPLE", "FULL", "DUO", "FULL", "FULL", "TRIPLE"], bagText: ["FULL", "SPLIT", "FULL", "FULL", "TRIPLE", "SPLIT", "FULL", "DUO", "FULL", "SPLIT"] },
  bright: { name: "Trong trẻo tươi sáng", bg: "#ffffff", ink: "#2a2f36", sub: "#8a9099", accent: "#5b9aa8", title: "Cormorant Garamond", body: "Be Vietnam Pro", radius: 20, dark: false, letterbox: false, titleItalic: false, c1: "#eef4f5", c2: "#5b9aa8", trans: ["slide", "block", "wipe", "pushup"], tr: 0.62, kb: 0.08, pace: 0.98, bag: ["DUO", "QUAD", "FULL", "TRIPLE", "DUO", "QUAD", "FULL", "TRIPLE"], bagText: ["DUO", "SPLIT", "QUAD", "FULL", "SPLIT", "TRIPLE", "DUO", "SPLIT", "QUAD", "FULL"] },
};

type EngineState = {
  tab: string; photos: Photo[]; groom: string; bride: string; date: string; eyebrow: string;
  story: string; music: string; audioName: string; theme: string; perPhoto: number; diverse: boolean; showText: boolean;
  playing: boolean; total: number; slideCount: number; exporting: boolean; exportPct: number; exportError: string;
};

class SlideEngine {
  state: EngineState = { tab: "photos", photos: [], groom: "", bride: "", date: "", eyebrow: "", story: "", music: "none", audioName: "", theme: "luxe", perPhoto: 3.4, diverse: true, showText: true, playing: false, total: 0, slideCount: 0, exporting: false, exportPct: 0, exportError: "" };
  onChange: () => void = () => {};
  imgs = new Map<string, HTMLImageElement>();
  plan: Slide[] = [];
  quotes: string[] = [];
  seed = 1;
  time = 0;
  total = 0;
  canvas: HTMLCanvasElement | null = null;
  ctx: CanvasRenderingContext2D | null = null;
  scrubber: HTMLInputElement | null = null;
  timeLabel: HTMLElement | null = null;
  _pid = 0; _raf: number | null = null; _expRaf: number | null = null; _last: number | null = null;
  _drag: string | null = null; _cancelExport = false;
  actx: AudioContext | null = null; master: GainNode | null = null; recDest: MediaStreamAudioDestinationNode | null = null;
  audioEl: HTMLAudioElement | null = null; mediaSrc: MediaElementAudioSourceNode | null = null;
  _proc: ReturnType<typeof setInterval> | null = null; _procNodes: OscillatorNode[] = [];

  setState(patch: Partial<EngineState> | ((s: EngineState) => Partial<EngineState> | null), cb?: () => void) {
    const p = typeof patch === "function" ? patch(this.state) : patch;
    if (p) this.state = { ...this.state, ...p };
    this.onChange();
    if (cb) cb();
  }
  getTheme() { return THEMES[this.state.theme] || THEMES.luxe; }
  fmt(t: number) { t = Math.max(0, t || 0); const m = Math.floor(t / 60), s = Math.floor(t % 60); return m + ":" + String(s).padStart(2, "0"); }
  smooth(p: number, a: number, b: number) { let t = (p - a) / (b - a); t = Math.max(0, Math.min(1, t)); return t * t * (3 - 2 * t); }
  easeIO(t: number) { t = Math.max(0, Math.min(1, t)); return t < 0.5 ? 2 * t * t : 1 - Math.pow(-2 * t + 2, 2) / 2; }
  coupleName() { const g = (this.state.groom || "").trim(), b = (this.state.bride || "").trim(); if (!g && !b) return "Chú Rể & Cô Dâu"; return (g || "Chú Rể") + " & " + (b || "Cô Dâu"); }
  quotesNow() { return (this.state.story || "").split(/\n{2,}/).map((x) => x.replace(/\n/g, " ").trim()).filter(Boolean); }

  go(id: string) { this.setState({ tab: id }); }
  setField<K extends keyof EngineState>(k: K, v: EngineState[K]) { this.setState({ [k]: v } as Partial<EngineState>, () => this.rebuild()); }

  addFiles(list: FileList | File[] | null) {
    const files = [...(list || [])].filter((f) => f.type && f.type.indexOf("image/") === 0);
    if (!files.length) return;
    const added = files.map((f) => {
      const id = "p" + (this._pid = this._pid + 1);
      const url = URL.createObjectURL(f);
      const img = new Image();
      img.onload = () => this.rebuild();
      img.src = url;
      this.imgs.set(id, img);
      return { id, name: f.name, url };
    });
    this.setState((s) => ({ photos: [...s.photos, ...added] }), () => this.rebuild());
  }
  removePhoto(id: string) {
    const p = this.state.photos.find((x) => x.id === id);
    if (p) { try { URL.revokeObjectURL(p.url); } catch { /* */ } }
    this.imgs.delete(id);
    this.setState((s) => ({ photos: s.photos.filter((x) => x.id !== id) }), () => this.rebuild());
  }
  reorderPhotos(fromId: string | null, toId: string) {
    if (!fromId || fromId === toId) return;
    this.setState((s) => {
      const arr = s.photos.slice();
      const fi = arr.findIndex((x) => x.id === fromId), ti = arr.findIndex((x) => x.id === toId);
      if (fi < 0 || ti < 0) return null;
      const [it] = arr.splice(fi, 1); arr.splice(ti, 0, it);
      return { photos: arr };
    }, () => this.rebuild());
  }
  selectTheme(id: string) { this.setState({ theme: id }, () => this.rebuild()); }
  selectMusic(id: string) { this.setState({ music: id }, () => { if (this.state.playing) { this.pauseMusic(); this.playMusic(this.time); } }); }
  setAudioFile(file?: File) {
    if (!file) return;
    const url = URL.createObjectURL(file);
    if (this.audioEl) { try { this.audioEl.pause(); } catch { /* */ } }
    this.audioEl = new Audio(url); this.audioEl.loop = true; this.mediaSrc = null;
    this.setState({ music: "upload", audioName: file.name }, () => { if (this.state.playing) { this.pauseMusic(); this.playMusic(this.time); } });
  }

  slideDur(t: string) {
    const b = this.state.perPhoto;
    const m: Record<string, number> = { TITLE: 3.8, OUTRO: 4.2, QUOTE: 3.8, FULL: b, FRAME: b + 0.3, SPLIT: b + 1.1, DUO: b + 0.7, TRIPLE: b + 1.2, QUAD: b + 1.6 };
    return (m[t] || b) * (this.getTheme().pace || 1);
  }
  buildPlan(): Slide[] {
    const P = this.state.photos, Q = this.quotes;
    if (!P.length) return [];
    const showText = this.state.showText && Q.length > 0;
    let s = (this.seed || 1) >>> 0;
    const rnd = () => { s = (s * 1664525 + 1013904223) >>> 0; return s / 4294967296; };
    const pick = <T,>(a: T[]) => a[Math.floor(rnd() * a.length)];
    const th = this.getTheme();
    const trans = this.state.diverse ? (th.trans || ["fade", "slide", "push"]) : ["fade"];
    const need: Record<string, number> = { FULL: 1, FRAME: 1, SPLIT: 1, DUO: 2, TRIPLE: 3, QUAD: 4 };
    const bag = showText ? (th.bagText || th.bag) : th.bag;
    const slides: Slide[] = [{ type: "TITLE", photos: [P[0]], trans: "fade" }];
    let i = 0, bi = 0, cnt = 0, qi = 0, side = 0;
    while (i < P.length) {
      let type = bag[bi % bag.length]; bi++;
      const rem = P.length - i;
      if (need[type] > rem) { type = rem >= 3 ? "TRIPLE" : rem >= 2 ? "DUO" : "FULL"; }
      const k = need[type];
      const grp = P.slice(i, i + k); i += k;
      const sl: Slide = { type, photos: grp, trans: pick(trans) };
      if (type === "SPLIT") {
        if (qi < Q.length) { sl.text = Q[qi++]; sl.side = side; side = side ? 0 : 1; }
        else { sl.type = "FULL"; sl.photos = [grp[0]]; }
      }
      slides.push(sl); cnt++;
      if (showText && cnt % 3 === 0 && i < P.length && qi < Q.length) slides.push({ type: "QUOTE", photos: [], text: Q[qi++], trans: pick(trans) });
    }
    slides.push({ type: "OUTRO", photos: [], trans: "fade" });
    return slides;
  }
  rebuild() {
    this.quotes = this.state.showText ? this.quotesNow() : [];
    this.plan = this.buildPlan();
    let total = 0;
    this.plan.forEach((sl) => { sl.t0 = total; sl.dur = this.slideDur(sl.type); total += sl.dur; });
    this.total = total;
    if (this.scrubber) this.scrubber.max = String(total || 100);
    if (this.time > total) this.time = Math.max(0, total - 0.01);
    if (this.state.total !== total || this.state.slideCount !== this.plan.length) this.setState({ total, slideCount: this.plan.length });
    this.drawAt(this.time);
  }

  roundRect(x: number, y: number, w: number, h: number, r: number) { const c = this.ctx!; r = Math.min(r, w / 2, h / 2); c.beginPath(); c.moveTo(x + r, y); c.arcTo(x + w, y, x + w, y + h, r); c.arcTo(x + w, y + h, x, y + h, r); c.arcTo(x, y + h, x, y, r); c.arcTo(x, y, x + w, y, r); c.closePath(); }
  text(str: string, x: number, y: number, size: number, color: string, family: string, weight: number, align: CanvasTextAlign, italic: boolean, letter: number, alpha: number) {
    const c = this.ctx!; c.save();
    if (alpha != null) c.globalAlpha *= alpha;
    c.fillStyle = color; c.textAlign = align || "left"; c.textBaseline = "top";
    c.font = (italic ? "italic " : "") + weight + " " + size + 'px "' + family + '"';
    if ("letterSpacing" in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = (letter || 0) + "px";
    c.fillText(str, x, y);
    if ("letterSpacing" in c) (c as CanvasRenderingContext2D & { letterSpacing: string }).letterSpacing = "0px";
    c.restore();
  }
  fitSize(str: string, family: string, weight: number, maxW: number, cap: number, italic: boolean) { const c = this.ctx!; c.font = (italic ? "italic " : "") + weight + ' 100px "' + family + '"'; const w = c.measureText(str).width || 1; return Math.min(cap, 100 * maxW / w); }
  wrap(str: string, size: number, family: string, italic: boolean, maxW: number) {
    const c = this.ctx!; c.font = (italic ? "italic " : "") + "500 " + size + 'px "' + family + '"';
    const words = (str || "").split(/\s+/), lines: string[] = []; let cur = "";
    for (const w of words) { const t = cur ? cur + " " + w : w; if (c.measureText(t).width > maxW && cur) { lines.push(cur); cur = w; } else cur = t; }
    if (cur) lines.push(cur);
    return lines.length ? lines : [""];
  }
  drawPhotoCell(x: number, y: number, w: number, h: number, r: number, p: number, seed: number, photo?: Photo) {
    const c = this.ctx!; const img = photo ? this.imgs.get(photo.id) : null;
    c.save(); this.roundRect(x, y, w, h, r); c.clip();
    if (img && img.complete && img.naturalWidth) {
      const z = 1.05 + (this.getTheme().kb || 0.09) * p;
      const s = Math.max(w / img.naturalWidth, h / img.naturalHeight) * z;
      const iw = img.naturalWidth * s, ih = img.naturalHeight * s;
      const sx = (iw - w) / 2, sy = (ih - h) / 2;
      const dx = ((seed % 2) ? 1 : -1) * sx * 0.35 * (2 * p - 1);
      const dy = (((seed >> 1) & 1) ? 1 : -1) * sy * 0.35 * (2 * p - 1);
      c.drawImage(img, x + (w - iw) / 2 + dx, y + (h - ih) / 2 + dy, iw, ih);
    } else { c.fillStyle = "#d8d2c8"; c.fillRect(x, y, w, h); }
    c.restore();
  }
  drawEmpty() {
    const c = this.ctx!, th = this.getTheme(), W = 1920, H = 1080;
    c.fillStyle = th.ink; c.globalAlpha = 0.9;
    this.text("Tải ảnh lên để bắt đầu", W / 2, H / 2 - 40, 56, th.ink, th.title, 600, "center", th.titleItalic, 0, 1);
    this.text("Kéo thả ảnh cưới của bạn ở bảng bên trái", W / 2, H / 2 + 40, 26, th.sub, th.body, 500, "center", false, 0, 0.9);
    c.globalAlpha = 1;
  }
  renderSlide(slide: Slide, p: number, opts: { alpha?: number; clipW?: number; dx?: number; dy?: number; scale?: number }) {
    const c = this.ctx!, W = 1920, H = 1080, th = this.getTheme();
    c.save();
    c.globalAlpha = opts.alpha == null ? 1 : opts.alpha;
    if (opts.clipW != null) { c.beginPath(); c.rect(0, 0, opts.clipW, H); c.clip(); }
    if (opts.dx || opts.dy) c.translate(opts.dx || 0, opts.dy || 0);
    if (opts.scale && opts.scale !== 1) { c.translate(W / 2, H / 2); c.scale(opts.scale, opts.scale); c.translate(-W / 2, -H / 2); }
    c.fillStyle = th.bg; c.fillRect(0, 0, W, H);
    switch (slide.type) {
      case "TITLE": this.drawTitle(slide, p); break;
      case "OUTRO": this.drawOutro(slide, p); break;
      case "QUOTE": this.drawQuote(slide, p); break;
      case "FULL": this.drawPhotoCell(0, 0, W, H, 0, p, 3, slide.photos[0]); break;
      case "FRAME": this.drawFrame(slide, p); break;
      case "SPLIT": this.drawSplit(slide, p); break;
      case "DUO": this.drawDuo(slide, p); break;
      case "TRIPLE": this.drawTriple(slide, p); break;
      case "QUAD": this.drawQuad(slide, p); break;
    }
    c.restore();
  }
  drawTitle(slide: Slide, p: number) {
    const c = this.ctx!, th = this.getTheme(), W = 1920, H = 1080;
    const hero = slide.photos[0];
    if (hero) this.drawPhotoCell(0, 0, W, H, 0, p, 7, hero);
    else { c.fillStyle = th.accent; c.globalAlpha = 0.18; c.fillRect(0, 0, W, H); c.globalAlpha = 1; }
    const g = c.createLinearGradient(0, 0, 0, H); g.addColorStop(0, "rgba(0,0,0,0.18)"); g.addColorStop(0.5, "rgba(0,0,0,0.06)"); g.addColorStop(1, "rgba(0,0,0,0.66)");
    c.fillStyle = g; c.fillRect(0, 0, W, H);
    const a = this.smooth(p, 0, 0.22); const rise = (1 - a) * 22;
    c.save(); c.globalAlpha *= a;
    const cx = W / 2; let y = H * 0.585 - rise;
    const eb = (this.state.eyebrow || "LỄ THÀNH HÔN").toUpperCase();
    this.text(eb, cx, y, 26, "#ffffff", th.body, 600, "center", false, 6, 0.9); y += 52;
    c.strokeStyle = "rgba(255,255,255,0.75)"; c.lineWidth = 1.5; c.beginPath(); c.moveTo(cx - 40, y); c.lineTo(cx + 40, y); c.stroke(); y += 38;
    const nm = this.coupleName(); const ns = this.fitSize(nm, th.title, 600, W * 0.82, 120, th.titleItalic);
    this.text(nm, cx, y, ns, "#ffffff", th.title, 600, "center", th.titleItalic, 0, 1); y += ns * 1.02 + 30;
    if (this.state.date) this.text(this.state.date, cx, y, 30, "rgba(255,255,255,0.92)", th.body, 500, "center", false, 4, 1);
    c.restore();
  }
  drawOutro(_slide: Slide, p: number) {
    const c = this.ctx!, th = this.getTheme(), W = 1920, H = 1080;
    const a = this.smooth(p, 0, 0.22); const rise = (1 - a) * 20;
    c.save(); c.globalAlpha *= a;
    const cx = W / 2; let y = H * 0.32 - rise;
    this.text("TRÂN TRỌNG CẢM ƠN", cx, y, 24, th.accent, th.body, 600, "center", false, 6, 1); y += 54;
    const big = "Cảm ơn"; const bs = this.fitSize(big, th.title, 600, W * 0.6, 132, th.titleItalic);
    this.text(big, cx, y, bs, th.ink, th.title, 600, "center", th.titleItalic, 0, 1); y += bs + 28;
    c.strokeStyle = th.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(cx - 34, y); c.lineTo(cx + 34, y); c.stroke(); y += 34;
    this.text(this.coupleName(), cx, y, 46, th.ink, th.title, 500, "center", th.titleItalic, 0, 1); y += 66;
    if (this.state.date) this.text(this.state.date, cx, y, 26, th.sub, th.body, 500, "center", false, 3, 1);
    c.restore();
  }
  drawQuote(slide: Slide, p: number) {
    const c = this.ctx!, th = this.getTheme(), W = 1920, H = 1080;
    const a = this.smooth(p, 0, 0.2); const rise = (1 - a) * 18;
    c.save(); c.globalAlpha *= a;
    const size = 58; const lines = this.wrap(slide.text || "", size, th.title, th.titleItalic, W * 0.66);
    const lh = size * 1.3; const blockH = lines.length * lh; let y = H / 2 - blockH / 2 - rise;
    c.strokeStyle = th.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(W / 2 - 34, y - 42); c.lineTo(W / 2 + 34, y - 42); c.stroke();
    for (const l of lines) { this.text(l, W / 2, y, size, th.ink, th.title, 500, "center", th.titleItalic, 0, 1); y += lh; }
    y += 18; this.text(this.coupleName().toUpperCase(), W / 2, y, 20, th.sub, th.body, 600, "center", false, 4, 1);
    c.restore();
  }
  drawFrame(slide: Slide, p: number) {
    const th = this.getTheme(), W = 1920, H = 1080;
    const mx = 180, my = 140, x = mx, y = my, w = W - 2 * mx, h = H - 2 * my;
    this.drawPhotoCell(x, y, w, h, th.radius, p, 5, slide.photos[0]);
    this.text(this.coupleName(), x, y - 52, 26, th.sub, th.body, 600, "left", false, 2, 1);
    if (this.state.date) this.text(this.state.date, x + w, y + h + 18, 22, th.sub, th.body, 500, "right", false, 3, 1);
  }
  drawSplit(slide: Slide, p: number) {
    const c = this.ctx!, th = this.getTheme(), W = 1920, H = 1080;
    const side = slide.side || 0; const pw = Math.round(W * 0.55);
    const px = side === 0 ? 0 : W - pw;
    this.drawPhotoCell(px, 0, pw, H, 0, p, 4, slide.photos[0]);
    const tx = side === 0 ? pw : 0; const tw = W - pw; const pad = 90; const cx = tx + pad;
    const a = this.smooth(p, 0, 0.2); c.save(); c.globalAlpha *= a;
    let y = H * 0.34;
    c.strokeStyle = th.accent; c.lineWidth = 2; c.beginPath(); c.moveTo(cx, y); c.lineTo(cx + 56, y); c.stroke(); y += 34;
    const size = 48; const lines = this.wrap(slide.text || "", size, th.title, th.titleItalic, tw - pad * 2); const lh = size * 1.3;
    for (const l of lines) { this.text(l, cx, y, size, th.ink, th.title, 500, "left", th.titleItalic, 0, 1); y += lh; }
    y += 26; this.text(this.coupleName().toUpperCase(), cx, y, 20, th.sub, th.body, 600, "left", false, 3, 1);
    c.restore();
  }
  drawDuo(slide: Slide, p: number) {
    const th = this.getTheme(), W = 1920, H = 1080, M = 70, g = 26;
    const w = (W - 2 * M - g) / 2, h = H - 2 * M;
    this.drawPhotoCell(M, M, w, h, th.radius, p, 2, slide.photos[0]);
    this.drawPhotoCell(M + w + g, M, w, h, th.radius, p, 5, slide.photos[1]);
  }
  drawTriple(slide: Slide, p: number) {
    const th = this.getTheme(), W = 1920, H = 1080, M = 70, g = 26;
    const bigW = Math.round((W - 2 * M - g) * 0.6), rightW = (W - 2 * M - g) - bigW, h = H - 2 * M, sh = (h - g) / 2;
    this.drawPhotoCell(M, M, bigW, h, th.radius, p, 2, slide.photos[0]);
    this.drawPhotoCell(M + bigW + g, M, rightW, sh, th.radius, p, 4, slide.photos[1]);
    this.drawPhotoCell(M + bigW + g, M + sh + g, rightW, sh, th.radius, p, 6, slide.photos[2]);
  }
  drawQuad(slide: Slide, p: number) {
    const th = this.getTheme(), W = 1920, H = 1080, M = 70, g = 26;
    const w = (W - 2 * M - g) / 2, h = (H - 2 * M - g) / 2;
    const cells = [[0, 0], [1, 0], [0, 1], [1, 1]];
    cells.forEach((cc, ix) => this.drawPhotoCell(M + cc[0] * (w + g), M + cc[1] * (h + g), w, h, th.radius, p, ix + 2, slide.photos[ix]));
  }
  drawAt(t: number) {
    const c = this.ctx; if (!c) return;
    const th = this.getTheme(), W = 1920, H = 1080;
    c.setTransform(1, 0, 0, 1, 0, 0); c.globalAlpha = 1;
    c.clearRect(0, 0, W, H); c.fillStyle = th.bg; c.fillRect(0, 0, W, H);
    if (!this.plan.length || !this.state.photos.length) { this.drawEmpty(); return; }
    const total = this.total; const tt = Math.max(0, Math.min(t, total - 0.001));
    let i = this.plan.findIndex((s) => tt >= (s.t0 || 0) && tt < (s.t0 || 0) + (s.dur || 0)); if (i < 0) i = this.plan.length - 1;
    const cur = this.plan[i], localT = tt - (cur.t0 || 0), d = cur.dur || 0, p = d > 0 ? localT / d : 0;
    const TR = Math.min(th.tr || 0.7, d * 0.5);
    if (i > 0 && localT < TR) {
      const prev = this.plan[i - 1];
      const e = this.easeIO(localT / TR);
      switch (cur.trans) {
        case "zoomsoft": this.renderSlide(prev, 1, { scale: 1 + 0.05 * e }); this.renderSlide(cur, p, { alpha: e, scale: 1.06 - 0.06 * e }); break;
        case "zoom": this.renderSlide(prev, 1, { scale: 1 + 0.10 * e }); this.renderSlide(cur, p, { alpha: this.smooth(e, 0, 0.55), scale: 1.15 - 0.15 * e }); break;
        case "slide": this.renderSlide(prev, 1, {}); this.renderSlide(cur, p, { dx: (1 - e) * W }); break;
        case "slideup": case "slideU": this.renderSlide(prev, 1, {}); this.renderSlide(cur, p, { dy: (1 - e) * H }); break;
        case "push": this.renderSlide(prev, 1, { dx: -e * W }); this.renderSlide(cur, p, { dx: (1 - e) * W }); break;
        case "pushup": this.renderSlide(prev, 1, { dy: -e * H }); this.renderSlide(cur, p, { dy: (1 - e) * H }); break;
        case "wipe": this.renderSlide(prev, 1, {}); this.renderSlide(cur, p, { clipW: e * W, scale: 1.05 - 0.05 * e }); break;
        case "block": this.renderSlide(prev, 1, {}); this.renderSlide(cur, p, { clipW: e * W }); c.save(); c.fillStyle = th.accent; c.globalAlpha = 0.92; c.fillRect(e * W - 10, 0, 10, H); c.restore(); break;
        default: this.renderSlide(prev, 1, {}); this.renderSlide(cur, p, { alpha: e });
      }
    } else { this.renderSlide(cur, p, {}); }
    if (th.letterbox) { c.fillStyle = "#0b0b0d"; c.fillRect(0, 0, W, 64); c.fillRect(0, H - 64, W, 64); }
    if (th.dark) { const gg = c.createRadialGradient(W / 2, H / 2, H * 0.42, W / 2, H / 2, H * 0.95); gg.addColorStop(0, "rgba(0,0,0,0)"); gg.addColorStop(1, "rgba(0,0,0,0.34)"); c.fillStyle = gg; c.fillRect(0, 0, W, H); }
  }

  updateScrub() { if (this.scrubber) this.scrubber.value = String(this.time); if (this.timeLabel) this.timeLabel.textContent = this.fmt(this.time); }
  playTick = (ts: number) => {
    if (this._last == null) this._last = ts;
    const dt = (ts - this._last) / 1000; this._last = ts;
    this.time += dt;
    if (this.time >= this.total) this.time = this.time % (this.total || 1);
    this.drawAt(this.time); this.updateScrub();
    this._raf = requestAnimationFrame(this.playTick);
  };
  togglePlay() {
    if (!this.state.photos.length) return;
    if (this.state.playing) { this.pausePreview(); return; }
    this.setState({ playing: true });
    this.playMusic(this.time);
    this._last = null; this._raf = requestAnimationFrame(this.playTick);
  }
  pausePreview() { this.setState({ playing: false }); if (this._raf) { cancelAnimationFrame(this._raf); this._raf = null; } this._last = null; this.pauseMusic(); }
  onScrub(v: number) { this.time = v; this.drawAt(v); if (this.timeLabel) this.timeLabel.textContent = this.fmt(v); if (this.state.music === "upload" && this.audioEl) { try { this.audioEl.currentTime = this.audioEl.duration ? v % this.audioEl.duration : v; } catch { /* */ } } }

  ensureAudio() {
    if (this.actx) return;
    const AC = window.AudioContext || (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext; if (!AC) return;
    this.actx = new AC();
    this.master = this.actx.createGain(); this.master.gain.value = 0.8; this.master.connect(this.actx.destination);
    this.recDest = this.actx.createMediaStreamDestination(); this.master.connect(this.recDest);
  }
  playMusic(from: number) {
    const m = this.state.music; if (m === "none") return;
    this.ensureAudio(); if (!this.actx) return;
    if (this.actx.resume) this.actx.resume();
    this.stopMusicNodes();
    if (m === "upload") {
      if (!this.audioEl) return;
      if (!this.mediaSrc) { try { this.mediaSrc = this.actx.createMediaElementSource(this.audioEl); this.mediaSrc.connect(this.master!); } catch { /* */ } }
      try { this.audioEl.currentTime = this.audioEl.duration ? (from || 0) % this.audioEl.duration : (from || 0); } catch { /* */ }
      this.audioEl.loop = true; this.audioEl.play().catch(() => {});
    } else { this.startProc(m); }
  }
  pauseMusic() { if (this.state.music === "upload" && this.audioEl) { try { this.audioEl.pause(); } catch { /* */ } } this.stopMusicNodes(); }
  stopMusicNodes() {
    if (this._proc) { clearInterval(this._proc); this._proc = null; }
    if (this._procNodes) { this._procNodes.forEach((n) => { try { n.stop(); } catch { /* */ } try { n.disconnect(); } catch { /* */ } }); this._procNodes = []; }
  }
  _note(freq: number, at: number, dur: number, vol: number) {
    const ctx = this.actx!;
    const o = ctx.createOscillator(); o.type = "sine"; o.frequency.value = freq;
    const o2 = ctx.createOscillator(); o2.type = "triangle"; o2.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(0.0001, at); g.gain.linearRampToValueAtTime(vol, at + 0.03); g.gain.exponentialRampToValueAtTime(0.0001, at + dur);
    o.connect(g); o2.connect(g); g.connect(this.master!);
    o.start(at); o2.start(at); o.stop(at + dur + 0.1); o2.stop(at + dur + 0.1);
  }
  startProc(kind: string) {
    const ctx = this.actx!; this._procNodes = [];
    if (kind === "strings") {
      [130.81, 196.0].forEach((f) => {
        const o = ctx.createOscillator(); o.type = "sawtooth"; o.frequency.value = f;
        const lp = ctx.createBiquadFilter(); lp.type = "lowpass"; lp.frequency.value = 680;
        const g = ctx.createGain(); g.gain.value = 0.028;
        o.connect(lp); lp.connect(g); g.connect(this.master!); o.start(); this._procNodes.push(o);
      });
    }
    const scale = [261.63, 293.66, 329.63, 392.0, 440.0, 523.25, 587.33, 659.25];
    const step = () => {
      const now = ctx.currentTime;
      const f = scale[Math.floor(Math.random() * scale.length)];
      this._note(f, now, kind === "strings" ? 2.6 : 1.9, kind === "strings" ? 0.05 : 0.09);
      if (Math.random() < 0.35) this._note(scale[Math.floor(Math.random() * scale.length)], now + 0.14, 1.6, 0.045);
    };
    step();
    this._proc = setInterval(step, kind === "strings" ? 1500 : 960);
  }

  async exportVideo() {
    if (this.state.exporting) return;
    if (!this.state.photos.length) { this.setState({ exportError: "Hãy tải ảnh lên trước khi xuất video." }); setTimeout(() => this.setState({ exportError: "" }), 4000); return; }
    this.pausePreview();
    this._cancelExport = false;
    this.setState({ exporting: true, exportPct: 0, exportError: "" });
    await new Promise((r) => setTimeout(r, 60));
    try {
      const canvas = this.canvas!, fps = 30;
      const vs = (canvas as HTMLCanvasElement & { captureStream: (f: number) => MediaStream }).captureStream(fps);
      const tracks: MediaStreamTrack[] = [...vs.getVideoTracks()];
      if (this.state.music !== "none") {
        this.ensureAudio();
        if (this.actx) { if (this.actx.resume) await this.actx.resume(); this.playMusic(0); if (this.recDest) tracks.push(...this.recDest.stream.getAudioTracks()); }
      }
      const stream = new MediaStream(tracks);
      const mimes = ["video/mp4;codecs=h264,aac", "video/mp4", "video/webm;codecs=vp9,opus", "video/webm;codecs=vp8,opus", "video/webm"];
      const mime = mimes.find((t) => window.MediaRecorder && MediaRecorder.isTypeSupported(t)) || "";
      const rec = new MediaRecorder(stream, mime ? { mimeType: mime, videoBitsPerSecond: 12000000, audioBitsPerSecond: 192000 } : {});
      const chunks: BlobPart[] = []; rec.ondataavailable = (e) => { if (e.data && e.data.size) chunks.push(e.data); };
      const stopped = new Promise<void>((res) => { rec.onstop = () => res(); });
      rec.start(120);
      const total = this.total, t0 = performance.now();
      await new Promise<void>((resolve) => {
        const tick = () => {
          const el = (performance.now() - t0) / 1000;
          this.time = Math.min(el, total); this.drawAt(this.time);
          const pct = Math.max(1, Math.min(99, Math.round(el / total * 100)));
          if (pct !== this.state.exportPct) this.setState({ exportPct: pct });
          if (this._cancelExport || el >= total) { resolve(); return; }
          this._expRaf = requestAnimationFrame(tick);
        };
        this._expRaf = requestAnimationFrame(tick);
      });
      if (this._expRaf) { cancelAnimationFrame(this._expRaf); this._expRaf = null; }
      try { rec.stop(); } catch { /* */ }
      this.pauseMusic();
      await stopped;
      if (!this._cancelExport && chunks.length) {
        const ext = mime.indexOf("mp4") >= 0 ? "mp4" : "webm";
        const blob = new Blob(chunks, { type: mime || "video/webm" });
        const url = URL.createObjectURL(blob);
        const nm = ((this.state.groom || "") + "-" + (this.state.bride || "")).replace(/\s+/g, "").replace(/[^\w-]/g, "") || "wedding";
        const a = document.createElement("a"); a.href = url; a.download = "mstudo-" + nm + "." + ext; document.body.appendChild(a); a.click(); a.remove();
        setTimeout(() => URL.revokeObjectURL(url), 6000);
      }
    } catch (e) {
      this.setState({ exportError: "Không xuất được: " + ((e as Error)?.message || e) });
      setTimeout(() => this.setState({ exportError: "" }), 5000);
    }
    this._cancelExport = false;
    this.setState({ exporting: false, exportPct: 0 });
    this.time = 0; this.drawAt(0); this.updateScrub();
  }
  destroy() {
    if (this._raf) cancelAnimationFrame(this._raf);
    if (this._expRaf) cancelAnimationFrame(this._expRaf);
    this.stopMusicNodes();
    try { this.state.photos.forEach((p) => URL.revokeObjectURL(p.url)); } catch { /* */ }
    try { if (this.actx) this.actx.close(); } catch { /* */ }
  }
}

// Load the display fonts the canvas uses (Playfair Display + Be Vietnam Pro;
// Cormorant/Manrope already ship with the app) once per page.
function ensureFonts() {
  if (document.getElementById("slide-fonts")) return;
  const l = document.createElement("link");
  l.id = "slide-fonts"; l.rel = "stylesheet";
  l.href = "https://fonts.googleapis.com/css2?family=Playfair+Display:ital,wght@0,500;0,600;1,600&family=Be+Vietnam+Pro:wght@500;600;700&display=swap";
  document.head.appendChild(l);
}

export default function SlideStudio() {
  const engRef = useRef<SlideEngine | null>(null);
  const [, force] = useState(0);
  if (!engRef.current) { engRef.current = new SlideEngine(); engRef.current.onChange = () => force((n) => n + 1); }
  const eng = engRef.current;
  const S = eng.state;

  useEffect(() => {
    ensureFonts();
    const fams = ["Playfair Display", "Cormorant Garamond", "Be Vietnam Pro", "Manrope"];
    if (document.fonts?.load) {
      Promise.all(fams.flatMap((f) => [document.fonts.load(`600 40px "${f}"`), document.fonts.load(`italic 600 40px "${f}"`)])).then(() => eng.rebuild()).catch(() => {});
    }
    eng.rebuild();
    return () => eng.destroy();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const green = "#1f9d63";
  const TABS = [["photos", "1", "Ảnh"], ["info", "2", "Thông tin"], ["story", "3", "Câu chuyện"], ["music", "4", "Nhạc"], ["style", "5", "Phong cách"]] as const;
  const MUSIC = [["none", "Không nhạc", "Chỉ hình ảnh, không âm thanh"], ["piano", "Piano nhẹ", "Nhẹ nhàng, du dương (mẫu)"], ["strings", "Dây đàn ấm", "Sâu lắng, tình cảm (mẫu)"], ["upload", "Nhạc của bạn", "Dùng file bạn đã tải lên"]] as const;
  const qn = eng.quotesNow().length;
  const inp: React.CSSProperties = { width: "100%", height: 42, padding: "0 14px", border: "1px solid #e2dccf", borderRadius: 10, fontSize: 14, background: "#faf8f3", color: "#26241f" };
  const lbl: React.CSSProperties = { fontSize: 12.5, fontWeight: 700, marginBottom: 6, color: "#6a6459" };

  return (
    <div style={{ height: "calc(100vh - 120px)", minHeight: 560, display: "flex", flexDirection: "column", background: "#e9e5dd", color: "#26241f", borderRadius: 16, overflow: "hidden", border: "1px solid var(--border)" }}>
      {/* Header */}
      <header style={{ height: 60, flex: "none", display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 20px", background: "#fffdf9", borderBottom: "1px solid #e7e2d9" }}>
        <div>
          <div style={{ fontWeight: 800, fontSize: 15 }}>Video slide ảnh cưới</div>
          <div style={{ fontSize: 12, color: "#8a8378" }}>Tự động tạo từ ảnh của bạn · mstudo</div>
        </div>
        <button onClick={() => eng.exportVideo()} style={{ height: 40, padding: "0 20px", border: "none", borderRadius: 10, background: green, color: "#fff", fontWeight: 700, fontSize: 14, cursor: "pointer", boxShadow: "0 6px 18px rgba(31,157,99,.3)" }}>↓ Xuất video</button>
      </header>

      <div style={{ flex: 1, display: "flex", minHeight: 0 }}>
        {/* Controls */}
        <aside style={{ width: 400, flex: "none", background: "#fffdf9", borderRight: "1px solid #e7e2d9", display: "flex", flexDirection: "column", minHeight: 0 }}>
          <div style={{ flex: "none", display: "flex", gap: 2, padding: "10px 10px 0", borderBottom: "1px solid #efe9df" }}>
            {TABS.map(([id, num, label]) => (
              <button key={id} onClick={() => eng.go(id)} style={{ flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 5, padding: "10px 2px 12px", border: "none", borderBottom: S.tab === id ? `2px solid ${green}` : "2px solid transparent", background: "transparent", cursor: "pointer", color: S.tab === id ? green : "#9a9488", fontSize: 11, fontWeight: 700 }}>
                <span style={{ width: 22, height: 22, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 12, fontWeight: 800, background: S.tab === id ? green : "#ece7de", color: S.tab === id ? "#fff" : "#9a9488" }}>{num}</span>
                <span>{label}</span>
              </button>
            ))}
          </div>
          <div style={{ flex: 1, overflowY: "auto", padding: 20 }}>
            {S.tab === "photos" && (
              <div>
                <label onDrop={(e) => { e.preventDefault(); if (e.dataTransfer?.files) eng.addFiles(e.dataTransfer.files); }} onDragOver={(e) => e.preventDefault()} style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: 8, padding: "30px 20px", border: "2px dashed #d8d0c3", borderRadius: 14, cursor: "pointer", textAlign: "center", background: "#faf8f3" }}>
                  <div style={{ fontWeight: 700, fontSize: 14 }}>Kéo thả ảnh vào đây</div>
                  <div style={{ fontSize: 12.5, color: "#8a8378" }}>hoặc bấm để chọn nhiều ảnh · JPG, PNG</div>
                  <input type="file" accept="image/*" multiple onChange={(e) => { eng.addFiles(e.target.files); e.target.value = ""; }} style={{ display: "none" }} />
                </label>
                <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", margin: "18px 0 10px" }}>
                  <span style={{ fontSize: 12.5, fontWeight: 700, color: "#6a6459" }}>{S.photos.length ? `${S.photos.length} ảnh` : "Chưa có ảnh"}</span>
                  <span style={{ fontSize: 12, color: "#a49d90" }}>Kéo để sắp xếp lại</span>
                </div>
                <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 8 }}>
                  {S.photos.map((ph, i) => (
                    <div key={ph.id} draggable onDragStart={() => { eng._drag = ph.id; }} onDragOver={(e) => e.preventDefault()} onDrop={() => eng.reorderPhotos(eng._drag, ph.id)} style={{ position: "relative", aspectRatio: "1", borderRadius: 10, overflow: "hidden", background: "#eae5dc", cursor: "grab" }}>
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={ph.url} alt="" style={{ width: "100%", height: "100%", objectFit: "cover", display: "block", pointerEvents: "none" }} />
                      <span style={{ position: "absolute", left: 5, top: 5, minWidth: 18, height: 18, padding: "0 4px", borderRadius: 6, background: "rgba(20,18,15,.72)", color: "#fff", fontSize: 11, fontWeight: 700, display: "flex", alignItems: "center", justifyContent: "center" }}>{i + 1}</span>
                      <button onClick={() => eng.removePhoto(ph.id)} style={{ position: "absolute", right: 5, top: 5, width: 20, height: 20, border: "none", borderRadius: 6, background: "rgba(20,18,15,.72)", color: "#fff", fontSize: 13, lineHeight: 1, cursor: "pointer", padding: 0 }}>×</button>
                    </div>
                  ))}
                </div>
              </div>
            )}
            {S.tab === "info" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div><div style={lbl}>Tên chú rể</div><input onChange={(e) => eng.setField("groom", e.target.value)} defaultValue={S.groom} placeholder="VD: Hoàng Phú" style={inp} /></div>
                <div><div style={lbl}>Tên cô dâu</div><input onChange={(e) => eng.setField("bride", e.target.value)} defaultValue={S.bride} placeholder="VD: Bảo Hân" style={inp} /></div>
                <div><div style={lbl}>Ngày cưới</div><input onChange={(e) => eng.setField("date", e.target.value)} defaultValue={S.date} placeholder="VD: 20 · 12 · 2025" style={inp} /></div>
                <div><div style={lbl}>Câu mở đầu (không bắt buộc)</div><input onChange={(e) => eng.setField("eyebrow", e.target.value)} defaultValue={S.eyebrow} placeholder="VD: LỄ THÀNH HÔN" style={inp} /></div>
              </div>
            )}
            {S.tab === "story" && (
              <div>
                <div style={lbl}>Lời nhắn · câu chuyện · cảm nghĩ</div>
                <textarea onChange={(e) => eng.setField("story", e.target.value)} defaultValue={S.story} placeholder={"Viết những dòng cảm xúc của bạn...\n\nMỗi đoạn cách nhau một dòng trống sẽ thành một slide chữ riêng."} style={{ ...inp, height: 300, padding: 14, lineHeight: 1.6, resize: "vertical" }} />
                <div style={{ fontSize: 12, color: "#a49d90", marginTop: 8 }}>{S.showText ? (qn ? `${qn} slide chữ sẽ được tạo từ câu chuyện` : "Chưa có nội dung — cách đoạn bằng một dòng trống") : "Đang tắt slide chữ (bật lại ở tab Phong cách)"}</div>
              </div>
            )}
            {S.tab === "music" && (
              <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
                {MUSIC.map(([id, label, desc]) => (
                  <button key={id} onClick={() => eng.selectMusic(id)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: S.music === id ? `1.5px solid ${green}` : "1px solid #e2dccf", borderRadius: 10, background: S.music === id ? "#f0f8f3" : "#faf8f3", cursor: "pointer" }}>
                    <div style={{ textAlign: "left" }}><div style={{ fontWeight: 700, fontSize: 14 }}>{label}</div><div style={{ fontSize: 12, color: "#8a8378", marginTop: 1 }}>{desc}</div></div>
                    <span style={{ width: 16, height: 16, borderRadius: "50%", border: S.music === id ? `5px solid ${green}` : "2px solid #cfc8bb", background: "#fff", flex: "none" }} />
                  </button>
                ))}
                <label style={{ marginTop: 4, display: "flex", alignItems: "center", gap: 10, padding: "12px 14px", border: "1px dashed #d8d0c3", borderRadius: 10, cursor: "pointer", background: "#faf8f3" }}>
                  <span style={{ fontSize: 13, fontWeight: 600, color: "#6a6459" }}>{S.audioName ? `Đã chọn: ${S.audioName}` : "Tải file nhạc của bạn lên"}</span>
                  <input type="file" accept="audio/*" onChange={(e) => { eng.setAudioFile(e.target.files?.[0]); e.target.value = ""; }} style={{ display: "none" }} />
                </label>
                <div style={{ fontSize: 12, color: "#a49d90", marginTop: 2 }}>Nhạc sẽ được ghép vào file video khi xuất.</div>
              </div>
            )}
            {S.tab === "style" && (
              <div>
                <div style={{ ...lbl, marginBottom: 10 }}>Phong cách</div>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {Object.entries(THEMES).map(([id, t]) => (
                    <button key={id} onClick={() => eng.selectTheme(id)} style={{ padding: 8, border: S.theme === id ? `2px solid ${green}` : "1px solid #e2dccf", borderRadius: 12, background: S.theme === id ? "#f0f8f3" : "#fff", cursor: "pointer" }}>
                      <div style={{ height: 54, borderRadius: 8, background: `linear-gradient(120deg, ${t.c1} 62%, ${t.c2} 62%)`, display: "flex", alignItems: "center", justifyContent: "center" }}>
                        <span style={{ fontFamily: `"${t.title}"`, fontStyle: t.titleItalic ? "italic" : "normal", fontSize: 26, fontWeight: 600, color: t.ink }}>Aa</span>
                      </div>
                      <div style={{ fontSize: 12.5, fontWeight: 700, marginTop: 8, textAlign: "left" }}>{t.name}</div>
                    </button>
                  ))}
                </div>
                <div style={{ marginTop: 22 }}>
                  <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, fontWeight: 700, color: "#6a6459", marginBottom: 10 }}><span>Thời lượng mỗi ảnh</span><span style={{ color: green }}>{S.perPhoto.toFixed(1)} giây</span></div>
                  <input type="range" min={2} max={6} step={0.2} defaultValue={S.perPhoto} onChange={(e) => eng.setField("perPhoto", parseFloat(e.target.value))} style={{ width: "100%", accentColor: green }} />
                </div>
                <div style={{ marginTop: 22, display: "flex", flexDirection: "column", gap: 10 }}>
                  {([["diverse", "Hiệu ứng chuyển cảnh đa dạng"], ["showText", "Chèn slide chữ / câu chuyện"]] as const).map(([k, label]) => {
                    const on = S[k] as boolean;
                    return (
                      <button key={k} onClick={() => eng.setField(k, !on as never)} style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "12px 14px", border: "1px solid #e2dccf", borderRadius: 10, background: "#faf8f3", cursor: "pointer", width: "100%" }}>
                        <span style={{ fontSize: 13.5, fontWeight: 600 }}>{label}</span>
                        <span style={{ width: 40, height: 23, borderRadius: 999, background: on ? green : "#d5cfc4", flex: "none", position: "relative", transition: "background .15s" }}><span style={{ position: "absolute", top: 2, left: on ? 19 : 2, width: 19, height: 19, borderRadius: "50%", background: "#fff", boxShadow: "0 1px 3px rgba(0,0,0,.25)", transition: "left .15s" }} /></span>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}
          </div>
        </aside>

        {/* Preview */}
        <main style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", background: "#1a1a1e" }}>
          <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, minHeight: 0 }}>
            <div style={{ width: "100%", maxWidth: 1120, aspectRatio: "16 / 9", background: "#000", borderRadius: 12, overflow: "hidden", boxShadow: "0 30px 80px rgba(0,0,0,.5)", position: "relative" }}>
              <canvas width={1920} height={1080} ref={(el) => { if (el && el !== eng.canvas) { eng.canvas = el; eng.ctx = el.getContext("2d"); eng.rebuild(); } }} style={{ width: "100%", height: "100%", display: "block" }} />
              <div style={{ position: "absolute", left: 14, top: 12, display: "flex", gap: 8, alignItems: "center", pointerEvents: "none" }}>
                <span style={{ fontSize: 11, fontWeight: 700, color: "#fff", background: "rgba(0,0,0,.42)", padding: "4px 10px", borderRadius: 999 }}>Xem trước · 16:9</span>
                <span style={{ fontSize: 11, fontWeight: 600, color: "#fff", background: "rgba(0,0,0,.42)", padding: "4px 10px", borderRadius: 999 }}>{S.slideCount} cảnh</span>
              </div>
            </div>
          </div>
          <div style={{ flex: "none", display: "flex", alignItems: "center", gap: 14, padding: "14px 24px 20px" }}>
            <button onClick={() => eng.togglePlay()} style={{ width: 44, height: 44, flex: "none", border: "none", borderRadius: "50%", background: green, color: "#fff", cursor: "pointer", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: "0 6px 18px rgba(31,157,99,.35)" }}>{S.playing ? "❚❚" : "▶"}</button>
            <span ref={(el) => { eng.timeLabel = el; }} style={{ fontSize: 12.5, color: "#cfcbc4", fontVariantNumeric: "tabular-nums", minWidth: 36 }}>0:00</span>
            <input type="range" min={0} max={100} step={0.05} defaultValue={0} ref={(el) => { eng.scrubber = el; if (el) el.max = String(eng.total || 100); }} onChange={(e) => eng.onScrub(parseFloat(e.target.value) || 0)} style={{ flex: 1, accentColor: green }} />
            <span style={{ fontSize: 12.5, color: "#8f8b84", fontVariantNumeric: "tabular-nums", minWidth: 36 }}>{eng.fmt(S.total)}</span>
            <button onClick={() => { eng.seed = (eng.seed || 1) + 1; eng.rebuild(); }} title="Tạo lại bố cục" style={{ height: 36, padding: "0 14px", border: "1px solid #3a3a40", borderRadius: 9, background: "transparent", color: "#e6e2da", fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>↻ Bố cục mới</button>
          </div>
        </main>
      </div>

      {/* Export overlay */}
      {S.exporting && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(15,15,18,.72)", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 50 }}>
          <div style={{ width: 380, background: "#fffdf9", borderRadius: 18, padding: 30, textAlign: "center", boxShadow: "0 30px 80px rgba(0,0,0,.4)" }}>
            <div style={{ fontWeight: 800, fontSize: 17, color: "#26241f" }}>Đang xuất video…</div>
            <div style={{ fontSize: 13, color: "#8a8378", marginTop: 6 }}>Giữ tab này mở cho tới khi hoàn tất. Video sẽ tự tải về.</div>
            <div style={{ height: 8, background: "#eee7db", borderRadius: 5, margin: "20px 0 8px", overflow: "hidden" }}><div style={{ width: `${S.exportPct}%`, height: "100%", background: green, borderRadius: 5, transition: "width .2s" }} /></div>
            <div style={{ fontSize: 13, fontWeight: 700, color: green }}>{S.exportPct}%</div>
            <button onClick={() => { eng._cancelExport = true; }} style={{ marginTop: 18, height: 38, padding: "0 18px", border: "1px solid #e2dccf", borderRadius: 9, background: "transparent", fontSize: 13, fontWeight: 600, color: "#6a6459", cursor: "pointer" }}>Hủy</button>
          </div>
        </div>
      )}
      {S.exportError && (
        <div onClick={() => eng.setState({ exportError: "" })} style={{ position: "fixed", left: "50%", bottom: 24, transform: "translateX(-50%)", background: "#cc4b4b", color: "#fff", padding: "12px 18px", borderRadius: 10, fontSize: 13, fontWeight: 600, zIndex: 60, cursor: "pointer", maxWidth: 520 }}>{S.exportError}</div>
      )}
    </div>
  );
}

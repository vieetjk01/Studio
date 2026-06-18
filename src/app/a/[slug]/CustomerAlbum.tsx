"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Heart,
  Check,
  Copy,
  Download,
  FileText,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  ListChecks,
  ZoomIn,
  ZoomOut,
} from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl, fullImageUrl, stripExtension } from "@/lib/drive";
import { buildZip, triggerDownload } from "@/lib/download";

interface PublicPhoto {
  id: string;
  drive_file_id: string;
  name: string;
  source_id: string | null;
  position: number;
}
interface PublicSource {
  id: string;
  name: string;
  position: number;
}
interface PublicAlbum {
  id: string;
  slug: string;
  title: string;
  description: string | null;
  selection_limit: number | null;
  watermark_enabled: boolean;
  watermark_text: string | null;
  hasPassword: boolean;
  allowZip: boolean;
  allowNotes: boolean;
}

// One shared selection per album (the share link belongs to one client), so it
// persists and is visible from any browser that opens the link.
const SHARED = "shared";

export default function CustomerAlbum({
  album,
  initialPhotos,
  initialSources,
  initialSelected,
  initialNotes,
}: {
  album: PublicAlbum;
  initialPhotos: PublicPhoto[] | null;
  initialSources: PublicSource[] | null;
  initialSelected?: string[];
  initialNotes?: Record<string, string>;
}) {
  const { t } = useLang();

  const [unlocked, setUnlocked] = useState(!album.hasPassword);
  const [photos, setPhotos] = useState<PublicPhoto[]>(initialPhotos ?? []);
  const [sources, setSources] = useState<PublicSource[]>(initialSources ?? []);

  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set(initialSelected ?? []));
  const [notes, setNotes] = useState<Record<string, string>>(initialNotes ?? {});
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [activeTab, setActiveTab] = useState<string>("all");

  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [zoom, setZoom] = useState(1);
  const [pan, setPan] = useState({ x: 0, y: 0 });
  const drag = useRef<{ x: number; y: number; px: number; py: number } | null>(null);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const [copied, setCopied] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const wm = album.watermark_enabled ? album.watermark_text || "Vieetjk" : null;

  // Refs hold the latest selection so the debounced save uses fresh data.
  const selectedRef = useRef(selected);
  const notesRef = useRef(notes);
  const saveTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  // Window during which polling must not overwrite the local selection
  // (covers the debounce + server-commit lag so taps never "revert").
  const dirtyUntil = useRef(0);

  const saveNow = useCallback(async () => {
    saveTimer.current = null;
    setSaveStatus("saving");
    const sel = [...selectedRef.current];
    const noteMap: Record<string, string> = {};
    for (const id of sel) if (notesRef.current[id]?.trim()) noteMap[id] = notesRef.current[id];
    try {
      const res = await fetch(`/api/a/${album.slug}/select`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ sessionId: SHARED, photoIds: sel, notes: noteMap }),
        keepalive: true,
      });
      if (!res.ok) {
        const d = await res.json().catch(() => ({}));
        setSaveStatus("idle");
        flashToast(`Chưa lưu được lựa chọn (${d.error ?? res.status})`);
        return;
      }
      dirtyUntil.current = Date.now() + 2500; // grace for read-after-write
      setSaveStatus("saved");
    } catch {
      setSaveStatus("idle");
      flashToast("Mất kết nối khi lưu lựa chọn");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [album.slug]);

  const scheduleSave = useCallback(() => {
    setSaveStatus("saving");
    dirtyUntil.current = Date.now() + 4000;
    if (saveTimer.current) clearTimeout(saveTimer.current);
    saveTimer.current = setTimeout(saveNow, 250);
  }, [saveNow]);

  // Flush a pending save immediately (e.g. before the page unloads).
  const flush = useCallback(() => {
    if (saveTimer.current) {
      clearTimeout(saveTimer.current);
      saveNow();
    }
  }, [saveNow]);

  // Keep the shared selection in sync with other people viewing the same link.
  const refresh = useCallback(async () => {
    if (saveTimer.current || Date.now() < dirtyUntil.current) return; // don't clobber a recent local change
    try {
      const res = await fetch(`/api/a/${album.slug}/select`, { cache: "no-store" });
      if (!res.ok) return;
      const data = await res.json();
      const sel = new Set<string>(data.selected ?? []);
      selectedRef.current = sel;
      notesRef.current = { ...notesRef.current, ...(data.notes ?? {}) };
      setSelected(sel);
      setNotes((prev) => ({ ...prev, ...(data.notes ?? {}) }));
    } catch {
      /* ignore */
    }
  }, [album.slug]);

  const limit = album.selection_limit;
  const atLimit = limit != null && selected.size >= limit;

  function toggle(id: string) {
    const next = new Set(selectedRef.current);
    if (next.has(id)) next.delete(id);
    else {
      if (limit != null && next.size >= limit) {
        flashToast(t("limitReached"));
        return;
      }
      next.add(id);
    }
    selectedRef.current = next;
    setSelected(next);
    scheduleSave();
  }

  function setNote(id: string, text: string) {
    const next = { ...notesRef.current, [id]: text };
    notesRef.current = next;
    setNotes(next);
    scheduleSave();
  }

  function flashToast(msg: string) {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2400);
  }

  async function unlock(e: React.FormEvent) {
    e.preventDefault();
    setPwLoading(true);
    setPwError(false);
    const res = await fetch(`/api/a/${album.slug}/access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    setPwLoading(false);
    if (!res.ok) {
      setPwError(true);
      return;
    }
    const data = await res.json();
    setPhotos(data.photos ?? []);
    setSources(data.sources ?? []);
    const sel = new Set<string>(data.selected ?? []);
    selectedRef.current = sel;
    notesRef.current = data.notes ?? {};
    setSelected(sel);
    setNotes(data.notes ?? {});
    setUnlocked(true);
  }

  const visiblePhotos = useMemo(() => {
    let base = activeTab === "all" ? photos : photos.filter((p) => p.source_id === activeTab);
    if (selectedOnly) base = base.filter((p) => selected.has(p.id));
    return base;
  }, [photos, activeTab, selectedOnly, selected]);
  const selectedPhotos = useMemo(() => photos.filter((p) => selected.has(p.id)), [photos, selected]);

  // Only sources that actually contain photos become tabs/sections (a parent
  // folder with only sub-folders has no direct photos and is skipped).
  const tabSources = useMemo(
    () => sources.filter((s) => photos.some((p) => p.source_id === s.id)),
    [sources, photos]
  );

  // Group visible photos into sections by Drive source (each link = a section),
  // keeping each photo's index within visiblePhotos for lightbox navigation.
  const sections = useMemo(() => {
    const indexed = visiblePhotos.map((p, idx) => ({ p, idx }));
    if (activeTab !== "all" || selectedOnly || tabSources.length <= 1) {
      return [{ id: "all", name: "", items: indexed }];
    }
    const byId = new Map<string, { p: PublicPhoto; idx: number }[]>();
    for (const it of indexed) {
      const sid = it.p.source_id ?? "none";
      if (!byId.has(sid)) byId.set(sid, []);
      byId.get(sid)!.push(it);
    }
    const ordered: { id: string; name: string; items: { p: PublicPhoto; idx: number }[] }[] = [];
    for (const s of sources) {
      if (byId.has(s.id)) {
        ordered.push({ id: s.id, name: s.name, items: byId.get(s.id)! });
        byId.delete(s.id);
      }
    }
    for (const [sid, items] of byId) ordered.push({ id: sid, name: sid === "none" ? "Khác" : "", items });
    return ordered;
  }, [visiblePhotos, sources, selectedOnly, activeTab, tabSources.length]);

  function copyList() {
    navigator.clipboard.writeText(selectedPhotos.map((p) => stripExtension(p.name)).join("\n"));
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
    flashToast(t("copied"));
  }
  function exportList() {
    const text = selectedPhotos
      .map((p) => {
        const note = notes[p.id]?.trim();
        return stripExtension(p.name) + (note ? ` — ${note}` : "");
      })
      .join("\n");
    triggerDownload(
      new Blob([text], { type: "text/plain;charset=utf-8" }),
      `${album.slug}-selection.txt`
    );
  }
  async function downloadZip() {
    if (selectedPhotos.length === 0) return;
    setZipProgress(0);
    const blob = await buildZip(
      selectedPhotos.map((p) => ({ fileId: p.drive_file_id, name: p.name })),
      { watermark: wm, onProgress: (d, tot) => setZipProgress(Math.round((d / tot) * 100)) }
    );
    triggerDownload(blob, `${album.slug}-photos.zip`);
    setZipProgress(null);
  }

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (lbIdx === null) return;
      if (e.key === "ArrowRight") setLbIdx((i) => (i === null ? i : Math.min(visiblePhotos.length - 1, i + 1)));
      else if (e.key === "ArrowLeft") setLbIdx((i) => (i === null ? i : Math.max(0, i - 1)));
      else if (e.key === "Escape") setLbIdx(null);
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lbIdx, visiblePhotos.length]);

  // Reset zoom whenever the lightbox opens or the photo changes.
  useEffect(() => {
    setZoom(1);
    setPan({ x: 0, y: 0 });
  }, [lbIdx]);

  function zoomBy(d: number) {
    setZoom((z) => {
      const n = Math.min(5, Math.max(1, +(z + d).toFixed(2)));
      if (n === 1) setPan({ x: 0, y: 0 });
      return n;
    });
  }
  function onWheelZoom(e: React.WheelEvent) {
    zoomBy(e.deltaY < 0 ? 0.3 : -0.3);
  }
  function onPanDown(e: React.PointerEvent) {
    if (zoom <= 1) return;
    drag.current = { x: e.clientX, y: e.clientY, px: pan.x, py: pan.y };
    (e.currentTarget as HTMLElement).setPointerCapture(e.pointerId);
  }
  function onPanMove(e: React.PointerEvent) {
    if (!drag.current) return;
    setPan({ x: drag.current.px + (e.clientX - drag.current.x), y: drag.current.py + (e.clientY - drag.current.y) });
  }
  function onPanUp() {
    drag.current = null;
  }

  // Load the current selection immediately on open (don't wait for SSR/poll),
  // keep it in sync, and flush any pending save before the page goes away.
  useEffect(() => {
    if (!unlocked) return;
    refresh(); // fresh load right away — avoids showing stale/empty picks
    const iv = setInterval(refresh, 5000);
    const onFocus = () => refresh();
    const onVisibility = () => {
      if (document.visibilityState === "hidden") flush();
      else refresh();
    };
    const onHide = () => flush();
    window.addEventListener("focus", onFocus);
    document.addEventListener("visibilitychange", onVisibility);
    window.addEventListener("pagehide", onHide);
    return () => {
      clearInterval(iv);
      window.removeEventListener("focus", onFocus);
      document.removeEventListener("visibilitychange", onVisibility);
      window.removeEventListener("pagehide", onHide);
    };
  }, [unlocked, refresh, flush]);

  // ── Password gate ──────────────────────────────────────────────
  if (!unlocked) {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Brand />
          <LanguageSwitcher />
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <form onSubmit={unlock} className="card w-full max-w-sm p-8 text-center animate-[vkPop_.4s_ease_both]">
            <Lock className="mx-auto mb-4" size={26} style={{ color: "var(--gold)" }} />
            <h1 className="font-serif text-2xl font-medium">{album.title}</h1>
            <p className="mb-6 mt-1 text-sm" style={{ color: "var(--text2)" }}>
              {t("enterPassword")}
            </p>
            <input
              type="password"
              autoFocus
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              className="input mb-4 text-center"
              placeholder="••••••"
            />
            {pwError && <p className="mb-4 text-sm text-red-400">{t("wrongPassword")}</p>}
            <button disabled={pwLoading} className="btn-primary w-full">
              {pwLoading ? t("loading") : t("enter")}
            </button>
          </form>
        </div>
      </main>
    );
  }

  const lbPhoto = lbIdx !== null ? visiblePhotos[lbIdx] : null;

  // ── Gallery ────────────────────────────────────────────────────
  return (
    <main className="min-h-screen pb-32">
      <header
        className="sticky top-0 z-40 flex flex-wrap items-center gap-3 px-6 py-3.5 md:px-10"
        style={{
          background: "color-mix(in srgb, var(--bg) 80%, transparent)",
          backdropFilter: "blur(20px)",
          borderBottom: "1px solid var(--border)",
        }}
      >
        <Brand />
        <div
          className="ml-auto flex items-center gap-2.5 rounded-full px-3.5 py-1.5 text-[12.5px]"
          style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
        >
          <span className="h-1.5 w-1.5 rounded-full" style={{ background: "#3fbf7f" }} />
          Album được chia sẻ · chế độ khách
        </div>
        <LanguageSwitcher />
      </header>

      <div className="mx-auto max-w-[1500px] px-6 pt-7 md:px-10">
        <div className="animate-[vkFade_.5s_ease_both]">
          <p className="mb-2 text-[12px] uppercase tracking-[0.2em]" style={{ color: "var(--text3)" }}>
            Vieetjk đã chia sẻ với bạn
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[clamp(32px,5vw,52px)] font-medium leading-none">{album.title}</h1>
              <p className="mt-2 text-[13.5px]" style={{ color: "var(--text2)" }}>
                {photos.length} {t("photos")}
                {album.description ? ` · ${album.description}` : ""}
              </p>
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <Heart size={14} /> Nhấn vào trái tim để chọn ảnh bạn thích
            </div>
          </div>
        </div>

        {/* Link tabs — switch between Drive sources */}
        {tabSources.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveTab("all")}
              className="rounded-full px-4 py-1.5 text-[13px] transition-colors"
              style={activeTab === "all" ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Tất cả
            </button>
            {tabSources.map((s) => {
              const n = photos.filter((p) => p.source_id === s.id).length;
              return (
                <button
                  key={s.id}
                  onClick={() => setActiveTab(s.id)}
                  className="rounded-full px-4 py-1.5 text-[13px] transition-colors"
                  style={activeTab === s.id ? { background: "var(--accent)", color: "var(--accentInk)" } : { background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
                >
                  {s.name}
                  <span className="ml-1.5 opacity-60">{n}</span>
                </button>
              );
            })}
          </div>
        )}

        {/* Sticky toolbar */}
        <div
          className="sticky top-[64px] z-20 mt-6 mb-7 flex flex-wrap items-center gap-2.5 rounded-2xl p-3 animate-[vkFade_.5s_ease_both]"
          style={{
            background: "color-mix(in srgb, var(--bg2) 86%, transparent)",
            backdropFilter: "blur(16px)",
            border: "1px solid var(--border)",
          }}
        >
          <button
            onClick={() => setSelectedOnly((v) => !v)}
            className="flex items-center gap-2 rounded-lg px-3.5 py-2 text-[13px] font-medium transition-colors"
            style={
              selectedOnly
                ? { background: "var(--accent)", color: "var(--accentInk)", border: "1px solid var(--accent)" }
                : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }
            }
          >
            <Heart size={14} fill={selectedOnly ? "currentColor" : "none"} />
            {selectedOnly ? "Đang xem ảnh đã chọn" : `Ảnh đã chọn${selected.size ? ` · ${selected.size}` : ""}`}
          </button>
          <span className="text-[13px]" style={{ color: "var(--text3)" }}>
            {selected.size > 0
              ? `${selected.size}${limit != null ? ` / ${limit}` : ""} ${t("selected")}`
              : `Chưa chọn ảnh nào · ${photos.length} ${t("photos")}`}
          </span>

          <div className="flex-1" />

          {/* Auto-save status */}
          <span className="flex items-center gap-1.5 text-[12.5px]" style={{ color: saveStatus === "saved" ? "#5fd29a" : "var(--text3)" }}>
            {saveStatus === "saving" ? (
              <>Đang lưu…</>
            ) : saveStatus === "saved" ? (
              <>
                <Check size={13} /> Đã lưu cho studio
              </>
            ) : null}
          </span>

          {selected.size > 0 && (
            <ToolButton onClick={copyList}>
              {copied ? <Check size={14} /> : <Copy size={14} />} {t("copyList")}
            </ToolButton>
          )}
          <ToolButton onClick={exportList} disabled={selected.size === 0}>
            <FileText size={14} /> {t("exportList")}
          </ToolButton>
          {album.allowZip && (
            <ToolButton onClick={downloadZip} disabled={selected.size === 0 || zipProgress !== null}>
              <Download size={14} />
              {zipProgress !== null ? `${zipProgress}%` : t("downloadZip")}
            </ToolButton>
          )}
        </div>

        {/* Empty filtered state */}
        {visiblePhotos.length === 0 ? (
          <div className="py-20 text-center animate-[vkFade_.4s_ease_both]" style={{ color: "var(--text3)" }}>
            <p className="mb-1.5 font-serif text-2xl" style={{ color: "var(--text2)" }}>
              {selectedOnly ? "Chưa có ảnh nào được chọn" : t("loading")}
            </p>
            <p className="text-[13.5px]">Nhấn vào trái tim ở góc mỗi ảnh để chọn.</p>
          </div>
        ) : (
          // Sections — each Drive source shown separately, left-to-right
          <div className="space-y-9">
            {sections.map((sec) => (
              <section key={sec.id}>
                {sec.name && (
                  <h2 className="mb-3 font-serif text-xl font-medium">
                    {sec.name}
                    <span className="ml-2 text-[13px] font-normal" style={{ color: "var(--text3)" }}>
                      · {sec.items.length} ảnh
                    </span>
                  </h2>
                )}
                <div className="grid items-start gap-3.5 [grid-template-columns:repeat(auto-fill,minmax(160px,1fr))]">
            {sec.items.map(({ p, idx }) => {
              const isSel = selected.has(p.id);
              const note = notes[p.id];
              return (
                <div
                  key={p.id}
                  className="overflow-hidden rounded-xl animate-[vkPop_.45s_ease_both]"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
                >
                  <div className="relative aspect-square">
                    <div
                      className="pointer-events-none absolute inset-0 z-[3]"
                      style={isSel ? { boxShadow: "inset 0 0 0 3px var(--gold)" } : undefined}
                    />
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={thumbnailUrl(p.drive_file_id, 600)}
                      alt={p.name}
                      loading="lazy"
                      draggable={false}
                      onClick={() => setLbIdx(idx)}
                      onContextMenu={(e) => wm && e.preventDefault()}
                      className="h-full w-full cursor-zoom-in select-none object-cover"
                    />
                    {wm && (
                      <div className="pointer-events-none absolute inset-0 z-[2] flex flex-wrap content-center items-center justify-center gap-x-8 gap-y-6 opacity-20">
                        {Array.from({ length: 8 }).map((_, i) => (
                          <span key={i} className="rotate-[-30deg] whitespace-nowrap text-xs font-semibold tracking-widest text-white">
                            {wm}
                          </span>
                        ))}
                      </div>
                    )}
                    <div
                      className="pointer-events-none absolute inset-x-0 top-0 h-16"
                      style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent)" }}
                    />
                    {/* heart select — large tap target for mobile */}
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        toggle(p.id);
                      }}
                      title={t("selectThis")}
                      className="absolute right-2 top-2 z-[4] flex h-11 w-11 items-center justify-center rounded-full transition-transform active:scale-90"
                      style={
                        isSel
                          ? { background: "var(--gold)", color: "#1a1205", border: "2px solid var(--gold)" }
                          : { background: "rgba(10,10,12,.5)", color: "#fff", border: "2px solid rgba(255,255,255,.75)" }
                      }
                    >
                      <Heart size={20} fill={isSel ? "currentColor" : "none"} strokeWidth={isSel ? 0 : 2} />
                    </button>
                  </div>

                  {/* note under the thumbnail */}
                  {album.allowNotes && (
                    <button
                      onClick={() => setLbIdx(idx)}
                      className="flex w-full items-center gap-1.5 px-2.5 py-2 text-left"
                      style={{ borderTop: "1px solid var(--border)" }}
                    >
                      <FileText size={12} className="flex-shrink-0" style={{ color: note?.trim() ? "var(--gold)" : "var(--text3)" }} />
                      <span
                        className="truncate text-[11.5px]"
                        style={{ color: note?.trim() ? "var(--text)" : "var(--text3)" }}
                      >
                        {note?.trim() || "Thêm ghi chú…"}
                      </span>
                    </button>
                  )}
                </div>
              );
            })}
                </div>
              </section>
            ))}
          </div>
        )}
      </div>

      {/* Lightbox */}
      {lbPhoto && lbIdx !== null && (
        <div
          className="fixed inset-0 z-[80] flex flex-col animate-[vkOverlay_.3s_ease_both]"
          style={{ background: "rgba(6,6,8,.93)", backdropFilter: "blur(8px)" }}
        >
          <div className="flex flex-shrink-0 items-center gap-3 px-4 py-3.5 md:px-7" style={{ borderBottom: "1px solid var(--border)" }}>
            <span className="text-[13px]" style={{ color: "var(--text2)" }}>
              {lbIdx + 1} / {visiblePhotos.length}
            </span>
            <div className="flex-1" />
            <button
              onClick={() => toggle(lbPhoto.id)}
              className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-all"
              style={
                selected.has(lbPhoto.id)
                  ? { background: "var(--gold)", color: "#1a1205", border: "1px solid var(--gold)" }
                  : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }
              }
            >
              <Heart size={15} fill={selected.has(lbPhoto.id) ? "currentColor" : "none"} strokeWidth={selected.has(lbPhoto.id) ? 0 : 2} />
              {selected.has(lbPhoto.id) ? "Đã thích" : "Thích ảnh này"}
            </button>
            {album.allowZip && (
              <a
                href={`/api/img?id=${lbPhoto.drive_file_id}&w=2400`}
                download={lbPhoto.name}
                title={t("downloadZip")}
                className="flex h-10 w-10 items-center justify-center rounded-lg"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
              >
                <Download size={17} />
              </a>
            )}
            <button onClick={() => zoomBy(-0.5)} disabled={zoom <= 1} title="Thu nhỏ" className="flex h-10 w-10 items-center justify-center rounded-lg disabled:opacity-40" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <ZoomOut size={17} />
            </button>
            <button onClick={() => zoomBy(0.5)} title="Phóng to" className="flex h-10 w-10 items-center justify-center rounded-lg" style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}>
              <ZoomIn size={17} />
            </button>
            <button
              onClick={() => setLbIdx(null)}
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-wrap overflow-y-auto">
            <div
              className="relative flex min-h-0 flex-1 items-center justify-center overflow-hidden p-3 md:p-10"
              style={{ flexBasis: "480px" }}
              onWheel={onWheelZoom}
            >
              <button
                onClick={() => setLbIdx(Math.max(0, lbIdx - 1))}
                disabled={lbIdx === 0}
                className="absolute left-3.5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:pointer-events-none disabled:opacity-25"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <ChevronLeft size={22} />
              </button>
              <div
                className="relative inline-flex"
                style={{
                  transform: `translate(${pan.x}px, ${pan.y}px) scale(${zoom})`,
                  transformOrigin: "center",
                  transition: drag.current ? "none" : "transform .15s ease",
                  cursor: zoom > 1 ? (drag.current ? "grabbing" : "grab") : "zoom-in",
                  touchAction: "none",
                }}
                onPointerDown={onPanDown}
                onPointerMove={onPanMove}
                onPointerUp={onPanUp}
                onDoubleClick={() => (zoom > 1 ? zoomBy(-10) : zoomBy(1.5))}
              >
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={fullImageUrl(lbPhoto.drive_file_id, 1600)}
                  alt={lbPhoto.name}
                  draggable={false}
                  onContextMenu={(e) => wm && e.preventDefault()}
                  className="max-h-[46vh] max-w-full select-none rounded object-contain md:max-h-[78vh]"
                  style={{ boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}
                />
                {wm && (
                  <div className="pointer-events-none absolute inset-0 flex flex-wrap content-center items-center justify-center gap-x-12 gap-y-10 overflow-hidden opacity-30">
                    {Array.from({ length: 16 }).map((_, i) => (
                      <span key={i} className="rotate-[-30deg] whitespace-nowrap text-base font-semibold tracking-widest text-white drop-shadow">
                        {wm}
                      </span>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setLbIdx(Math.min(visiblePhotos.length - 1, lbIdx + 1))}
                disabled={lbIdx >= visiblePhotos.length - 1}
                className="absolute right-3.5 top-1/2 z-10 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:pointer-events-none disabled:opacity-25"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {album.allowNotes && (
              <aside
                className="flex w-full flex-shrink-0 flex-col gap-4 border-t p-5 md:w-[340px] md:flex-none md:overflow-y-auto md:border-l md:border-t-0 md:p-7"
                style={{ borderColor: "var(--border)" }}
              >
                <div>
                  <h3 className="font-serif text-2xl font-medium">{t("note")}</h3>
                  <p className="text-[12.5px] leading-relaxed" style={{ color: "var(--text3)" }}>
                    Để lại ghi chú để studio biết bạn muốn chỉnh sửa gì cho ảnh này.
                  </p>
                </div>
                <textarea
                  value={notes[lbPhoto.id] ?? ""}
                  onChange={(e) => setNote(lbPhoto.id, e.target.value)}
                  placeholder="Viết ghi chú cho ảnh này…"
                  className="min-h-[120px] w-full resize-y rounded-xl px-3.5 py-3 text-sm outline-none"
                  style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
                />
                <div className="mt-auto border-t pt-4" style={{ borderColor: "var(--border)" }}>
                  <div className="flex items-center gap-2.5 text-[13px]" style={{ color: "var(--text2)" }}>
                    <span className="h-2 w-2 rounded-full" style={{ background: selected.has(lbPhoto.id) ? "#3fbf7f" : "var(--text3)" }} />
                    {selected.has(lbPhoto.id) ? "Ảnh này đã được chọn" : "Ảnh chưa được chọn"}
                  </div>
                </div>
              </aside>
            )}
          </div>
        </div>
      )}

      {/* Toast */}
      {toast && (
        <div
          className="fixed bottom-8 left-1/2 z-[100] flex -translate-x-1/2 items-center gap-2.5 rounded-xl px-5 py-3.5 animate-[vkToast_.35s_ease_both]"
          style={{ background: "var(--surface2)", border: "1px solid var(--border2)", boxShadow: "0 20px 60px rgba(0,0,0,.5)" }}
        >
          <span className="h-2 w-2 rounded-full" style={{ background: "#3fbf7f" }} />
          <span className="text-sm font-medium">{toast}</span>
        </div>
      )}
    </main>
  );
}

function ToolButton({ onClick, disabled, children }: { onClick: () => void; disabled?: boolean; children: React.ReactNode }) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex items-center gap-1.5 rounded-lg px-3 py-2 text-[13px] transition-colors disabled:opacity-40"
      style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
    >
      {children}
    </button>
  );
}

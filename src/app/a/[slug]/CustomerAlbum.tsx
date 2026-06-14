"use client";

import { useCallback, useEffect, useMemo, useState } from "react";
import {
  Check,
  Copy,
  Download,
  FileText,
  Send,
  Lock,
  ChevronLeft,
  ChevronRight,
  X,
  ListChecks,
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
}

export default function CustomerAlbum({
  album,
  initialPhotos,
  initialSources,
}: {
  album: PublicAlbum;
  initialPhotos: PublicPhoto[] | null;
  initialSources: PublicSource[] | null;
}) {
  const { t } = useLang();

  const [unlocked, setUnlocked] = useState(!album.hasPassword);
  const [photos, setPhotos] = useState<PublicPhoto[]>(initialPhotos ?? []);
  const [sources, setSources] = useState<PublicSource[]>(initialSources ?? []);

  const [password, setPassword] = useState("");
  const [pwError, setPwError] = useState(false);
  const [pwLoading, setPwLoading] = useState(false);

  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notes, setNotes] = useState<Record<string, string>>({});
  const [selectedOnly, setSelectedOnly] = useState(false);
  const [activeSource, setActiveSource] = useState<string>("all");
  const [clientName, setClientName] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [lbIdx, setLbIdx] = useState<number | null>(null);
  const [sendOpen, setSendOpen] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);
  const [toast, setToast] = useState<string | null>(null);

  const wm = album.watermark_enabled ? album.watermark_text || "Vieetjk" : null;

  const showToast = useCallback((msg: string) => {
    setToast(msg);
    window.setTimeout(() => setToast(null), 2800);
  }, []);

  // session + persisted state
  useEffect(() => {
    const key = `vk_session_${album.slug}`;
    let sid = window.localStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      window.localStorage.setItem(key, sid);
    }
    setSessionId(sid);
    try {
      const s = window.localStorage.getItem(`vk_sel_${album.slug}`);
      if (s) setSelected(new Set(JSON.parse(s)));
      const n = window.localStorage.getItem(`vk_notes_${album.slug}`);
      if (n) setNotes(JSON.parse(n));
      const nm = window.localStorage.getItem(`vk_name_${album.slug}`);
      if (nm) setClientName(nm);
    } catch {}
  }, [album.slug]);

  function persistSel(next: Set<string>) {
    window.localStorage.setItem(`vk_sel_${album.slug}`, JSON.stringify([...next]));
  }
  function persistNotes(next: Record<string, string>) {
    window.localStorage.setItem(`vk_notes_${album.slug}`, JSON.stringify(next));
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
    setUnlocked(true);
  }

  const sourceFiltered = useMemo(
    () =>
      activeSource === "all"
        ? photos
        : photos.filter((p) => p.source_id === activeSource),
    [photos, activeSource]
  );

  const visiblePhotos = useMemo(
    () => (selectedOnly ? sourceFiltered.filter((p) => selected.has(p.id)) : sourceFiltered),
    [sourceFiltered, selectedOnly, selected]
  );

  const selectedPhotos = useMemo(
    () => photos.filter((p) => selected.has(p.id)),
    [photos, selected]
  );

  const limit = album.selection_limit;
  const atLimit = limit != null && selected.size >= limit;

  function toggle(id: string) {
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else {
        if (limit != null && next.size >= limit) {
          showToast(t("limitReached"));
          return prev;
        }
        next.add(id);
      }
      persistSel(next);
      return next;
    });
  }

  function setNote(id: string, text: string) {
    setNotes((prev) => {
      const next = { ...prev, [id]: text };
      persistNotes(next);
      return next;
    });
  }

  function copyList() {
    const text = selectedPhotos.map((p) => stripExtension(p.name)).join("\n");
    navigator.clipboard.writeText(text);
    showToast(t("copied"));
  }

  function exportList() {
    const text = selectedPhotos.map((p) => p.name).join("\n");
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
      { watermark: wm, onProgress: (d, total) => setZipProgress(Math.round((d / total) * 100)) }
    );
    triggerDownload(blob, `${album.slug}-photos.zip`);
    setZipProgress(null);
  }

  async function submit() {
    if (clientName) window.localStorage.setItem(`vk_name_${album.slug}`, clientName);
    const selectedNotes: Record<string, string> = {};
    for (const id of selected) if (notes[id]?.trim()) selectedNotes[id] = notes[id];
    const res = await fetch(`/api/a/${album.slug}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientName,
        photoIds: [...selected],
        notes: selectedNotes,
      }),
    });
    setSendOpen(false);
    if (res.ok) showToast(`${t("submitted")} (${selected.size})`);
    else showToast(t("error"));
  }

  // lightbox keyboard nav
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
      {/* Header with guest banner */}
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
        {/* Title block */}
        <div className="animate-[vkFade_.5s_ease_both]">
          <p className="mb-2 text-[12px] uppercase tracking-[0.2em]" style={{ color: "var(--text3)" }}>
            Vieetjk đã chia sẻ với bạn
          </p>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <h1 className="font-serif text-[clamp(32px,5vw,52px)] font-medium leading-none">
                {album.title}
              </h1>
              <p className="mt-2 text-[13.5px]" style={{ color: "var(--text2)" }}>
                {photos.length} {t("photos")}
                {album.description ? ` · ${album.description}` : ""}
              </p>
            </div>
            <div
              className="flex items-center gap-2 rounded-full px-4 py-2 text-[13px]"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <ListChecks size={14} />
              Chọn ảnh bạn thích rồi gửi lại studio
            </div>
          </div>
        </div>

        {/* Source tabs */}
        {sources.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <SourceTab active={activeSource === "all"} onClick={() => setActiveSource("all")}>
              {t("allPhotos")}
            </SourceTab>
            {sources.map((s) => (
              <SourceTab key={s.id} active={activeSource === s.id} onClick={() => setActiveSource(s.id)}>
                {s.name}
              </SourceTab>
            ))}
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
            <ListChecks size={14} />
            {selectedOnly ? "Đang lọc: đã chọn" : `Lọc ảnh đã chọn${selected.size ? ` · ${selected.size}` : ""}`}
          </button>
          <span className="text-[13px]" style={{ color: "var(--text3)" }}>
            {selected.size > 0
              ? `${selected.size}${limit != null ? ` / ${limit}` : ""} ${t("selected")}`
              : `Chưa chọn ảnh nào · ${photos.length} ${t("photos")}`}
          </span>

          <div className="flex-1" />

          {selected.size > 0 && (
            <button
              onClick={() => {
                setSelected(new Set());
                persistSel(new Set());
                setSelectedOnly(false);
              }}
              className="rounded-lg px-3.5 py-2 text-[13px] transition-colors"
              style={{ background: "transparent", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              Bỏ chọn
            </button>
          )}

          <ToolButton onClick={copyList} disabled={selected.size === 0}>
            <Copy size={14} /> {t("copyList")}
          </ToolButton>
          <ToolButton onClick={exportList} disabled={selected.size === 0}>
            <FileText size={14} /> {t("exportList")}
          </ToolButton>
          <ToolButton onClick={downloadZip} disabled={selected.size === 0 || zipProgress !== null}>
            <Download size={14} />
            {zipProgress !== null ? `${zipProgress}%` : t("downloadZip")}
          </ToolButton>

          <button
            onClick={() => (selected.size === 0 ? showToast(t("limitReached")) : setSendOpen(true))}
            disabled={selected.size === 0}
            className="flex items-center gap-2 rounded-lg px-4 py-2 text-[13.5px] font-semibold transition-opacity disabled:opacity-40"
            style={{ background: "var(--accent)", color: "var(--accentInk)" }}
          >
            <Send size={15} />
            {t("submitSelection")}
            {selected.size ? ` (${selected.size})` : ""}
          </button>
        </div>

        {/* Empty filtered state */}
        {visiblePhotos.length === 0 ? (
          <div className="py-20 text-center animate-[vkFade_.4s_ease_both]" style={{ color: "var(--text3)" }}>
            <p className="mb-1.5 font-serif text-2xl" style={{ color: "var(--text2)" }}>
              {selectedOnly ? "Chưa có ảnh nào được chọn" : t("loading")}
            </p>
            <p className="text-[13.5px]">
              Bấm vào vòng tròn ở góc mỗi ảnh để chọn, rồi lọc lại tại đây.
            </p>
          </div>
        ) : (
          // Masonry gallery
          <div style={{ columns: "280px", columnGap: "14px" }}>
            {visiblePhotos.map((p, idx) => {
              const isSel = selected.has(p.id);
              const note = notes[p.id];
              return (
                <div
                  key={p.id}
                  className="relative mb-3.5 overflow-hidden rounded-xl animate-[vkPop_.45s_ease_both]"
                  style={{ breakInside: "avoid", background: "var(--surface)" }}
                >
                  {/* selection ring */}
                  <div
                    className="pointer-events-none absolute inset-0 z-[3] rounded-xl"
                    style={isSel ? { boxShadow: "inset 0 0 0 3px var(--accent)" } : undefined}
                  />
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl(p.drive_file_id, 600)}
                    alt={p.name}
                    loading="lazy"
                    draggable={false}
                    onClick={() => setLbIdx(idx)}
                    onContextMenu={(e) => wm && e.preventDefault()}
                    className="block w-full cursor-zoom-in select-none transition-transform duration-700 hover:scale-[1.03]"
                  />
                  {/* watermark overlay */}
                  {wm && (
                    <div className="pointer-events-none absolute inset-0 z-[2] flex flex-wrap content-center items-center justify-center gap-x-8 gap-y-6 opacity-20">
                      {Array.from({ length: 8 }).map((_, i) => (
                        <span key={i} className="rotate-[-30deg] whitespace-nowrap text-xs font-semibold tracking-widest text-white">
                          {wm}
                        </span>
                      ))}
                    </div>
                  )}
                  {/* top gradient */}
                  <div
                    className="pointer-events-none absolute inset-x-0 top-0 h-16"
                    style={{ background: "linear-gradient(to bottom, rgba(0,0,0,.5), transparent)" }}
                  />
                  {/* select circle */}
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      toggle(p.id);
                    }}
                    title={t("selectThis")}
                    className="absolute left-2.5 top-2.5 z-[4] flex h-7 w-7 items-center justify-center rounded-full transition-all"
                    style={
                      isSel
                        ? { background: "var(--accent)", color: "var(--accentInk)", border: "2px solid var(--accent)" }
                        : { background: "rgba(10,10,12,.45)", color: "transparent", border: "2px solid rgba(255,255,255,.7)" }
                    }
                  >
                    <Check size={15} strokeWidth={3} />
                  </button>
                  {/* note badge */}
                  {note?.trim() && (
                    <div
                      onClick={() => setLbIdx(idx)}
                      title={note}
                      className="absolute bottom-2.5 left-2.5 z-[4] flex max-w-[calc(100%-20px)] cursor-pointer items-center gap-1.5 rounded-lg px-2.5 py-1.5"
                      style={{ background: "rgba(10,10,12,.66)", backdropFilter: "blur(8px)", border: "1px solid var(--border)" }}
                    >
                      <FileText size={13} />
                      <span className="truncate text-[11.5px]" style={{ color: "var(--text)" }}>
                        {note}
                      </span>
                    </div>
                  )}
                </div>
              );
            })}
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
                  ? { background: "var(--accent)", color: "var(--accentInk)", border: "1px solid var(--accent)" }
                  : { background: "var(--surface)", color: "var(--text)", border: "1px solid var(--border)" }
              }
            >
              <Check size={15} strokeWidth={2.6} />
              {selected.has(lbPhoto.id) ? "Đã chọn" : t("selectThis")}
            </button>
            <a
              href={`/api/img?id=${lbPhoto.drive_file_id}&w=2400`}
              download={lbPhoto.name}
              title={t("downloadZip")}
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text2)" }}
            >
              <Download size={17} />
            </a>
            <button
              onClick={() => setLbIdx(null)}
              className="flex h-10 w-10 items-center justify-center rounded-lg"
              style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
            >
              <X size={17} />
            </button>
          </div>

          <div className="flex min-h-0 flex-1 flex-wrap">
            <div className="relative flex min-h-0 flex-1 items-center justify-center p-4 md:p-10" style={{ flexBasis: "480px" }}>
              <button
                onClick={() => setLbIdx(Math.max(0, lbIdx - 1))}
                disabled={lbIdx === 0}
                className="absolute left-3.5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:pointer-events-none disabled:opacity-25"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <ChevronLeft size={22} />
              </button>
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={fullImageUrl(lbPhoto.drive_file_id, 1600)}
                alt={lbPhoto.name}
                draggable={false}
                onContextMenu={(e) => wm && e.preventDefault()}
                className="max-h-[78vh] max-w-full select-none rounded object-contain animate-[vkPop_.35s_ease_both]"
                style={{ boxShadow: "0 30px 80px rgba(0,0,0,.6)" }}
              />
              <button
                onClick={() => setLbIdx(Math.min(visiblePhotos.length - 1, lbIdx + 1))}
                disabled={lbIdx >= visiblePhotos.length - 1}
                className="absolute right-3.5 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full transition-opacity disabled:pointer-events-none disabled:opacity-25"
                style={{ background: "var(--surface)", border: "1px solid var(--border)", color: "var(--text)" }}
              >
                <ChevronRight size={22} />
              </button>
            </div>

            {/* note panel */}
            <aside
              className="flex max-w-full flex-col gap-4 overflow-y-auto p-5 md:p-7"
              style={{ flex: "0 0 340px", borderLeft: "1px solid var(--border)" }}
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
                  <span
                    className="h-2 w-2 rounded-full"
                    style={{ background: selected.has(lbPhoto.id) ? "#3fbf7f" : "var(--text3)" }}
                  />
                  {selected.has(lbPhoto.id) ? "Ảnh này đã được chọn" : "Ảnh chưa được chọn"}
                </div>
              </div>
            </aside>
          </div>
        </div>
      )}

      {/* Send modal */}
      {sendOpen && (
        <div
          onClick={() => setSendOpen(false)}
          className="fixed inset-0 z-[90] flex items-center justify-center p-5 animate-[vkOverlay_.25s_ease_both]"
          style={{ background: "rgba(6,6,8,.7)", backdropFilter: "blur(6px)" }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-[420px] rounded-2xl p-7 text-center animate-[vkPop_.3s_ease_both]"
            style={{ background: "var(--bg2)", border: "1px solid var(--border2)", boxShadow: "0 40px 100px rgba(0,0,0,.6)" }}
          >
            <div
              className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-2xl"
              style={{ background: "var(--surface)", border: "1px solid var(--border)" }}
            >
              <Send size={22} />
            </div>
            <h3 className="font-serif text-2xl font-medium">{t("submitSelection")}?</h3>
            <p className="mb-5 mt-1.5 text-[13.5px] leading-relaxed" style={{ color: "var(--text2)" }}>
              Bạn đã chọn {selected.size} ảnh. Studio Vieetjk sẽ nhận được danh sách này cùng các ghi chú của bạn.
            </p>
            <input
              value={clientName}
              onChange={(e) => setClientName(e.target.value)}
              placeholder={t("yourName")}
              className="input mb-4 text-center"
            />
            <div className="flex gap-2.5">
              <button
                onClick={() => setSendOpen(false)}
                className="flex-1 rounded-xl py-3 text-sm font-medium"
                style={{ background: "transparent", border: "1px solid var(--border2)", color: "var(--text)" }}
              >
                Huỷ
              </button>
              <button
                onClick={submit}
                className="flex-[1.4] rounded-xl py-3 text-sm font-semibold"
                style={{ background: "var(--accent)", color: "var(--accentInk)" }}
              >
                Gửi {selected.size} ảnh
              </button>
            </div>
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

function SourceTab({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      onClick={onClick}
      className="rounded-full px-4 py-1.5 text-xs transition-colors"
      style={
        active
          ? { background: "var(--accent)", color: "var(--accentInk)" }
          : { background: "transparent", border: "1px solid var(--border)", color: "var(--text2)" }
      }
    >
      {children}
    </button>
  );
}

function ToolButton({
  onClick,
  disabled,
  children,
}: {
  onClick: () => void;
  disabled?: boolean;
  children: React.ReactNode;
}) {
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

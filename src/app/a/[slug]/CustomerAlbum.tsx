"use client";

import { useEffect, useMemo, useState } from "react";
import { Check, Copy, Download, FileText, Send, Lock } from "lucide-react";
import Brand from "@/components/Brand";
import LanguageSwitcher from "@/components/LanguageSwitcher";
import WatermarkImage from "@/components/WatermarkImage";
import { useLang } from "@/lib/i18n";
import { thumbnailUrl, stripExtension } from "@/lib/drive";
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
  const [activeSource, setActiveSource] = useState<string>("all");
  const [clientName, setClientName] = useState("");
  const [sessionId, setSessionId] = useState("");

  const [copied, setCopied] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [zipProgress, setZipProgress] = useState<number | null>(null);

  const wm = album.watermark_enabled ? album.watermark_text || "Vieetjk" : null;

  // session + persisted selection
  useEffect(() => {
    const key = `vk_session_${album.slug}`;
    let sid = window.localStorage.getItem(key);
    if (!sid) {
      sid = crypto.randomUUID();
      window.localStorage.setItem(key, sid);
    }
    setSessionId(sid);

    const savedSel = window.localStorage.getItem(`vk_sel_${album.slug}`);
    if (savedSel) {
      try {
        setSelected(new Set(JSON.parse(savedSel)));
      } catch {}
    }
    const savedName = window.localStorage.getItem(`vk_name_${album.slug}`);
    if (savedName) setClientName(savedName);
  }, [album.slug]);

  function persistSelection(next: Set<string>) {
    window.localStorage.setItem(
      `vk_sel_${album.slug}`,
      JSON.stringify([...next])
    );
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

  const visiblePhotos = useMemo(
    () =>
      activeSource === "all"
        ? photos
        : photos.filter((p) => p.source_id === activeSource),
    [photos, activeSource]
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
      if (next.has(id)) {
        next.delete(id);
      } else {
        if (limit != null && next.size >= limit) {
          alert(t("limitReached"));
          return prev;
        }
        next.add(id);
      }
      persistSelection(next);
      return next;
    });
  }

  function copyList() {
    const text = selectedPhotos.map((p) => stripExtension(p.name)).join("\n");
    navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
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
      {
        watermark: wm,
        onProgress: (d, total) =>
          setZipProgress(Math.round((d / total) * 100)),
      }
    );
    triggerDownload(blob, `${album.slug}-photos.zip`);
    setZipProgress(null);
  }

  async function submit() {
    if (clientName) window.localStorage.setItem(`vk_name_${album.slug}`, clientName);
    const res = await fetch(`/api/a/${album.slug}/select`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        sessionId,
        clientName,
        photoIds: [...selected],
      }),
    });
    if (res.ok) {
      setSubmitted(true);
      setTimeout(() => setSubmitted(false), 3000);
    } else {
      alert(t("error"));
    }
  }

  // ── Password gate ─────────────────────────────────────────────
  if (!unlocked) {
    return (
      <main className="flex min-h-screen flex-col">
        <header className="flex items-center justify-between px-6 py-5 md:px-10">
          <Brand />
          <LanguageSwitcher />
        </header>
        <div className="flex flex-1 items-center justify-center px-6">
          <form onSubmit={unlock} className="card w-full max-w-sm p-8 text-center">
            <Lock className="mx-auto mb-4 text-accent-gold" size={28} />
            <h1 className="text-lg font-medium text-accent">{album.title}</h1>
            <p className="mb-6 mt-1 text-sm text-accent-muted">
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
            {pwError && (
              <p className="mb-4 text-sm text-red-400">{t("wrongPassword")}</p>
            )}
            <button disabled={pwLoading} className="btn-primary w-full">
              {pwLoading ? t("loading") : t("enter")}
            </button>
          </form>
        </div>
      </main>
    );
  }

  // ── Gallery ───────────────────────────────────────────────────
  return (
    <main className="min-h-screen pb-28">
      <header className="sticky top-0 z-20 flex items-center justify-between border-b border-ink-800 bg-ink-950/80 px-6 py-4 backdrop-blur md:px-10">
        <Brand />
        <LanguageSwitcher />
      </header>

      <div className="mx-auto max-w-6xl px-6 py-8 md:px-10">
        <h1 className="text-3xl font-light tracking-tight text-accent">
          {album.title}
        </h1>
        {album.description && (
          <p className="mt-2 max-w-2xl text-sm text-accent-muted">
            {album.description}
          </p>
        )}

        {/* Source tabs */}
        {sources.length > 1 && (
          <div className="mt-6 flex flex-wrap gap-2">
            <button
              onClick={() => setActiveSource("all")}
              className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
                activeSource === "all"
                  ? "bg-accent text-ink-950"
                  : "border border-ink-700 text-accent-muted hover:bg-ink-800"
              }`}
            >
              {t("allPhotos")}
            </button>
            {sources.map((s) => (
              <button
                key={s.id}
                onClick={() => setActiveSource(s.id)}
                className={`rounded-full px-4 py-1.5 text-xs transition-colors ${
                  activeSource === s.id
                    ? "bg-accent text-ink-950"
                    : "border border-ink-700 text-accent-muted hover:bg-ink-800"
                }`}
              >
                {s.name}
              </button>
            ))}
          </div>
        )}

        {/* Grid */}
        <div className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
          {visiblePhotos.map((p) => {
            const isSel = selected.has(p.id);
            return (
              <button
                key={p.id}
                onClick={() => toggle(p.id)}
                disabled={!isSel && atLimit}
                className={`group relative aspect-square overflow-hidden rounded-lg transition disabled:opacity-40 ${
                  isSel ? "ring-2 ring-accent-gold" : "ring-1 ring-ink-800"
                }`}
              >
                <WatermarkImage
                  src={thumbnailUrl(p.drive_file_id, 500)}
                  alt={p.name}
                  watermark={wm}
                  className="h-full w-full"
                />
                <span
                  className={`absolute right-2 top-2 flex h-6 w-6 items-center justify-center rounded-full border transition ${
                    isSel
                      ? "border-accent-gold bg-accent-gold text-ink-950"
                      : "border-white/60 bg-black/30 text-transparent group-hover:text-white/70"
                  }`}
                >
                  <Check size={14} />
                </span>
                <span className="pointer-events-none absolute bottom-0 left-0 right-0 truncate bg-gradient-to-t from-black/70 to-transparent px-2 py-1 text-left text-[10px] text-white/80">
                  {p.name}
                </span>
              </button>
            );
          })}
        </div>

        {visiblePhotos.length === 0 && (
          <p className="mt-10 text-center text-sm text-accent-muted">
            {t("loading")}
          </p>
        )}
      </div>

      {/* Action bar */}
      <div className="fixed bottom-0 left-0 right-0 z-30 border-t border-ink-800 bg-ink-900/95 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center gap-3 px-6 py-3 md:px-10">
          <div className="text-sm text-accent">
            <span className="font-semibold text-accent-gold">{selected.size}</span>
            {limit != null && <span className="text-accent-muted"> / {limit}</span>}{" "}
            <span className="text-accent-muted">{t("selected")}</span>
          </div>

          <input
            value={clientName}
            onChange={(e) => setClientName(e.target.value)}
            placeholder={t("yourName")}
            className="input ml-auto max-w-[180px] py-1.5 text-xs"
          />

          <button
            onClick={copyList}
            disabled={selected.size === 0}
            className="btn-ghost py-1.5 text-xs"
          >
            {copied ? <Check size={14} /> : <Copy size={14} />}
            {copied ? t("copied") : t("copyList")}
          </button>
          <button
            onClick={exportList}
            disabled={selected.size === 0}
            className="btn-ghost py-1.5 text-xs"
          >
            <FileText size={14} /> {t("exportList")}
          </button>
          <button
            onClick={downloadZip}
            disabled={selected.size === 0 || zipProgress !== null}
            className="btn-ghost py-1.5 text-xs"
          >
            <Download size={14} />
            {zipProgress !== null
              ? `${t("preparingZip")} ${zipProgress}%`
              : t("downloadZip")}
          </button>
          <button
            onClick={submit}
            disabled={selected.size === 0}
            className="btn-primary py-1.5 text-xs"
          >
            <Send size={14} />
            {submitted ? t("submitted") : t("submitSelection")}
          </button>
        </div>
      </div>
    </main>
  );
}

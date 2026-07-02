"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft,
  RefreshCw,
  Trash2,
  Plus,
  Star,
  ExternalLink,
  Users,
  Save,
  Images,
  PackageCheck,
  ArrowRight,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { studioUrl } from "@/lib/hosts";
import ShareButton from "@/components/ShareButton";
import { thumbnailUrl, isFolderLink } from "@/lib/drive";
import { fetchAllPhotos } from "@/lib/photos";
import type { Album, AlbumSource, Photo, SourceKind, AlbumPhase, SourceStage } from "@/lib/types";

export default function AlbumEditor({
  album,
  initialSources,
  initialPhotos,
  canDelivery = true,
  canPinHome = true,
  studioName = "Studio",
  studioSubdomain = null,
}: {
  album: Album;
  initialSources: AlbumSource[];
  initialPhotos: Photo[];
  canDelivery?: boolean;
  canPinHome?: boolean;
  studioName?: string;
  studioSubdomain?: string | null;
}) {
  const { t } = useLang();
  const supabase = createClient();
  const router = useRouter();
  const [deleting, setDeleting] = useState(false);

  async function deleteAlbum() {
    if (!confirm("Xóa album này? Thao tác không thể hoàn tác. (Số album đã tạo trong tháng vẫn được tính.)")) return;
    setDeleting(true);
    const { error } = await supabase.from("albums").delete().eq("id", album.id);
    if (error) {
      setDeleting(false);
      flash(error.message);
      return;
    }
    router.push("/dashboard");
    router.refresh();
  }

  const [form, setForm] = useState({
    title: album.title,
    description: album.description ?? "",
    slug: album.slug,
    selection_limit: album.selection_limit ?? "",
    watermark_enabled: album.watermark_enabled,
    watermark_text: album.watermark_text ?? studioName,
    watermark_delivery: album.watermark_delivery ?? false,
    gallery_pinned: album.gallery_pinned ?? false,
    download_enabled: album.download_enabled ?? true,
    status: album.status,
    cover_url: album.cover_url,
    is_showcase: album.is_showcase,
    is_pinned: album.is_pinned,
    kind: album.kind ?? "",
  });
  const [hasPassword, setHasPassword] = useState(!!album.password_hash);
  const [newPassword, setNewPassword] = useState("");

  const [phase, setPhase] = useState<AlbumPhase>(album.phase ?? "selection");
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [sources, setSources] = useState<AlbumSource[]>(initialSources);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  const [newSource, setNewSource] = useState<{ name: string; url: string; stage: SourceStage }>({ name: "", url: "", stage: "selection" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  // A photo's stage comes from the source it was synced from.
  const stageById = new Map(sources.map((s) => [s.id, s.stage]));
  const deliveryCount = photos.filter((p) => stageById.get(p.source_id ?? "") === "delivery").length;
  const selectionCount = photos.length - deliveryCount;

  async function saveSettings() {
    setSaving(true);
    const { error } = await supabase
      .from("albums")
      .update({
        title: form.title,
        description: form.description || null,
        slug: form.slug,
        selection_limit:
          form.selection_limit === "" ? null : Number(form.selection_limit),
        watermark_enabled: form.watermark_enabled,
        watermark_text: form.watermark_text || null,
        watermark_delivery: form.watermark_delivery,
        gallery_pinned: canPinHome ? form.gallery_pinned : false,
        download_enabled: form.download_enabled,
        status: form.status,
        cover_url: form.cover_url,
        is_showcase: form.is_showcase,
        is_pinned: form.is_pinned,
        kind: form.kind || null,
      })
      .eq("id", album.id);
    setSaving(false);
    if (error) flash(error.message);
    else flash(t("saved"));
  }

  async function savePassword() {
    const res = await fetch(`/api/albums/${album.id}/password`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: newPassword }),
    });
    const data = await res.json();
    if (res.ok) {
      setHasPassword(data.hasPassword);
      setNewPassword("");
      flash(t("saved"));
    } else flash(data.error ?? t("error"));
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSource.url.trim()) return;
    const kind: SourceKind = isFolderLink(newSource.url) ? "folder" : "file";
    const { data, error } = await supabase
      .from("album_sources")
      .insert({
        album_id: album.id,
        name: newSource.name || (kind === "folder" ? "Folder" : "File"),
        drive_url: newSource.url.trim(),
        kind,
        stage: newSource.stage,
        position: sources.length,
      })
      .select("*")
      .single();
    if (error) return flash(error.message);
    setSources([...sources, data as AlbumSource]);
    setNewSource({ name: "", url: "", stage: newSource.stage });
    // Auto-sync so photos & thumbnails appear immediately after adding a source.
    await sync();
  }

  // Switch which phase the client link exposes (selection ↔ delivery). Plans
  // without delivery can still switch BACK to selection (escape a stuck album),
  // but can't switch into delivery.
  async function switchPhase(next: AlbumPhase) {
    if (!canDelivery && next === "delivery") return;
    setPhaseBusy(true);
    const { error } = await supabase.from("albums").update({ phase: next }).eq("id", album.id);
    setPhaseBusy(false);
    if (error) return flash(error.message);
    setPhase(next);
    flash(next === "delivery" ? "Đã chuyển sang giai đoạn Giao khách" : "Đã chuyển về giai đoạn Chọn ảnh");
  }

  async function removeSource(id: string) {
    if (!confirm(t("confirmDelete"))) return;
    await supabase.from("album_sources").delete().eq("id", id);
    setSources(sources.filter((s) => s.id !== id));
    setPhotos(photos.filter((p) => p.source_id !== id));
  }

  async function sync() {
    setSyncing(true);
    setMsg(null);
    const res = await fetch(`/api/albums/${album.id}/sync`, { method: "POST" });
    const data = await res.json();
    setSyncing(false);
    if (!res.ok) return flash(data.error ?? t("error"));

    const fresh = await fetchAllPhotos(supabase, album.id, "*");
    setPhotos(fresh as Photo[]);
    // refresh sources too (sync may have auto-added sub-folder sources)
    const { data: freshSources } = await supabase
      .from("album_sources")
      .select("*")
      .eq("album_id", album.id)
      .order("position");
    if (freshSources) setSources(freshSources as AlbumSource[]);
    flash(
      `${data.total} ${t("photos")}` +
        (data.errors?.length ? ` · ${data.errors.join("; ")}` : "")
    );
  }

  async function setCover(fileId: string) {
    const url = thumbnailUrl(fileId, 800);
    setForm((f) => ({ ...f, cover_url: url }));
    await supabase.from("albums").update({ cover_url: url }).eq("id", album.id);
    flash(t("saved"));
  }

  async function removePhoto(id: string) {
    await supabase.from("photos").delete().eq("id", id);
    setPhotos(photos.filter((p) => p.id !== id));
  }

  return (
    <div className="animate-fade-in pb-20">
      {/* Header */}
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-accent-muted hover:text-accent"
          >
            <ArrowLeft size={15} /> {t("back")}
          </Link>
          <h1 className="text-2xl font-light text-accent">{form.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link
            href={`/dashboard/albums/${album.id}/selections`}
            className="btn-ghost"
          >
            <Users size={15} /> {t("customerSelections")}
          </Link>
          <a href={studioUrl(studioSubdomain, `/a/${form.slug}`)} target="_blank" rel="noreferrer" className="btn-ghost">
            <ExternalLink size={15} /> {t("view")}
          </a>
          <ShareButton path={studioUrl(studioSubdomain, `/a/${form.slug}`)} title={form.title} />
          <button onClick={deleteAlbum} disabled={deleting} className="btn-danger">
            <Trash2 size={15} /> {deleting ? "Đang xóa…" : t("delete")}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-6 rounded-md border border-accent-gold/30 bg-accent-gold/10 px-4 py-2 text-sm text-accent-gold">
          {msg}
        </div>
      )}

      {/* Project phase: which set of photos the client link currently shows. */}
      <div className="card mb-6 flex flex-col gap-4 p-5 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-center gap-3">
          <span className={`flex h-9 w-9 items-center justify-center rounded-full ${phase === "delivery" ? "bg-emerald-500/15 text-emerald-400" : "bg-accent-gold/15 text-accent-gold"}`}>
            {phase === "delivery" ? <PackageCheck size={18} /> : <Images size={18} />}
          </span>
          <div>
            <p className="text-sm font-medium text-accent">
              Giai đoạn hiện tại: {phase === "delivery" ? "Giao khách (ảnh hoàn thiện)" : "Chọn ảnh (ảnh gốc)"}
            </p>
            <p className="text-xs" style={{ color: "var(--text3)" }}>
              {phase === "delivery"
                ? "Khách đang xem & tải ảnh hoàn thiện qua link dự án."
                : "Khách đang chọn ảnh gốc qua link dự án."}
            </p>
          </div>
        </div>
        {canDelivery ? (
          <button
            onClick={() => switchPhase(phase === "delivery" ? "selection" : "delivery")}
            disabled={phaseBusy}
            className="btn-ghost whitespace-nowrap"
          >
            {phase === "delivery" ? (
              <><ArrowLeft size={15} /> Về giai đoạn Chọn ảnh</>
            ) : (
              <>Chuyển sang Giao khách <ArrowRight size={15} /></>
            )}
          </button>
        ) : phase === "delivery" ? (
          // Stuck in delivery on a plan that no longer allows it — let them out.
          <button onClick={() => switchPhase("selection")} disabled={phaseBusy} className="btn-ghost whitespace-nowrap">
            <ArrowLeft size={15} /> Về giai đoạn Chọn ảnh
          </button>
        ) : (
          <Link href="/dashboard/upgrade" className="btn-ghost whitespace-nowrap" title="Nâng cấp để dùng giao khách">
            🔒 Giao khách (nâng cấp gói)
          </Link>
        )}
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings */}
        <div className="card space-y-4 p-6 lg:col-span-1">
          <h2 className="text-sm font-medium uppercase tracking-wide text-accent-muted">
            {t("settings")}
          </h2>

          <div>
            <label className="label">{t("albumTitle")}</label>
            <input
              className="input"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t("description")}</label>
            <textarea
              className="input min-h-[70px]"
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />
          </div>
          <div>
            <label className="label">{t("slug")}</label>
            <input
              className="input"
              value={form.slug}
              onChange={(e) =>
                setForm({
                  ...form,
                  slug: e.target.value.replace(/[^a-z0-9-]/gi, "-").toLowerCase(),
                })
              }
            />
          </div>
          <div>
            <label className="label">{t("selectionLimit")}</label>
            <input
              type="number"
              min={0}
              className="input"
              placeholder={t("unlimited")}
              value={form.selection_limit}
              onChange={(e) =>
                setForm({ ...form, selection_limit: e.target.value })
              }
            />
          </div>

          <div className="rounded-md border border-ink-800 p-3">
            <label className="flex items-center gap-2 text-sm text-accent">
              <input
                type="checkbox"
                checked={form.watermark_enabled}
                onChange={(e) =>
                  setForm({ ...form, watermark_enabled: e.target.checked })
                }
              />
              {t("enableWatermark")}
            </label>
            {form.watermark_enabled && (
              <input
                className="input mt-3"
                placeholder={t("watermarkText")}
                value={form.watermark_text}
                onChange={(e) =>
                  setForm({ ...form, watermark_text: e.target.value })
                }
              />
            )}
            <p className="mt-2 text-xs" style={{ color: "var(--text3)" }}>
              Bật watermark để chữ tự gắn lên ảnh khi khách xem (kể cả ảnh phóng to) — chống chụp màn hình.
            </p>
          </div>

          <label className="flex items-center gap-2 rounded-md border border-ink-800 p-3 text-sm text-accent">
            <input
              type="checkbox"
              checked={form.download_enabled}
              onChange={(e) => setForm({ ...form, download_enabled: e.target.checked })}
            />
            Cho phép khách tải ảnh xuống
          </label>

          {canDelivery && (
            <label className="flex items-center gap-2 rounded-md border border-ink-800 p-3 text-sm text-accent">
              <input
                type="checkbox"
                checked={form.watermark_delivery}
                onChange={(e) => setForm({ ...form, watermark_delivery: e.target.checked })}
              />
              Watermark cả ở giai đoạn Giao khách
            </label>
          )}

          {/* "Show on homepage" only applies to the delivery phase. */}
          {phase === "delivery" && canPinHome && (
            <label className="flex items-center gap-2 rounded-md border border-ink-800 p-3 text-sm text-accent">
              <input
                type="checkbox"
                checked={form.gallery_pinned}
                onChange={(e) => setForm({ ...form, gallery_pinned: e.target.checked })}
              />
              Hiện ở trang chủ công khai (khách xem không cần mật khẩu)
            </label>
          )}
          {phase === "delivery" && canDelivery && !canPinHome && (
            <Link href="/dashboard/upgrade" className="flex items-center gap-2 rounded-md border border-ink-800 p-3 text-sm" style={{ color: "var(--text3)" }}>
              🔒 Hiện ở trang chủ công khai — nâng cấp gói Photographer/Studio
            </Link>
          )}

          <div>
            <label className="label">{t("status")}</label>
            <select
              className="input"
              value={form.status}
              onChange={(e) =>
                setForm({ ...form, status: e.target.value as Album["status"] })
              }
            >
              <option value="draft">{t("draft")}</option>
              <option value="published">{t("published")}</option>
            </select>
          </div>

          <button
            onClick={saveSettings}
            disabled={saving}
            className="btn-primary w-full"
          >
            <Save size={15} /> {saving ? t("saving") : t("save")}
          </button>

          {/* Password */}
          <div className="rounded-md border border-ink-800 p-3">
            <label className="label">{t("albumPassword")}</label>
            <p className="mb-2 text-xs text-accent-muted">{t("passwordHint")}</p>
            <input
              type="text"
              className="input"
              placeholder={hasPassword ? "•••••• (đã đặt)" : ""}
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <button onClick={savePassword} className="btn-ghost mt-3 w-full text-xs">
              {hasPassword && !newPassword ? t("remove") : t("save")}
            </button>
          </div>
        </div>

        {/* Sources + Photos */}
        <div className="space-y-6 lg:col-span-2">
          {/* Sources */}
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide text-accent-muted">
              {t("sources")}
            </h2>

            <ul className="mb-4 space-y-2">
              {sources.map((s) => (
                <li
                  key={s.id}
                  className="flex items-center justify-between rounded-md border border-ink-800 px-3 py-2"
                >
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm text-accent">
                      <span className="rounded bg-ink-700 px-1.5 py-0.5 text-[10px] uppercase text-accent-muted">
                        {s.kind}
                      </span>
                      <span className={`rounded px-1.5 py-0.5 text-[10px] uppercase ${s.stage === "delivery" ? "bg-emerald-500/15 text-emerald-400" : "bg-accent-gold/15 text-accent-gold"}`}>
                        {s.stage === "delivery" ? "Giao" : "Chọn"}
                      </span>
                      {s.name}
                    </div>
                    <div className="truncate text-xs text-ink-600">{s.drive_url}</div>
                  </div>
                  <button
                    onClick={() => removeSource(s.id)}
                    className="text-accent-muted hover:text-red-400"
                  >
                    <Trash2 size={15} />
                  </button>
                </li>
              ))}
              {sources.length === 0 && (
                <li className="text-sm text-accent-muted">—</li>
              )}
            </ul>

            <form onSubmit={addSource} className="grid grid-cols-1 gap-2 sm:grid-cols-[auto_1fr_2fr_auto]">
              <select
                className="input"
                value={newSource.stage}
                onChange={(e) =>
                  setNewSource({ ...newSource, stage: e.target.value as SourceStage })
                }
              >
                <option value="selection">Ảnh chọn</option>
                {canDelivery && <option value="delivery">Ảnh giao</option>}
              </select>
              <input
                className="input"
                placeholder={t("sourceName")}
                value={newSource.name}
                onChange={(e) =>
                  setNewSource({ ...newSource, name: e.target.value })
                }
              />
              <input
                className="input"
                placeholder={t("driveLink")}
                value={newSource.url}
                onChange={(e) =>
                  setNewSource({ ...newSource, url: e.target.value })
                }
              />
              <button className="btn-ghost whitespace-nowrap">
                <Plus size={15} /> {t("addSource")}
              </button>
            </form>

            <button
              onClick={sync}
              disabled={syncing || sources.length === 0}
              className="btn-primary mt-4"
            >
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} />
              {syncing ? t("syncing") : t("syncDrive")}
            </button>
          </div>

          {/* Photos */}
          <div className="card p-6">
            <h2 className="mb-4 flex flex-wrap items-center gap-2 text-sm font-medium uppercase tracking-wide text-accent-muted">
              {photos.length} {t("photos")}
              {deliveryCount > 0 && (
                <span className="flex gap-1.5 normal-case">
                  <span className="rounded bg-accent-gold/15 px-1.5 py-0.5 text-[10px] text-accent-gold">{selectionCount} chọn</span>
                  <span className="rounded bg-emerald-500/15 px-1.5 py-0.5 text-[10px] text-emerald-400">{deliveryCount} giao</span>
                </span>
              )}
            </h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.map((p) => (
                <div
                  key={p.id}
                  className="group relative aspect-square overflow-hidden rounded-md bg-ink-850"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={thumbnailUrl(p.drive_file_id, 400)}
                    alt={p.name}
                    loading="lazy"
                    className="h-full w-full object-cover"
                  />
                  <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <button
                      onClick={() => setCover(p.drive_file_id)}
                      title={t("setCover")}
                      className="rounded bg-ink-900/80 p-1.5 text-accent-gold hover:bg-ink-800"
                    >
                      <Star size={14} />
                    </button>
                    <button
                      onClick={() => removePhoto(p.id)}
                      className="rounded bg-ink-900/80 p-1.5 text-red-300 hover:bg-ink-800"
                    >
                      <Trash2 size={14} />
                    </button>
                  </div>
                  {form.cover_url === thumbnailUrl(p.drive_file_id, 800) && (
                    <span className="absolute left-1.5 top-1.5 rounded bg-accent-gold px-1.5 py-0.5 text-[9px] font-medium uppercase text-ink-950">
                      {t("cover")}
                    </span>
                  )}
                </div>
              ))}
            </div>
            {photos.length === 0 && (
              <p className="text-sm text-accent-muted">
                {t("addSource")} → {t("syncDrive")}
              </p>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

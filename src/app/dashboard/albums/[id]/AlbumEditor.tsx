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
  FolderOpen,
  HardDriveDownload,
} from "lucide-react";
import { useLang } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/client";
import { studioUrl } from "@/lib/hosts";
import ShareButton from "@/components/ShareButton";
import ZaloSendButton from "@/components/ZaloSendButton";
import { thumbnailUrl, isFolderLink } from "@/lib/drive";
import { fetchAllPhotos } from "@/lib/photos";
import { CATEGORY_PRESETS, slugifyVi } from "@/lib/category";
import type { Album, AlbumSource, Photo, SourceKind, AlbumPhase, SourceStage } from "@/lib/types";

export default function AlbumEditor({
  album,
  initialSources,
  initialPhotos,
  canDelivery = true,
  canPinHome = true,
  canWatermark = true,
  studioName = "Studio",
  studioHost = null,
  studioCats = [],
  contractId = null,
  clientPhone = null,
  clientName = null,
}: {
  album: Album;
  initialSources: AlbumSource[];
  initialPhotos: Photo[];
  canDelivery?: boolean;
  canPinHome?: boolean;
  canWatermark?: boolean;
  studioName?: string;
  studioHost?: string | null;
  studioCats?: { slug: string; label: string }[];
  contractId?: string | null;
  clientPhone?: string | null;
  clientName?: string | null;
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
    category: album.category ?? "",
    category_label: album.category_label ?? "",
  });
  const [hasPassword, setHasPassword] = useState(!!album.password_hash);
  const [newPassword, setNewPassword] = useState("");

  const [phase, setPhase] = useState<AlbumPhase>(album.phase ?? "selection");
  const [phaseBusy, setPhaseBusy] = useState(false);
  const [sources, setSources] = useState<AlbumSource[]>(initialSources);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);

  const [newSource, setNewSource] = useState<{ name: string; url: string; stage: SourceStage }>({ name: "", url: "", stage: "selection" });
  // Link ảnh đã CHỈNH SỬA (giao khách) — studio nhập ở giai đoạn giao. Ảnh trong
  // thư mục này hiện cho khách ở album giao; ảnh gốc khách đã chọn tự thành "File gốc".
  const [editedUrl, setEditedUrl] = useState(
    initialSources.find((s) => s.stage === "delivery" && s.kind === "folder")?.drive_url ?? ""
  );
  const [deliveryBusy, setDeliveryBusy] = useState(false);
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2500);
  }

  // A photo's stage comes from the source it was synced from.
  const stageById = new Map(sources.map((s) => [s.id, s.stage]));
  const deliveryPhotos = photos.filter((p) => stageById.get(p.source_id ?? "") === "delivery");
  const deliveryCount = deliveryPhotos.length;
  const selectionCount = photos.length - deliveryCount;
  // Delivery folder sources can be opened straight on Drive (0 Fast Origin Transfer,
  // true originals — Google serves the download, not us).
  const deliveryFolders = sources.filter((s) => s.stage === "delivery" && s.kind === "folder");


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
        watermark_enabled: canWatermark && form.watermark_enabled,
        watermark_text: form.watermark_text || null,
        watermark_delivery: canWatermark && form.watermark_delivery,
        gallery_pinned: canPinHome ? form.gallery_pinned : false,
        download_enabled: form.download_enabled,
        status: form.status,
        cover_url: form.cover_url,
        is_showcase: form.is_showcase,
        is_pinned: form.is_pinned,
        kind: form.kind || null,
        category: form.category || null,
        category_label: form.category_label || null,
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

  // Lưu link ảnh đã chỉnh sửa (giao khách): tạo/cập nhật nguồn stage 'delivery'
  // rồi đồng bộ ảnh. Ảnh trong thư mục này là ảnh hiện cho khách ở album giao.
  async function saveDeliveryLink() {
    const url = editedUrl.trim();
    if (!url || deliveryBusy) return;
    setDeliveryBusy(true);
    const kind: SourceKind = isFolderLink(url) ? "folder" : "file";
    const existing = sources.find((s) => s.stage === "delivery");
    if (existing) {
      const { error } = await supabase.from("album_sources").update({ drive_url: url, kind }).eq("id", existing.id);
      if (error) { setDeliveryBusy(false); return flash(error.message); }
      setSources(sources.map((s) => (s.id === existing.id ? { ...s, drive_url: url, kind } : s)));
    } else {
      const { data, error } = await supabase
        .from("album_sources")
        .insert({ album_id: album.id, name: "File ChinhSua", drive_url: url, kind, stage: "delivery", position: sources.length })
        .select("*")
        .single();
      if (error) { setDeliveryBusy(false); return flash(error.message); }
      setSources([...sources, data as AlbumSource]);
    }
    await sync();
    setDeliveryBusy(false);
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
        <div className="min-w-0">
          <Link
            href="/dashboard"
            className="mb-2 inline-flex items-center gap-1 text-sm text-accent-muted hover:text-accent"
          >
            <ArrowLeft size={15} /> {t("back")}
          </Link>
          <h1 className="break-words text-2xl font-light text-accent">{form.title}</h1>
        </div>
        {/* Bọc phải wrap: 5 nút + ô SĐT Zalo rộng hơn màn hình điện thoại, không
            wrap thì cả trang bị nới ngang và mọi thứ lệch sang trái. */}
        <div className="flex w-full flex-wrap items-center gap-2 sm:w-auto">
          <Link
            href={`/dashboard/albums/${album.id}/selections`}
            className="btn-ghost"
          >
            <Users size={15} /> {t("customerSelections")}
          </Link>
          <a href={studioUrl(studioHost, `/a/${form.slug}`)} target="_blank" rel="noreferrer" className="btn-ghost">
            <ExternalLink size={15} /> {t("view")}
          </a>
          <ShareButton path={studioUrl(studioHost, `/a/${form.slug}`)} title={form.title} />
          <ZaloSendButton
            phone={clientPhone || album.client_phone}
            name={clientName || album.client_name}
            contractId={contractId}
            audience="client"
            kind="album_share"
            askPhone
            message={`Chào ${clientName || album.client_name || "anh/chị"}, mời anh/chị xem album ảnh tại: ${studioUrl(studioHost, `/a/${form.slug}`)}`}
          />
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
          <span
            className="flex h-9 w-9 items-center justify-center rounded-full"
            style={phase === "delivery"
              ? { background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }
              : { background: "color-mix(in srgb, var(--gold) 15%, transparent)", color: "var(--gold)" }}
          >
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

      {/* Delivery phase: studio pastes the EDITED-photos folder link. Those photos
          are what the client sees in the delivery gallery; the originals the client
          picked earlier auto-surface as the "File gốc" button (see getOriginalFolders). */}
      {phase === "delivery" && (
        <div className="card mb-6 p-5">
          <label className="label">Link ảnh đã chỉnh sửa (hiện cho khách ở album giao)</label>
          <div className="flex flex-col gap-2 sm:flex-row">
            <input
              className="input flex-1"
              placeholder="Dán link thư mục Google Drive ảnh đã chỉnh sửa…"
              value={editedUrl}
              onChange={(e) => setEditedUrl(e.target.value)}
            />
            <button
              onClick={saveDeliveryLink}
              disabled={deliveryBusy || syncing || !editedUrl.trim()}
              className="btn-primary whitespace-nowrap"
            >
              {deliveryBusy ? "Đang lưu…" : "Lưu & đồng bộ"}
            </button>
          </div>
          <p className="mt-2 text-[11px]" style={{ color: "var(--text3)" }}>
            Ảnh trong thư mục này sẽ hiện ở album giao khách. Ảnh gốc khách đã chọn ở
            giai đoạn trước tự thành nút <b>“File gốc (ảnh chọn)”</b> để khách xem/tải trên
            Drive. Thư mục cần chia sẻ ở chế độ “ai có link xem được”.
          </p>

          {/* Nói thẳng nút "Tải file chỉnh sửa" bên album khách đã hiện chưa và
              còn thiếu gì — ba điều kiện nằm ở ba màn hình khác nhau, không nói
              ra thì studio không có cách nào đoán. */}
          {(() => {
            const missing: string[] = [];
            if (!sources.some((x) => x.stage === "delivery" && x.drive_url)) missing.push("chưa lưu link Drive giao khách ở trên");
            if (!form.download_enabled) missing.push("đang tắt “Cho phép khách tải ảnh xuống”");
            if (form.status !== "published") missing.push("album chưa xuất bản");
            return (
              <p
                className="mt-2 rounded-lg px-2.5 py-1.5 text-[11px]"
                style={
                  missing.length
                    ? { background: "color-mix(in srgb, var(--s-amber) 12%, transparent)", color: "var(--s-amber)" }
                    : { background: "color-mix(in srgb, var(--s-green) 12%, transparent)", color: "var(--s-green)" }
                }
              >
                {missing.length
                  ? `Nút “Tải file chỉnh sửa” CHƯA hiện với khách — ${missing.join("; ")}.`
                  : "Nút “Tải file chỉnh sửa” đang hiện ở đầu album giao khách."}
              </p>
            );
          })()}
        </div>
      )}

      {/* Delivery phase: download the finished album at ORIGINAL quality from Drive. */}
      {phase === "delivery" && deliveryFolders.length > 0 && (
        <div className="card mb-6 p-5">
          <div className="flex items-start gap-3">
            <span className="flex h-9 w-9 flex-shrink-0 items-center justify-center rounded-full" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>
              <HardDriveDownload size={18} />
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium text-accent">Tải album gốc từ Drive</p>
              <p className="mb-3 text-xs" style={{ color: "var(--text3)" }}>
                Tải toàn bộ ảnh giao khách ở chất lượng gốc (không nén, không watermark) trực tiếp
                từ Google Drive — Google tự nén và phục vụ, không tốn băng thông máy chủ.
              </p>
              <div className="flex flex-wrap gap-2">
                {deliveryFolders.map((s) => (
                  <a
                    key={s.id}
                    href={s.drive_url}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-ghost"
                    title="Mở thư mục trên Google Drive để tải trực tiếp (không tốn băng thông máy chủ)"
                  >
                    <FolderOpen size={15} /> Mở thư mục Drive{deliveryFolders.length > 1 ? ` · ${s.name}` : ""}
                  </a>
                ))}
              </div>
              {deliveryFolders.length > 0 && (
                <p className="mt-2 text-[11px]" style={{ color: "var(--text3)" }}>
                  Mẹo: “Mở thư mục Drive” cho phép tải cả album trực tiếp từ Google (nhanh & không tốn băng thông máy chủ).
                </p>
              )}
            </div>
          </div>
        </div>
      )}

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

          {canWatermark ? (
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
          ) : (
            <div className="rounded-md border border-ink-800 p-3">
              <p className="text-sm text-accent">{t("enableWatermark")}</p>
              <p className="mt-2 text-xs" style={{ color: "var(--text3)" }}>
                Watermark có ở gói <strong>Photographer Plus</strong> và <strong>Studio</strong>.
                Ảnh không watermark được tải thẳng từ Google Drive nên nhanh hơn và
                không giới hạn lượt tải.
              </p>
            </div>
          )}

          <label className="flex items-center gap-2 rounded-md border border-ink-800 p-3 text-sm text-accent">
            <input
              type="checkbox"
              checked={form.download_enabled}
              onChange={(e) => setForm({ ...form, download_enabled: e.target.checked })}
            />
            Cho phép khách tải ảnh xuống
          </label>

          {canDelivery && canWatermark && (
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
            <label className="label">Loại album (phân loại)</label>
            <input
              className="input"
              list="album-category-presets"
              placeholder="VD: Cưới, Sự kiện, Doanh nghiệp…"
              value={form.category_label}
              onChange={(e) => {
                const label = e.target.value;
                setForm({ ...form, category_label: label, category: slugifyVi(label) });
              }}
            />
            <datalist id="album-category-presets">
              {/* Loại của CHÍNH studio đã dùng (ưu tiên), rồi tới gợi ý mẫu. */}
              {studioCats.map((c) => (
                <option key={`s-${c.slug}`} value={c.label} />
              ))}
              {CATEGORY_PRESETS.filter((p) => !studioCats.some((c) => c.slug === p.slug)).map((c) => (
                <option key={`p-${c.slug}`} value={c.label} />
              ))}
            </datalist>
            <p className="mt-1 text-xs text-accent-muted">
              Tự đặt loại theo ý bạn — loại mới sẽ tự lưu để chọn cho album khác.{" "}
              <Link href="/dashboard/studio/album-categories" className="underline">Quản lý loại album</Link>
            </p>
          </div>

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
                      <span
                        className="rounded px-1.5 py-0.5 text-[10px] uppercase"
                        style={s.stage === "delivery"
                          ? { background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }
                          : { background: "color-mix(in srgb, var(--gold) 15%, transparent)", color: "var(--gold)" }}
                      >
                        {s.stage === "delivery" ? "Giao" : "Chọn"}
                      </span>
                      {s.name}
                    </div>
                    <div className="truncate text-xs text-ink-600">{s.drive_url}</div>
                  </div>
                  <button
                    onClick={() => removeSource(s.id)}
                    className="text-accent-muted hover:text-red-400"
                    aria-label={t("delete")}
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
                  <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "color-mix(in srgb, var(--gold) 15%, transparent)", color: "var(--gold)" }}>{selectionCount} chọn</span>
                  <span className="rounded px-1.5 py-0.5 text-[10px]" style={{ background: "color-mix(in srgb, var(--success) 15%, transparent)", color: "var(--success)" }}>{deliveryCount} giao</span>
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
                      aria-label={t("setCover")}
                      className="rounded bg-ink-900/80 p-1.5 text-accent-gold hover:bg-ink-800"
                    >
                      <Star size={14} />
                    </button>
                    <button
                      onClick={() => removePhoto(p.id)}
                      aria-label={t("delete")}
                      className="rounded bg-ink-900/80 p-1.5 hover:bg-ink-800"
                      style={{ color: "var(--danger)" }}
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

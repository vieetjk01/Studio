"use client";

import { useEffect, useState } from "react";
import DateInput from "@/components/DateInput";
import Link from "next/link";
import { useRouter } from "next/navigation";
import {
  ArrowLeft, RefreshCw, Trash2, Plus, Star, ExternalLink, Save, Pin, MessageSquare, Star as StarIcon,
} from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { mainUrl } from "@/lib/hosts";
import ShareButton from "@/components/ShareButton";
import { thumbnailUrl, isFolderLink } from "@/lib/drive";
import { fetchAllPhotos } from "@/lib/photos";
import { fetchMyGalleryCategories } from "@/lib/gallery-cats";
import type { Album, AlbumSource, Photo, Feedback, SourceKind } from "@/lib/types";

export default function GalleryEditor({
  album,
  initialSources,
  initialPhotos,
  feedback,
}: {
  album: Album;
  initialSources: AlbumSource[];
  initialPhotos: Photo[];
  feedback: Feedback[];
}) {
  const supabase = createClient();
  const router = useRouter();

  const [form, setForm] = useState({
    title: album.title,
    client_name: album.client_name ?? "",
    event_date: album.event_date ?? "",
    category: album.category ?? "",
    status: album.status,
    gallery_pinned: album.gallery_pinned,
    download_enabled: album.download_enabled ?? true,
    cover_url: album.cover_url,
  });
  const [newPhone, setNewPhone] = useState("");
  const [catSuggestions, setCatSuggestions] = useState<string[]>([]);
  useEffect(() => {
    fetchMyGalleryCategories().then(setCatSuggestions);
  }, []);
  const [sources, setSources] = useState<AlbumSource[]>(initialSources);
  const [photos, setPhotos] = useState<Photo[]>(initialPhotos);
  const [newSource, setNewSource] = useState({ name: "", url: "" });
  const [saving, setSaving] = useState(false);
  const [syncing, setSyncing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [msg, setMsg] = useState<string | null>(null);

  function flash(m: string) {
    setMsg(m);
    setTimeout(() => setMsg(null), 2800);
  }

  async function save() {
    setSaving(true);
    const { error } = await supabase
      .from("albums")
      .update({
        title: form.title,
        client_name: form.client_name || null,
        event_date: form.event_date || null,
        category: form.category.trim() || null,
        category_label: null,
        status: form.status,
        gallery_pinned: form.gallery_pinned,
        download_enabled: form.download_enabled,
        cover_url: form.cover_url,
      })
      .eq("id", album.id);
    if (!error && newPhone.trim()) {
      await supabase.from("albums").update({ client_phone: newPhone.trim() }).eq("id", album.id);
      await fetch(`/api/albums/${album.id}/password`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password: newPhone.trim() }),
      });
      setNewPhone("");
    }
    setSaving(false);
    flash(error ? error.message : "Đã lưu");
  }

  async function addSource(e: React.FormEvent) {
    e.preventDefault();
    if (!newSource.url.trim()) return;
    const kind: SourceKind = isFolderLink(newSource.url) ? "folder" : "file";
    const { data, error } = await supabase
      .from("album_sources")
      .insert({ album_id: album.id, name: newSource.name || (kind === "folder" ? "Folder" : "File"), drive_url: newSource.url.trim(), kind, position: sources.length })
      .select("*")
      .single();
    if (error) return flash(error.message);
    setSources([...sources, data as AlbumSource]);
    setNewSource({ name: "", url: "" });
    // Auto-sync so photos & thumbnails appear immediately after adding a source.
    await sync();
  }

  async function removeSource(id: string) {
    if (!confirm("Gỡ nguồn này?")) return;
    await supabase.from("album_sources").delete().eq("id", id);
    setSources(sources.filter((s) => s.id !== id));
    setPhotos(photos.filter((p) => p.source_id !== id));
  }

  async function sync() {
    setSyncing(true);
    const res = await fetch(`/api/albums/${album.id}/sync`, { method: "POST" });
    const data = await res.json();
    const fresh = await fetchAllPhotos(supabase, album.id, "*");
    setPhotos(fresh as Photo[]);
    const { data: fs } = await supabase.from("album_sources").select("*").eq("album_id", album.id).order("position");
    if (fs) setSources(fs as AlbumSource[]);
    setSyncing(false);
    flash(`${data.total ?? 0} ảnh` + (data.errors?.length ? ` · ${data.errors.join("; ")}` : ""));
  }

  async function setCover(fileId: string) {
    const url = thumbnailUrl(fileId, 800);
    setForm((f) => ({ ...f, cover_url: url }));
    await supabase.from("albums").update({ cover_url: url }).eq("id", album.id);
    flash("Đã đặt ảnh bìa");
  }
  async function removePhoto(id: string) {
    await supabase.from("photos").delete().eq("id", id);
    setPhotos(photos.filter((p) => p.id !== id));
  }
  async function deleteGallery() {
    if (!confirm("Xóa gallery này? Không thể hoàn tác.")) return;
    setDeleting(true);
    await supabase.from("albums").delete().eq("id", album.id);
    router.push("/dashboard/galleries");
    router.refresh();
  }

  return (
    <div className="animate-[vkFade_.5s_ease_both] pb-20">
      <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
        <div>
          <Link href="/dashboard/galleries" className="mb-2 inline-flex items-center gap-1 text-sm" style={{ color: "var(--text2)" }}>
            <ArrowLeft size={15} /> Quay lại
          </Link>
          <h1 className="font-serif text-2xl font-medium">{form.title}</h1>
        </div>
        <div className="flex items-center gap-2">
          <Link href={`/album/${album.slug}`} target="_blank" className="btn-ghost">
            <ExternalLink size={15} /> Xem
          </Link>
          <ShareButton path={mainUrl(`/album/${album.slug}`)} title={form.title} />
          <button onClick={deleteGallery} disabled={deleting} className="btn-danger">
            <Trash2 size={15} /> {deleting ? "Đang xóa…" : "Xóa"}
          </button>
        </div>
      </div>

      {msg && (
        <div className="mb-6 rounded-md px-4 py-2 text-sm" style={{ background: "color-mix(in srgb, var(--gold) 12%, transparent)", color: "var(--gold)" }}>
          {msg}
        </div>
      )}

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-3">
        {/* Settings */}
        <div className="card space-y-4 p-6 lg:col-span-1">
          <h2 className="text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>Thông tin</h2>
          <div><label className="label">Tên album</label><input className="input" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} /></div>
          <div><label className="label">Họ tên khách</label><input className="input" value={form.client_name} onChange={(e) => setForm({ ...form, client_name: e.target.value })} /></div>
          <div>
            <label className="label">Đổi SĐT / mật khẩu</label>
            <input className="input" placeholder={album.client_phone ? "•••• (đã đặt)" : "Nhập SĐT"} value={newPhone} onChange={(e) => setNewPhone(e.target.value)} />
          </div>
          <div><label className="label">Ngày cưới / đính hôn</label><DateInput value={form.event_date ?? ""} onChange={(v) => setForm({ ...form, event_date: v })} /></div>
          <div>
            <label className="label">Phân loại (tự nhập)</label>
            <input
              className="input"
              value={form.category}
              onChange={(e) => setForm({ ...form, category: e.target.value })}
              list="gallery-cat-suggestions"
              placeholder="VD: Cưới hỏi, Kỷ yếu, Sự kiện…"
            />
            <datalist id="gallery-cat-suggestions">
              {catSuggestions.map((c) => (<option key={c} value={c} />))}
            </datalist>
            {catSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {catSuggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setForm({ ...form, category: c })}
                    className="rounded-full px-2.5 py-1 text-[12px]"
                    style={form.category === c
                      ? { background: "var(--gold)", color: "#1a1205" }
                      : { background: "var(--surface2)", color: "var(--text2)" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
          <div>
            <label className="label">Trạng thái</label>
            <select className="input" value={form.status} onChange={(e) => setForm({ ...form, status: e.target.value as Album["status"] })}>
              <option value="draft">Nháp</option>
              <option value="published">Đã xuất bản</option>
            </select>
          </div>
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
            <input type="checkbox" checked={form.gallery_pinned} onChange={(e) => setForm({ ...form, gallery_pinned: e.target.checked })} />
            <Pin size={14} /> Ghim ra trang chủ (xem không cần mật khẩu)
          </label>
          <label className="flex items-center gap-2 rounded-md border p-3 text-sm" style={{ borderColor: "var(--border)" }}>
            <input type="checkbox" checked={form.download_enabled} onChange={(e) => setForm({ ...form, download_enabled: e.target.checked })} />
            Cho phép khách tải ảnh / video xuống
          </label>
          <button onClick={save} disabled={saving} className="btn-primary w-full"><Save size={15} /> {saving ? "Đang lưu…" : "Lưu"}</button>
        </div>

        {/* Sources + photos */}
        <div className="space-y-6 lg:col-span-2">
          <div className="card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>Nguồn ảnh (Drive)</h2>
            <ul className="mb-4 space-y-2">
              {sources.map((s) => (
                <li key={s.id} className="flex items-center justify-between rounded-md border px-3 py-2" style={{ borderColor: "var(--border)" }}>
                  <div className="min-w-0">
                    <div className="flex items-center gap-2 text-sm">
                      <span className="rounded px-1.5 py-0.5 text-[10px] uppercase" style={{ background: "var(--surface2)", color: "var(--text2)" }}>{s.kind}</span>
                      {s.name}
                    </div>
                    <div className="truncate text-xs" style={{ color: "var(--text3)" }}>{s.drive_url}</div>
                  </div>
                  <button onClick={() => removeSource(s.id)} className="hover:text-red-400" style={{ color: "var(--text2)" }}><Trash2 size={15} /></button>
                </li>
              ))}
              {sources.length === 0 && <li className="text-sm" style={{ color: "var(--text2)" }}>—</li>}
            </ul>
            <form onSubmit={addSource} className="grid grid-cols-1 gap-2 sm:grid-cols-[1fr_2fr_auto]">
              <input className="input" placeholder="Tên nhóm" value={newSource.name} onChange={(e) => setNewSource({ ...newSource, name: e.target.value })} />
              <input className="input" placeholder="Link Drive" value={newSource.url} onChange={(e) => setNewSource({ ...newSource, url: e.target.value })} />
              <button className="btn-ghost whitespace-nowrap"><Plus size={15} /> Thêm</button>
            </form>
            <button onClick={sync} disabled={syncing || sources.length === 0} className="btn-primary mt-4">
              <RefreshCw size={15} className={syncing ? "animate-spin" : ""} /> {syncing ? "Đang đồng bộ…" : "Đồng bộ ảnh từ Drive"}
            </button>
          </div>

          <div className="card p-6">
            <h2 className="mb-4 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>{photos.length} ảnh</h2>
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 md:grid-cols-4">
              {photos.slice(0, 200).map((p) => (
                <div key={p.id} className="group relative aspect-square overflow-hidden rounded-md" style={{ background: "var(--surface2)" }}>
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img src={thumbnailUrl(p.drive_file_id, 400)} alt={p.name} loading="lazy" className="h-full w-full object-cover" />
                  <div className="absolute inset-0 flex items-end justify-between bg-gradient-to-t from-black/70 to-transparent p-2 opacity-0 transition group-hover:opacity-100">
                    <button onClick={() => setCover(p.drive_file_id)} title="Đặt bìa" className="rounded bg-ink-900/80 p-1.5" style={{ color: "var(--gold)" }}><Star size={14} /></button>
                    <button onClick={() => removePhoto(p.id)} className="rounded bg-ink-900/80 p-1.5 text-red-300"><Trash2 size={14} /></button>
                  </div>
                </div>
              ))}
            </div>
            {photos.length > 200 && <p className="mt-3 text-xs" style={{ color: "var(--text3)" }}>Hiển thị 200/{photos.length} ảnh.</p>}
          </div>

          {/* Feedback */}
          <div className="card p-6">
            <h2 className="mb-4 flex items-center gap-2 text-sm font-medium uppercase tracking-wide" style={{ color: "var(--text2)" }}>
              <MessageSquare size={15} /> Feedback của khách ({feedback.length})
            </h2>
            {feedback.length === 0 ? (
              <p className="text-sm" style={{ color: "var(--text3)" }}>Chưa có feedback.</p>
            ) : (
              <div className="space-y-3">
                {feedback.map((f) => (
                  <div key={f.id} className="rounded-lg p-3" style={{ background: "var(--surface2)" }}>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-medium">{f.client_name || "Khách"}</span>
                      {f.rating ? (
                        <span className="flex items-center gap-0.5" style={{ color: "var(--gold)" }}>
                          {Array.from({ length: f.rating }).map((_, i) => <StarIcon key={i} size={12} fill="currentColor" strokeWidth={0} />)}
                        </span>
                      ) : null}
                    </div>
                    <p className="mt-1 text-[13.5px]" style={{ color: "var(--text2)" }}>{f.content}</p>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

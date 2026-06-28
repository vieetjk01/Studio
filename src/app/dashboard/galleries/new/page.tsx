"use client";

import { useEffect, useState } from "react";
import DateInput from "@/components/DateInput";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, Plus, Link2, FolderTree, ArrowRight, Lock } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { isFolderLink } from "@/lib/drive";
import { fetchMyGalleryCategories } from "@/lib/gallery-cats";

function slugify(s: string) {
  const base = s
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/Đ/g, "d")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/(^-|-$)/g, "")
    .slice(0, 40);
  return `${base || "album"}-${Math.random().toString(36).slice(2, 7)}`;
}

export default function NewGalleryPage() {
  const router = useRouter();
  const supabase = createClient();

  const [title, setTitle] = useState("");
  const [drives, setDrives] = useState<string[]>([""]);
  const [clientName, setClientName] = useState("");
  const [phone, setPhone] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [category, setCategory] = useState("");
  const [catSuggestions, setCatSuggestions] = useState<string[]>([]);

  useEffect(() => {
    fetchMyGalleryCategories().then(setCatSuggestions);
  }, []);

  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [splitMsg, setSplitMsg] = useState<string | null>(null);
  const [splitting, setSplitting] = useState(false);

  async function splitSubfolders() {
    const parent = drives.map((d) => d.trim()).find(Boolean);
    if (!parent) return setSplitMsg("Hãy dán link folder tổng ở ô đầu tiên trước.");
    setSplitting(true);
    setSplitMsg(null);
    const res = await fetch("/api/drive/subfolders", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ url: parent }),
    });
    const data = await res.json();
    setSplitting(false);
    if (data.error) return setSplitMsg(data.error);
    const folders = (data.folders ?? []) as { url: string }[];
    if (folders.length === 0) return setSplitMsg("Không tìm thấy folder con.");
    setDrives(folders.map((f) => f.url));
    setSplitMsg(`Đã thêm ${folders.length} folder con — mỗi folder là một mục riêng.`);
  }

  async function create() {
    setError(null);
    if (!title.trim()) return setError("Hãy nhập tên album.");
    const viewPassword = phone.trim();
    setBusy(true);
    try {
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return router.push("/login");

      const { data: album, error: aErr } = await supabase
        .from("albums")
        .insert({
          owner_id: user.id,
          title: title.trim(),
          slug: slugify(title),
          is_gallery: true,
          client_name: clientName.trim() || null,
          client_phone: viewPassword || null,
          event_date: eventDate || null,
          category: category.trim() || null,
          category_label: null,
          status: "published",
          watermark_enabled: false,
        })
        .select("id, slug")
        .single();
      if (aErr || !album) throw new Error(aErr?.message ?? "Không tạo được gallery");

      const links = drives.map((d) => d.trim()).filter(Boolean);
      if (links.length > 0) {
        await supabase.from("album_sources").insert(
          links.map((url, i) => ({
            album_id: album.id,
            name: isFolderLink(url) ? `Folder ${i + 1}` : `Nhóm ${i + 1}`,
            drive_url: url,
            kind: isFolderLink(url) ? "folder" : "file",
            position: i,
          }))
        );
      }

      // Password = client phone (hashed server-side). Skip if no phone provided.
      // Fail loudly: a gallery that silently stays unprotected is worse than an error.
      if (viewPassword) {
        const pwRes = await fetch(`/api/albums/${album.id}/password`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ password: viewPassword }),
        });
        if (!pwRes.ok) throw new Error("Không đặt được mật khẩu cho gallery. Vui lòng thử lại.");
      }
      // Sync failure isn't fatal — the gallery exists and can be re-synced — but warn.
      if (links.length > 0) {
        const syncRes = await fetch(`/api/albums/${album.id}/sync`, { method: "POST" });
        if (!syncRes.ok) {
          sessionStorage.setItem("gallerySyncWarning", "Đồng bộ ảnh chưa xong, hãy bấm Đồng bộ lại trong trang gallery.");
        }
      }

      router.push(`/dashboard/galleries/${album.id}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Có lỗi xảy ra");
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl animate-[vkFade_.5s_ease_both]">
      <Link href="/dashboard/galleries" className="mb-5 inline-flex items-center gap-1 text-sm" style={{ color: "var(--text2)" }}>
        <ArrowLeft size={15} /> Quay lại
      </Link>
      <h1 className="mb-6 font-serif text-3xl font-medium">Tạo gallery giao khách</h1>

      <div className="card space-y-4 p-6">
        <div>
          <label className="label">Tên album</label>
          <input value={title} onChange={(e) => setTitle(e.target.value)} className="input" placeholder="Mai & Long · Wedding" />
        </div>

        <div>
          <label className="label">Link ảnh (Google Drive)</label>
          <div className="flex flex-col gap-2.5">
            {drives.map((d, i) => (
              <div key={i} className="relative">
                <Link2 size={16} className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2" style={{ color: "var(--text3)" }} />
                <input
                  value={d}
                  onChange={(e) => setDrives((arr) => arr.map((x, j) => (j === i ? e.target.value : x)))}
                  placeholder={i === 0 ? "https://drive.google.com/drive/folders/..." : "Link bổ sung…"}
                  className="input pl-[42px] text-[13.5px]"
                />
              </div>
            ))}
          </div>
          <div className="mt-2.5 flex flex-wrap gap-4">
            <button onClick={() => setDrives((a) => [...a, ""])} className="flex items-center gap-1.5 text-[13px] font-semibold" style={{ color: "var(--gold)" }}>
              <Plus size={15} /> Thêm link
            </button>
            <button onClick={splitSubfolders} disabled={splitting} className="flex items-center gap-1.5 text-[13px] font-semibold disabled:opacity-50" style={{ color: "var(--gold)" }}>
              <FolderTree size={15} /> {splitting ? "Đang tách…" : "Tách folder con"}
            </button>
          </div>
          {splitMsg && <p className="mt-2 text-[12.5px]" style={{ color: "var(--text2)" }}>{splitMsg}</p>}
        </div>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Họ tên khách hàng</label>
            <input value={clientName} onChange={(e) => setClientName(e.target.value)} className="input" placeholder="Nguyễn Văn A" />
          </div>
          <div>
            <label className="label flex items-center gap-1.5">
              <Lock size={12} /> Số điện thoại (mật khẩu xem)
            </label>
            <input value={phone} onChange={(e) => setPhone(e.target.value)} className="input" placeholder="09xx xxx xxx" />
          </div>
          <div>
            <label className="label">Ngày cưới / đính hôn</label>
            <DateInput value={eventDate} onChange={(v) => setEventDate(v)} allowPast />
          </div>
          <div>
            <label className="label">Phân loại (tự nhập)</label>
            <input
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              list="gallery-cat-suggestions"
              className="input"
              placeholder="VD: Cưới hỏi, Kỷ yếu, Sự kiện…"
            />
            <datalist id="gallery-cat-suggestions">
              {catSuggestions.map((c) => (
                <option key={c} value={c} />
              ))}
            </datalist>
            {catSuggestions.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {catSuggestions.map((c) => (
                  <button
                    key={c}
                    type="button"
                    onClick={() => setCategory(c)}
                    className="rounded-full px-2.5 py-1 text-[12px]"
                    style={category === c
                      ? { background: "var(--gold)", color: "#1a1205" }
                      : { background: "var(--surface2)", color: "var(--text2)" }}
                  >
                    {c}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>

        <p className="rounded-lg px-3 py-2 text-[12.5px]" style={{ background: "var(--surface2)", color: "var(--text2)" }}>
          Khách xem album bằng mật khẩu là <b>số điện thoại</b> ở trên. Nếu để trống, album sẽ <b>không có mật khẩu</b> — ai có link đều xem được. Bạn có thể đặt mật khẩu sau trong phần chỉnh sửa.
        </p>

        {error && <p className="text-sm text-red-400">{error}</p>}
        <button onClick={create} disabled={busy} className="btn-primary w-full">
          {busy ? "Đang tạo…" : "Tạo gallery"} <ArrowRight size={16} />
        </button>
      </div>
    </div>
  );
}
